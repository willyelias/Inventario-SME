import { InventoryItem } from '../types/inventory';
import * as XLSX from 'xlsx';
import { isPrinterItem } from '../utils/inventoryValidation';

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

export function buildHeaderMap(headers: (string | undefined | null)[]): Record<string, number> {
  const map: Record<string, number> = {};
  let seenNobreak = false;

  headers.forEach((h, idx) => {
    const raw = String(h || '').trim();
    const up = raw.toUpperCase();
    if (!up) return;

    if (up.includes('NOBREAK') || up.includes('MÓDULO') || up.includes('MODULO')) {
      seenNobreak = true;
      if (!up.includes('SERIAL')) {
        map['NOBREAK_MODELO'] = idx;
        map['NOBREAK/ MÓDULO'] = idx;
        map['NOBREAK'] = idx;
      }
    }

    if (
      up === 'SERIAL' ||
      up === 'SERIE' ||
      up === 'SÉRIE' ||
      up === 'Nº DE SÉRIE' ||
      up === 'Nº SERIE' ||
      up === 'NUMERO DE SERIE'
    ) {
      if (seenNobreak && map['NOBREAK_SERIAL'] === undefined) {
        map['NOBREAK_SERIAL'] = idx;
      } else if (map['EQUIP_SERIAL'] === undefined) {
        map['EQUIP_SERIAL'] = idx;
        map['SERIAL'] = idx;
      }
    } else if (
      up.includes('SERIAL') &&
      (up.includes('NOBREAK') || up.includes('MÓDULO') || up.includes('MODULO'))
    ) {
      map['NOBREAK_SERIAL'] = idx;
    } else if (
      up.includes('SERIAL') &&
      !up.includes('MONITOR')
    ) {
      if (map['EQUIP_SERIAL'] === undefined) {
        map['EQUIP_SERIAL'] = idx;
        map['SERIAL'] = idx;
      }
    } else {
      map[up] = idx;
    }
  });

  return map;
}

