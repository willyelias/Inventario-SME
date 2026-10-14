import React from 'react';
import {
  Monitor,
  Plus,
  FileSpreadsheet,
  RefreshCw
} from 'lucide-react';
import { GoogleSheetConfig, SyncStatus } from '../types/inventory';

interface NavbarProps {
  config: GoogleSheetConfig | null;
  syncStatus: SyncStatus;
  onOpenNewItem: () => void;
  onOpenSyncModal: () => void;
  onQuickSync: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  config,
  syncStatus,
  onOpenNewItem,
  onOpenSyncModal,
  onQuickSync
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs shrink-0">
            <Monitor className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base sm:text-lg text-slate-900 tracking-tight leading-none">
                Inventário TI
              </h1>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold text-slate-600 bg-slate-100 rounded-md border border-slate-200">
                SME
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block leading-tight mt-0.5">
              Gestão Centralizada de Equipamentos e Ativos
            </p>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Cloud Sheet Status */}
          <button
            type="button"
            onClick={onOpenSyncModal}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              config?.spreadsheetId
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100/70 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-2xs'
            }`}
          >
            <FileSpreadsheet
              className={`w-3.5 h-3.5 ${
                config?.spreadsheetId ? 'text-emerald-600' : 'text-slate-500'
              }`}
            />
            <span className="hidden md:inline">
              {config?.spreadsheetId ? config.spreadsheetTitle : 'Conectar Planilha'}
            </span>
            <span className="md:hidden">
              {config?.spreadsheetId ? 'Planilha' : 'Planilha'}
            </span>
            {config?.spreadsheetId && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
            )}
          </button>

          {/* Quick sync button if connected */}
          {config?.spreadsheetId && (
            <button
              type="button"
              disabled={syncStatus.isSyncing}
              onClick={onQuickSync}
              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
              title="Sincronizar com Google Sheets agora"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${syncStatus.isSyncing ? 'animate-spin text-blue-600' : ''}`}
              />
            </button>
          )}

          {/* Primary CTA: Novo Equipamento */}
          <button
            type="button"
            onClick={onOpenNewItem}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs sm:text-sm font-semibold shadow-xs shadow-blue-500/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Novo Equipamento</span>
            <span className="sm:hidden">Novo</span>
          </button>
        </div>
      </div>
    </header>
  );
};
