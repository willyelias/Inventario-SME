import { InventoryItem } from '../types/inventory';

export interface PendingFieldInfo {
  key: keyof InventoryItem;
  label: string;
}

export function getPendingFields(item: InventoryItem): PendingFieldInfo[] {
  const pending: PendingFieldInfo[] = [];

  // Missing computer name/hostname
  if (!item.nome || item.nome.trim() === '' || item.nome.trim() === '-') {
    pending.push({ key: 'nome', label: 'Nome da Máquina' });
  }

  // Missing computer serial
  if (!item.serial || item.serial.trim() === '' || item.serial.trim() === '-') {
    pending.push({ key: 'serial', label: 'Serial do PC' });
  }

  // Missing responsible person
  if (!item.responsavel || item.responsavel.trim() === '' || item.responsavel.trim() === '-') {
    pending.push({ key: 'responsavel', label: 'Responsável' });
  }

  // Missing Matricula / CPF
  if (!item.matriculaCpf || item.matriculaCpf.trim() === '' || item.matriculaCpf.trim() === '-') {
    pending.push({ key: 'matriculaCpf', label: 'Matrícula / CPF' });
  }

  // Missing function/role
  if (!item.funcao || item.funcao.trim() === '' || item.funcao.trim() === '-') {
    pending.push({ key: 'funcao', label: 'Função / Cargo' });
  }

  // Termo not signed
  if (!item.termoAssinado || item.termoAssinado !== 'SIM') {
    pending.push({ key: 'termoAssinado', label: 'Termo Assinado' });
  }

  // Missing monitor 1
  if (!item.monitor1Serial || item.monitor1Serial.trim() === '' || item.monitor1Serial.trim() === '-') {
    pending.push({ key: 'monitor1Serial', label: 'Serial Monitor 1' });
  }

  return pending;
}

export function isFieldPending(item: InventoryItem, field: keyof InventoryItem): boolean {
  if (field === 'termoAssinado') {
    return item.termoAssinado !== 'SIM';
  }
  const val = item[field];
  if (!val || typeof val !== 'string') return true;
  const trimmed = val.trim();
  return trimmed === '' || trimmed === '-';
}

export function hasPendingInfo(item: InventoryItem): boolean {
  return getPendingFields(item).length > 0;
}