export function parseFlexibleRow(
  row: any[],
  headerMap?: Record<string, number>,
  index: number = 0,
  existingItems?: InventoryItem[]
): InventoryItem {
  const getCol = (names: string[], fallbackIdx: number = -1): string => {
    if (headerMap) {
      for (const name of names) {
        const idx = headerMap[name.toUpperCase().trim()];
        if (idx !== undefined && row[idx] !== undefined && row[idx] !== null) {
          const val = String(row[idx]).trim();
          if (val !== '') return val;
        }
      }
    }
    if (fallbackIdx >= 0 && row[fallbackIdx] !== undefined && row[fallbackIdx] !== null) {
      return String(row[fallbackIdx]).trim();
    }
    return '';
  };

  const itemNumVal = getCol(['#', 'NUM', 'ITEM', 'ITEMNUMBER'], 0);
  const itemNumber = Number(itemNumVal) || index + 1;

  const rawSerial = getCol(['EQUIP_SERIAL', 'SERIAL', 'SERIE', 'SÉRIE', 'Nº SERIE', 'Nº DE SÉRIE'], 6);
  const rawSetor = getCol(['SETOR', 'DEPARTAMENTO'], 1);
  const rawSala = getCol(['SALA', 'LOCAL'], 2);
  const rawMarca = getCol(['MARCA', 'FABRICANTE'], 3);
  const rawModelo = getCol(['MODELO'], 4);
  const rawNome = getCol(['NOME', 'HOSTNAME', 'COMPUTADOR'], 5);
  const rawM1Serial = getCol(['MONITOR 1 (SERIAL)', 'MONITOR 1', 'SERIAL MONITOR 1'], 7) || '-';
  const rawM1Marca = getCol(['MARCA MONITOR 1', 'MARCA M1'], 8) || '-';
  const rawM2Serial = getCol(['MONITOR 2 (SERIAL)', 'MONITOR 2', 'SERIAL MONITOR 2'], 9) || '-';
  const rawM2Marca = getCol(['MARCA MONITOR 2', 'MARCA M2'], 10) || '-';
  const rawAdaptador = getCol(['ADAPTADOR', 'ADAPT.'], 11).toUpperCase().includes('SIM') ? 'SIM' : 'NÃO';
  const rawNbModelo = getCol(['NOBREAK_MODELO', 'NOBREAK/ MÓDULO', 'NOBREAK', 'MODULO'], 12) || '-';
  const rawNbSerial = getCol(['NOBREAK_SERIAL', 'SERIAL NOBREAK', 'SERIAL MÓDULO', 'SERIAL NOBREAK/MÓDULO'], 13) || '-';
  const rawResp = getCol(['RESPONSÁVEL', 'RESPONSAVEL', 'USUÁRIO'], 14);
  const rawMatricula = getCol(['MATRÍCULA/ CPF', 'MATRICULA/CPF', 'MATRICULA', 'CPF'], 15);
  const rawFuncao = getCol(['FUNÇÃO', 'FUNCAO', 'CARGO'], 16);
  const rawTermo = getCol(['TERMO ASSINADO', 'TERMO'], 17).toUpperCase().includes('SIM') ? 'SIM' : 'NÃO';
  const rawPatrimonio = getCol(['PATRIMÔNIO', 'PATRIMONIO', 'TOMBO', 'Nº PATRIMÔNIO']);
  let rawObs = getCol(['OBSERVAÇÕES', 'OBSERVACOES', 'DATA ATUALIZAÇÃO'], 18);

  const isPrinter = isPrinterItem({
    nome: rawNome,
    marca: rawMarca,
    modelo: rawModelo,
    observacoes: rawObs
  });

  if (isPrinter && rawPatrimonio && !rawObs) {
    rawObs = rawPatrimonio.toUpperCase().startsWith('PATRIMÔNIO') || rawPatrimonio.toUpperCase().startsWith('PATRIMONIO')
      ? rawPatrimonio
      : `Patrimônio: ${rawPatrimonio}`;
  }

  // Find matching existing item for stable ID and preserved local states
  const matchedExisting = existingItems?.find(
    (e) => (rawSerial && e.serial && e.serial.toLowerCase().trim() === rawSerial.toLowerCase().trim()) ||
           (e.itemNumber === itemNumber)
  );

  return {
    id: matchedExisting ? matchedExisting.id : `inv-${itemNumber}`,
    itemNumber,
    setor: rawSetor,
    sala: rawSala,
    marca: rawMarca,
    modelo: rawModelo,
    nome: rawNome || (isPrinter ? 'IMPRESSORA' : ''),
    serial: rawSerial,
    monitor1Serial: isPrinter ? '-' : rawM1Serial,
    monitor1Marca: isPrinter ? '-' : rawM1Marca,
    monitor2Serial: isPrinter ? '-' : rawM2Serial,
    monitor2Marca: isPrinter ? '-' : rawM2Marca,
    adaptador: isPrinter ? 'NÃO' : rawAdaptador,
    nobreakModelo: isPrinter ? '-' : rawNbModelo,
    nobreakSerial: isPrinter ? '-' : rawNbSerial,
    responsavel: isPrinter ? (rawResp || '-') : rawResp,
    matriculaCpf: isPrinter ? (rawMatricula || '-') : rawMatricula,
    funcao: isPrinter ? (rawFuncao || '-') : rawFuncao,
    termoAssinado: isPrinter ? 'NÃO' : rawTermo,
    observacoes: rawObs,
    signatureDataUrl: matchedExisting?.signatureDataUrl,
    syncedToGoogleSheet: true,
    sheetRowIndex: index + 2,
    createdAt: matchedExisting?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toLocaleString('pt-BR')
  };
}

export interface ParseXlsxResult {
  items: InventoryItem[];
  sheetName: string;
  sheetNames: string[];
  stats: {
    totalItems: number;
    computadores: number;
    impressoras: number;
    sheetsProcessed: string[];
  };
}

