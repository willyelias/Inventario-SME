export interface InventoryItem {
  id: string;
  itemNumber: number;
  setor: string;
  sala: string;
  marca: string;
  modelo: string;
  nome: string;
  serial: string;
  monitor1Serial: string;
  monitor1Marca: string;
  monitor2Serial: string;
  monitor2Marca: string;
  adaptador: 'SIM' | 'NÃO';
  nobreakModelo: string;
  nobreakSerial: string;
  responsavel: string;
  matriculaCpf: string;
  funcao: string;
  termoAssinado: 'SIM' | 'NÃO' | 'PENDENTE';
  observacoes?: string;
  signatureDataUrl?: string;
  syncedToGoogleSheet?: boolean;
  sheetRowIndex?: number;
  createdAt: string;
  updatedAt: string;
}

export interface GoogleSheetConfig {
  spreadsheetId: string;
  spreadsheetTitle: string;
  sheetName: string;
  spreadsheetUrl: string;
  autoSync: boolean;
  lastSyncedAt?: string;
}

export interface SyncStatus {
  isSyncing: boolean;
  pendingCount: number;
  lastSuccessMessage?: string;
  error?: string;
}
