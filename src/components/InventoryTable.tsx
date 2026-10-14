import React, { useState, useMemo } from 'react';
import { InventoryItem } from '../types/inventory';
import { getPendingFields, isFieldPending, hasPendingInfo, isPrinterItem } from '../utils/inventoryValidation';
import { ItemDetailsModal } from './ItemDetailsModal';
import {
  Search,
  Filter,
  Edit2,
  Trash2,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  FileCheck,
  Monitor,
  Zap,
  LayoutGrid,
  Table as TableIcon,
  Download,
  FileSpreadsheet,
  ArrowUpDown,
  RotateCcw,
  Printer,
  Eye,
  Laptop,
  Layers
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface InventoryTableProps {
  items: InventoryItem[];
  onEdit: (item: InventoryItem) => void;
  onDeleteRequest: (item: InventoryItem) => void;
  onQuickSign: (item: InventoryItem) => void;
  initialPendenciaFilter?: 'TODOS' | 'PENDENTES' | 'COMPLETOS';
  activeCategory?: 'COMPUTADORES' | 'IMPRESSORAS' | 'TODOS';
  onCategoryChange?: (category: 'COMPUTADORES' | 'IMPRESSORAS' | 'TODOS') => void;
}

type SortColumn =
  | 'itemNumber'
  | 'setor'
  | 'sala'
  | 'marca'
  | 'modelo'
  | 'nome'
  | 'serial'
  | 'responsavel'
  | 'funcao'
  | 'matriculaCpf'
  | 'termoAssinado';

export const InventoryTable: React.FC<InventoryTableProps> = ({
  items,
  onEdit,
  onDeleteRequest,
  onQuickSign,
  initialPendenciaFilter = 'TODOS',
  activeCategory: propActiveCategory,
  onCategoryChange
}) => {
  // Main Category Tab State (Computadores, Impressoras, Todos)
  const [internalCategory, setInternalCategory] = useState<'COMPUTADORES' | 'IMPRESSORAS' | 'TODOS'>('COMPUTADORES');
  const currentCategory = propActiveCategory !== undefined ? propActiveCategory : internalCategory;

  const handleCategorySelect = (category: 'COMPUTADORES' | 'IMPRESSORAS' | 'TODOS') => {
    if (onCategoryChange) {
      onCategoryChange(category);
    } else {
      setInternalCategory(category);
    }
  };

  // Search & Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSetor, setSelectedSetor] = useState('TODOS');
  const [selectedPrinterBrand, setSelectedPrinterBrand] = useState('TODOS');
  const [selectedTermo, setSelectedTermo] = useState<'TODOS' | 'SIM' | 'NÃO'>('TODOS');
  const [selectedPendencia, setSelectedPendencia] = useState<'TODOS' | 'PENDENTES' | 'COMPLETOS'>(initialPendenciaFilter);
  const [selectedRecurso, setSelectedRecurso] = useState<'TODOS' | 'DUAL_MONITOR' | 'NOBREAK'>('TODOS');

  // Sorting State (Columns)
  const [sortColumn, setSortColumn] = useState<SortColumn>('itemNumber');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // View & UI State
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Row Details Modal State
  const [selectedItemForDetails, setSelectedItemForDetails] = useState<InventoryItem | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Overall metric counts for filter badges
  const totalCount = items.length;
  const impressorasCount = useMemo(() => items.filter(isPrinterItem).length, [items]);
  const computadoresCount = totalCount - impressorasCount;

  // Printer Brands (HP, CANON, etc.)
  const printerBrands = useMemo(() => {
    const set = new Set<string>();
    items.filter(isPrinterItem).forEach((i) => {
      if (i.marca) set.add(i.marca.toUpperCase());
    });
    return Array.from(set).sort();
  }, [items]);

  // Unique Setores (tailored to active category)
  const uniqueSetores = useMemo(() => {
    const set = new Set<string>();
    const baseItems =
      currentCategory === 'COMPUTADORES'
        ? items.filter((i) => !isPrinterItem(i))
        : currentCategory === 'IMPRESSORAS'
        ? items.filter(isPrinterItem)
        : items;

    baseItems.forEach((i) => {
      if (i.setor) set.add(i.setor);
    });
    return Array.from(set).sort();
  }, [items, currentCategory]);

  const pendentesCount = useMemo(() => items.filter(hasPendingInfo).length, [items]);
  const completosCount = totalCount - pendentesCount;
  const assinadosCount = useMemo(() => items.filter((i) => i.termoAssinado === 'SIM').length, [items]);
  const termoPendentesCount = totalCount - assinadosCount;
  const dualMonitorCount = useMemo(() => items.filter((i) => i.monitor2Serial && i.monitor2Serial !== '-').length, [items]);
  const nobreakCount = useMemo(
    () => items.filter((i) => i.nobreakModelo && i.nobreakModelo !== '-' && !i.nobreakModelo.includes('NENHUM')).length,
    [items]
  );

  // Check if any custom filter is active
  const isAnyFilterActive = useMemo(() => {
    return (
      searchTerm.trim() !== '' ||
      selectedSetor !== 'TODOS' ||
      selectedPrinterBrand !== 'TODOS' ||
      selectedTermo !== 'TODOS' ||
      selectedPendencia !== 'TODOS' ||
      selectedRecurso !== 'TODOS' ||
      sortColumn !== 'itemNumber' ||
      sortDirection !== 'asc'
    );
  }, [searchTerm, selectedSetor, selectedPrinterBrand, selectedTermo, selectedPendencia, selectedRecurso, sortColumn, sortDirection]);

  // Clear all filters
  const resetAllFilters = () => {
    setSearchTerm('');
    setSelectedSetor('TODOS');
    setSelectedPrinterBrand('TODOS');
    setSelectedTermo('TODOS');
    setSelectedPendencia('TODOS');
    setSelectedRecurso('TODOS');
    setSortColumn('itemNumber');
    setSortDirection('asc');
  };

  // Toggle column sort
  const handleSortColumn = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Filter & Sort Items
  const filteredItems = useMemo(() => {
    const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

    const result = items.filter((item) => {
      const isPrinter = isPrinterItem(item);

      // 1. Categoria / Aba Principal
      if (currentCategory === 'COMPUTADORES' && isPrinter) return false;
      if (currentCategory === 'IMPRESSORAS' && !isPrinter) return false;

      // 2. Filtro de Marca de Impressora (quando na aba de impressoras)
      if (currentCategory === 'IMPRESSORAS' && selectedPrinterBrand !== 'TODOS') {
        if (item.marca?.toUpperCase() !== selectedPrinterBrand) return false;
      }

      // 3. Setor
      if (selectedSetor !== 'TODOS' && item.setor !== selectedSetor) return false;

      // 4. Termo (apenas computadores ou todos)
      if (currentCategory !== 'IMPRESSORAS') {
        if (selectedTermo === 'SIM' && item.termoAssinado !== 'SIM') return false;
        if (selectedTermo === 'NÃO' && item.termoAssinado === 'SIM') return false;
      }

      // 5. Pendências
      const isPending = hasPendingInfo(item);
      if (selectedPendencia === 'PENDENTES' && !isPending) return false;
      if (selectedPendencia === 'COMPLETOS' && isPending) return false;

      // 6. Periféricos & Recursos (apenas computadores ou todos)
      if (currentCategory !== 'IMPRESSORAS') {
        if (selectedRecurso === 'DUAL_MONITOR') {
          if (!item.monitor2Serial || item.monitor2Serial === '-') return false;
        }
        if (selectedRecurso === 'NOBREAK') {
          if (!item.nobreakModelo || item.nobreakModelo === '-' || item.nobreakModelo.includes('NENHUM')) return false;
        }
      }

      // 7. Busca por texto
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        item.nome?.toLowerCase().includes(q) ||
        item.serial?.toLowerCase().includes(q) ||
        item.responsavel?.toLowerCase().includes(q) ||
        item.matriculaCpf?.toLowerCase().includes(q) ||
        item.funcao?.toLowerCase().includes(q) ||
        item.setor?.toLowerCase().includes(q) ||
        item.sala?.toLowerCase().includes(q) ||
        item.modelo?.toLowerCase().includes(q) ||
        item.marca?.toLowerCase().includes(q) ||
        item.monitor1Serial?.toLowerCase().includes(q) ||
        item.monitor2Serial?.toLowerCase().includes(q) ||
        item.nobreakSerial?.toLowerCase().includes(q) ||
        item.observacoes?.toLowerCase().includes(q)
      );
    });

    // Column sort
    return result.sort((a, b) => {
      let valA = a[sortColumn] || '';
      let valB = b[sortColumn] || '';

      if (sortColumn === 'itemNumber') {
        return sortDirection === 'asc' ? a.itemNumber - b.itemNumber : b.itemNumber - a.itemNumber;
      }

      const cmp = collator.compare(String(valA), String(valB));
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [
    items,
    currentCategory,
    selectedPrinterBrand,
    searchTerm,
    selectedSetor,
    selectedTermo,
    selectedPendencia,
    selectedRecurso,
    sortColumn,
    sortDirection
  ]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const openItemDetails = (item: InventoryItem) => {
    setSelectedItemForDetails(item);
    setIsDetailsModalOpen(true);
  };

  // Export to CSV
  const exportToCSV = () => {
    if (filteredItems.length === 0) {
      alert('Não há itens para exportar com os filtros atuais.');
      return;
    }

    const headers = [
      'ITEM',
      'SETOR',
      'SALA',
      'MARCA',
      'MODELO',
      'NOME',
      'SERIAL',
      'MONITOR 1 (SERIAL)',
      'MARCA MONITOR 1',
      'MONITOR 2 (SERIAL)',
      'MARCA MONITOR 2',
      'ADAPTADOR',
      'NOBREAK/ MÓDULO',
      'SERIAL NOBREAK',
      'RESPONSÁVEL',
      'MATRÍCULA/ CPF',
      'FUNÇÃO',
      'TERMO ASSINADO',
      'OBSERVAÇÕES'
    ];

    const escapeCsv = (val: unknown) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = filteredItems.map((i) => [
      i.itemNumber,
      escapeCsv(i.setor),
      escapeCsv(i.sala),
      escapeCsv(i.marca),
      escapeCsv(i.modelo),
      escapeCsv(i.nome),
      escapeCsv(i.serial),
      escapeCsv(i.monitor1Serial),
      escapeCsv(i.monitor1Marca),
      escapeCsv(i.monitor2Serial),
      escapeCsv(i.monitor2Marca),
      escapeCsv(i.adaptador),
      escapeCsv(i.nobreakModelo),
      escapeCsv(i.nobreakSerial),
      escapeCsv(i.responsavel),
      escapeCsv(i.matriculaCpf),
      escapeCsv(i.funcao),
      escapeCsv(i.termoAssinado),
      escapeCsv(i.observacoes || '')
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `inventario_ti_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export to Excel (.xlsx)
  const exportToExcel = () => {
    if (filteredItems.length === 0) {
      alert('Não há itens para exportar com os filtros atuais.');
      return;
    }

    const headers = [
      'ITEM',
      'SETOR',
      'SALA',
      'MARCA',
      'MODELO',
      'NOME',
      'SERIAL',
      'MONITOR 1 (SERIAL)',
      'MARCA MONITOR 1',
      'MONITOR 2 (SERIAL)',
      'MARCA MONITOR 2',
      'ADAPTADOR',
      'NOBREAK/ MÓDULO',
      'SERIAL NOBREAK',
      'RESPONSÁVEL',
      'MATRÍCULA/ CPF',
      'FUNÇÃO',
      'TERMO ASSINADO',
      'OBSERVAÇÕES'
    ];

    const data = [
      headers,
      ...filteredItems.map((i) => [
        i.itemNumber,
        i.setor || '',
        i.sala || '',
        i.marca || '',
        i.modelo || '',
        i.nome || '',
        i.serial || '',
        i.monitor1Serial || '',
        i.monitor1Marca || '',
        i.monitor2Serial || '',
        i.monitor2Marca || '',
        i.adaptador || '',
        i.nobreakModelo || '',
        i.nobreakSerial || '',
        i.responsavel || '',
        i.matriculaCpf || '',
        i.funcao || '',
        i.termoAssinado || '',
        i.observacoes || ''
      ])
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventário');
    XLSX.writeFile(workbook, `inventario_ti_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const getSetorBadgeColor = (setor: string) => {
    switch (setor?.toUpperCase()) {
      case 'DEA':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'INFORMÁTICA':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'UTCI':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'PAT':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'CENSO':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const renderSortableHeader = (label: string, column: SortColumn, className = '') => {
    const isCurrent = sortColumn === column;
    return (
      <th
        onClick={() => handleSortColumn(column)}
        className={`py-2.5 px-3 cursor-pointer select-none hover:bg-slate-200/70 transition-colors ${className}`}
        title={`Clique para ordenar por ${label}`}
      >
        <div className="flex items-center gap-1">
          <span>{label}</span>
          <span className="text-[10px]">
            {isCurrent ? (
              <span className="text-blue-600 font-bold">{sortDirection === 'asc' ? '▲' : '▼'}</span>
            ) : (
              <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 hover:opacity-100" />
            )}
          </span>
        </div>
      </th>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Top Main Navigation Tabs */}
      <div className="bg-slate-100 border-b border-slate-200 px-3 sm:px-4 pt-3 flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => {
              handleCategorySelect('COMPUTADORES');
              setSelectedSetor('TODOS');
            }}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold border-t-2 border-x transition-all whitespace-nowrap cursor-pointer ${
              currentCategory === 'COMPUTADORES'
                ? 'bg-white border-blue-600 text-blue-900 border-x-slate-200 shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Laptop className={`w-4 h-4 ${currentCategory === 'COMPUTADORES' ? 'text-blue-600' : 'text-slate-400'}`} />
            <span>Computadores & Notebooks</span>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                currentCategory === 'COMPUTADORES'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {computadoresCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              handleCategorySelect('IMPRESSORAS');
              setSelectedSetor('TODOS');
            }}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold border-t-2 border-x transition-all whitespace-nowrap cursor-pointer ${
              currentCategory === 'IMPRESSORAS'
                ? 'bg-white border-purple-600 text-purple-900 border-x-slate-200 shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Printer className={`w-4 h-4 ${currentCategory === 'IMPRESSORAS' ? 'text-purple-600' : 'text-slate-400'}`} />
            <span>Impressoras & Multifuncionais</span>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                currentCategory === 'IMPRESSORAS'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {impressorasCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              handleCategorySelect('TODOS');
              setSelectedSetor('TODOS');
            }}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold border-t-2 border-x transition-all whitespace-nowrap cursor-pointer ${
              currentCategory === 'TODOS'
                ? 'bg-white border-slate-700 text-slate-900 border-x-slate-200 shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Layers className={`w-4 h-4 ${currentCategory === 'TODOS' ? 'text-slate-700' : 'text-slate-400'}`} />
            <span>Todos os Equipamentos</span>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                currentCategory === 'TODOS'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {totalCount}
            </span>
          </button>
        </div>
      </div>

      {/* Table Toolbar & Filters */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/70 space-y-3.5">
        {/* Row 1: Search, Preset Sort, Views, Exports */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                currentCategory === 'IMPRESSORAS'
                  ? 'Buscar impressora por serial, modelo, setor, sala ou patrimônio...'
                  : 'Buscar por serial, responsável, nome, setor...'
              }
              className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Action Controls & View Switcher */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            {/* View Switcher */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-all ${
                  viewMode === 'table'
                    ? 'bg-blue-50 text-blue-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Visualização em Tabela (Planilha)"
              >
                <TableIcon className="w-4 h-4" />
                <span className="hidden md:inline">Planilha</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-all ${
                  viewMode === 'cards'
                    ? 'bg-blue-50 text-blue-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Visualização em Cards"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden md:inline">Cards</span>
              </button>
            </div>

            {/* Export buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={exportToCSV}
                className="px-2.5 sm:px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-1.5 shadow-2xs transition-colors"
                title="Exportar dados filtrados para CSV (.csv)"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Exportar CSV</span>
              </button>

              <button
                type="button"
                onClick={exportToExcel}
                className="px-2.5 sm:px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-300 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-1.5 shadow-2xs transition-colors"
                title="Exportar dados filtrados diretamente para Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Exportar Excel</span>
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Secondary Filters (Diferenciado para Impressoras ou Computadores) */}
        {currentCategory === 'IMPRESSORAS' ? (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/80 text-xs">
            <span className="text-slate-500 font-semibold text-xs flex items-center gap-1">
              <Printer className="w-3.5 h-3.5 text-purple-600" /> Filtrar por Marca:
            </span>
            <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setSelectedPrinterBrand('TODOS')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  selectedPrinterBrand === 'TODOS'
                    ? 'bg-purple-600 text-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todas ({impressorasCount})
              </button>
              {printerBrands.map((brand) => {
                const bCount = items.filter((i) => isPrinterItem(i) && i.marca?.toUpperCase() === brand).length;
                return (
                  <button
                    key={brand}
                    type="button"
                    onClick={() => setSelectedPrinterBrand(brand)}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                      selectedPrinterBrand === brand
                        ? 'bg-purple-600 text-white shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {brand} ({bCount})
                  </button>
                );
              })}
            </div>

            {isAnyFilterActive && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ml-auto"
                title="Restaurar visualização original"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Limpar Filtros</span>
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/80 text-xs">
            {/* Situação Cadastral (Pendências) */}
            <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setSelectedPendencia('TODOS')}
                className={`px-2 py-1 rounded-md font-medium transition-all ${
                  selectedPendencia === 'TODOS'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Qualquer Status
              </button>
              <button
                type="button"
                onClick={() => setSelectedPendencia('COMPLETOS')}
                className={`px-2 py-1 rounded-md font-medium transition-all ${
                  selectedPendencia === 'COMPLETOS'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Completos ({completosCount})
              </button>
              <button
                type="button"
                onClick={() => setSelectedPendencia('PENDENTES')}
                className={`px-2 py-1 rounded-md font-medium transition-all ${
                  selectedPendencia === 'PENDENTES'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Com Pendências ({pendentesCount})
              </button>
            </div>

            {/* Termos de Responsabilidade */}
            <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setSelectedTermo('TODOS')}
                className={`px-2 py-1 rounded-md font-medium transition-all ${
                  selectedTermo === 'TODOS'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Termo: Todos
              </button>
              <button
                type="button"
                onClick={() => setSelectedTermo('SIM')}
                className={`px-2 py-1 rounded-md font-medium transition-all ${
                  selectedTermo === 'SIM'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Assinados ({assinadosCount})
              </button>
              <button
                type="button"
                onClick={() => setSelectedTermo('NÃO')}
                className={`px-2 py-1 rounded-md font-medium transition-all ${
                  selectedTermo === 'NÃO'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Não Assinados ({termoPendentesCount})
              </button>
            </div>

            {/* Periféricos */}
            <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setSelectedRecurso(selectedRecurso === 'DUAL_MONITOR' ? 'TODOS' : 'DUAL_MONITOR')}
                className={`px-2 py-1 rounded-md font-medium flex items-center gap-1 transition-all ${
                  selectedRecurso === 'DUAL_MONITOR'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Monitor className="w-3 h-3" />
                2º Monitor ({dualMonitorCount})
              </button>
              <button
                type="button"
                onClick={() => setSelectedRecurso(selectedRecurso === 'NOBREAK' ? 'TODOS' : 'NOBREAK')}
                className={`px-2 py-1 rounded-md font-medium flex items-center gap-1 transition-all ${
                  selectedRecurso === 'NOBREAK'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Zap className="w-3 h-3" />
                Nobreak ({nobreakCount})
              </button>
            </div>

            {/* Reset Filters button if active */}
            {isAnyFilterActive && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ml-auto"
                title="Restaurar visualização original"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Limpar Filtros</span>
              </button>
            )}
          </div>
        )}

        {/* Row 3: Sector Buttons Bar */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          <span className="text-slate-400 font-medium text-[11px] mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Setores:
          </span>
          <button
            type="button"
            onClick={() => setSelectedSetor('TODOS')}
            className={`px-2 py-0.5 rounded-md font-medium transition-all text-[11px] ${
              selectedSetor === 'TODOS'
                ? currentCategory === 'IMPRESSORAS'
                  ? 'bg-purple-600 text-white shadow-2xs font-semibold'
                  : 'bg-blue-600 text-white shadow-2xs font-semibold'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Todos (
            {currentCategory === 'COMPUTADORES'
              ? computadoresCount
              : currentCategory === 'IMPRESSORAS'
              ? impressorasCount
              : totalCount}
            )
          </button>
          {uniqueSetores.map((setor) => {
            const count = items.filter((i) => {
              if (currentCategory === 'COMPUTADORES' && isPrinterItem(i)) return false;
              if (currentCategory === 'IMPRESSORAS' && !isPrinterItem(i)) return false;
              return i.setor === setor;
            }).length;
            return (
              <button
                key={setor}
                type="button"
                onClick={() => setSelectedSetor(setor)}
                className={`px-2 py-0.5 rounded-md font-medium transition-all text-[11px] ${
                  selectedSetor === setor
                    ? currentCategory === 'IMPRESSORAS'
                      ? 'bg-purple-600 text-white shadow-2xs font-semibold'
                      : 'bg-blue-600 text-white shadow-2xs font-semibold'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {setor} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Content View */}
      {filteredItems.length === 0 ? (
        <div className="p-12 text-center text-slate-500">
          <p className="text-sm font-medium">Nenhum equipamento encontrado com a combinação de filtros atual.</p>
          <button
            onClick={resetAllFilters}
            className="mt-3 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-bold bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restaurar todos os filtros
          </button>
        </div>
      ) : viewMode === 'table' ? (
        currentCategory === 'IMPRESSORAS' ? (
          /* DEDICATED PRINTER SPREADSHEET TABLE VIEW */
          <div className="overflow-x-auto w-full max-h-[70vh]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100/90 text-slate-700 uppercase tracking-wider sticky top-0 z-20 shadow-xs border-b border-slate-300 font-bold text-[11px]">
                <tr>
                  {renderSortableHeader('#', 'itemNumber', 'w-12 text-center')}
                  {renderSortableHeader('Setor', 'setor')}
                  {renderSortableHeader('Sala', 'sala')}
                  {renderSortableHeader('Marca', 'marca')}
                  {renderSortableHeader('Modelo da Impressora', 'modelo')}
                  {renderSortableHeader('Nº de Série', 'serial')}
                  <th className="py-2.5 px-3">Patrimônio / Observações</th>
                  {renderSortableHeader('Responsável / Setor', 'responsavel')}
                  <th className="py-2.5 px-2 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center sticky right-0 bg-slate-100 z-20">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredItems.map((item) => {
                  const isPending = hasPendingInfo(item);
                  return (
                    <tr
                      key={item.id}
                      onClick={() => openItemDetails(item)}
                      className={`hover:bg-purple-50/60 cursor-pointer transition-colors group text-slate-800 ${
                        isPending ? 'bg-amber-50/30' : ''
                      }`}
                      title="Clique para visualizar a ficha completa da impressora"
                    >
                      {/* # */}
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500 bg-slate-50/50 whitespace-nowrap">
                        #{item.itemNumber}
                      </td>

                      {/* Setor */}
                      <td className="py-2.5 px-3 font-semibold whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${getSetorBadgeColor(
                            item.setor
                          )}`}
                        >
                          {item.setor}
                        </span>
                      </td>

                      {/* Sala */}
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-700 whitespace-nowrap">
                        Sala {item.sala}
                      </td>

                      {/* Marca */}
                      <td className="py-2.5 px-3 font-bold whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            item.marca?.toUpperCase() === 'HP'
                              ? 'bg-cyan-100 text-cyan-900 border border-cyan-200'
                              : 'bg-rose-100 text-rose-900 border border-rose-200'
                          }`}
                        >
                          {item.marca}
                        </span>
                      </td>

                      {/* Modelo */}
                      <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Printer className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          <span>{item.modelo}</span>
                        </div>
                      </td>

                      {/* Serial */}
                      <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                        {item.serial && item.serial.trim() !== '' ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {item.serial}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(item.serial, `printer-serial-${item.id}`);
                              }}
                              className="text-slate-400 hover:text-slate-700 p-0.5 rounded"
                              title="Copiar Serial"
                            >
                              {copiedId === `printer-serial-${item.id}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="italic text-xs text-amber-800 bg-amber-100/70 px-1.5 py-0.5 rounded">
                            Serial ausente
                          </span>
                        )}
                      </td>

                      {/* Patrimônio / Observações */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {item.observacoes && item.observacoes.trim() !== '' ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                            {item.observacoes}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>

                      {/* Responsável / Setor */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-xs text-slate-600">
                        {item.responsavel && item.responsavel.trim() !== '' && item.responsavel !== '-' ? (
                          <span className="font-semibold text-slate-800">{item.responsavel}</span>
                        ) : (
                          <span className="text-slate-500 italic">Compartilhado ({item.setor})</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
                        <span className="text-[10px] font-semibold text-slate-500">
                          {item.syncedToGoogleSheet ? '✓ Na nuvem' : '• Local'}
                        </span>
                      </td>

                      {/* Ações */}
                      <td
                        onClick={(e) => e.stopPropagation()}
                        className="py-2.5 px-3 text-center whitespace-nowrap sticky right-0 bg-white/95 group-hover:bg-purple-50/95 transition-colors"
                      >
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => openItemDetails(item)}
                            className="p-1 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                            title="Ver Ficha Completa"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onEdit(item)}
                            className="p-1 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteRequest(item)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* SPREADSHEET TABLE VIEW (Click on any row to open details) */
          <div className="overflow-x-auto w-full max-h-[70vh]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100/90 text-slate-700 uppercase tracking-wider sticky top-0 z-20 shadow-xs border-b border-slate-300 font-bold text-[11px]">
                <tr>
                  {renderSortableHeader('#', 'itemNumber', 'w-10 text-center')}
                  {renderSortableHeader('Setor', 'setor')}
                  {renderSortableHeader('Sala', 'sala')}
                  {renderSortableHeader('Marca', 'marca')}
                  {renderSortableHeader('Modelo', 'modelo')}
                  {renderSortableHeader('Nome (Host)', 'nome')}
                  {renderSortableHeader('Serial PC', 'serial')}
                  <th className="py-2.5 px-3">Monitor 1</th>
                  <th className="py-2.5 px-2">Marca M1</th>
                  <th className="py-2.5 px-3">Monitor 2</th>
                  <th className="py-2.5 px-2">Marca M2</th>
                  <th className="py-2.5 px-2 text-center">Adapt.</th>
                  <th className="py-2.5 px-3">Nobreak / Módulo</th>
                  <th className="py-2.5 px-3">Serial Nobreak</th>
                  {renderSortableHeader('Responsável', 'responsavel')}
                  {renderSortableHeader('Matrícula/CPF', 'matriculaCpf')}
                  {renderSortableHeader('Função', 'funcao')}
                  {renderSortableHeader('Termo', 'termoAssinado', 'text-center')}
                  <th className="py-2.5 px-3 text-center sticky right-0 bg-slate-100 z-20">Ações</th>
                </tr>
              </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredItems.map((item) => {
                const isPending = hasPendingInfo(item);
                const isNomeMissing = isFieldPending(item, 'nome');
                const isSerialMissing = isFieldPending(item, 'serial');
                const isRespMissing = isFieldPending(item, 'responsavel');
                const isMatriculaMissing = isFieldPending(item, 'matriculaCpf');
                const isFuncaoMissing = isFieldPending(item, 'funcao');
                const isMon1Missing = isFieldPending(item, 'monitor1Serial');

                return (
                  <tr
                    key={item.id}
                    onClick={() => openItemDetails(item)}
                    className={`hover:bg-blue-50/70 cursor-pointer transition-colors group text-slate-800 ${
                      isPending ? 'bg-amber-50/30' : ''
                    }`}
                    title="Clique para visualizar todos os detalhes deste equipamento"
                  >
                    {/* # */}
                    <td className="py-2 px-3 text-center font-mono font-bold text-slate-500 bg-slate-50/50 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <span>{item.itemNumber}</span>
                        {isPending && (
                          <span
                            className="w-2 h-2 rounded-full bg-amber-500 shrink-0"
                            title="Estação com informações pendentes"
                          />
                        )}
                      </div>
                    </td>

                    {/* Setor */}
                    <td className="py-2 px-3 font-semibold whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${getSetorBadgeColor(
                          item.setor
                        )}`}
                      >
                        {item.setor}
                      </span>
                    </td>

                    {/* Sala */}
                    <td className="py-2 px-2 font-mono font-medium text-slate-700 whitespace-nowrap">
                      {item.sala}
                    </td>

                    {/* Marca */}
                    <td className="py-2 px-3 font-medium whitespace-nowrap text-slate-900">
                      {item.marca}
                    </td>

                    {/* Modelo */}
                    <td className="py-2 px-3 font-medium whitespace-nowrap text-slate-700">
                      {item.modelo}
                    </td>

                    {/* Nome (Host) */}
                    <td
                      className={`py-2 px-3 font-mono whitespace-nowrap ${
                        isNomeMissing ? 'bg-amber-100/70 text-amber-900' : 'font-bold text-blue-700'
                      }`}
                    >
                      {item.nome && item.nome.trim() !== '' ? (
                        item.nome
                      ) : (
                        <span className="italic text-xs font-normal text-amber-800">
                          Informação ausente
                        </span>
                      )}
                    </td>

                    {/* Serial PC */}
                    <td
                      className={`py-2 px-3 font-mono whitespace-nowrap ${
                        isSerialMissing ? 'bg-amber-100/70 text-amber-900' : ''
                      }`}
                    >
                      {item.serial && item.serial.trim() !== '' ? (
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-slate-900">{item.serial}</span>
                          {item.serial !== '-' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(item.serial, `serial-${item.id}`);
                              }}
                              className="text-slate-400 hover:text-slate-700 p-0.5 rounded"
                              title="Copiar Serial"
                            >
                              {copiedId === `serial-${item.id}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="italic text-xs font-normal text-amber-800">
                          Informação ausente
                        </span>
                      )}
                    </td>

                    {/* Monitor 1 Serial */}
                    <td
                      className={`py-2 px-3 font-mono whitespace-nowrap ${
                        isMon1Missing ? 'bg-amber-100/70 text-amber-900' : 'text-slate-700'
                      }`}
                    >
                      {item.monitor1Serial && item.monitor1Serial.trim() !== '' ? (
                        item.monitor1Serial
                      ) : (
                        <span className="italic text-xs font-normal text-amber-800">
                          Informação ausente
                        </span>
                      )}
                    </td>

                    {/* Monitor 1 Marca */}
                    <td className="py-2 px-2 font-medium text-slate-600 whitespace-nowrap">
                      {item.monitor1Marca || '-'}
                    </td>

                    {/* Monitor 2 Serial */}
                    <td className="py-2 px-3 font-mono text-slate-700 whitespace-nowrap">
                      {item.monitor2Serial || '-'}
                    </td>

                    {/* Monitor 2 Marca */}
                    <td className="py-2 px-2 font-medium text-slate-600 whitespace-nowrap">
                      {item.monitor2Marca || '-'}
                    </td>

                    {/* Adaptador */}
                    <td className="py-2 px-2 text-center whitespace-nowrap">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          item.adaptador === 'SIM'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.adaptador}
                      </span>
                    </td>

                    {/* Nobreak / Módulo */}
                    <td className="py-2 px-3 text-slate-700 whitespace-nowrap">
                      {item.nobreakModelo || '-'}
                    </td>

                    {/* Serial Nobreak */}
                    <td className="py-2 px-3 font-mono text-slate-600 whitespace-nowrap">
                      {item.nobreakSerial || '-'}
                    </td>

                    {/* Responsável */}
                    <td
                      className={`py-2 px-3 whitespace-nowrap ${
                        isRespMissing ? 'bg-amber-100/70 text-amber-900' : 'font-bold text-slate-900'
                      }`}
                    >
                      {item.responsavel && item.responsavel.trim() !== '' ? (
                        <div className="flex items-center gap-1.5">
                          <span>{item.responsavel}</span>
                          {item.signatureDataUrl && (
                            <span
                              title="Possui assinatura digital coletada"
                              className="w-2 h-2 rounded-full bg-emerald-500 inline-block"
                            />
                          )}
                        </div>
                      ) : (
                        <span className="text-amber-800 italic text-xs font-normal">
                          Informação ausente
                        </span>
                      )}
                    </td>

                    {/* Matrícula/CPF */}
                    <td
                      className={`py-2 px-3 font-mono whitespace-nowrap ${
                        isMatriculaMissing ? 'bg-amber-100/70 text-amber-900' : 'text-slate-700'
                      }`}
                    >
                      {item.matriculaCpf && item.matriculaCpf.trim() !== '' ? (
                        item.matriculaCpf
                      ) : (
                        <span className="italic text-xs text-amber-800 font-normal">
                          Informação ausente
                        </span>
                      )}
                    </td>

                    {/* Função */}
                    <td
                      className={`py-2 px-3 whitespace-nowrap text-xs ${
                        isFuncaoMissing ? 'bg-amber-100/70 text-amber-900' : 'text-slate-600'
                      }`}
                    >
                      {item.funcao && item.funcao.trim() !== '' ? (
                        item.funcao
                      ) : (
                        <span className="italic text-xs text-amber-800 font-normal">
                          Informação ausente
                        </span>
                      )}
                    </td>

                    {/* Termo Assinado */}
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      {item.termoAssinado === 'SIM' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          SIM
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onQuickSign(item);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200 transition-colors"
                          title="Clique para assinar agora"
                        >
                          <XCircle className="w-3 h-3 text-rose-600" />
                          NÃO
                        </button>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-2 px-3 text-center whitespace-nowrap sticky right-0 bg-white group-hover:bg-blue-50/70 border-l border-slate-200 z-10">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openItemDetails(item);
                          }}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-100/60 rounded-lg transition-colors"
                          title="Visualizar detalhes completos"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(item);
                          }}
                          className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                            isPending
                              ? 'bg-amber-100 text-amber-900 hover:bg-amber-200 font-semibold text-[11px]'
                              : 'text-blue-600 hover:bg-blue-100'
                          }`}
                          title="Editar Equipamento"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteRequest(item);
                          }}
                          className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
                          title="Excluir Equipamento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )
    ) : (
      /* CARDS VIEW */
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredItems.map((item) => {
            const isPrinter = isPrinterItem(item);
            const isPending = hasPendingInfo(item);
            const pendingFields = getPendingFields(item);

            if (currentCategory === 'IMPRESSORAS' || isPrinter) {
              return (
                <div
                  key={item.id}
                  onClick={() => openItemDetails(item)}
                  className="bg-white border border-purple-200/90 rounded-xl p-4 shadow-2xs hover:border-purple-400 hover:shadow-md transition-all flex flex-col justify-between cursor-pointer"
                  title="Clique para abrir detalhes da impressora"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          #{item.itemNumber}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getSetorBadgeColor(
                            item.setor
                          )}`}
                        >
                          {item.setor}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">Sala {item.sala}</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.marca?.toUpperCase() === 'HP'
                            ? 'bg-cyan-100 text-cyan-900 border border-cyan-200'
                            : 'bg-rose-100 text-rose-900 border border-rose-200'
                        }`}
                      >
                        {item.marca}
                      </span>
                    </div>

                    <div className="mb-3">
                      <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        <Printer className="w-4 h-4 text-purple-600 shrink-0" />
                        <span>{item.modelo}</span>
                      </h4>
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-600">
                        <span className="font-medium text-slate-500">Serial:</span>
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          {item.serial}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(item.serial, `card-printer-${item.id}`);
                          }}
                          className="text-slate-400 hover:text-slate-700 p-0.5"
                        >
                          {copiedId === `card-printer-${item.id}` ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      {item.observacoes && (
                        <div className="mt-2 text-xs text-purple-900 bg-purple-50 p-2 rounded-lg border border-purple-200/80 font-mono">
                          {item.observacoes}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-[10px] text-slate-400 font-mono">
                      {item.syncedToGoogleSheet ? '✓ Na nuvem' : '• Local'}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openItemDetails(item);
                        }}
                        className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Ver Detalhes"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(item);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors text-blue-700 bg-blue-50 hover:bg-blue-100"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Editar</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteRequest(item);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={item.id}
                onClick={() => openItemDetails(item)}
                className={`bg-white border rounded-xl p-4 shadow-2xs hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between cursor-pointer ${
                  isPending ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'
                }`}
                title="Clique para abrir detalhes completos"
              >
                <div>
                  {/* Card Top Banner if Missing Info */}
                  {isPending && (
                    <div className="bg-amber-100/90 border border-amber-300 text-amber-900 rounded-lg px-2.5 py-1.5 text-[11px] mb-2.5 flex items-start gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <b>Pendências:</b> {pendingFields.map((f) => f.label).join(', ')}
                      </div>
                    </div>
                  )}

                  {/* Card Top: Number, Setor, Sala, Termo */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        #{item.itemNumber}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getSetorBadgeColor(
                          item.setor
                        )}`}
                      >
                        {item.setor}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">Sala {item.sala}</span>
                    </div>

                    {item.termoAssinado === 'SIM' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Assinado
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickSign(item);
                        }}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-300 hover:bg-rose-200 transition-colors"
                      >
                        <XCircle className="w-3 h-3 text-rose-600" />
                        Assinar Termo
                      </button>
                    )}
                  </div>

                  {/* PC Details */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-sm">
                        {item.marca} {item.modelo}
                      </h4>
                      {item.nome && item.nome.trim() !== '' ? (
                        <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                          {item.nome}
                        </span>
                      ) : (
                        <span className="text-[11px] italic font-normal text-amber-800 bg-amber-100/70 px-1.5 py-0.5 rounded">
                          Informação ausente
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-xs text-slate-600">
                      <span className="font-medium text-slate-500">Serial:</span>
                      <span className="font-mono font-bold text-slate-900">{item.serial}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(item.serial, `card-serial-${item.id}`);
                        }}
                        className="text-slate-400 hover:text-slate-700 p-0.5"
                      >
                        {copiedId === `card-serial-${item.id}` ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Hardware Specs summary */}
                  <div className="bg-slate-50 rounded-lg p-2.5 text-xs text-slate-600 space-y-1 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Monitor className="w-3.5 h-3.5 text-slate-500" />
                        <span>M1: {item.monitor1Marca || '-'}</span>
                      </span>
                      <span className="font-mono text-[11px] text-slate-700">
                        {item.monitor1Serial || '-'}
                      </span>
                    </div>

                    {item.monitor2Serial && item.monitor2Serial !== '-' && (
                      <div className="flex items-center justify-between text-indigo-700">
                        <span className="flex items-center gap-1">
                          <Monitor className="w-3.5 h-3.5 text-indigo-600" />
                          <span>M2: {item.monitor2Marca || '-'}</span>
                        </span>
                        <span className="font-mono text-[11px] font-medium">
                          {item.monitor2Serial}
                        </span>
                      </div>
                    )}

                    {item.nobreakModelo && item.nobreakModelo !== '-' && !item.nobreakModelo.includes('NENHUM') && (
                      <div className="flex items-center justify-between text-amber-800">
                        <span className="flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5 text-amber-600" />
                          <span className="truncate max-w-[140px]">{item.nobreakModelo}</span>
                        </span>
                        <span className="font-mono text-[11px] text-slate-700">
                          {item.nobreakSerial || '-'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Responsible Person */}
                  <div className="text-xs border-t border-slate-100 pt-2 mb-2">
                    <div
                      className={`font-semibold ${
                        !item.responsavel || item.responsavel.trim() === ''
                          ? 'text-amber-800 bg-amber-100/70 px-1.5 py-0.5 rounded inline-block text-xs italic font-normal'
                          : 'text-slate-800'
                      }`}
                    >
                      {item.responsavel && item.responsavel.trim() !== ''
                        ? item.responsavel
                        : 'Informação ausente'}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center justify-between mt-1">
                      <span
                        className={
                          !item.funcao || item.funcao.trim() === ''
                            ? 'text-amber-800 bg-amber-100/70 px-1 rounded italic'
                            : ''
                        }
                      >
                        {item.funcao && item.funcao.trim() !== '' ? item.funcao : 'Informação ausente'}
                      </span>
                      <span
                        className={`font-mono ${
                          !item.matriculaCpf || item.matriculaCpf.trim() === ''
                            ? 'text-amber-800 bg-amber-100/70 px-1 rounded italic'
                            : ''
                        }`}
                      >
                        {item.matriculaCpf && item.matriculaCpf.trim() !== ''
                          ? item.matriculaCpf
                          : 'Informação ausente'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400 font-mono">
                    {item.syncedToGoogleSheet ? '✓ Na nuvem' : '• Local'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openItemDetails(item);
                      }}
                      className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Ver Detalhes"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(item);
                      }}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors text-blue-700 bg-blue-50 hover:bg-blue-100"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteRequest(item);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer count summary */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
        <span>
          Exibindo <b>{filteredItems.length}</b> de{' '}
          <b>
            {currentCategory === 'COMPUTADORES'
              ? `${computadoresCount} computadores`
              : currentCategory === 'IMPRESSORAS'
              ? `${impressorasCount} impressoras`
              : `${items.length} equipamentos`}
          </b>
          {isAnyFilterActive && (
            <span className="text-blue-600 font-semibold ml-1.5">(com filtros aplicados)</span>
          )}
        </span>
        <span className="text-slate-400 text-[11px]">
          Dica: Clique em qualquer linha para abrir a ficha completa do equipamento.
        </span>
      </div>

      {/* Item Details Box/Modal */}
      <ItemDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        item={selectedItemForDetails}
        onEdit={onEdit}
        onQuickSign={onQuickSign}
      />
    </div>
  );
};
