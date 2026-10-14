import React from 'react';
import { InventoryItem } from '../types/inventory';
import { hasPendingInfo, isPrinterItem } from '../utils/inventoryValidation';
import {
  Monitor,
  FileCheck2,
  AlertCircle,
  Zap,
  Printer,
  Laptop
} from 'lucide-react';

interface DashboardStatsProps {
  items: InventoryItem[];
  onFilterPendingOnly?: () => void;
  onSelectCategory?: (category: 'COMPUTADORES' | 'IMPRESSORAS' | 'TODOS') => void;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  items,
  onFilterPendingOnly,
  onSelectCategory
}) => {
  const totalItems = items.length;
  const assinados = items.filter((i) => i.termoAssinado === 'SIM').length;
  const pendentesTermo = totalItems - assinados;
  const pctAssinados = totalItems > 0 ? Math.round((assinados / totalItems) * 100) : 0;

  // Pending information
  const itensComPendencias = items.filter(hasPendingInfo).length;

  const comNobreak = items.filter(
    (i) => i.nobreakModelo && i.nobreakModelo !== '-' && !i.nobreakModelo.includes('NENHUM')
  ).length;

  const dualMonitor = items.filter(
    (i) => i.monitor2Serial && i.monitor2Serial !== '-'
  ).length;

  const impressoras = items.filter(isPrinterItem).length;
  const estacoes = totalItems - impressoras;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {/* 1. Total Equipamentos */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total de Ativos
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Monitor className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {totalItems}
            </span>
            <span className="text-xs text-slate-500 font-medium">equipamentos</span>
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600 font-medium">
          <button
            type="button"
            onClick={() => onSelectCategory?.('COMPUTADORES')}
            className="flex items-center gap-1 hover:text-blue-700 hover:underline transition-colors"
            title="Ver somente computadores e notebooks"
          >
            <Laptop className="w-3 h-3 text-blue-500" />
            <span>{estacoes} computadores</span>
          </button>
          <span className="text-slate-300">•</span>
          <button
            type="button"
            onClick={() => onSelectCategory?.('IMPRESSORAS')}
            className="flex items-center gap-1 hover:text-purple-700 hover:underline transition-colors font-semibold text-purple-700"
            title="Ver somente impressoras e multifuncionais"
          >
            <Printer className="w-3 h-3 text-purple-500" />
            <span>{impressoras} impressoras</span>
          </button>
        </div>
      </div>

      {/* 2. Pendências Cadastrais */}
      <div
        onClick={onFilterPendingOnly}
        className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs hover:border-amber-300 transition-all cursor-pointer group flex flex-col justify-between"
        title="Clique para filtrar equipamentos com dados incompletos"
      >
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Pendências Cadastrais
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 tracking-tight">
              {itensComPendencias}
            </span>
            <span className="text-[11px] font-semibold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-md">
              Requer atenção
            </span>
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 truncate">
          {itensComPendencias > 0
            ? 'Aguardando preenchimento completo'
            : 'Todos os cadastros completos ✓'}
        </div>
      </div>

      {/* 3. Termos de Responsabilidade */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Termos Assinados
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 tracking-tight">
              {assinados}
            </span>
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md">
              {pctAssinados}%
            </span>
          </div>
        </div>
        <div>
          <div className="mt-2.5 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${pctAssinados}%` }}
            />
          </div>
          <div className="mt-1.5 pt-1 text-[10px] text-slate-500 flex justify-between font-medium">
            <span>{assinados} assinados</span>
            <span>{pendentesTermo} pendentes</span>
          </div>
        </div>
      </div>

      {/* 4. Periféricos & Proteção */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Periféricos & Proteção
          </span>
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Zap className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2.5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-600 font-medium">
              <Monitor className="w-3.5 h-3.5 text-indigo-500" />
              2º Monitor Adicional
            </span>
            <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
              {dualMonitor}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-600 font-medium">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              Nobreak / Módulo Isolador
            </span>
            <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
              {comNobreak}
            </span>
          </div>
        </div>
        <div className="mt-2.5 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
          Infraestrutura de proteção elétrica
        </div>
      </div>
    </div>
  );
};
