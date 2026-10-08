import React from 'react';
import { InventoryItem, GoogleSheetConfig } from '../types/inventory';
import { hasPendingInfo } from '../utils/inventoryValidation';
import {
  Cpu,
  FileCheck2,
  AlertTriangle,
  Monitor,
  Zap,
  CloudCheck,
  CloudUpload,
  AlertCircle
} from 'lucide-react';

interface DashboardStatsProps {
  items: InventoryItem[];
  config: GoogleSheetConfig | null;
  onOpenSyncModal: () => void;
  onFilterPendingOnly?: () => void;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  items,
  config,
  onOpenSyncModal,
  onFilterPendingOnly
}) => {
  const totalItems = items.length;
  const assinados = items.filter((i) => i.termoAssinado === 'SIM').length;
  const pendentesTermo = totalItems - assinados;
  const pctAssinados = totalItems > 0 ? Math.round((assinados / totalItems) * 100) : 0;

  // Items missing information (yellow cells in the sheet)
  const itensComPendencias = items.filter(hasPendingInfo).length;
  const pctCompletos = totalItems > 0 ? Math.round(((totalItems - itensComPendencias) / totalItems) * 100) : 0;

  const comNobreak = items.filter(
    (i) => i.nobreakModelo && i.nobreakModelo !== '-' && !i.nobreakModelo.includes('NENHUM')
  ).length;

  const dualMonitor = items.filter(
    (i) => i.monitor2Serial && i.monitor2Serial !== '-'
  ).length;

  const pendentesSync = items.filter((i) => !i.syncedToGoogleSheet).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4 mb-6">
      {/* Total Computers */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Equipamentos
          </span>
          <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
            <Cpu className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-900">{totalItems}</span>
          <span className="text-xs text-slate-500 font-medium">estações</span>
        </div>
      </div>

      {/* Yellow Cells / Incomplete Stations KPI */}
      <div
        onClick={onFilterPendingOnly}
        className="bg-amber-50/70 border border-amber-300/80 p-3.5 sm:p-4 rounded-xl shadow-xs hover:bg-amber-100/70 cursor-pointer transition-all group"
        title="Clique para filtrar apenas estações com dados pendentes (células amarelas)"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block animate-ping" />
            Dados Pendentes
          </span>
          <div className="p-1.5 bg-amber-200/80 text-amber-800 rounded-lg group-hover:scale-105 transition-transform">
            <AlertCircle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-amber-700">{itensComPendencias}</span>
          <span className="text-[11px] text-amber-800 font-semibold bg-amber-200/70 px-1.5 py-0.5 rounded">
            Células Amarelas
          </span>
        </div>
        <div className="text-[10px] text-amber-700/80 mt-1 font-medium">
          {itensComPendencias > 0
            ? 'Faltando dados (hostname, cpf, função...)'
            : 'Todas as estações 100% preenchidas!'}
        </div>
      </div>

      {/* Termos Assinados */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Termos Assinados
          </span>
          <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <FileCheck2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-emerald-600">{assinados}</span>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-100/60 px-1.5 py-0.5 rounded">
            {pctAssinados}%
          </span>
        </div>
        <div className="text-[10px] text-slate-500 mt-1">
          {pendentesTermo > 0 ? `${pendentesTermo} termo(s) a colher assinatura` : 'Todos assinados ✓'}
        </div>
      </div>

      {/* Monitores & Nobreaks */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Monitores & Nobreaks
          </span>
          <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <Monitor className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-600 font-medium">
          <span className="flex items-center gap-1">
            <Monitor className="w-3.5 h-3.5 text-indigo-500" />
            <b>{dualMonitor}</b> 2º Monitor
          </span>
          <span className="flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <b>{comNobreak}</b> Nobreak
          </span>
        </div>
      </div>

      {/* Sync Status Card */}
      <div
        onClick={onOpenSyncModal}
        className={`col-span-2 md:col-span-3 lg:col-span-1 p-3.5 sm:p-4 rounded-xl border cursor-pointer transition-all ${
          config?.spreadsheetId
            ? pendentesSync > 0
              ? 'bg-amber-50/70 border-amber-200 hover:bg-amber-100/50'
              : 'bg-emerald-50/70 border-emerald-200 hover:bg-emerald-100/50'
            : 'bg-slate-100 border-slate-300 hover:bg-slate-200'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
            Planilha Nuvem
          </span>
          {config?.spreadsheetId ? (
            pendentesSync > 0 ? (
              <CloudUpload className="w-4 h-4 text-amber-600 animate-bounce" />
            ) : (
              <CloudCheck className="w-4 h-4 text-emerald-600" />
            )
          ) : (
            <CloudUpload className="w-4 h-4 text-slate-400" />
          )}
        </div>
        <div className="mt-2">
          {config?.spreadsheetId ? (
            <div>
              <div className="text-xs font-bold text-slate-800 truncate">
                {config.spreadsheetTitle}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {pendentesSync > 0
                  ? `${pendentesSync} item(ns) pendente(s) de envio`
                  : 'Sincronizado em tempo real ✓'}
              </div>
            </div>
          ) : (
            <div>
              <div className="text-xs font-bold text-slate-700">Conectar Google Sheets</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Clique para vincular planilha</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