export function parseXlsxBuffer(
  buffer: ArrayBuffer,
  existingItems?: InventoryItem[]
): ParseXlsxResult {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const allItems: InventoryItem[] = [];
  const sheetsProcessed: string[] = [];
  let itemCounter = 1;

  for (const sheetName of workbook.SheetNames) {
    const sheetUpper = sheetName.toUpperCase().trim();
    // Skip reference/lookup sheets
    if (
      sheetUpper.includes('DADOS') ||
      sheetUpper.includes('VALIDA') ||
      sheetUpper.includes('LOOKUP') ||
      sheetUpper.includes('CONFIG') ||
      sheetUpper.includes('RESUMO') ||
      sheetUpper.includes('AJUDA')
    ) {
      continue;
    }

    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;
    const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    if (!jsonData || jsonData.length < 2) continue;

    // Find header row in first 6 rows
    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(jsonData.length, 6); i++) {
      const row = jsonData[i] || [];
      const joined = row.map((c) => String(c || '').toUpperCase()).join(' ');
      if (
        joined.includes('SETOR') ||
        joined.includes('SERIAL') ||
        joined.includes('MARCA') ||
        joined.includes('MODELO') ||
        joined.includes('PATRIMÔNIO') ||
        joined.includes('PATRIMONIO')
      ) {
        headerRowIdx = i;
        break;
      }
    }
    if (headerRowIdx === -1) continue;

    sheetsProcessed.push(sheetName);

    const rawHeaders = (jsonData[headerRowIdx] || []).map((h) => String(h || '').trim());
    const headerMap = buildHeaderMap(rawHeaders);

    const isDedicatedPrinterSheet =
      sheetUpper.includes('IMPRESSOR') ||
      sheetUpper.includes('PRINTER') ||
      sheetUpper.includes('MULTIFUNC') ||
      (!rawHeaders.some((h) => h.toUpperCase().includes('MONITOR')) &&
        rawHeaders.some((h) => h.toUpperCase().includes('PATRIM')));

    const dataRows = jsonData.slice(headerRowIdx + 1);

    for (const row of dataRows) {
      if (!row || !row.some((c) => c !== undefined && c !== null && String(c).trim() !== '')) {
        continue;
      }

      const getVal = (...keys: string[]): string => {
        for (const k of keys) {
          const idx = headerMap[k.toUpperCase()];
          if (idx !== undefined && row[idx] !== undefined && row[idx] !== null) {
            const val = String(row[idx]).trim();
            if (val !== '') return val;
          }
        }
        return '';
      };

      if (isDedicatedPrinterSheet) {
        const setor = getVal('SETOR', 'DEPARTAMENTO');
        const sala = getVal('SALA', 'LOCAL');
        const marca = getVal('MARCA', 'FABRICANTE');
        const modelo = getVal('MODELO');
        const serial = getVal('EQUIP_SERIAL', 'SERIAL', 'SERIE', 'SÉRIE', 'Nº SERIE', 'Nº DE SÉRIE');
        const patVal = getVal('PATRIMÔNIO', 'PATRIMONIO', 'TOMBO', 'Nº PATRIMÔNIO');

        // Skip completely empty identifier row
        if (!setor && !marca && !modelo && !serial) continue;

        const currentNum = itemCounter++;
        const matchedExisting = existingItems?.find(
          (e) => (serial && e.serial && e.serial.toLowerCase().trim() === serial.toLowerCase().trim()) ||
                 (e.itemNumber === currentNum)
        );

        let observacoes = '';
        if (patVal) {
          observacoes = patVal.toUpperCase().startsWith('PATRIMÔNIO') || patVal.toUpperCase().startsWith('PATRIMONIO')
            ? patVal
            : `Patrimônio: ${patVal}`;
        }

        allItems.push({
          id: matchedExisting ? matchedExisting.id : `inv-${currentNum}`,
          itemNumber: currentNum,
          setor,
          sala,
          marca,
          modelo,
          nome: 'IMPRESSORA',
          serial,
          monitor1Serial: '-',
          monitor1Marca: '-',
          monitor2Serial: '-',
          monitor2Marca: '-',
          adaptador: 'NÃO',
          nobreakModelo: '-',
          nobreakSerial: '-',
          responsavel: '-',
          matriculaCpf: '-',
          funcao: '-',
          termoAssinado: 'NÃO',
          observacoes,
          signatureDataUrl: matchedExisting?.signatureDataUrl,
          syncedToGoogleSheet: true,
          sheetRowIndex: currentNum + 1,
          createdAt: matchedExisting?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toLocaleString('pt-BR')
        });
      } else {
        const setor = getVal('SETOR', 'DEPARTAMENTO');
        const marca = getVal('MARCA', 'FABRICANTE');
        const modelo = getVal('MODELO');
        const serial = getVal('EQUIP_SERIAL', 'SERIAL', 'SERIE', 'SÉRIE', 'Nº SERIE', 'Nº DE SÉRIE');

        if (!setor && !marca && !modelo && !serial) continue;

        const currentNum = itemCounter++;
        const matchedExisting = existingItems?.find(
          (e) => (serial && e.serial && e.serial.toLowerCase().trim() === serial.toLowerCase().trim()) ||
                 (e.itemNumber === currentNum)
        );

        const sala = getVal('SALA', 'LOCAL');
        const nome = getVal('NOME', 'HOSTNAME', 'COMPUTADOR');
        const m1s = getVal('MONITOR 1 (SERIAL)', 'MONITOR 1', 'SERIAL MONITOR 1') || '-';
        const m1m = getVal('MARCA MONITOR 1', 'MARCA M1') || '-';
        const m2s = getVal('MONITOR 2 (SERIAL)', 'MONITOR 2', 'SERIAL MONITOR 2') || '-';
        const m2m = getVal('MARCA MONITOR 2', 'MARCA M2') || '-';
        const adapt = getVal('ADAPTADOR', 'ADAPT.').toUpperCase().includes('SIM') ? 'SIM' : 'NÃO';
        const nbMod = getVal('NOBREAK_MODELO', 'NOBREAK/ MÓDULO', 'NOBREAK', 'MODULO') || '-';
        const nbSer = getVal('NOBREAK_SERIAL', 'SERIAL NOBREAK', 'SERIAL MÓDULO', 'SERIAL NOBREAK/MÓDULO') || '-';
        const resp = getVal('RESPONSÁVEL', 'RESPONSAVEL', 'USUÁRIO');
        const mat = getVal('MATRÍCULA/ CPF', 'MATRICULA/CPF', 'MATRICULA', 'CPF');
        const func = getVal('FUNÇÃO', 'FUNCAO', 'CARGO');
        const termo = getVal('TERMO ASSINADO', 'TERMO').toUpperCase().includes('SIM') ? 'SIM' : 'NÃO';
        const patVal = getVal('PATRIMÔNIO', 'PATRIMONIO', 'TOMBO', 'Nº PATRIMÔNIO');
        let obs = getVal('OBSERVAÇÕES', 'OBSERVACOES');

        const isRowPrinter = isPrinterItem({
          nome,
          marca,
          modelo,
          observacoes: obs
        });

        if (isRowPrinter && patVal && !obs) {
          obs = patVal.toUpperCase().startsWith('PATRIMÔNIO') || patVal.toUpperCase().startsWith('PATRIMONIO')
            ? patVal
            : `Patrimônio: ${patVal}`;
        }

        allItems.push({
          id: matchedExisting ? matchedExisting.id : `inv-${currentNum}`,
          itemNumber: currentNum,
          setor,
          sala,
          marca,
          modelo,
          nome: isRowPrinter ? (nome || 'IMPRESSORA') : nome,
          serial,
          monitor1Serial: isRowPrinter ? '-' : m1s,
          monitor1Marca: isRowPrinter ? '-' : m1m,
          monitor2Serial: isRowPrinter ? '-' : m2s,
          monitor2Marca: isRowPrinter ? '-' : m2m,
          adaptador: isRowPrinter ? 'NÃO' : adapt,
          nobreakModelo: isRowPrinter ? '-' : nbMod,
          nobreakSerial: isRowPrinter ? '-' : nbSer,
          responsavel: isRowPrinter ? (resp || '-') : resp,
          matriculaCpf: isRowPrinter ? (mat || '-') : mat,
          funcao: isRowPrinter ? (func || '-') : func,
          termoAssinado: isRowPrinter ? 'NÃO' : termo,
          observacoes: obs,
          signatureDataUrl: matchedExisting?.signatureDataUrl,
          syncedToGoogleSheet: true,
          sheetRowIndex: currentNum + 1,
          createdAt: matchedExisting?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toLocaleString('pt-BR')
        });
      }
    }
  }

  // Count items
  let computadores = 0;
  let impressoras = 0;
  allItems.forEach((item) => {
    if (isPrinterItem(item)) {
      impressoras++;
    } else {
      computadores++;
    }
  });

  const firstSheet = sheetsProcessed[0] || workbook.SheetNames[0] || 'Inventário TI';

  return {
    items: allItems,
    sheetName: firstSheet,
    sheetNames: workbook.SheetNames,
    stats: {
      totalItems: allItems.length,
      computadores,
      impressoras,
      sheetsProcessed
    }
  };
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

  const headers = allRows[0] || [];
  const headerMap = buildHeaderMap(headers);

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
