import React, { useState } from 'react';
import { InventoryItem } from '../types/inventory';
import { hasPendingInfo, getPendingFields, isPrinterItem } from '../utils/inventoryValidation';
import {
  X,
  Edit2,
  FileCheck,
  Check,
  Copy,
  Monitor,
  Zap,
  User,
  Cpu,
  MapPin,
  Calendar,
  AlertTriangle,
  FileText,
  Clock,
  Printer
} from 'lucide-react';

interface ItemDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  onEdit: (item: InventoryItem) => void;
  onQuickSign: (item: InventoryItem) => void;
}

export const ItemDetailsModal: React.FC<ItemDetailsModalProps> = ({
  isOpen,
  onClose,
  item,
  onEdit,
  onQuickSign
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen || !item) return null;

  const isPending = hasPendingInfo(item);
  const pendingFields = getPendingFields(item);
  const isPrinter = isPrinterItem(item);

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isPrinter
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {isPrinter ? <Printer className="w-5 h-5" /> : <Cpu className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded">
                  #{item.itemNumber}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                  {isPrinter
                    ? `${item.marca} ${item.modelo}`
                    : item.nome && item.nome !== '-'
                    ? item.nome
                    : `${item.marca} ${item.modelo}`}
                </h3>
                {isPrinter ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                    <Printer className="w-3 h-3 text-purple-600" /> Impressora / Multifuncional
                  </span>
                ) : item.termoAssinado === 'SIM' ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <FileCheck className="w-3 h-3" /> Termo Assinado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                    Termo Pendente
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {item.setor} • Sala {item.sala} • {item.marca} {item.modelo}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors shrink-0"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
          {/* Pending Warning Banner if applicable */}
          {isPending && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-2.5 text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-xs text-amber-950">
                  Dados pendentes de preenchimento:
                </p>
                <p className="text-xs text-amber-800 mt-0.5">
                  {pendingFields.map((f) => f.label).join(', ')}
                </p>
              </div>
            </div>
          )}

          {/* Section 1: Identificação & Localização */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              <MapPin className="w-3.5 h-3.5" />
              <span>Identificação & Localização</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <span className="text-[11px] text-slate-500 font-medium block">Setor</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {item.setor || '-'}
                </span>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <span className="text-[11px] text-slate-500 font-medium block">Sala</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {item.sala || '-'}
                </span>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <span className="text-[11px] text-slate-500 font-medium block">Nome na Rede (Host)</span>
                <span className="font-mono font-bold text-blue-700 text-sm mt-0.5 block">
                  {item.nome && item.nome.trim() !== '' ? item.nome : (
                    <span className="text-amber-800 italic font-normal text-xs">Informação ausente</span>
                  )}
                </span>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 col-span-2 sm:col-span-1">
                <span className="text-[11px] text-slate-500 font-medium block">Marca</span>
                <span className="font-semibold text-slate-900 text-sm mt-0.5 block">
                  {item.marca || '-'}
                </span>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 col-span-2 sm:col-span-1">
                <span className="text-[11px] text-slate-500 font-medium block">Modelo</span>
                <span className="font-semibold text-slate-900 text-sm mt-0.5 block">
                  {item.modelo || '-'}
                </span>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 col-span-2 sm:col-span-1">
                <span className="text-[11px] text-slate-500 font-medium block">Serial PC</span>
                <div className="flex items-center justify-between gap-1 mt-0.5">
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {item.serial && item.serial.trim() !== '' ? item.serial : (
                      <span className="text-amber-800 italic font-normal text-xs">Informação ausente</span>
                    )}
                  </span>
                  {item.serial && item.serial.trim() !== '' && item.serial !== '-' && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(item.serial, 'serial-pc')}
                      className="text-slate-400 hover:text-slate-700 p-1 rounded"
                      title="Copiar serial"
                    >
                      {copiedField === 'serial-pc' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2 & 3: Monitores e Nobreak (Apenas para Computadores) ou Dados da Impressora */}
          {!isPrinter ? (
            <>
              {/* Section 2: Monitores & Periféricos */}
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Monitores & Periféricos</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <span className="text-[11px] text-slate-500 font-medium block">Monitor Principal (1)</span>
                    <p className="font-semibold text-slate-800 text-xs mt-0.5">
                      Marca: <span className="font-bold">{item.monitor1Marca || '-'}</span>
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-mono text-xs text-slate-700">
                        Serial: {item.monitor1Serial || '-'}
                      </span>
                      {item.monitor1Serial && item.monitor1Serial !== '-' && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(item.monitor1Serial, 'm1-serial')}
                          className="text-slate-400 hover:text-slate-700 p-0.5 rounded"
                          title="Copiar serial"
                        >
                          {copiedField === 'm1-serial' ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <span className="text-[11px] text-slate-500 font-medium block">Monitor Secundário (2)</span>
                    <p className="font-semibold text-slate-800 text-xs mt-0.5">
                      Marca: <span className="font-bold">{item.monitor2Marca || '-'}</span>
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-mono text-xs text-slate-700">
                        Serial: {item.monitor2Serial || '-'}
                      </span>
                      {item.monitor2Serial && item.monitor2Serial !== '-' && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(item.monitor2Serial, 'm2-serial')}
                          className="text-slate-400 hover:text-slate-700 p-0.5 rounded"
                          title="Copiar serial"
                        >
                          {copiedField === 'm2-serial' ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <span className="text-[11px] text-slate-500 font-medium block">Adaptador de Vídeo</span>
                    <span
                      className={`inline-block mt-1 px-2.5 py-0.5 rounded text-xs font-bold ${
                        item.adaptador === 'SIM'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {item.adaptador === 'SIM' ? 'Possui Adaptador' : 'Não Possui'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 3: Proteção Elétrica (Nobreak) */}
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Proteção Elétrica</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <span className="text-[11px] text-slate-500 font-medium block">Modelo Nobreak / Módulo</span>
                    <span className="font-semibold text-slate-900 text-sm mt-0.5 block">
                      {item.nobreakModelo || '-'}
                    </span>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <span className="text-[11px] text-slate-500 font-medium block">Serial Nobreak</span>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {item.nobreakSerial || '-'}
                      </span>
                      {item.nobreakSerial && item.nobreakSerial !== '-' && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(item.nobreakSerial, 'nb-serial')}
                          className="text-slate-400 hover:text-slate-700 p-1 rounded"
                          title="Copiar serial"
                        >
                          {copiedField === 'nb-serial' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-purple-50/60 rounded-xl p-4 border border-purple-200 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-900 uppercase tracking-wider">
                <Printer className="w-4 h-4 text-purple-600" />
                <span>Dados de Operação e Patrimônio da Impressora</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                <div className="bg-white p-3 rounded-lg border border-purple-100 shadow-2xs">
                  <span className="text-slate-500 font-medium block text-[11px]">Identificação / Patrimônio:</span>
                  <span className="font-bold text-purple-950 text-sm mt-0.5 block font-mono">
                    {item.observacoes && item.observacoes.trim() !== '' ? item.observacoes : 'Sem registro de patrimônio'}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-purple-100 shadow-2xs">
                  <span className="text-slate-500 font-medium block text-[11px]">Disponibilidade e Localização:</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                    Recurso Departamental • Sala {item.sala} ({item.setor})
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Section 4: Responsável & Termo de Compromisso */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              <User className="w-3.5 h-3.5" />
              <span>{isPrinter ? 'Uso e Responsabilidade do Setor' : 'Responsável & Termo de Compromisso'}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <span className="text-[11px] text-slate-500 font-medium block">
                  {isPrinter ? 'Alocação / Responsável' : 'Nome do Responsável'}
                </span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {item.responsavel && item.responsavel.trim() !== '' && item.responsavel !== '-' ? (
                    item.responsavel
                  ) : isPrinter ? (
                    `Setor ${item.setor} (Compartilhado)`
                  ) : (
                    <span className="text-amber-800 italic font-normal text-xs">Informação ausente</span>
                  )}
                </span>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <span className="text-[11px] text-slate-500 font-medium block">Cargo / Função</span>
                <span className="font-semibold text-slate-800 text-sm mt-0.5 block">
                  {item.funcao && item.funcao.trim() !== '' && item.funcao !== '-' ? (
                    item.funcao
                  ) : isPrinter ? (
                    'Uso Departamental'
                  ) : (
                    <span className="text-amber-800 italic font-normal text-xs">Informação ausente</span>
                  )}
                </span>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <span className="text-[11px] text-slate-500 font-medium block">Matrícula / CPF</span>
                <span className="font-mono font-semibold text-slate-800 text-sm mt-0.5 block">
                  {item.matriculaCpf && item.matriculaCpf.trim() !== '' && item.matriculaCpf !== '-' ? (
                    item.matriculaCpf
                  ) : isPrinter ? (
                    '-'
                  ) : (
                    <span className="text-amber-800 italic font-normal text-xs">Informação ausente</span>
                  )}
                </span>
              </div>
            </div>

            {/* Signature preview if collected */}
            {item.signatureDataUrl && (
              <div className="mt-3 p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5 mb-2">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  Assinatura Digital Coletada:
                </span>
                <div className="bg-white rounded-lg p-2 border border-emerald-100 flex items-center justify-center max-h-28 overflow-hidden">
                  <img
                    src={item.signatureDataUrl}
                    alt="Assinatura"
                    className="max-h-24 object-contain"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 5: Observações (se houver) */}
          {item.observacoes && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                <FileText className="w-3.5 h-3.5" />
                <span>Observações & Informações Complementares</span>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs sm:text-sm text-slate-700">
                {item.observacoes}
              </div>
            </div>
          )}

          {/* Section 6: Metadados */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Criado em: {new Date(item.createdAt).toLocaleDateString('pt-BR')}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Última atualização: {item.updatedAt}
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 transition-colors"
          >
            Fechar
          </button>

          <div className="flex items-center gap-2">
            {item.termoAssinado !== 'SIM' && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onQuickSign(item);
                }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
              >
                <FileCheck className="w-4 h-4" />
                <span>Assinar Termo</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(item);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
            >
              <Edit2 className="w-4 h-4" />
              <span>Editar Equipamento</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
