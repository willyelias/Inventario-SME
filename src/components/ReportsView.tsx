import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Printer,
  FileText,
  Filter,
  CheckSquare,
  Square,
  Trash2,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Search,
  Monitor,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Building2,
  HardDrive,
  Layers,
  ArrowLeft,
  X,
  FileCheck2,
  Eye,
  Settings2
} from 'lucide-react';
import { InventoryItem } from '../types/inventory';
import { isPrinterItem, hasPendingInfo } from '../utils/inventoryValidation';

interface ReportsViewProps {
  items: InventoryItem[];
  onBackToInventory: () => void;
  onEditItem?: (item: InventoryItem) => void;
}

export type ReportCategory = 'TODOS' | 'COMPUTADORES' | 'IMPRESSORAS';
export type ReportTermo = 'TODOS' | 'SIM' | 'NAO';
export type ReportOrientation = 'landscape' | 'portrait';

export interface ColumnConfig {
  key: string;
  label: string;
  enabled: boolean;
  minWidth?: string;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  items,
  onBackToInventory,
  onEditItem
}) => {
  // Sub-tab: 'charts' (Gráficos & Estatísticas) vs 'print' (Relatório Customizado & Impressão)
  const [activeSubTab, setActiveSubTab] = useState<'charts' | 'print'>('charts');

  // Print Report Configuration State
  const [reportTitle, setReportTitle] = useState('RELATÓRIO GERAL DE ATIVOS E EQUIPAMENTOS DE TI');
  const [reportSubtitle, setReportSubtitle] = useState('Secretaria Municipal de Educação - Departamento de Tecnologia da Informação (SME Natal)');
  const [reportNotes, setReportNotes] = useState('');
  const [orientation, setOrientation] = useState<ReportOrientation>('landscape');
  const [includeSummaryCards, setIncludeSummaryCards] = useState(true);
  const [includeSignatureFields, setIncludeSignatureFields] = useState(true);
  const [showConfigPanel, setShowConfigPanel] = useState(true);

  // Filters for the Report
  const [filterCategory, setFilterCategory] = useState<ReportCategory>('TODOS');
  const [filterSetor, setFilterSetor] = useState<string>('TODOS');
  const [filterTermo, setFilterTermo] = useState<ReportTermo>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');

  // Manually excluded item IDs (allows user to remove specific rows from print preview)
  const [excludedItemIds, setExcludedItemIds] = useState<Set<string>>(new Set());

  // Columns Configuration for Print
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { key: 'itemNumber', label: '#', enabled: true, minWidth: '40px' },
    { key: 'setor', label: 'Setor', enabled: true, minWidth: '80px' },
    { key: 'sala', label: 'Sala', enabled: true, minWidth: '50px' },
    { key: 'marcaModelo', label: 'Equipamento', enabled: true, minWidth: '120px' },
    { key: 'nome', label: 'Host / Máquina', enabled: true, minWidth: '100px' },
    { key: 'serial', label: 'Serial PC / Impressora', enabled: true, minWidth: '110px' },
    { key: 'monitores', label: 'Monitores', enabled: true, minWidth: '120px' },
    { key: 'nobreak', label: 'Proteção Elétrica', enabled: true, minWidth: '110px' },
    { key: 'responsavel', label: 'Responsável', enabled: true, minWidth: '130px' },
    { key: 'matriculaCargo', label: 'Matrícula / Cargo', enabled: false, minWidth: '110px' },
    { key: 'termoAssinado', label: 'Termo', enabled: true, minWidth: '60px' },
    { key: 'observacoes', label: 'Patrimônio / Obs', enabled: false, minWidth: '120px' }
  ]);

  // All distinct sectors
  const allSetores = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      const s = (i.setor || '').trim();
      if (s && s !== '-') set.add(s);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  // Overall Statistics Metrics
  const stats = useMemo(() => {
    const total = items.length;
    const impressoras = items.filter(isPrinterItem).length;
    const computadores = total - impressoras;
    const termosAssinados = items.filter((i) => !isPrinterItem(i) && i.termoAssinado === 'SIM').length;
    const computadoresTotal = computadores;
    const percentTermo = computadoresTotal > 0 ? Math.round((termosAssinados / computadoresTotal) * 100) : 0;
    const pendencias = items.filter(hasPendingInfo).length;
    const dualMonitor = items.filter((i) => !isPrinterItem(i) && i.monitor2Serial && i.monitor2Serial !== '-').length;
    const comNobreak = items.filter((i) => i.nobreakModelo && i.nobreakModelo !== '-' && !i.nobreakModelo.toUpperCase().includes('NENHUM')).length;

    // Top Setores
    const setorMap: Record<string, { total: number; pcs: number; imp: number }> = {};
    items.forEach((i) => {
      const s = (i.setor || 'NÃO INFORMADO').trim().toUpperCase();
      if (!setorMap[s]) setorMap[s] = { total: 0, pcs: 0, imp: 0 };
      setorMap[s].total++;
      if (isPrinterItem(i)) {
        setorMap[s].imp++;
      } else {
        setorMap[s].pcs++;
      }
    });

    const topSetores = Object.entries(setorMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total);

    // Distribution by Brand
    const brandMap: Record<string, number> = {};
    items.forEach((i) => {
      let b = (i.marca || 'OUTRAS').trim().toUpperCase();
      if (b === '-' || !b) b = 'NÃO IDENTIFICADA';
      brandMap[b] = (brandMap[b] || 0) + 1;
    });

    const topBrands = Object.entries(brandMap)
      .map(([name, count]) => ({ name, count, percent: Math.round((count / (total || 1)) * 100) }))
      .sort((a, b) => b.count - a.count);

    return {
      total,
      computadores,
      impressoras,
      percentPcs: total > 0 ? Math.round((computadores / total) * 100) : 0,
      percentImp: total > 0 ? Math.round((impressoras / total) * 100) : 0,
      termosAssinados,
      termosPendentes: computadores - termosAssinados,
      percentTermo,
      pendencias,
      dualMonitor,
      comNobreak,
      topSetores,
      topBrands
    };
  }, [items]);

  // Filtered Items for Print Preview
  const printableItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Excluded manually by user in preview
      if (excludedItemIds.has(item.id)) return false;

      // 2. Category Filter
      const isPrinter = isPrinterItem(item);
      if (filterCategory === 'COMPUTADORES' && isPrinter) return false;
      if (filterCategory === 'IMPRESSORAS' && !isPrinter) return false;

      // 3. Sector Filter
      if (filterSetor !== 'TODOS') {
        const itemSetor = (item.setor || '').trim().toUpperCase();
        if (itemSetor !== filterSetor.toUpperCase()) return false;
      }

      // 4. Termo Filter
      if (filterTermo === 'SIM' && item.termoAssinado !== 'SIM') return false;
      if (filterTermo === 'NAO' && item.termoAssinado === 'SIM') return false;

      // 5. Search Filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const str = [
          item.nome,
          item.serial,
          item.responsavel,
          item.setor,
          item.sala,
          item.marca,
          item.modelo,
          item.matriculaCpf,
          item.observacoes
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!str.includes(q)) return false;
      }

      return true;
    });
  }, [items, excludedItemIds, filterCategory, filterSetor, filterTermo, searchTerm]);

  // Toggle Column
  const toggleColumn = (key: string) => {
    setColumns((prev) =>
      prev.map((c) => (c.key === key ? { ...c, enabled: !c.enabled } : c))
    );
  };

  // Remove single item from report
  const handleRemoveItem = (id: string) => {
    setExcludedItemIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  // Restore all excluded items
  const handleRestoreAll = () => {
    setExcludedItemIds(new Set());
  };

  // Trigger Native Print Dialog
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Navigation & View Switcher (Screen Only) */}
      <div className="no-print bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToInventory}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
            title="Voltar à lista de inventário"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Relatórios, Estatísticas & Impressão
              </h2>
              <span className="px-2 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                SME Natal
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Análise gráfica da infraestrutura e gerador de relatórios personalizados para impressão oficial
            </p>
          </div>
        </div>

        {/* View Mode Buttons */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveSubTab('charts')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'charts'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Gráficos & Estatísticas</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('print')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'print'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Relatório & Impressão</span>
              {excludedItemIds.size > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500" title="Itens customizados" />
              )}
            </button>
          </div>

          {activeSubTab === 'print' && (
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-600/30 transition-all active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4 stroke-[2.5]" />
              <span>Imprimir / Salvar PDF</span>
            </button>
          )}
        </div>
      </div>

      {/* SUB-TAB 1: GRÁFICOS & ESTATÍSTICAS */}
      {activeSubTab === 'charts' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total de Ativos</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{stats.total}</p>
              <span className="text-[10px] text-slate-400 mt-0.5 block">100% dos equipamentos</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider block">Computadores</span>
              <p className="text-2xl font-black text-blue-700 mt-1">{stats.computadores}</p>
              <span className="text-[10px] text-blue-600/80 font-medium mt-0.5 block">{stats.percentPcs}% do total</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider block">Impressoras</span>
              <p className="text-2xl font-black text-purple-700 mt-1">{stats.impressoras}</p>
              <span className="text-[10px] text-purple-600/80 font-medium mt-0.5 block">{stats.percentImp}% do total</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block">Termos Assinados</span>
              <p className="text-2xl font-black text-emerald-700 mt-1">{stats.termosAssinados}</p>
              <span className="text-[10px] text-emerald-600/80 font-medium mt-0.5 block">{stats.percentTermo}% de adesão</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider block">2º Monitor</span>
              <p className="text-2xl font-black text-indigo-700 mt-1">{stats.dualMonitor}</p>
              <span className="text-[10px] text-indigo-600/80 font-medium mt-0.5 block">Estações c/ tela dupla</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider block">Com No-break</span>
              <p className="text-2xl font-black text-amber-700 mt-1">{stats.comNobreak}</p>
              <span className="text-[10px] text-amber-600/80 font-medium mt-0.5 block">Proteção elétrica</span>
            </div>
          </div>

          {/* Charts Row 1: Donut (PCs vs Impressoras) + Top Brands */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Chart 1: Donut Proportion */}
            <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900">Proporção por Categoria</h3>
                  <p className="text-xs text-slate-500">Distribuição entre computadores e impressoras</p>
                </div>
                <Layers className="w-4 h-4 text-slate-400" />
              </div>

              <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-6 py-6">
                {/* SVG Donut Chart */}
                <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    {/* Background circle */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      className="text-slate-100"
                      strokeWidth="12"
                      stroke="currentColor"
                      fill="transparent"
                    />
                    {/* PCs Arc */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      stroke="#2563eb"
                      strokeWidth="12"
                      strokeDasharray={`${stats.percentPcs * 2.387} 238.7`}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-1000 ease-out"
                    />
                    {/* Printers Arc */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      stroke="#9333ea"
                      strokeWidth="12"
                      strokeDasharray={`${stats.percentImp * 2.387} 238.7`}
                      strokeDashoffset={`-${stats.percentPcs * 2.387}`}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-black text-slate-900">{stats.total}</span>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Ativos</span>
                  </div>
                </div>

                {/* Legend & Percentages */}
                <div className="space-y-3 w-full sm:w-auto">
                  <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center justify-between sm:justify-start gap-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-3.5 h-3.5 rounded-md bg-blue-600" />
                      <div>
                        <p className="text-xs font-bold text-blue-950">Computadores</p>
                        <p className="text-[11px] text-blue-700/80">{stats.computadores} unidades</p>
                      </div>
                    </div>
                    <span className="text-sm font-black text-blue-700 sm:ml-auto">{stats.percentPcs}%</span>
                  </div>

                  <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-100 flex items-center justify-between sm:justify-start gap-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-3.5 h-3.5 rounded-md bg-purple-600" />
                      <div>
                        <p className="text-xs font-bold text-purple-950">Impressoras</p>
                        <p className="text-[11px] text-purple-700/80">{stats.impressoras} unidades</p>
                      </div>
                    </div>
                    <span className="text-sm font-black text-purple-700 sm:ml-auto">{stats.percentImp}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Chart 2: Top Brands */}
            <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900">Distribuição por Fabricante / Marca</h3>
                  <p className="text-xs text-slate-500">Fabricantes com maior presença no parque computacional</p>
                </div>
                <HardDrive className="w-4 h-4 text-slate-400" />
              </div>

              <div className="flex-1 space-y-3.5 py-4">
                {stats.topBrands.slice(0, 6).map((brand) => (
                  <div key={brand.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">{brand.name}</span>
                      <span className="text-slate-500 font-semibold">
                        {brand.count} equipamentos ({brand.percent}%)
                      </span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-700"
                        style={{ width: `${Math.max(brand.percent, 3)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Charts Row 2: Top Setores */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900">Equipamentos por Setor (Top Setores)</h3>
                <p className="text-xs text-slate-500">Concentração de computadores e impressoras nas secretarias e departamentos</p>
              </div>
              <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-700 w-fit">
                {stats.topSetores.length} setores mapeados
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 pt-4">
              {stats.topSetores.slice(0, 12).map((setor, idx) => {
                const maxCount = stats.topSetores[0]?.total || 1;
                const percentOfMax = Math.round((setor.total / maxCount) * 100);

                return (
                  <div key={setor.name} className="space-y-1.5 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        {setor.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-blue-600 font-medium">{setor.pcs} PCs</span>
                        {setor.imp > 0 && (
                          <span className="text-[11px] text-purple-600 font-medium">{setor.imp} Imp</span>
                        )}
                        <span className="font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                          {setor.total}
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 rounded-full transition-all duration-700"
                        style={{ width: `${percentOfMax}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Action to Print */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="text-base font-bold flex items-center justify-center sm:justify-start gap-2">
                <Printer className="w-5 h-5 text-blue-400" />
                Precisa de um relatório impresso ou salvar em PDF?
              </h4>
              <p className="text-xs text-blue-200">
                Personalize títulos, colunas, filtros e visualize na folha A4 em tempo real antes de imprimir.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveSubTab('print')}
              className="px-5 py-2.5 bg-white hover:bg-blue-50 text-blue-900 rounded-xl text-xs sm:text-sm font-bold shadow-lg transition-all active:scale-95 shrink-0"
            >
              Abrir Relatório Customizável →
            </button>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: RELATÓRIO CUSTOMIZÁVEL & IMPRESSÃO WYSIWYG */}
      {activeSubTab === 'print' && (
        <div className="space-y-6">
          {/* Customization Control Panel (Screen Only - Hidden on Print) */}
          <div className="no-print bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div
              className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between cursor-pointer"
              onClick={() => setShowConfigPanel(!showConfigPanel)}
            >
              <div className="flex items-center gap-2.5">
                <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Personalizar Relatório de Impressão</h3>
                  <p className="text-xs text-slate-500">
                    Ajuste filtros, escolha quais colunas exibir e adicione notas oficiais
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                  {printableItems.length} equipamentos selecionados
                </span>
                {showConfigPanel ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </div>

            {showConfigPanel && (
              <div className="p-5 space-y-6 animate-in slide-in-from-top-2 duration-200">
                {/* Row 1: Document Metadata (Editable Title, Subtitle, Notes) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Título do Relatório
                    </label>
                    <input
                      type="text"
                      value={reportTitle}
                      onChange={(e) => setReportTitle(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: RELATÓRIO DE INVENTÁRIO TI"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Órgão / Departamento Emissor
                    </label>
                    <input
                      type="text"
                      value={reportSubtitle}
                      onChange={(e) => setReportSubtitle(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: Secretaria Municipal de Educação - SME"
                    />
                  </div>
                </div>

                {/* Row 2: Filters (Category, Setor, Termo, Search) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
                  {/* Category Filter */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Categoria
                    </label>
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value as ReportCategory)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="TODOS">Todos os Equipamentos ({items.length})</option>
                      <option value="COMPUTADORES">Apenas Computadores ({stats.computadores})</option>
                      <option value="IMPRESSORAS">Apenas Impressoras ({stats.impressoras})</option>
                    </select>
                  </div>

                  {/* Sector Filter */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Setor / Departamento
                    </label>
                    <select
                      value={filterSetor}
                      onChange={(e) => setFilterSetor(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="TODOS">Todos os Setores ({allSetores.length})</option>
                      {allSetores.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Termo Filter */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Termo Assinado
                    </label>
                    <select
                      value={filterTermo}
                      onChange={(e) => setFilterTermo(e.target.value as ReportTermo)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="TODOS">Todos os Status</option>
                      <option value="SIM">Apenas Assinados (SIM)</option>
                      <option value="NAO">Apenas Pendentes (NÃO)</option>
                    </select>
                  </div>

                  {/* Search Filter */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Filtrar por Texto
                    </label>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Serial, host, responsável..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 3: Columns Selector (Checkboxes) */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Colunas Incluídas na Impressão:
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Marque ou desmarque para ajustar a largura do papel
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {columns.map((col) => (
                      <button
                        key={col.key}
                        type="button"
                        onClick={() => toggleColumn(col.key)}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-left text-xs transition-all ${
                          col.enabled
                            ? 'bg-blue-50/80 border-blue-200 text-blue-900 font-semibold'
                            : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        {col.enabled ? (
                          <CheckSquare className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                        )}
                        <span className="truncate">{col.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Row 4: Page Layout & Signature Options */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={includeSummaryCards}
                      onChange={(e) => setIncludeSummaryCards(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Incluir Mini-Resumo com Totais no Cabeçalho</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={includeSignatureFields}
                      onChange={(e) => setIncludeSignatureFields(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Incluir Campos de Assinatura Oficial no Rodapé</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-semibold">Orientação:</span>
                    <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                      <button
                        type="button"
                        onClick={() => setOrientation('landscape')}
                        className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
                          orientation === 'landscape' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500'
                        }`}
                      >
                        Paisagem (A4)
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrientation('portrait')}
                        className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
                          orientation === 'portrait' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500'
                        }`}
                      >
                        Retrato (A4)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Notes Input */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Nota / Observação Administrativa (Opcional)
                  </label>
                  <input
                    type="text"
                    value={reportNotes}
                    onChange={(e) => setReportNotes(e.target.value)}
                    placeholder="Ex: Levantamento patrimonial realizado para conferência anual de ativos de TI..."
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Helper Bar (Screen Only) */}
          <div className="no-print flex flex-col sm:flex-row items-center justify-between gap-3 px-2 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <Eye className="w-4 h-4 text-slate-400" />
              <span>
                <strong>Prévia da Folha A4 em Tempo Real:</strong> Você pode remover qualquer linha clicando no botão vermelho à direita da tabela.
              </span>
            </div>

            <div className="flex items-center gap-2">
              {excludedItemIds.size > 0 && (
                <button
                  type="button"
                  onClick={handleRestoreAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg font-bold transition-all shadow-2xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restaurar {excludedItemIds.size} itens removidos</span>
                </button>
              )}

              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-600/30 transition-all active:scale-95"
              >
                <Printer className="w-4 h-4 stroke-[2.5]" />
                <span>Imprimir Relatório</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* THE OFFICIAL PRINTABLE A4 SHEET (WYSIWYG LIVE PREVIEW + PRINT CONTAINER) */}
          {/* ========================================================================= */}
          <div
            id="printable-report-area"
            className={`bg-white text-slate-900 mx-auto shadow-xl rounded-sm border border-slate-300 p-6 sm:p-10 transition-all print:p-0 print:border-none print:shadow-none ${
              orientation === 'landscape' ? 'max-w-[1200px]' : 'max-w-[850px]'
            }`}
          >
            {/* Document Header */}
            <div className="border-b-2 border-slate-900 pb-4 mb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xl shrink-0 print:border print:border-black">
                    SME
                  </div>
                  <div>
                    <h1 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight leading-tight">
                      {reportTitle}
                    </h1>
                    <p className="text-xs font-semibold text-slate-600 mt-0.5">
                      {reportSubtitle}
                    </p>
                  </div>
                </div>

                <div className="text-right text-[11px] text-slate-600 shrink-0">
                  <p className="font-bold text-slate-900">
                    Emissão: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-slate-500">
                    Total Listado: <strong>{printableItems.length} equipamentos</strong>
                  </p>
                  {filterSetor !== 'TODOS' && (
                    <p className="text-blue-800 font-bold uppercase mt-0.5">
                      Filtro Setor: {filterSetor}
                    </p>
                  )}
                </div>
              </div>

              {/* Optional Administrative Note */}
              {reportNotes && (
                <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 italic">
                  <strong>Observação:</strong> {reportNotes}
                </div>
              )}
            </div>

            {/* Optional Summary KPI Strip in Print */}
            {includeSummaryCards && (
              <div className="grid grid-cols-4 gap-2 mb-4 print:border-b print:border-slate-300 print:pb-3">
                <div className="p-2 border border-slate-200 rounded bg-slate-50 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Listado</span>
                  <span className="text-sm font-black text-slate-900">{printableItems.length}</span>
                </div>
                <div className="p-2 border border-slate-200 rounded bg-slate-50 text-center">
                  <span className="text-[10px] uppercase font-bold text-blue-700 block">Computadores</span>
                  <span className="text-sm font-black text-blue-900">
                    {printableItems.filter((i) => !isPrinterItem(i)).length}
                  </span>
                </div>
                <div className="p-2 border border-slate-200 rounded bg-slate-50 text-center">
                  <span className="text-[10px] uppercase font-bold text-purple-700 block">Impressoras</span>
                  <span className="text-sm font-black text-purple-900">
                    {printableItems.filter(isPrinterItem).length}
                  </span>
                </div>
                <div className="p-2 border border-slate-200 rounded bg-slate-50 text-center">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">Termos Assinados</span>
                  <span className="text-sm font-black text-emerald-900">
                    {printableItems.filter((i) => !isPrinterItem(i) && i.termoAssinado === 'SIM').length}
                  </span>
                </div>
              </div>
            )}

            {/* Empty State in Print Preview */}
            {printableItems.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="font-bold text-sm text-slate-600">Nenhum equipamento selecionado para este relatório.</p>
                <p className="text-xs text-slate-400 mt-1">Ajuste os filtros ou clique em "Restaurar Itens".</p>
                {excludedItemIds.size > 0 && (
                  <button
                    type="button"
                    onClick={handleRestoreAll}
                    className="mt-3 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold"
                  >
                    Restaurar {excludedItemIds.size} itens removidos
                  </button>
                )}
              </div>
            ) : (
              /* Printable Table */
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-800 bg-slate-100 text-slate-900 font-bold uppercase text-[10px]">
                      {columns.find((c) => c.key === 'itemNumber')?.enabled && (
                        <th className="py-2 px-1.5 text-center w-8">#</th>
                      )}
                      {columns.find((c) => c.key === 'setor')?.enabled && (
                        <th className="py-2 px-2">Setor</th>
                      )}
                      {columns.find((c) => c.key === 'sala')?.enabled && (
                        <th className="py-2 px-1.5 text-center w-12">Sala</th>
                      )}
                      {columns.find((c) => c.key === 'marcaModelo')?.enabled && (
                        <th className="py-2 px-2">Equipamento</th>
                      )}
                      {columns.find((c) => c.key === 'nome')?.enabled && (
                        <th className="py-2 px-2">Host / Nome</th>
                      )}
                      {columns.find((c) => c.key === 'serial')?.enabled && (
                        <th className="py-2 px-2">Serial</th>
                      )}
                      {columns.find((c) => c.key === 'monitores')?.enabled && (
                        <th className="py-2 px-2">Monitores</th>
                      )}
                      {columns.find((c) => c.key === 'nobreak')?.enabled && (
                        <th className="py-2 px-2">Proteção</th>
                      )}
                      {columns.find((c) => c.key === 'responsavel')?.enabled && (
                        <th className="py-2 px-2">Responsável</th>
                      )}
                      {columns.find((c) => c.key === 'matriculaCargo')?.enabled && (
                        <th className="py-2 px-2">Matrícula / Cargo</th>
                      )}
                      {columns.find((c) => c.key === 'termoAssinado')?.enabled && (
                        <th className="py-2 px-1.5 text-center w-12">Termo</th>
                      )}
                      {columns.find((c) => c.key === 'observacoes')?.enabled && (
                        <th className="py-2 px-2">Obs / Patrimônio</th>
                      )}
                      {/* Action column (Remove from report) - SCREEN ONLY */}
                      <th className="py-2 px-1 text-center w-8 no-print text-[9px] text-slate-400">
                        Remover
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {printableItems.map((item, idx) => {
                      const isPrinter = isPrinterItem(item);

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-blue-50/40 transition-colors even:bg-slate-50/70 print-avoid-break"
                        >
                          {/* Item # */}
                          {columns.find((c) => c.key === 'itemNumber')?.enabled && (
                            <td className="py-1.5 px-1.5 text-center font-bold text-slate-700">
                              {item.itemNumber || idx + 1}
                            </td>
                          )}

                          {/* Setor */}
                          {columns.find((c) => c.key === 'setor')?.enabled && (
                            <td className="py-1.5 px-2 font-bold text-slate-900">
                              {item.setor || '-'}
                            </td>
                          )}

                          {/* Sala */}
                          {columns.find((c) => c.key === 'sala')?.enabled && (
                            <td className="py-1.5 px-1.5 text-center text-slate-700">
                              {item.sala || '-'}
                            </td>
                          )}

                          {/* Equipamento (Marca e Modelo) */}
                          {columns.find((c) => c.key === 'marcaModelo')?.enabled && (
                            <td className="py-1.5 px-2">
                              <span className="font-bold text-slate-900 block leading-tight">
                                {item.marca || '-'}
                              </span>
                              <span className="text-[10px] text-slate-500 block leading-tight">
                                {item.modelo || '-'}
                              </span>
                            </td>
                          )}

                          {/* Host / Nome */}
                          {columns.find((c) => c.key === 'nome')?.enabled && (
                            <td className="py-1.5 px-2 font-mono text-[10px] font-semibold text-slate-800">
                              {item.nome || (isPrinter ? 'IMPRESSORA' : '-')}
                            </td>
                          )}

                          {/* Serial */}
                          {columns.find((c) => c.key === 'serial')?.enabled && (
                            <td className="py-1.5 px-2 font-mono text-[10px] font-bold text-slate-900">
                              {item.serial || '-'}
                            </td>
                          )}

                          {/* Monitores */}
                          {columns.find((c) => c.key === 'monitores')?.enabled && (
                            <td className="py-1.5 px-2 text-[10px] leading-tight">
                              {isPrinter ? (
                                <span className="text-slate-400">-</span>
                              ) : (
                                <div>
                                  {item.monitor1Serial && item.monitor1Serial !== '-' ? (
                                    <span className="block font-mono text-slate-800">
                                      M1: {item.monitor1Serial} ({item.monitor1Marca || '-'})
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 block">Sem monitor</span>
                                  )}
                                  {item.monitor2Serial && item.monitor2Serial !== '-' && (
                                    <span className="block font-mono text-indigo-700 font-semibold">
                                      M2: {item.monitor2Serial}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                          )}

                          {/* Proteção Elétrica */}
                          {columns.find((c) => c.key === 'nobreak')?.enabled && (
                            <td className="py-1.5 px-2 text-[10px] leading-tight">
                              {item.nobreakModelo && item.nobreakModelo !== '-' ? (
                                <div>
                                  <span className="font-semibold text-slate-800 block">
                                    {item.nobreakModelo}
                                  </span>
                                  {item.nobreakSerial && item.nobreakSerial !== '-' && (
                                    <span className="font-mono text-slate-500 text-[9px] block">
                                      S/N: {item.nobreakSerial}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                          )}

                          {/* Responsável */}
                          {columns.find((c) => c.key === 'responsavel')?.enabled && (
                            <td className="py-1.5 px-2 font-semibold text-slate-800">
                              {item.responsavel && item.responsavel !== '-' ? (
                                item.responsavel
                              ) : (
                                <span className="text-slate-400 italic">Não informado</span>
                              )}
                            </td>
                          )}

                          {/* Matrícula / Cargo */}
                          {columns.find((c) => c.key === 'matriculaCargo')?.enabled && (
                            <td className="py-1.5 px-2 text-[10px]">
                              {item.matriculaCpf && item.matriculaCpf !== '-' && (
                                <span className="block font-mono text-slate-700">
                                  Matr: {item.matriculaCpf}
                                </span>
                              )}
                              {item.funcao && item.funcao !== '-' && (
                                <span className="block text-slate-500">
                                  {item.funcao}
                                </span>
                              )}
                            </td>
                          )}

                          {/* Termo */}
                          {columns.find((c) => c.key === 'termoAssinado')?.enabled && (
                            <td className="py-1.5 px-1.5 text-center font-bold">
                              {isPrinter ? (
                                <span className="text-slate-400 text-[10px]">-</span>
                              ) : item.termoAssinado === 'SIM' ? (
                                <span className="text-emerald-700 text-[10px] font-black">SIM</span>
                              ) : (
                                <span className="text-rose-700 text-[10px] font-black">NÃO</span>
                              )}
                            </td>
                          )}

                          {/* Obs / Patrimônio */}
                          {columns.find((c) => c.key === 'observacoes')?.enabled && (
                            <td className="py-1.5 px-2 text-[10px] text-slate-600">
                              {item.observacoes || '-'}
                            </td>
                          )}

                          {/* Action (Remove from report) - SCREEN ONLY */}
                          <td className="py-1.5 px-1 text-center no-print">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              title="Remover este item deste relatório impresso"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Official Signatures Area (if enabled) */}
            {includeSignatureFields && printableItems.length > 0 && (
              <div className="mt-12 pt-6 border-t border-slate-300 print-avoid-break">
                <p className="text-[11px] font-semibold text-slate-600 text-center mb-10">
                  Certificamos que as informações de inventário de ativos e estações de trabalho acima relacionadas conferem com a inspeção física realizada.
                </p>

                <div className="grid grid-cols-3 gap-6 text-center text-[10px] text-slate-700">
                  <div className="space-y-1">
                    <div className="border-t border-slate-900 mx-4 pt-1" />
                    <p className="font-bold text-slate-900 uppercase">Responsável pelo Setor</p>
                    <p className="text-slate-500">Conferência Física do Local</p>
                  </div>
                  <div className="space-y-1">
                    <div className="border-t border-slate-900 mx-4 pt-1" />
                    <p className="font-bold text-slate-900 uppercase">Gestor de Tecnologia (TI)</p>
                    <p className="text-slate-500">SME Natal / TI</p>
                  </div>
                  <div className="space-y-1">
                    <div className="border-t border-slate-900 mx-4 pt-1" />
                    <p className="font-bold text-slate-900 uppercase">Comissão de Patrimônio</p>
                    <p className="text-slate-500">Registro e Tombamento</p>
                  </div>
                </div>
              </div>
            )}

            {/* Page Footer */}
            <div className="mt-8 pt-3 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
              <span>Sistema de Inventário TI - Secretaria Municipal de Educação (SME)</span>
              <span>Página Oficial de Conferência Patrimonial</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
