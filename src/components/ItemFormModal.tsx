import React, { useState, useEffect } from 'react';
import {
  X,
  Camera,
  Save,
  Monitor,
  Cpu,
  User,
  Zap,
  MapPin,
  CheckCircle2,
  PenTool,
  PlusCircle,
  FileCheck,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';
import { InventoryItem } from '../types/inventory';
import { COMMON_OPTIONS } from '../data/initialData';
import { getPendingFields } from '../utils/inventoryValidation';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { SignatureModal } from './SignatureModal';

interface ItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: InventoryItem) => void;
  initialItem?: InventoryItem | null;
  totalItemsCount: number;
}

export const ItemFormModal: React.FC<ItemFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialItem,
  totalItemsCount
}) => {
  const isEditing = !!initialItem;

  const [formData, setFormData] = useState<Partial<InventoryItem>>({
    itemNumber: totalItemsCount + 1,
    setor: 'DEA',
    sala: '133',
    marca: 'POSITIVO',
    modelo: 'C6300 MINIPRO',
    nome: '',
    serial: '',
    monitor1Serial: '',
    monitor1Marca: 'POSITIVO',
    monitor2Serial: '',
    monitor2Marca: 'POSITIVO',
    adaptador: 'NÃO',
    nobreakModelo: 'RAGTECH NEW 1200 STD TI',
    nobreakSerial: '',
    responsavel: '',
    matriculaCpf: '',
    funcao: 'TÉCNICO ADMINISTRATIVO',
    termoAssinado: 'SIM',
    observacoes: '',
    signatureDataUrl: ''
  });

  const [hasSecondMonitor, setHasSecondMonitor] = useState(false);
  const [hasNobreak, setHasNobreak] = useState(true);

  // Scanner modal state
  const [scannerField, setScannerField] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Signature modal state
  const [isSignatureOpen, setIsSignatureOpen] = useState(false);

  useEffect(() => {
    if (initialItem) {
      setFormData(initialItem);
      setHasSecondMonitor(
        Boolean(initialItem.monitor2Serial && initialItem.monitor2Serial !== '-')
      );
      setHasNobreak(
        Boolean(initialItem.nobreakModelo && initialItem.nobreakModelo !== '-' && !initialItem.nobreakModelo.includes('NENHUM'))
      );
    } else {
      setFormData({
        itemNumber: totalItemsCount + 1,
        setor: 'DEA',
        sala: '133',
        marca: 'POSITIVO',
        modelo: 'C6300 MINIPRO',
        nome: `SME-${Math.floor(600 + Math.random() * 10)}-${String(totalItemsCount + 1).padStart(2, '0')}`,
        serial: '',
        monitor1Serial: '',
        monitor1Marca: 'POSITIVO',
        monitor2Serial: '-',
        monitor2Marca: '-',
        adaptador: 'NÃO',
        nobreakModelo: 'RAGTECH NEW 1200 STD TI',
        nobreakSerial: '',
        responsavel: '',
        matriculaCpf: '',
        funcao: 'TÉCNICO ADMINISTRATIVO',
        termoAssinado: 'SIM',
        observacoes: '',
        signatureDataUrl: ''
      });
      setHasSecondMonitor(false);
      setHasNobreak(true);
    }
  }, [initialItem, totalItemsCount, isOpen]);

  const handleChange = (field: keyof InventoryItem, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const openScanner = (field: string) => {
    setScannerField(field);
    setIsScannerOpen(true);
  };

  const handleScanComplete = (code: string) => {
    if (!scannerField) return;
    handleChange(scannerField as keyof InventoryItem, code);
    setScannerField(null);
  };

  const pendingFields = getPendingFields({
    ...formData,
    id: formData.id || 'temp',
    itemNumber: Number(formData.itemNumber) || 1,
    termoAssinado: formData.termoAssinado || 'NÃO'
  } as InventoryItem);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalItem: InventoryItem = {
      id: initialItem?.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      itemNumber: Number(formData.itemNumber) || totalItemsCount + 1,
      setor: formData.setor?.trim().toUpperCase() || 'GERAL',
      sala: formData.sala?.trim() || '',
      marca: formData.marca?.trim().toUpperCase() || '',
      modelo: formData.modelo?.trim().toUpperCase() || '',
      nome: formData.nome?.trim().toUpperCase() || '',
      serial: formData.serial?.trim().toUpperCase() || '',
      monitor1Serial: formData.monitor1Serial?.trim().toUpperCase() || '-',
      monitor1Marca: formData.monitor1Marca?.trim().toUpperCase() || '-',
      monitor2Serial: hasSecondMonitor ? (formData.monitor2Serial?.trim().toUpperCase() || '-') : '-',
      monitor2Marca: hasSecondMonitor ? (formData.monitor2Marca?.trim().toUpperCase() || '-') : '-',
      adaptador: formData.adaptador || 'NÃO',
      nobreakModelo: hasNobreak ? (formData.nobreakModelo?.trim().toUpperCase() || '-') : '-',
      nobreakSerial: hasNobreak ? (formData.nobreakSerial?.trim().toUpperCase() || '-') : '-',
      responsavel: formData.responsavel?.trim().toUpperCase() || '',
      matriculaCpf: formData.matriculaCpf?.trim() || '',
      funcao: formData.funcao?.trim().toUpperCase() || '',
      termoAssinado: formData.termoAssinado || 'NÃO',
      observacoes: formData.observacoes?.trim() || '',
      signatureDataUrl: formData.signatureDataUrl,
      syncedToGoogleSheet: false,
      createdAt: initialItem?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toLocaleString('pt-BR')
    };

    onSave(finalItem);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto max-h-[96vh] flex flex-col border border-slate-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-5 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg">
                {isEditing ? `Editar / Completar Estação #${formData.itemNumber}` : 'Cadastrar Novo Equipamento'}
              </h2>
              <p className="text-xs text-blue-100">
                Coleta de inventário e preenchimento de pendências da planilha
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

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Missing info feedback banner */}
          {pendingFields.length > 0 ? (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <b className="font-bold text-amber-950">Campos com informações pendentes (fundo amarelo na planilha):</b>
                <p className="mt-0.5 text-amber-800">
                  Preencha os seguintes campos para completar o cadastro desta estação:{' '}
                  <b>{pendingFields.map((f) => f.label).join(', ')}</b>.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center gap-2 text-xs text-emerald-800 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Excelente! Esta estação está com todas as informações completas.</span>
            </div>
          )}

          {/* Section 1: Localização */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3 text-slate-800 font-semibold text-sm">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span>1. Localização Física</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Item # (Sequência)
                </label>
                <input
                  type="number"
                  value={formData.itemNumber ?? ''}
                  onChange={(e) => handleChange('itemNumber', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-blue-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Setor
                </label>
                <input
                  list="setores-list"
                  type="text"
                  value={formData.setor || ''}
                  onChange={(e) => handleChange('setor', e.target.value)}
                  placeholder="Ex: DEA, UTCI, INFORMÁTICA"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase"
                  required
                />
                <datalist id="setores-list">
                  {COMMON_OPTIONS.setores.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sala
                </label>
                <input
                  list="salas-list"
                  type="text"
                  value={formData.sala || ''}
                  onChange={(e) => handleChange('sala', e.target.value)}
                  placeholder="Ex: 133, 132, 131"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase"
                  required
                />
                <datalist id="salas-list">
                  {COMMON_OPTIONS.salas.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>

          {/* Section 2: Computador / CPU */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3 text-slate-800 font-semibold text-sm">
              <Cpu className="w-4 h-4 text-indigo-600" />
              <span>2. Computador / Estação de Trabalho</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Marca
                </label>
                <input
                  list="marcas-pc"
                  type="text"
                  value={formData.marca || ''}
                  onChange={(e) => handleChange('marca', e.target.value)}
                  placeholder="Ex: POSITIVO, HP, DELL"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase"
                  required
                />
                <datalist id="marcas-pc">
                  {COMMON_OPTIONS.marcasPC.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Modelo
                </label>
                <input
                  list="modelos-pc"
                  type="text"
                  value={formData.modelo || ''}
                  onChange={(e) => handleChange('modelo', e.target.value)}
                  placeholder="Ex: C6300 MINIPRO, PRODESK 600"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase"
                  required
                />
                <datalist id="modelos-pc">
                  {COMMON_OPTIONS.modelosPC.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Nome do Host / Máquina</span>
                  {(!formData.nome || formData.nome === '-') && (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-200 px-1.5 py-0.2 rounded">
                      Falta preencher
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={formData.nome || ''}
                  onChange={(e) => handleChange('nome', e.target.value)}
                  placeholder="Ex: SME-601-17"
                  className={`w-full px-3 py-2 rounded-lg text-sm font-mono focus:ring-2 focus:outline-none uppercase transition-all ${
                    !formData.nome || formData.nome === '-'
                      ? 'bg-amber-50 border-2 border-amber-300 focus:ring-amber-500'
                      : 'bg-white border border-slate-300 focus:ring-blue-500 text-slate-800'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Número de Série (Serial)</span>
                  {(!formData.serial || formData.serial === '-') ? (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-200 px-1.5 py-0.2 rounded">
                      Falta serial
                    </span>
                  ) : (
                    <span className="text-[10px] text-blue-600 font-normal">Leitor ativo</span>
                  )}
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={formData.serial || ''}
                    onChange={(e) => handleChange('serial', e.target.value)}
                    placeholder="Ex: BRJ2423BQ8"
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-mono font-medium focus:ring-2 focus:outline-none uppercase transition-all ${
                      !formData.serial || formData.serial === '-'
                        ? 'bg-amber-50 border-2 border-amber-300 focus:ring-amber-500'
                        : 'bg-white border border-slate-300 focus:ring-blue-500 text-slate-800'
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => openScanner('serial')}
                    className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg flex items-center gap-1 text-xs font-semibold transition-colors"
                    title="Escanear com a câmera"
                  >
                    <Camera className="w-4 h-4" />
                    <span className="hidden sm:inline">Escanear</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Monitores */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                <Monitor className="w-4 h-4 text-emerald-600" />
                <span>3. Monitores</span>
              </div>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasSecondMonitor}
                  onChange={(e) => setHasSecondMonitor(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                Possui 2º Monitor
              </label>
            </div>

            {/* Monitor 1 */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 mb-3">
              <div className="text-xs font-bold text-slate-700 mb-2">Monitor 1 (Principal)</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1 flex items-center justify-between">
                    <span>Serial Monitor 1</span>
                    {(!formData.monitor1Serial || formData.monitor1Serial === '-') && (
                      <span className="text-[10px] text-amber-800 bg-amber-100 px-1 rounded">
                        Pendente
                      </span>
                    )}
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={formData.monitor1Serial || ''}
                      onChange={(e) => handleChange('monitor1Serial', e.target.value)}
                      placeholder="Ex: 5D11H36415"
                      className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 uppercase"
                    />
                    <button
                      type="button"
                      onClick={() => openScanner('monitor1Serial')}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                      title="Escanear Serial Monitor 1"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Marca Monitor 1
                  </label>
                  <input
                    list="marcas-monitor"
                    type="text"
                    value={formData.monitor1Marca || ''}
                    onChange={(e) => handleChange('monitor1Marca', e.target.value)}
                    placeholder="Ex: POSITIVO, HP, AOC, THINK"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 uppercase"
                  />
                  <datalist id="marcas-monitor">
                    {COMMON_OPTIONS.marcasMonitor.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>

            {/* Monitor 2 */}
            {hasSecondMonitor && (
              <div className="bg-white p-3 rounded-lg border border-slate-200 transition-all">
                <div className="text-xs font-bold text-indigo-700 mb-2">Monitor 2 (Secundário)</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Serial Monitor 2
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={formData.monitor2Serial === '-' ? '' : (formData.monitor2Serial || '')}
                        onChange={(e) => handleChange('monitor2Serial', e.target.value)}
                        placeholder="Ex: 707F01596 ou BRG32404B1"
                        className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 uppercase"
                      />
                      <button
                        type="button"
                        onClick={() => openScanner('monitor2Serial')}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                        title="Escanear Serial Monitor 2"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Marca Monitor 2
                    </label>
                    <input
                      list="marcas-monitor"
                      type="text"
                      value={formData.monitor2Marca === '-' ? '' : (formData.monitor2Marca || '')}
                      onChange={(e) => handleChange('monitor2Marca', e.target.value)}
                      placeholder="Ex: POSITIVO, AOC, HP"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 uppercase"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Elétrica, Nobreak e Adaptador */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>4. Alimentação Elétrica & Nobreak</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-600">Adaptador de Vídeo:</span>
                <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5">
                  <button
                    type="button"
                    onClick={() => handleChange('adaptador', 'SIM')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                      formData.adaptador === 'SIM'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    SIM
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('adaptador', 'NÃO')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                      formData.adaptador === 'NÃO'
                        ? 'bg-slate-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    NÃO
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                id="check-nobreak"
                checked={hasNobreak}
                onChange={(e) => setHasNobreak(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <label htmlFor="check-nobreak" className="text-xs font-medium text-slate-700 cursor-pointer">
                Possui Nobreak / Módulo Isolador
              </label>
            </div>

            {hasNobreak && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3 rounded-lg border border-slate-200">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Modelo do Nobreak / Módulo
                  </label>
                  <input
                    list="modelos-nobreak"
                    type="text"
                    value={formData.nobreakModelo || ''}
                    onChange={(e) => handleChange('nobreakModelo', e.target.value)}
                    placeholder="Ex: RAGTECH NEW 1200 STD TI"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 uppercase"
                  />
                  <datalist id="modelos-nobreak">
                    {COMMON_OPTIONS.modelosNobreak.map((nb) => (
                      <option key={nb} value={nb} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Serial Nobreak
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={formData.nobreakSerial || ''}
                      onChange={(e) => handleChange('nobreakSerial', e.target.value)}
                      placeholder="Ex: 4137224121250"
                      className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 uppercase"
                    />
                    <button
                      type="button"
                      onClick={() => openScanner('nobreakSerial')}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                      title="Escanear Serial Nobreak"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 5: Responsável e Termo de Cautela */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3 text-slate-800 font-semibold text-sm">
              <User className="w-4 h-4 text-violet-600" />
              <span>5. Responsável & Termo de Entrega</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Nome do Responsável</span>
                  {(!formData.responsavel || formData.responsavel === '-') && (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-200 px-1.5 py-0.2 rounded">
                      Falta preencher
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={formData.responsavel || ''}
                  onChange={(e) => handleChange('responsavel', e.target.value)}
                  placeholder="Ex: WILLY ELIAS ALVES"
                  className={`w-full px-3 py-2 rounded-lg text-sm font-medium focus:ring-2 focus:outline-none uppercase transition-all ${
                    !formData.responsavel || formData.responsavel === '-'
                      ? 'bg-amber-50 border-2 border-amber-300 focus:ring-amber-500'
                      : 'bg-white border border-slate-300 focus:ring-blue-500 text-slate-800'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Matrícula ou CPF</span>
                  {(!formData.matriculaCpf || formData.matriculaCpf === '-') && (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-200 px-1.5 py-0.2 rounded">
                      Pendente
                    </span>
                  )}
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={formData.matriculaCpf || ''}
                    onChange={(e) => handleChange('matriculaCpf', e.target.value)}
                    placeholder="Ex: 738935 ou CPF"
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-mono focus:ring-2 focus:outline-none transition-all ${
                      !formData.matriculaCpf || formData.matriculaCpf === '-'
                        ? 'bg-amber-50 border-2 border-amber-300 focus:ring-amber-500'
                        : 'bg-white border border-slate-300 focus:ring-blue-500 text-slate-800'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => openScanner('matriculaCpf')}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                    title="Escanear Matrícula / Crachá"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Cargo / Função</span>
                  {(!formData.funcao || formData.funcao === '-') && (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-200 px-1.5 py-0.2 rounded">
                      Pendente
                    </span>
                  )}
                </label>
                <input
                  list="funcoes-list"
                  type="text"
                  value={formData.funcao || ''}
                  onChange={(e) => handleChange('funcao', e.target.value)}
                  placeholder="Ex: TÉCNICO DE INFORMÁTICA"
                  className={`w-full px-3 py-2 rounded-lg text-sm focus:ring-2 focus:outline-none uppercase transition-all ${
                    !formData.funcao || formData.funcao === '-'
                      ? 'bg-amber-50 border-2 border-amber-300 focus:ring-amber-500'
                      : 'bg-white border border-slate-300 focus:ring-blue-500 text-slate-800'
                  }`}
                />
                <datalist id="funcoes-list">
                  {COMMON_OPTIONS.funcoes.map((f) => (
                    <option key={f} value={f} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Termo Assinado?</span>
                  {formData.termoAssinado !== 'SIM' && (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-200 px-1.5 py-0.2 rounded">
                      Falta assinar
                    </span>
                  )}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleChange('termoAssinado', 'SIM')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border flex items-center justify-center gap-1.5 transition-all ${
                      formData.termoAssinado === 'SIM'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    SIM (Assinado)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('termoAssinado', 'NÃO')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border flex items-center justify-center gap-1.5 transition-all ${
                      formData.termoAssinado === 'NÃO'
                        ? 'bg-amber-500 text-slate-900 border-amber-500 font-extrabold shadow-sm ring-2 ring-amber-300'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <X className="w-3.5 h-3.5" />
                    NÃO (Pendente)
                  </button>
                </div>
              </div>
            </div>

            {/* Signature Capture Block */}
            <div className="border border-slate-200 rounded-lg p-3 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <PenTool className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-slate-700 font-medium">
                  {formData.signatureDataUrl
                    ? 'Assinatura digital capturada'
                    : 'Coletar assinatura em tela do responsável:'}
                </span>
              </div>

              {formData.signatureDataUrl ? (
                <div className="flex items-center gap-2">
                  <img
                    src={formData.signatureDataUrl}
                    alt="Assinatura"
                    className="h-9 max-w-[120px] object-contain border border-slate-200 rounded bg-slate-50 p-0.5"
                  />
                  <button
                    type="button"
                    onClick={() => setIsSignatureOpen(true)}
                    className="text-xs text-blue-600 hover:underline font-medium"
                  >
                    Trocar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsSignatureOpen(true)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <PenTool className="w-3.5 h-3.5 text-blue-600" />
                  Assinar na Tela (Celular/Tablet)
                </button>
              )}
            </div>
          </div>

          {/* Section 6: Observações */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Observações Adicionais (Avarias, periféricos, cabos, etc.)
            </label>
            <textarea
              rows={2}
              value={formData.observacoes || ''}
              onChange={(e) => handleChange('observacoes', e.target.value)}
              placeholder="Ex: Teclado e mouse USB inclusos. Monitor com cabo VGA para DisplayPort."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </form>

        {/* Footer Actions */}
        <div className="bg-slate-100 border-t border-slate-200 px-5 py-3.5 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <Save className="w-4 h-4" />
            {isEditing ? 'Salvar Alterações e Atualizar' : 'Salvar no Banco e Planilha'}
          </button>
        </div>
      </div>

      {/* Barcode / QR Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScanComplete}
        title={`Escanear Código / Serial (${scannerField})`}
      />

      {/* Digital Signature Modal */}
      <SignatureModal
        isOpen={isSignatureOpen}
        onClose={() => setIsSignatureOpen(false)}
        onSave={(dataUrl) => {
          handleChange('signatureDataUrl', dataUrl);
          handleChange('termoAssinado', 'SIM');
        }}
        responsavelNome={formData.responsavel || ''}
      />
    </div>
  );
};
