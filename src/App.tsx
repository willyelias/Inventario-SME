/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { doc, getDocFromServer } from 'firebase/firestore';
import { InventoryItem, GoogleSheetConfig, SyncStatus } from './types/inventory';
import { INITIAL_INVENTORY_ITEMS } from './data/initialData';
import {
  initAuth,
  googleSignIn,
  logoutGoogle,
  getAccessToken
} from './services/firebaseAuth';
import {
  db,
  subscribeToInventory,
  saveInventoryItemFirestore,
  deleteInventoryItemFirestore,
  batchSaveInventoryFirestore,
  saveSettingsFirestore,
  getSettingsFirestore
} from './services/firestore';
import {
  createInventorySpreadsheet,
  fetchSpreadsheetMetadata,
  appendInventoryRow,
  updateSpreadsheetRow,
  batchAppendInventoryRows,
  readSpreadsheetRows,
  extractSpreadsheetId,
  parseXlsxBuffer
} from './services/googleSheets';
import { Navbar } from './components/Navbar';
import { DashboardStats } from './components/DashboardStats';
import { InventoryTable } from './components/InventoryTable';
import { ItemFormModal } from './components/ItemFormModal';
import { GoogleSheetsConfigModal } from './components/GoogleSheetsConfigModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { SignatureModal } from './components/SignatureModal';
import {
  Plus,
  FileSpreadsheet,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Tablet,
  Laptop,
  ArrowRight,
  Database,
  Cloud
} from 'lucide-react';

