import { InventoryItem } from '../types/inventory';
import * as XLSX from 'xlsx';

export const INVENTORY_HEADERS = [
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
  'TERMO ASSINADO',
  'DATA ATUALIZAÇÃO'
];

export function extractSpreadsheetId(idOrUrl: string): string {
  const clean = idOrUrl.trim();
  // Format 1: /spreadsheets/d/ID
  const matchSheets = clean.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (matchSheets && matchSheets[1]) return matchSheets[1];

  // Format 2: /file/d/ID
  const matchDrive = clean.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
  if (matchDrive && matchDrive[1]) return matchDrive[1];

  // Format 3: ?id=ID
  const matchIdParam = clean.match(/[?&]id=([a-zA-Z0-9-_]+)/);
  if (matchIdParam && matchIdParam[1]) return matchIdParam[1];

  // Format 4: raw ID
  return clean;
}

export function itemToRow(item: InventoryItem): (string | number)[] {
  return [
    item.itemNumber,
    item.setor || '',
    item.sala || '',
    item.marca || '',
    item.modelo || '',
    item.nome || '',
    item.serial || '',
    item.monitor1Serial || '-',
    item.monitor1Marca || '-',
    item.monitor2Serial || '-',
    item.monitor2Marca || '-',
    item.adaptador || 'NÃO',
    item.nobreakModelo || '-',
    item.nobreakSerial || '-',
    item.responsavel || '',
    item.matriculaCpf || '',
    item.funcao || '',
    item.termoAssinado || 'NÃO',
    item.updatedAt || new Date().toLocaleString('pt-BR')
  ];
}

export function parseFlexibleRow(row: any[], headerMap?: Record<string, number>, index: number = 0): InventoryItem {
  const getCol = (names: string[], fallbackIdx: number): string => {
    if (headerMap) {
      for (const name of names) {
        const idx = headerMap[name.toUpperCase().trim()];
        if (idx !== undefined && row[idx] !== undefined && row[idx] !== null) {
          return String(row[idx]).trim();
        }
      }
    }
    return row[fallbackIdx] !== undefined && row[fallbackIdx] !== null ? String(row[fallbackIdx]).trim() : '';
  };

  const itemNumVal = getCol(['#', 'NUM', 'ITEM'], 0);
  const itemNumber = Number(itemNumVal) || index + 1;

  return {
    id: 'row-' + (index + 1) + '-' + Date.now(),
    itemNumber,
    setor: getCol(['SETOR', 'DEPARTAMENTO'], 1),
    sala: getCol(['SALA', 'LOCAL'], 2),
    marca: getCol(['MARCA', 'FABRICANTE'], 3),
    modelo: getCol(['MODELO'], 4),
    nome: getCol(['NOME', 'HOSTNAME', 'COMPUTADOR'], 5),
    serial: getCol(['SERIAL', 'SERIE', 'Nº SERIE'], 6),
    monitor1Serial: getCol(['MONITOR 1 (SERIAL)', 'MONITOR 1', 'SERIAL MONITOR 1'], 7) || '-',
    monitor1Marca: getCol(['MARCA MONITOR 1', 'MARCA M1'], 8) || '-',
    monitor2Serial: getCol(['MONITOR 2 (SERIAL)', 'MONITOR 2', 'SERIAL MONITOR 2'], 9) || '-',
    monitor2Marca: getCol(['MARCA MONITOR 2', 'MARCA M2'], 10) || '-',
    adaptador: getCol(['ADAPTADOR', 'ADAPT.'], 11).toUpperCase().includes('SIM') ? 'SIM' : 'NÃO',
    nobreakModelo: getCol(['NOBREAK/ MÓDULO', 'NOBREAK', 'MODULO'], 12) || '-',
    nobreakSerial: getCol(['SERIAL NOBREAK', 'SERIAL MÓDULO', 'SERIAL NOBREAK/MÓDULO'], 13) || '-',
    responsavel: getCol(['RESPONSÁVEL', 'RESPONSAVEL', 'USUÁRIO'], 14),
    matriculaCpf: getCol(['MATRÍCULA/ CPF', 'MATRICULA/CPF', 'MATRICULA', 'CPF'], 15),
    funcao: getCol(['FUNÇÃO', 'FUNCAO', 'CARGO'], 16),
    termoAssinado: getCol(['TERMO ASSINADO', 'TERMO'], 17).toUpperCase().includes('SIM') ? 'SIM' : 'NÃO',
    observacoes: getCol(['OBSERVAÇÕES', 'OBSERVACOES', 'DATA ATUALIZAÇÃO'], 18),
    syncedToGoogleSheet: true,
    sheetRowIndex: index + 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toLocaleString('pt-BR')
  };
}

