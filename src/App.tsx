/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { doc, getDocFromServer } from 'firebase/firestore';
import { InventoryItem, GoogleSheetConfig, SyncStatus } from './types/inventory';
import { INITIAL_INVENTORY_ITEMS } from './data/initialData';
import { getAccessToken } from './services/firebaseAuth';
import {
  db,
  subscribeToInventory,
  saveInventoryItemFirestore,
  deleteInventoryItemFirestore,
  batchSaveInventoryFirestore,
  saveSettingsFirestore,
  getSettingsFirestore,
  resetInventoryFirestore,
  getDatasetVersionFirestore,
  setDatasetVersionFirestore
} from './services/firestore';
import {
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
import { ReportsView } from './components/ReportsView';
import {
  Plus,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  reconcileInventory,
  deduplicateInventory,
  isPrinterItem
} from './utils/inventoryValidation';

const CURRENT_DATA_VERSION = 'v2_2026_10_08';
const STORAGE_KEY_ITEMS = 'inventario_ti_items_v2';
const STORAGE_KEY_DATA_VERSION = 'inventario_ti_data_version';
const STORAGE_KEY_CONFIG = 'inventario_ti_sheets_config_v1';

export default function App() {
  // Category Tab Selection ('COMPUTADORES' | 'IMPRESSORAS' | 'TODOS')
  const [activeCategoryTab, setActiveCategoryTab] = useState<'COMPUTADORES' | 'IMPRESSORAS' | 'TODOS'>('COMPUTADORES');

  // Main View Switcher ('inventory' | 'reports')
  const [currentView, setCurrentView] = useState<'inventory' | 'reports'>('inventory');

  // Firestore Database status
  const [isDatabaseConnected, setIsDatabaseConnected] = useState<boolean>(true);

  // Inventory Items State
  const [items, setItems] = useState<InventoryItem[]>(() => {
    try {
      const storedVersion = localStorage.getItem(STORAGE_KEY_DATA_VERSION);
      if (storedVersion === CURRENT_DATA_VERSION) {
        const saved = localStorage.getItem(STORAGE_KEY_ITEMS);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } else {
        localStorage.removeItem('inventario_ti_items_v1');
        localStorage.setItem(STORAGE_KEY_DATA_VERSION, CURRENT_DATA_VERSION);
        localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(INITIAL_INVENTORY_ITEMS));
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

  // Realtime Firestore Subscription & Version check
  useEffect(() => {
    let isInitialLoad = true;

    async function checkAndSyncCloud() {
      try {
        const cloudVersion = await getDatasetVersionFirestore();
        if (cloudVersion !== CURRENT_DATA_VERSION) {
          console.log('Sincronizando nova versão do dataset com o Firestore...');
          await resetInventoryFirestore(INITIAL_INVENTORY_ITEMS);
          await setDatasetVersionFirestore(CURRENT_DATA_VERSION);
        }
      } catch (e) {
        console.warn('Aviso na checagem de versão na nuvem:', e);
      }
    }

    checkAndSyncCloud();

    const unsubscribe = subscribeToInventory(
      async (remoteItems) => {
        if (remoteItems.length > 0) {
          const cloudVersion = await getDatasetVersionFirestore();
          const cleanItems = deduplicateInventory(remoteItems);
          if (cloudVersion === CURRENT_DATA_VERSION) {
            setItems(cleanItems);
          } else {
            setItems(INITIAL_INVENTORY_ITEMS);
          }
        } else if (isInitialLoad && INITIAL_INVENTORY_ITEMS.length > 0) {
          try {
            await batchSaveInventoryFirestore(INITIAL_INVENTORY_ITEMS);
            await setDatasetVersionFirestore(CURRENT_DATA_VERSION);
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


  // Link existing Google Spreadsheet
  const handleLinkExistingSheet = async (idOrUrl: string) => {
    const token = await getAccessToken();
    if (!token) throw new Error('Acesso à API do Google desativado. Para importar seus dados, utilize a Opção B (Carregar arquivo Excel).');

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

  // Import directly from .xlsx file (Opção B)
  const handleImportXlsxFile = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const { items: importedItems } = parseXlsxBuffer(arrayBuffer, items);

    if (importedItems.length === 0) {
      throw new Error('Nenhum dado de inventário encontrado dentro do arquivo Excel selecionado.');
    }

    // 1. Reconciliação inteligente: Atualiza equipamentos existentes e inclui apenas o que faltava
    const { reconciled, updatedCount, addedCount } = reconcileInventory(items, importedItems);

    // 2. Atualiza estado React imediatamente
    setItems(reconciled);

    // 3. Limpa e regrava na nuvem (Firestore) para garantir persistência 100% limpa, sem duplicatas
    await resetInventoryFirestore(reconciled);

    // 4. Notifica com resumo detalhado
    const compCount = reconciled.filter((i) => !isPrinterItem(i)).length;
    const impCount = reconciled.filter(isPrinterItem);

    showToast(
      `Planilha processada com sucesso: ${updatedCount} atualizados e ${addedCount} novos incluídos (total: ${reconciled.length} itens sem duplicatas)!`,
      'success'
    );

    return {
      totalItems: reconciled.length,
      updatedCount,
      addedCount,
      computadores: compCount,
      impressoras: impCount.length
    };
  };

  // Batch Sync all items to Google Sheet
  const handleSyncAll = async () => {
    if (!config?.spreadsheetId) throw new Error('Nenhuma planilha vinculada.');
    const token = await getAccessToken();
    if (!token) throw new Error('Acesso à API do Google desativado. Para exportar, utilize o botão "Exportar CSV".');

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
    const token = await getAccessToken();
    if (!token) throw new Error('Acesso à API do Google desativado. Para importar, utilize o arquivo Excel (.xlsx).');

    setSyncStatus((prev) => ({ ...prev, isSyncing: true }));
    try {
      const pulledItems = await readSpreadsheetRows(token, config.spreadsheetId, config.sheetName);
      if (pulledItems.length > 0) {
        setItems(pulledItems);
        await resetInventoryFirestore(pulledItems);
        showToast(`${pulledItems.length} registros importados da planilha e sincronizados no banco.`);
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
        config={config}
        syncStatus={syncStatus}
        currentView={currentView}
        onChangeView={setCurrentView}
        onOpenNewItem={() => {
          setEditingItem(null);
          setIsItemModalOpen(true);
        }}
        onOpenSyncModal={() => setIsConfigModalOpen(true)}
        onQuickSync={handleSyncAll}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentView === 'reports' ? (
          <ReportsView
            items={items}
            onBackToInventory={() => setCurrentView('inventory')}
            onEditItem={(item) => {
              setEditingItem(item);
              setIsItemModalOpen(true);
            }}
          />
        ) : (
          <>
            {/* Page Header */}
            <div className="mb-6">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Painel de Controle e Inventário
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Gestão de estações de trabalho, equipamentos e termos de responsabilidade
              </p>
            </div>

            {/* KPI Dashboard */}
            <DashboardStats
              items={items}
              onSelectCategory={setActiveCategoryTab}
            />

            {/* Inventory Table and Cards */}
            <InventoryTable
              items={items}
              activeCategory={activeCategoryTab}
              onCategoryChange={setActiveCategoryTab}
              onOpenReports={() => setCurrentView('reports')}
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
          </>
        )}
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
        syncStatus={syncStatus}
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
