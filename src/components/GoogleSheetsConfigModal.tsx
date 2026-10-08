import React, { useState, useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  DownloadCloud,
  LogOut,
  Layers,
  Sparkles,
  Link2,
  FileUp,
  HelpCircle,
  Info
} from 'lucide-react';
import { GoogleSheetConfig, SyncStatus } from '../types/inventory';
import { User } from 'firebase/auth';

interface GoogleSheetsConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: GoogleSheetConfig | null;
  currentUser: User | null;
  syncStatus: SyncStatus;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onCreateNewSheet: (title: string) => Promise<void>;
  onLinkExistingSheet: (idOrUrl: string) => Promise<void>;
  onSyncAll: () => Promise<void>;
  onPullFromSheet: () => Promise<void>;
  onToggleAutoSync: (enabled: boolean) => void;
  onImportXlsxFile: (file: File) => Promise<void>;
}

export const GoogleSheetsConfigModal: React.FC<GoogleSheetsConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  currentUser,
  syncStatus,
  onSignIn,
  onSignOut,
  onCreateNewSheet,
  onLinkExistingSheet,
  onSyncAll,
  onPullFromSheet,
  onToggleAutoSync,
  onImportXlsxFile
}) => {
  const [existingInput, setExistingInput] = useState('');
  const [newTitle, setNewTitle] = useState('INVENTÁRIO SME - Controle Central');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setIsProcessing(true);
    setFeedback(null);
    try {
      await onCreateNewSheet(newTitle.trim());
      setFeedback({
        type: 'success',
        message: 'Planilha criada com sucesso no seu Google Drive com todas as colunas formatadas!'
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Falha ao criar planilha.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLink = async () => {
    if (!existingInput.trim()) return;
    setIsProcessing(true);
    setFeedback(null);
    try {
      await onLinkExistingSheet(existingInput.trim());
      setFeedback({
        type: 'success',
        message: 'Planilha vinculada com sucesso!'
      });
      setExistingInput('');
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Falha ao vincular planilha. Verifique se o link/ID está correto.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setFeedback(null);
    try {
      await onImportXlsxFile(file);
      setFeedback({
        type: 'success',
        message: `Arquivo "${file.name}" importado com sucesso! Os dados foram carregados.`
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Falha ao importar o arquivo Excel.'
      });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSyncAllClick = async () => {
    setIsProcessing(true);
    setFeedback(null);
    try {
      await onSyncAll();
      setFeedback({
        type: 'success',
        message: 'Todos os registros foram sincronizados com sucesso com o Google Sheets!'
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Falha ao sincronizar dados.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePullClick = async () => {
    setIsProcessing(true);
    setFeedback(null);
    try {
      await onPullFromSheet();
      setFeedback({
        type: 'success',
        message: 'Dados importados com sucesso da planilha central!'
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Falha ao importar da planilha.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-auto border border-slate-200 flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg">Vincular Planilha de Inventário</h2>
              <p className="text-xs text-emerald-100">
                Conecte seu arquivo do Google Drive para receber as coletas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Auth State */}
          {!currentUser ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-800 text-sm">
                  1º Passo: Conecte sua conta Google
                </h4>
                <p className="text-xs text-slate-600 mt-1">
                  Faça login para permitir que o app acerte a planilha no seu Google Drive com segurança.
                </p>
              </div>

              {/* Official Google Sign In Button */}
              <button
                type="button"
                onClick={onSignIn}
                className="inline-flex items-center justify-center gap-3 px-5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-700 text-sm font-semibold shadow-sm hover:bg-slate-50 hover:border-slate-400 active:scale-[0.98] transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                <span>Entrar com o Google</span>
              </button>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || ''}
                    className="w-9 h-9 rounded-full ring-2 ring-emerald-500"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm">
                    {currentUser.email?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="text-xs font-semibold text-slate-800">
                    {currentUser.displayName || 'Usuário Google Conectado'}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {currentUser.email}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-200 rounded-lg transition-colors"
                title="Desconectar conta Google"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Feedback Banner */}
          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Active Configured Spreadsheet */}
          {config && config.spreadsheetId ? (
            <div className="bg-emerald-50/70 border border-emerald-300 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 w-max">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Planilha Central Vinculada
                  </span>
                  <h3 className="font-bold text-slate-900 text-base mt-1.5">
                    {config.spreadsheetTitle || 'INVENTÁRIO SME'}
                  </h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 font-mono">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    Aba: <span className="font-bold text-slate-700">{config.sheetName}</span>
                  </p>
                </div>
                <a
                  href={config.spreadsheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <span>Abrir no Google</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Auto Sync Toggle */}
              <div className="pt-2 border-t border-emerald-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-800">
                    Sincronização Automática em Tempo Real
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Cada cadastro ou edição feita no celular é enviada na hora.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleAutoSync(!config.autoSync)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    config.autoSync ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md transform" />
                </button>
              </div>

              {/* Sync Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleSyncAllClick}
                  className="px-3 py-2 bg-white hover:bg-emerald-100/50 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <UploadCloud className="w-4 h-4 text-emerald-600" />
                  Enviar Todos para a Planilha
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handlePullClick}
                  className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <DownloadCloud className="w-4 h-4 text-slate-600" />
                  Baixar Dados da Planilha
                </button>
              </div>
            </div>
          ) : (
            /* Direct guide for the user's specific spreadsheet in the screenshot */
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Como vincular seu arquivo "INVENTÁRIO SME.xlsx" do Google Drive:</span>
              </div>
              <ol className="text-xs text-blue-800 space-y-1.5 pl-5 list-decimal font-medium">
                <li>
                  No Google Drive (na aba ao lado), com o <b>INVENTÁRIO SME.xlsx</b> selecionado, clique no ícone de <b>🔗 Copiar link</b> no topo (ou abra o arquivo no Google Planilhas e copie a URL).
                </li>
                <li>
                  Cole o link no campo <b>Opção A</b> abaixo e clique em <b>Vincular</b>.
                </li>
              </ol>
            </div>
          )}

          {/* Option A: Paste Link from Google Drive */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
              <Link2 className="w-4 h-4 text-emerald-600" />
              <span>Opção A: Colar Link do "INVENTÁRIO SME"</span>
            </div>
            <p className="text-xs text-slate-600">
              Cole o link copiado do Google Drive ou da planilha aberta:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={existingInput}
                onChange={(e) => setExistingInput(e.target.value)}
                placeholder="Ex: https://drive.google.com/file/d/... ou https://docs.google.com/..."
                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
              />
              <button
                type="button"
                disabled={isProcessing || !existingInput.trim() || !currentUser}
                onClick={handleLink}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm whitespace-nowrap"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Vincular
              </button>
            </div>
          </div>

          {/* Option B: Direct File Upload */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                <FileUp className="w-4 h-4 text-indigo-600" />
                <span>Opção B: Carregar arquivo INVENTÁRIO SME.xlsx</span>
              </div>
              <span className="text-[10px] text-indigo-700 bg-indigo-50 font-bold px-2 py-0.5 rounded border border-indigo-200">
                Mais Rápido
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Selecione o arquivo Excel diretamente para carregar todas as linhas e equipamentos no aplicativo:
            </p>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
                id="excel-file-input"
              />
              <label
                htmlFor="excel-file-input"
                className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Selecionar Arquivo INVENTÁRIO SME.xlsx</span>
              </label>
            </div>
          </div>

          {/* Option C: Create New Spreadsheet */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Opção C: Criar Nova Planilha no Google Drive</span>
            </div>
            <p className="text-xs text-slate-600">
              Cria uma nova planilha no seu Google Drive com todas as 19 colunas formatadas:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Título da Planilha"
                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button
                type="button"
                disabled={isProcessing || !currentUser}
                onClick={handleCreate}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                Criar Planilha
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-5 py-3 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-xl transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