export function parseXlsxBuffer(buffer: ArrayBuffer): { items: InventoryItem[]; sheetName: string } {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0] || 'Inventário TI';
  const worksheet = workbook.Sheets[sheetName];
  const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (jsonData.length === 0) {
    return { items: [], sheetName };
  }

  // Find header row (usually row 0 or row 1)
  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(jsonData.length, 5); i++) {
    const row = jsonData[i] || [];
    const joined = row.map((c) => String(c || '').toUpperCase()).join(' ');
    if (joined.includes('SETOR') || joined.includes('SERIAL') || joined.includes('MARCA')) {
      headerRowIdx = i;
      break;
    }
  }

  const headers = (jsonData[headerRowIdx] || []).map((h) => String(h || '').toUpperCase().trim());
  const headerMap: Record<string, number> = {};
  headers.forEach((h, idx) => {
    headerMap[h] = idx;
  });

  const dataRows = jsonData.slice(headerRowIdx + 1).filter((r) => r && r.length > 0 && r.some((c) => c !== undefined && c !== ''));

  const items = dataRows.map((row, idx) => parseFlexibleRow(row, headerMap, idx));
  return { items, sheetName };
}

export async function createInventorySpreadsheet(
  accessToken: string,
  title: string = 'Inventário Geral de Equipamentos de TI'
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; sheetName: string }> {
  const requestBody = {
    properties: {
      title
    },
    sheets: [
      {
        properties: {
          title: 'Inventário TI',
          gridProperties: {
            frozenRowCount: 1
          }
        },
        data: [
          {
            startRow: 0,
            startColumn: 0,
            rowData: [
              {
                values: INVENTORY_HEADERS.map((header) => ({
                  userEnteredValue: { stringValue: header },
                  userEnteredFormat: {
                    textFormat: { bold: true, fontSize: 10, foregroundColor: { red: 0.1, green: 0.1, blue: 0.1 } },
                    backgroundColor: { red: 0.94, green: 0.95, blue: 0.97 },
                    horizontalAlignment: 'CENTER'
                  }
                }))
              }
            ]
          }
        ]
      }
    ]
  };

  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Erro ao criar planilha no Google Sheets: ${response.statusText}`);
  }

  const data = await response.json();
  const spreadsheetId = data.spreadsheetId;
  const spreadsheetUrl = data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  const sheetName = data.sheets?.[0]?.properties?.title || 'Inventário TI';

  return { spreadsheetId, spreadsheetUrl, sheetName };
}

export async function fetchSpreadsheetMetadata(
  accessToken: string,
  spreadsheetId: string
): Promise<{ title: string; sheets: string[]; spreadsheetUrl: string }> {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties.title,spreadsheetUrl`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Erro ao carregar planilha (verifique se o link/ID está correto ou se o arquivo foi aberto no Google Planilhas): ${response.statusText}`);
  }

  const data = await response.json();
  const title = data.properties?.title || 'Planilha de Inventário';
  const sheets = (data.sheets || []).map((s: any) => s.properties?.title || 'Sheet1');
  const spreadsheetUrl = data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  return { title, sheets, spreadsheetUrl };
}

export async function readSpreadsheetRows(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string = 'Inventário TI'
): Promise<InventoryItem[]> {
  const range = `${sheetName}!A1:S`;
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Falha ao ler dados da planilha.');
  }

  const data = await response.json();
  const allRows: any[][] = data.values || [];
  if (allRows.length === 0) return [];

  const headers = (allRows[0] || []).map((h) => String(h || '').toUpperCase().trim());
  const headerMap: Record<string, number> = {};
  headers.forEach((h, idx) => {
    headerMap[h] = idx;
  });

  const dataRows = allRows.slice(1);
  return dataRows.map((row, idx) => parseFlexibleRow(row, headerMap, idx));
}

export async function appendInventoryRow(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  item: InventoryItem
): Promise<{ updatedRange: string }> {
  const range = `${sheetName}!A:S`;
  const row = itemToRow(item);

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: [row]
      })
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Erro ao adicionar linha na planilha do Google Sheets');
  }

  const data = await response.json();
  return { updatedRange: data.updates?.updatedRange || '' };
}

export async function batchAppendInventoryRows(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  items: InventoryItem[]
): Promise<{ updatedRows: number }> {
  if (items.length === 0) return { updatedRows: 0 };
  const range = `${sheetName}!A:S`;
  const rows = items.map(itemToRow);

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: rows
      })
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Erro ao sincronizar linhas em lote com o Google Sheets');
  }

  const data = await response.json();
  return { updatedRows: data.updates?.updatedRows || items.length };
}

export async function updateSpreadsheetRow(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  rowIndex: number,
  item: InventoryItem
): Promise<void> {
  const range = `${sheetName}!A${rowIndex}:S${rowIndex}`;
  const row = itemToRow(item);

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: [row]
      })
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Erro ao atualizar linha na planilha do Google Sheets');
  }
}
