import React from 'react';
import {
  Cpu,
  Plus,
  FileSpreadsheet,
  CloudCheck,
  CloudUpload,
  RefreshCw,
  LogOut,
  ExternalLink
} from 'lucide-react';
import { GoogleSheetConfig, SyncStatus } from '../types/inventory';
import { User } from 'firebase/auth';

interface NavbarProps {
  currentUser: User | null;
  config: GoogleSheetConfig | null;
  syncStatus: SyncStatus;
  onOpenNewItem: () => void;
  onOpenSyncModal: () => void;
  onQuickSync: () => void;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  config,
  syncStatus,
  onOpenNewItem,
  onOpenSyncModal,
  onQuickSync,
  onSignIn,
  onSignOut
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight leading-none">
                Inventário TI
              </h1>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold text-blue-700 bg-blue-50 rounded-full border border-blue-200 uppercase tracking-wider">
                Mobile & Web
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block leading-tight mt-0.5">
              Coleta de estações de trabalho e alimentação central
            </p>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Cloud Sheet Status pill */}
          <button
            type="button"
            onClick={onOpenSyncModal}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              config?.spreadsheetId
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100/60'
                : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100/60'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="hidden md:inline">
              {config?.spreadsheetId ? config.spreadsheetTitle : 'Conectar Planilha'}
            </span>
            <span className="md:hidden">
              {config?.spreadsheetId ? 'Planilha OK' : 'Planilha'}
            </span>
            {config?.spreadsheetId && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
            )}
          </button>

          {/* Quick sync button if connected */}
          {config?.spreadsheetId && (
            <button
              type="button"
              disabled={syncStatus.isSyncing}
              onClick={onQuickSync}
              className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
              title="Sincronizar com Google Sheets agora"
            >
              <RefreshCw
                className={`w-4 h-4 ${syncStatus.isSyncing ? 'animate-spin text-blue-600' : ''}`}
              />
            </button>
          )}

          {/* Google Auth Button or User Badge */}
          {!currentUser ? (
            <button
              type="button"
              onClick={onSignIn}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              <span>Entrar</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || ''}
                  className="w-8 h-8 rounded-full ring-2 ring-emerald-500/50"
                  title={currentUser.email || ''}
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs"
                  title={currentUser.email || ''}
                >
                  {currentUser.email?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          )}

          {/* Primary CTA: Novo Equipamento */}
          <button
            type="button"
            onClick={onOpenNewItem}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-blue-600/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo Equipamento</span>
            <span className="sm:hidden">Coletar</span>
          </button>
        </div>
      </div>
    </header>
  );
};
