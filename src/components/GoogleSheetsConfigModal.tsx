import React, { useState, useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  DownloadCloud,
  Layers,
  Link2,
  FileUp,
  HelpCircle,
  Info
} from 'lucide-react';
import { GoogleSheetConfig, SyncStatus } from '../types/inventory';

interface GoogleSheetsConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: GoogleSheetConfig | null;
  syncStatus: SyncStatus;
  onLinkExistingSheet: (idOrUrl: string) => Promise<void>;
  onSyncAll: () => Promise<void>;
  onPullFromSheet: () => Promise<void>;
  onToggleAutoSync: (enabled: boolean) => void;
  onImportXlsxFile: (file: File) => Promise<any>;
}

export const GoogleSheetsConfigModal: React.FC<GoogleSheetsConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  syncStatus,
  onLinkExistingSheet,
  onSyncAll,
  onPullFromSheet,
  onToggleAutoSync,
  onImportXlsxFile
}) => {
  const [existingInput, setExistingInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

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
      const stats = await onImportXlsxFile(file);
      const detailMsg = stats?.updatedCount !== undefined
        ? ` (${stats.updatedCount} registros atualizados, ${stats.addedCount} novos incluídos • Total: ${stats.totalItems} equipamentos sem duplicatas)`
        : '';
      setFeedback({
        type: 'success',
        message: `Planilha "${file.name}" processada com sucesso!${detailMsg}`
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
                disabled={isProcessing || !existingInput.trim()}
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
              Selecione o arquivo Excel diretamente para varrer todas as abas (computadores e impressoras) e atualizar todos os valores no sistema:
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
