import React, { useState, useMemo } from 'react';
import { InventoryItem } from '../types/inventory';
import { getPendingFields, isFieldPending, hasPendingInfo } from '../utils/inventoryValidation';
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
  AlertCircle,
  AlertTriangle,
  Info
} from 'lucide-react';

interface InventoryTableProps {
  items: InventoryItem[];
  onEdit: (item: InventoryItem) => void;
  onDeleteRequest: (item: InventoryItem) => void;
  onQuickSign: (item: InventoryItem) => void;
  initialPendenciaFilter?: 'TODOS' | 'PENDENTES' | 'COMPLETOS';
}

export const InventoryTable: React.FC<InventoryTableProps> = ({
  items,
  onEdit,
  onDeleteRequest,
  onQuickSign,
  initialPendenciaFilter = 'TODOS'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSetor, setSelectedSetor] = useState('TODOS');
  const [selectedTermo, setSelectedTermo] = useState('TODOS');
  const [selectedPendencia, setSelectedPendencia] = useState<'TODOS' | 'PENDENTES' | 'COMPLETOS'>(initialPendenciaFilter);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Extract unique setores for filter
  const uniqueSetores = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.setor) set.add(i.setor);
    });
    return Array.from(set).sort();
  }, [items]);

  // Counts
  const totalCount = items.length;
  const pendentesCount = useMemo(() => items.filter(hasPendingInfo).length, [items]);
  const completosCount = totalCount - pendentesCount;

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSetor = selectedSetor === 'TODOS' || item.setor === selectedSetor;
      const matchTermo =
        selectedTermo === 'TODOS' ||
        (selectedTermo === 'SIM' && item.termoAssinado === 'SIM') ||
        (selectedTermo === 'NÃO' && item.termoAssinado !== 'SIM');

      const isPending = hasPendingInfo(item);
      const matchPendencia =
        selectedPendencia === 'TODOS' ||
        (selectedPendencia === 'PENDENTES' && isPending) ||
        (selectedPendencia === 'COMPLETOS' && !isPending);

      if (!matchSetor || !matchTermo || !matchPendencia) return false;

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
        item.nobreakSerial?.toLowerCase().includes(q)
      );
    });
  }, [items, searchTerm, selectedSetor, selectedTermo, selectedPendencia]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const exportToCSV = () => {
    const headers = [
      '#',
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
      'TERMO ASSINADO'
    ];

    const rows = filteredItems.map((i) => [
      i.itemNumber,
      `"${i.setor || ''}"`,
      `"${i.sala || ''}"`,
      `"${i.marca || ''}"`,
      `"${i.modelo || ''}"`,
      `"${i.nome || ''}"`,
      `"${i.serial || ''}"`,
      `"${i.monitor1Serial || ''}"`,
      `"${i.monitor1Marca || ''}"`,
      `"${i.monitor2Serial || ''}"`,
      `"${i.monitor2Marca || ''}"`,
      `"${i.adaptador || ''}"`,
      `"${i.nobreakModelo || ''}"`,
      `"${i.nobreakSerial || ''}"`,
      `"${i.responsavel || ''}"`,
      `"${i.matriculaCpf || ''}"`,
      `"${i.funcao || ''}"`,
      `"${i.termoAssinado || ''}"`
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `inventario_ti_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/60 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por serial, responsável, nome, setor..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
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

          {/* Quick Actions & View Switcher */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* View Switcher */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
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
                title="Visualização em Cards (Mobile)"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden md:inline">Cards</span>
              </button>
            </div>

            {/* Export CSV */}
            <button
              type="button"
              onClick={exportToCSV}
              className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-1.5 shadow-2xs transition-colors"
              title="Exportar dados filtrados para CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>
          </div>
        </div>

        {/* Sector Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <div className="flex items-center gap-1 text-slate-500 font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span>Setor:</span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedSetor('TODOS')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              selectedSetor === 'TODOS'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Todos ({totalCount})
          </button>
          {uniqueSetores.map((setor) => {
            const count = items.filter((i) => i.setor === setor).length;
            return (
              <button
                key={setor}
                type="button"
                onClick={() => setSelectedSetor(setor)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  selectedSetor === setor
                    ? 'bg-blue-600 text-white shadow-2xs'
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
          <p className="text-sm font-medium">Nenhum equipamento encontrado com os filtros atuais.</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedSetor('TODOS');
              setSelectedTermo('TODOS');
              setSelectedPendencia('TODOS');
            }}
            className="mt-2 text-xs text-blue-600 hover:underline font-semibold"
          >
            Limpar filtros de busca
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* SPREADSHEET TABLE VIEW (identical to the user's uploaded spreadsheet with exact yellow highlight) */
        <div className="overflow-x-auto w-full max-h-[70vh]">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-100/90 text-slate-700 uppercase tracking-wider sticky top-0 z-20 shadow-xs border-b border-slate-300 font-bold text-[11px]">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3">Setor</th>
                <th className="py-2.5 px-2">Sala</th>
                <th className="py-2.5 px-3">Marca</th>
                <th className="py-2.5 px-3">Modelo</th>
                <th className="py-2.5 px-3">Nome (Host)</th>
                <th className="py-2.5 px-3">Serial PC</th>
                <th className="py-2.5 px-3">Monitor 1</th>
                <th className="py-2.5 px-2">Marca M1</th>
                <th className="py-2.5 px-3">Monitor 2</th>
                <th className="py-2.5 px-2">Marca M2</th>
                <th className="py-2.5 px-2 text-center">Adapt.</th>
                <th className="py-2.5 px-3">Nobreak / Módulo</th>
                <th className="py-2.5 px-3">Serial Nobreak</th>
                <th className="py-2.5 px-3">Responsável</th>
                <th className="py-2.5 px-3">Matrícula/CPF</th>
                <th className="py-2.5 px-3">Função</th>
                <th className="py-2.5 px-3 text-center">Termo</th>
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
                    className={`hover:bg-blue-50/50 transition-colors group text-slate-800 ${
                      isPending ? 'bg-amber-50/30' : ''
                    }`}
                  >
                    {/* # */}
                    <td className="py-2 px-3 text-center font-mono font-bold text-slate-500 bg-slate-50/50 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <span>{item.itemNumber}</span>
                        {isPending && (
                          <span
                            className="w-2 h-2 rounded-full bg-amber-500 shrink-0"
                            title="Estação com informações pendentes (células amarelas)"
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

                    {/* Nome (Host) - Highlight in YELLOW if missing */}
                    <td
                      className={`py-2 px-3 font-mono whitespace-nowrap ${
                        isNomeMissing
                          ? 'bg-amber-200/90 text-amber-950 font-bold border border-amber-300'
                          : 'font-bold text-blue-700'
                      }`}
                    >
                      {item.nome && item.nome !== '-' ? (
                        item.nome
                      ) : (
                        <span className="italic text-[11px] font-medium flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-amber-700" />
                          [Pendente: Host]
                        </span>
                      )}
                    </td>

                    {/* Serial PC - Highlight in YELLOW if missing */}
                    <td
                      className={`py-2 px-3 font-mono whitespace-nowrap ${
                        isSerialMissing
                          ? 'bg-amber-200/90 text-amber-950 font-bold border border-amber-300'
                          : ''
                      }`}
                    >
                      {item.serial ? (
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-slate-900">{item.serial}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(item.serial, `serial-${item.id}`)}
                            className="text-slate-400 hover:text-slate-700 p-0.5 rounded"
                            title="Copiar Serial"
                          >
                            {copiedId === `serial-${item.id}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="italic text-[11px] font-medium">[Falta Serial]</span>
                      )}
                    </td>

                    {/* Monitor 1 Serial */}
                    <td
                      className={`py-2 px-3 font-mono whitespace-nowrap ${
                        isMon1Missing && !item.monitor1Serial
                          ? 'bg-amber-100 text-amber-900'
                          : 'text-slate-700'
                      }`}
                    >
                      {item.monitor1Serial || '-'}
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

                    {/* Responsável - Highlight in YELLOW if missing or highlighted as in user image */}
                    <td
                      className={`py-2 px-3 font-bold whitespace-nowrap ${
                        isRespMissing
                          ? 'bg-amber-200/90 text-amber-950 border border-amber-300'
                          : 'text-slate-900'
                      }`}
                    >
                      {item.responsavel && item.responsavel !== '-' ? (
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
                        <span className="text-amber-900 font-semibold italic flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                          [Pendente: Responsável]
                        </span>
                      )}
                    </td>

                    {/* Matrícula/CPF - Highlight in YELLOW if missing */}
                    <td
                      className={`py-2 px-3 font-mono whitespace-nowrap ${
                        isMatriculaMissing
                          ? 'bg-amber-100/90 text-amber-900 font-medium border border-amber-200'
                          : 'text-slate-700'
                      }`}
                    >
                      {item.matriculaCpf && item.matriculaCpf !== '-' ? (
                        item.matriculaCpf
                      ) : (
                        <span className="italic text-[11px] text-amber-800">[Pendente: CPF]</span>
                      )}
                    </td>

                    {/* Função - Highlight in YELLOW if missing */}
                    <td
                      className={`py-2 px-3 whitespace-nowrap text-[11px] ${
                        isFuncaoMissing
                          ? 'bg-amber-100/90 text-amber-900 font-medium border border-amber-200'
                          : 'text-slate-600'
                      }`}
                    >
                      {item.funcao && item.funcao !== '-' ? (
                        item.funcao
                      ) : (
                        <span className="italic text-[11px] text-amber-800">[Pendente: Função]</span>
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
                          onClick={() => onQuickSign(item)}
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
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEdit(item)}
                          className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                            isPending
                              ? 'bg-amber-100 text-amber-900 hover:bg-amber-200 font-semibold text-[11px]'
                              : 'text-blue-600 hover:bg-blue-100'
                          }`}
                          title="Editar e Completar Dados"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          {isPending && <span className="hidden xl:inline">Completar</span>}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteRequest(item)}
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
      ) : (
        /* CARDS VIEW (optimized for mobile / tablet collection in the field) */
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredItems.map((item) => {
            const isPending = hasPendingInfo(item);
            const pendingFields = getPendingFields(item);

            return (
              <div
                key={item.id}
                className={`bg-white border rounded-xl p-4 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between ${
                  isPending ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'
                }`}
              >
                <div>
                  {/* Card Top Banner if Missing Info */}
                  {isPending && (
                    <div className="bg-amber-100/90 border border-amber-300 text-amber-900 rounded-lg px-2.5 py-1.5 text-[11px] mb-2.5 flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <b>Faltando Informações:</b>{' '}
                        {pendingFields.map((f) => f.label).join(', ')}
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
                        {item.setor} - Sala {item.sala}
                      </span>
                    </div>

                    {item.termoAssinado === 'SIM' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        Termo Assinado
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onQuickSign(item)}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 hover:bg-rose-100"
                      >
                        <XCircle className="w-3 h-3" />
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
                      {item.nome && item.nome !== '-' ? (
                        <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                          {item.nome}
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] font-bold bg-amber-200 text-amber-950 px-1.5 py-0.5 rounded border border-amber-300">
                          Falta Host
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-xs text-slate-600">
                      <span className="font-medium text-slate-500">Serial:</span>
                      <span className="font-mono font-bold text-slate-900">{item.serial}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(item.serial, `card-serial-${item.id}`)}
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
                      className={`font-bold ${
                        !item.responsavel || item.responsavel === '-'
                          ? 'text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded inline-block'
                          : 'text-slate-800'
                      }`}
                    >
                      {item.responsavel || '⚠️ Responsável não informado'}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center justify-between mt-1">
                      <span
                        className={
                          !item.funcao || item.funcao === '-'
                            ? 'text-amber-800 bg-amber-100/70 px-1 rounded'
                            : ''
                        }
                      >
                        {item.funcao || 'Falta Cargo/Função'}
                      </span>
                      <span
                        className={`font-mono ${
                          !item.matriculaCpf || item.matriculaCpf === '-'
                            ? 'text-amber-800 bg-amber-100/70 px-1 rounded'
                            : ''
                        }`}
                      >
                        {item.matriculaCpf || 'Falta CPF'}
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
                      onClick={() => onEdit(item)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors ${
                        isPending
                          ? 'bg-amber-400 text-slate-900 hover:bg-amber-300 font-bold'
                          : 'text-blue-700 bg-blue-50 hover:bg-blue-100'
                      }`}
                    >
                      <Edit2 className="w-3 h-3" />
                      {isPending ? 'Completar' : 'Editar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteRequest(item)}
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
      <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
        <span>
          Exibindo <b>{filteredItems.length}</b> de <b>{items.length}</b> registros
        </span>
        <span className="hidden sm:inline text-amber-800 font-medium">
          Dica: Filtre por "Faltando Informações" para verificar todas as estações com pendências.
        </span>
      </div>
    </div>
  );
};