const STORAGE_KEY_ITEMS = 'inventario_ti_items_v1';
const STORAGE_KEY_CONFIG = 'inventario_ti_sheets_config_v1';

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Firestore Database status
  const [isDatabaseConnected, setIsDatabaseConnected] = useState<boolean>(true);

  // Inventory Items State
  const [items, setItems] = useState<InventoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ITEMS);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Erro ao carregar itens do localStorage:', e);
    }
    return INITIAL_INVENTORY_ITEMS;
  });

  // Google Sheets Config State
  const [config, setConfig] = useState<GoogleSheetConfig | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Erro ao carregar config do localStorage:', e);
    }
    return null;
  });

  // Sync Status
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isSyncing: false,
    pendingCount: 0
  });

  // Toast Notification
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  }, []);

  // Modals State
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  const [isQuickSignatureOpen, setIsQuickSignatureOpen] = useState(false);
  const [quickSignItem, setQuickSignItem] = useState<InventoryItem | null>(null);

  // Test Firestore Connection on Boot
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
        setIsDatabaseConnected(true);
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error('Please check your Firebase configuration.');
          setIsDatabaseConnected(false);
        } else {
          // Normal: permission or document not found still means connected
          setIsDatabaseConnected(true);
        }
      }
    }
    testConnection();
  }, []);

  // Realtime Firestore Subscription
  useEffect(() => {
    let isInitialLoad = true;
    const unsubscribe = subscribeToInventory(
      async (remoteItems) => {
        if (remoteItems.length > 0) {
          setItems(remoteItems);
        } else if (isInitialLoad && INITIAL_INVENTORY_ITEMS.length > 0) {
          // If the cloud database is brand new and empty, seed it with initial inventory items
          try {
            await batchSaveInventoryFirestore(INITIAL_INVENTORY_ITEMS);
          } catch (e) {
            console.warn('Falha ao inicializar dados no Firestore:', e);
          }
        }
        isInitialLoad = false;
        setIsDatabaseConnected(true);
      },
      (err) => {
        console.warn('Erro na sincronização em tempo real do Firestore:', err);
      }
    );

    // Also load shared cloud settings if any
    getSettingsFirestore()
      .then((remoteConfig) => {
        if (remoteConfig && !config) {
          setConfig(remoteConfig);
        }
      })
      .catch(() => {});

    return () => unsubscribe();
  }, []);

  // Sync state to local storage as offline backup
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
    } catch (e) {
      console.warn('Falha ao salvar no localStorage:', e);
    }
  }, [items]);

  useEffect(() => {
    try {
      if (config) {
        localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
      } else {
        localStorage.removeItem(STORAGE_KEY_CONFIG);
      }
    } catch (e) {
      console.warn('Falha ao salvar config no localStorage:', e);
    }
  }, [config]);

  // Initialize Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => {
        setCurrentUser(user);
      },
      () => {
        setCurrentUser(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Handle Google Sign In
  const handleSignIn = async () => {
    try {
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        showToast(`Bem-vindo, ${res.user.displayName || res.user.email}! Conectado ao Google.`);
      }
    } catch (err: any) {
      showToast(err.message || 'Falha ao autenticar com o Google.', 'error');
    }
  };

  // Handle Google Sign Out
  const handleSignOut = async () => {
    try {
      await logoutGoogle();
      setCurrentUser(null);
      showToast('Conta Google desconectada.');
    } catch (err: any) {
      showToast(err.message || 'Erro ao sair.', 'error');
    }
  };

  // Save Item (New or Edit) -> Persists in Cloud Firestore & Synced to Google Sheets
  const handleSaveItem = async (item: InventoryItem) => {
    const isEdit = items.some((i) => i.id === item.id);
    let updatedList: InventoryItem[];

    if (isEdit) {
      updatedList = items.map((i) => (i.id === item.id ? item : i));
    } else {
      updatedList = [item, ...items];
    }
    setItems(updatedList);

    // 1. Always persist permanently to Cloud Firestore database
    try {
      await saveInventoryItemFirestore(item);
    } catch (e) {
      console.warn('Aviso ao salvar no Firestore:', e);
    }

    // 2. If Google Sheet is configured and autoSync is enabled
    if (config?.spreadsheetId && config.autoSync) {
      const token = await getAccessToken();
      if (token) {
        try {
          setSyncStatus((prev) => ({ ...prev, isSyncing: true }));
          if (isEdit && item.sheetRowIndex) {
            await updateSpreadsheetRow(token, config.spreadsheetId, config.sheetName, item.sheetRowIndex, item);
          } else {
            await appendInventoryRow(token, config.spreadsheetId, config.sheetName, item);
            // Mark item as synced in Firestore and state
            const syncedItem = { ...item, syncedToGoogleSheet: true };
            await saveInventoryItemFirestore(syncedItem);
            setItems((curr) =>
              curr.map((i) => (i.id === item.id ? syncedItem : i))
            );
          }
          showToast(`Equipamento ${item.nome || item.serial} salvo no banco de dados e sincronizado na planilha Google!`);
        } catch (err: any) {
          console.error('Falha ao sincronizar com Google Sheets:', err);
          showToast(`Salvo no banco de dados. Erro na planilha Google: ${err.message}`, 'error');
        } finally {
          setSyncStatus((prev) => ({ ...prev, isSyncing: false }));
        }
        return;
      }
    }

    showToast(`Equipamento ${item.nome || item.serial} salvo permanentemente no banco de dados!`);
  };

  // Delete Item Confirmation
  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    try {
      await deleteInventoryItemFirestore(itemToDelete.id);
    } catch (e) {
      console.warn('Erro ao deletar do Firestore:', e);
    }
    setItems((curr) => curr.filter((i) => i.id !== itemToDelete.id));
    showToast(`Equipamento ${itemToDelete.nome || itemToDelete.serial} removido do banco de dados.`);
    setItemToDelete(null);
  };

  // Quick Signature from Table / Cards
  const handleSaveQuickSignature = (dataUrl: string) => {
    if (!quickSignItem) return;
    const updated: InventoryItem = {
      ...quickSignItem,
      signatureDataUrl: dataUrl,
      termoAssinado: 'SIM',
      updatedAt: new Date().toLocaleString('pt-BR')
    };
    handleSaveItem(updated);
    setQuickSignItem(null);
  };

  // Create new Google Spreadsheet
  const handleCreateNewSheet = async (title: string) => {
    let token = await getAccessToken();
    if (!token) {
      const authRes = await googleSignIn();
      token = authRes?.accessToken || null;
    }
    if (!token) throw new Error('Autenticação com Google necessária.');

    const newSheet = await createInventorySpreadsheet(token, title);

    const newConfig: GoogleSheetConfig = {
      spreadsheetId: newSheet.spreadsheetId,
      spreadsheetTitle: title,
      sheetName: newSheet.sheetName,
      spreadsheetUrl: newSheet.spreadsheetUrl,
      autoSync: true,
      lastSyncedAt: new Date().toISOString()
    };
    setConfig(newConfig);

    // Save configuration in cloud database for all users
    try {
      await saveSettingsFirestore(newConfig);
    } catch (e) {
      console.warn('Erro ao salvar settings no Firestore:', e);
    }

    // Populate the newly created spreadsheet with current items
    if (items.length > 0) {
      setSyncStatus((prev) => ({ ...prev, isSyncing: true }));
      try {
        await batchAppendInventoryRows(token, newSheet.spreadsheetId, newSheet.sheetName, items);
        const updated = items.map((i) => ({ ...i, syncedToGoogleSheet: true }));
        setItems(updated);
        await batchSaveInventoryFirestore(updated);
      } finally {
        setSyncStatus((prev) => ({ ...prev, isSyncing: false }));
      }
    }

    showToast(`Planilha "${title}" criada e preenchida no seu Google Drive com sucesso!`);
  };

  // Link existing Google Spreadsheet
  const handleLinkExistingSheet = async (idOrUrl: string) => {
    let token = await getAccessToken();
    if (!token) {
      const authRes = await googleSignIn();
      token = authRes?.accessToken || null;
    }
    if (!token) throw new Error('Autenticação com Google necessária.');

    const spreadsheetId = extractSpreadsheetId(idOrUrl);
    if (!spreadsheetId) {
      throw new Error('Não foi possível identificar o ID da planilha no link informado.');
    }

    const metadata = await fetchSpreadsheetMetadata(token, spreadsheetId);
    const chosenSheet = metadata.sheets.length > 0 ? metadata.sheets[0] : 'Inventário TI';

    const newConfig: GoogleSheetConfig = {
      spreadsheetId,
      spreadsheetTitle: metadata.title,
      sheetName: chosenSheet,
      spreadsheetUrl: metadata.spreadsheetUrl,
      autoSync: true,
      lastSyncedAt: new Date().toISOString()
    };
    setConfig(newConfig);

    // Save in cloud database
    try {
      await saveSettingsFirestore(newConfig);
    } catch (e) {
      console.warn('Erro ao salvar settings no Firestore:', e);
    }

    // Try reading rows to see if there is data already
    try {
      const existingRows = await readSpreadsheetRows(token, spreadsheetId, chosenSheet);
      if (existingRows.length > 0) {
        setItems(existingRows);
        await batchSaveInventoryFirestore(existingRows);
        showToast(`Planilha "${metadata.title}" vinculada e ${existingRows.length} registros salvos no banco!`);
        return;
      }
    } catch (e) {
      console.warn('Planilha vinculada sem linhas de dados iniciais:', e);
    }

    showToast(`Planilha "${metadata.title}" vinculada com sucesso!`);
  };

  // Import directly from .xlsx file
  const handleImportXlsxFile = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const { items: importedItems } = parseXlsxBuffer(arrayBuffer);

    if (importedItems.length === 0) {
      throw new Error('Nenhum dado encontrado dentro do arquivo Excel selecionado.');
    }

    setItems(importedItems);
    await batchSaveInventoryFirestore(importedItems);
    showToast(`${importedItems.length} equipamentos importados e salvos no banco de dados!`);
  };

  // Batch Sync all items to Google Sheet
  const handleSyncAll = async () => {
    if (!config?.spreadsheetId) throw new Error('Nenhuma planilha vinculada.');
    let token = await getAccessToken();
    if (!token) {
      const authRes = await googleSignIn();
      token = authRes?.accessToken || null;
    }
    if (!token) throw new Error('Autenticação com Google necessária.');

    setSyncStatus((prev) => ({ ...prev, isSyncing: true }));
    try {
      await batchAppendInventoryRows(token, config.spreadsheetId, config.sheetName, items);
      const updated = items.map((i) => ({ ...i, syncedToGoogleSheet: true }));
      setItems(updated);
      await batchSaveInventoryFirestore(updated);
      setConfig((prev) => (prev ? { ...prev, lastSyncedAt: new Date().toISOString() } : null));
      showToast(`${items.length} equipamentos sincronizados com a planilha central.`);
    } finally {
      setSyncStatus((prev) => ({ ...prev, isSyncing: false }));
    }
  };

  // Pull records from central Google Sheet
  const handlePullFromSheet = async () => {
    if (!config?.spreadsheetId) throw new Error('Nenhuma planilha vinculada.');
    let token = await getAccessToken();
    if (!token) {
      const authRes = await googleSignIn();
      token = authRes?.accessToken || null;
    }
    if (!token) throw new Error('Autenticação com Google necessária.');

    setSyncStatus((prev) => ({ ...prev, isSyncing: true }));
    try {
      const pulledItems = await readSpreadsheetRows(token, config.spreadsheetId, config.sheetName);
      if (pulledItems.length > 0) {
        setItems(pulledItems);
        await batchSaveInventoryFirestore(pulledItems);
        showToast(`${pulledItems.length} registros importados da planilha e salvos no banco.`);
      } else {
        showToast('Nenhuma linha de dados encontrada na planilha central.', 'info');
      }
    } finally {
      setSyncStatus((prev) => ({ ...prev, isSyncing: false }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans pb-20 sm:pb-8">
      {/* Toast Banner */}
      {toast && (
        <div className="fixed top-4 right-4 left-4 sm:left-auto z-50 max-w-md animate-in fade-in slide-in-from-top-4 duration-200">
          <div
            className={`p-3.5 rounded-xl shadow-xl border flex items-center gap-3 ${
              toast.type === 'success'
                ? 'bg-emerald-900/90 text-white border-emerald-700 backdrop-blur-md'
                : toast.type === 'error'
                ? 'bg-rose-900/90 text-white border-rose-700 backdrop-blur-md'
                : 'bg-blue-900/90 text-white border-blue-700 backdrop-blur-md'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-300 shrink-0" />
            )}
            <p className="text-xs sm:text-sm font-medium">{toast.message}</p>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        config={config}
        syncStatus={syncStatus}
        onOpenNewItem={() => {
          setEditingItem(null);
          setIsItemModalOpen(true);
        }}
        onOpenSyncModal={() => setIsConfigModalOpen(true)}
        onQuickSync={handleSyncAll}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
      />

      {/* Hero / Mobile Field Banner */}
      <div className="bg-gradient-to-b from-blue-50/70 to-transparent border-b border-blue-100/50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                  <Smartphone className="w-3.5 h-3.5" />
                  <Tablet className="w-3.5 h-3.5" />
                  <span>Otimizado para Celular & Tablet</span>
                </div>
                {/* Database active badge */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <Database className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Banco de Dados Cloud Firestore: Ativo e Permanente</span>
                </div>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Controle Central de Equipamentos e Inventário
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
                Todos os dados inseridos são salvos automaticamente no banco de dados na nuvem e
                alimentam a planilha de controle central em tempo real.
              </p>
            </div>

            {/* Quick Action Cards */}
            <div className="flex items-center gap-2">
              {config?.spreadsheetId ? (
                <a
                  href={config.spreadsheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-emerald-700 border border-emerald-300 rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Ver Planilha Central</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02]"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Conectar Google Sheets</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* KPI Dashboard */}
        <DashboardStats
          items={items}
          config={config}
          onOpenSyncModal={() => setIsConfigModalOpen(true)}
        />

        {/* Inventory Table and Cards */}
        <InventoryTable
          items={items}
          onEdit={(item) => {
            setEditingItem(item);
            setIsItemModalOpen(true);
          }}
          onDeleteRequest={(item) => {
            setItemToDelete(item);
            setIsDeleteModalOpen(true);
          }}
          onQuickSign={(item) => {
            setQuickSignItem(item);
            setIsQuickSignatureOpen(true);
          }}
        />
      </main>

      {/* Mobile Floating Action Button */}
      <div className="fixed bottom-4 right-4 z-30 sm:hidden">
        <button
          type="button"
          onClick={() => {
            setEditingItem(null);
            setIsItemModalOpen(true);
          }}
          className="flex items-center gap-2 px-5 py-3.5 bg-blue-600 active:bg-blue-700 text-white rounded-full shadow-2xl shadow-blue-600/40 text-sm font-bold border-2 border-white transition-all transform active:scale-95"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>Novo Equipamento</span>
        </button>
      </div>

      {/* Modals */}
      {/* 1. Item Form Modal */}
      <ItemFormModal
        isOpen={isItemModalOpen}
        onClose={() => {
          setIsItemModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveItem}
        initialItem={editingItem}
        totalItemsCount={items.length}
      />

      {/* 2. Google Sheets Config Modal */}
      <GoogleSheetsConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        config={config}
        currentUser={currentUser}
        syncStatus={syncStatus}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onCreateNewSheet={handleCreateNewSheet}
        onLinkExistingSheet={handleLinkExistingSheet}
        onSyncAll={handleSyncAll}
        onPullFromSheet={handlePullFromSheet}
        onImportXlsxFile={handleImportXlsxFile}
        onToggleAutoSync={(enabled) =>
          setConfig((prev) => (prev ? { ...prev, autoSync: enabled } : null))
        }
      />

      {/* 3. Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        item={itemToDelete}
      />

      {/* 4. Quick Signature Modal */}
      <SignatureModal
        isOpen={isQuickSignatureOpen}
        onClose={() => {
          setIsQuickSignatureOpen(false);
          setQuickSignItem(null);
        }}
        onSave={handleSaveQuickSignature}
        responsavelNome={quickSignItem?.responsavel || ''}
      />
    </div>
  );
}
