import { InventoryItem } from '../types/inventory';

export interface PendingFieldInfo {
  key: keyof InventoryItem;
  label: string;
}

/**
 * Detecta se o equipamento é uma impressora ou multifuncional com base nos campos do cadastro.
 */
export const isPrinterItem = (item: Partial<InventoryItem>): boolean => {
  const nomeUpper = item.nome?.toUpperCase() || '';
  const modeloUpper = item.modelo?.toUpperCase() || '';
  const obsUpper = item.observacoes?.toUpperCase() || '';
  const marcaUpper = item.marca?.toUpperCase() || '';

  return (
    nomeUpper === 'IMPRESSORA' ||
    nomeUpper.includes('IMPRESSORA') ||
    modeloUpper.includes('LASERJET') ||
    modeloUpper.includes('IMAGE RUNNER') ||
    modeloUpper.includes('MFP') ||
    modeloUpper.includes('ECOTANK') ||
    modeloUpper.includes('DESKJET') ||
    (marcaUpper === 'CANON' && (modeloUpper.includes('ADVANCE') || modeloUpper.includes('DX'))) ||
    obsUpper.includes('IMPRESSORA')
  );
};

/**
 * Verifica se um campo está vazio.
 * Um traço (-) indica que o item não possui ou não se aplica (ex: notebook sem monitor externo,
 * impressora sem nobreak, etc.) e portanto NÃO deve ser considerado pendente.
 */
export const isValueEmpty = (val?: string): boolean => {
  if (!val || typeof val !== 'string') return true;
  const trimmed = val.trim();
  if (trimmed === '-') return false;
  return trimmed === '';
};

export function getPendingFields(item: InventoryItem): PendingFieldInfo[] {
  const pending: PendingFieldInfo[] = [];
  const isPrinter = isPrinterItem(item);

  // Serial do Equipamento
  if (isValueEmpty(item.serial)) {
    pending.push({ key: 'serial', label: isPrinter ? 'Serial da Impressora' : 'Serial do PC' });
  }

  // Setor
  if (isValueEmpty(item.setor)) {
    pending.push({ key: 'setor', label: 'Setor' });
  }

  // Sala
  if (isValueEmpty(item.sala)) {
    pending.push({ key: 'sala', label: 'Sala' });
  }

  // Validações específicas para Computadores e Estações
  if (!isPrinter) {
    // Nome da Máquina (Host)
    if (isValueEmpty(item.nome)) {
      pending.push({ key: 'nome', label: 'Nome da Máquina' });
    }

    // Responsável
    if (isValueEmpty(item.responsavel)) {
      pending.push({ key: 'responsavel', label: 'Responsável' });
    }

    // Matrícula / CPF
    if (isValueEmpty(item.matriculaCpf)) {
      pending.push({ key: 'matriculaCpf', label: 'Matrícula / CPF' });
    }

    // Função / Cargo
    if (isValueEmpty(item.funcao)) {
      pending.push({ key: 'funcao', label: 'Função / Cargo' });
    }

    // Termo Assinado
    if (!item.termoAssinado || item.termoAssinado !== 'SIM') {
      pending.push({ key: 'termoAssinado', label: 'Termo Assinado' });
    }

    // Monitor 1 (apenas se vazio; traço '-' indica que não tem monitor, ex: tela de notebook)
    if (isValueEmpty(item.monitor1Serial)) {
      pending.push({ key: 'monitor1Serial', label: 'Serial Monitor 1' });
    }
  }

  return pending;
}

export function isFieldPending(item: InventoryItem, field: keyof InventoryItem): boolean {
  if (field === 'termoAssinado') {
    if (isPrinterItem(item)) return false;
    return item.termoAssinado !== 'SIM';
  }
  const val = item[field];
  return isValueEmpty(val as string);
}

export function hasPendingInfo(item: InventoryItem): boolean {
  return getPendingFields(item).length > 0;
}

/**
 * Remove duplicatas da lista de inventário com base em ID e serial normalizado.
 */
export function deduplicateInventory(items: InventoryItem[]): InventoryItem[] {
  const seenIds = new Set<string>();
  const seenSerials = new Map<string, number>();
  const seenNbSerials = new Map<string, number>();
  const result: InventoryItem[] = [];

  for (const item of items) {
    if (!item) continue;
    // Pula item com ID duplicado
    if (seenIds.has(item.id)) continue;
    seenIds.add(item.id);

    // Verifica serial normalizado (se válido e não for marcador '-')
    const normSerial = String(item.serial || '').trim().toUpperCase();
    if (normSerial && normSerial !== '-' && normSerial.length > 2) {
      if (seenSerials.has(normSerial)) {
        const existingIdx = seenSerials.get(normSerial)!;
        const existingItem = result[existingIdx];
        // Se o item atual tem ID canônico 'inv-' e o existente não, substitui
        if (item.id.startsWith('inv-') && !existingItem.id.startsWith('inv-')) {
          result[existingIdx] = item;
        }
        continue;
      }
      seenSerials.set(normSerial, result.length);
    }

    // Para itens avulsos que só possuem nobreak cadastrado (sem PC, sem monitor e sem serial de máquina)
    const normNb = String(item.nobreakSerial || '').trim().toUpperCase();
    const normNome = String(item.nome || '').trim().toUpperCase();
    const normM1 = String(item.monitor1Serial || '').trim().toUpperCase();
    const isOnlyNobreak = (!normSerial || normSerial === '-') && (!normNome || normNome === '-') && (!normM1 || normM1 === '-');
    if (isOnlyNobreak && normNb && normNb !== '-' && normNb.length > 3) {
      if (seenNbSerials.has(normNb)) {
        continue;
      }
      seenNbSerials.set(normNb, result.length);
    }

    result.push(item);
  }

  return result;
}

/**
 * Reconcilia os itens existentes com os dados importados de uma planilha:
 * - Atualiza registros existentes (mantendo ID estável e assinaturas)
 * - Inclui como novos os registros que faltavam no inventário (sem descartar linhas)
 * - Preserva os itens existentes que não vieram na planilha
 * - Elimina duplicações e assegura numeração contínua
 */
export function reconcileInventory(
  existingItems: InventoryItem[],
  incomingItems: InventoryItem[]
): {
  reconciled: InventoryItem[];
  updatedCount: number;
  addedCount: number;
} {
  // 1. Filtrar registros corrompidos/duplicatas antigas (como 'row-*')
  const cleanExisting = deduplicateInventory(
    existingItems.filter((item) => item && !item.id.startsWith('row-'))
  );

  // Deduplicar itens que vieram da planilha para evitar linhas repetidas no próprio arquivo
  const cleanIncoming = deduplicateInventory(incomingItems);

  const existingBySerial = new Map<string, InventoryItem>();
  const existingByHostname = new Map<string, InventoryItem>();
  const existingByPatrimonio = new Map<string, InventoryItem>();
  const existingByMonitor1 = new Map<string, InventoryItem>();
  const existingByNobreakOnly = new Map<string, InventoryItem>();

  const extractPatrimonio = (str?: string): string => {
    if (!str) return '';
    const match = String(str).match(/\b\d{4,8}\b/);
    return match ? match[0] : '';
  };

  cleanExisting.forEach((item) => {
    const s = String(item.serial || '').trim().toUpperCase();
    if (s && s !== '-' && s.length > 2) {
      existingBySerial.set(s, item);
    }
    const h = String(item.nome || '').trim().toUpperCase();
    if (h && h !== '-' && h !== 'IMPRESSORA' && h.length > 2) {
      existingByHostname.set(h, item);
    }
    const pat = extractPatrimonio(item.observacoes);
    if (pat && isPrinterItem(item)) {
      existingByPatrimonio.set(pat, item);
    }
    const m1 = String(item.monitor1Serial || '').trim().toUpperCase();
    if (m1 && m1 !== '-' && m1.length > 2 && !isPrinterItem(item)) {
      existingByMonitor1.set(m1, item);
    }
    const nb = String(item.nobreakSerial || '').trim().toUpperCase();
    const isOnlyNb = (!s || s === '-') && (!h || h === '-') && (!m1 || m1 === '-');
    if (isOnlyNb && nb && nb !== '-' && nb.length > 3) {
      existingByNobreakOnly.set(nb, item);
    }
  });

  const matchedExistingIds = new Set<string>();
  const finalItems: InventoryItem[] = [];
  let updatedCount = 0;
  let addedCount = 0;

  let maxItemNumber = cleanExisting.reduce((max, i) => Math.max(max, i.itemNumber || 0), 0);

  // 2. Processar itens que vieram da planilha importada
  for (const inc of cleanIncoming) {
    if (!inc) continue;

    const incSerial = String(inc.serial || '').trim().toUpperCase();
    const incNome = String(inc.nome || '').trim().toUpperCase();
    const incPat = extractPatrimonio(inc.observacoes);
    const incM1 = String(inc.monitor1Serial || '').trim().toUpperCase();
    const incNb = String(inc.nobreakSerial || '').trim().toUpperCase();
    const isIncOnlyNb = (!incSerial || incSerial === '-') && (!incNome || incNome === '-') && (!incM1 || incM1 === '-');

    let match: InventoryItem | undefined;

    // Regra 1: Serial exato
    if (incSerial && incSerial !== '-' && incSerial.length > 2 && existingBySerial.has(incSerial)) {
      const candidate = existingBySerial.get(incSerial);
      if (candidate && !matchedExistingIds.has(candidate.id)) {
        match = candidate;
      }
    }

    // Regra 2: Patrimônio de impressora
    if (!match && isPrinterItem(inc) && incPat && existingByPatrimonio.has(incPat)) {
      const candidate = existingByPatrimonio.get(incPat);
      if (candidate && !matchedExistingIds.has(candidate.id)) {
        match = candidate;
      }
    }

    // Regra 3: Hostname do computador
    if (!match && !isPrinterItem(inc) && incNome && incNome !== '-' && incNome !== 'IMPRESSORA' && existingByHostname.has(incNome)) {
      const candidate = existingByHostname.get(incNome);
      if (candidate && !matchedExistingIds.has(candidate.id)) {
        match = candidate;
      }
    }

    // Regra 4: Monitor 1 Serial (para computadores sem serial ou hostname cadastrado)
    if (!match && !isPrinterItem(inc) && incM1 && incM1 !== '-' && existingByMonitor1.has(incM1)) {
      const candidate = existingByMonitor1.get(incM1);
      if (candidate && !matchedExistingIds.has(candidate.id)) {
        match = candidate;
      }
    }

    // Regra 5: Nobreak Serial para itens somente nobreak
    if (!match && isIncOnlyNb && incNb && incNb !== '-' && existingByNobreakOnly.has(incNb)) {
      const candidate = existingByNobreakOnly.get(incNb);
      if (candidate && !matchedExistingIds.has(candidate.id)) {
        match = candidate;
      }
    }

    if (match) {
      // ATUALIZAÇÃO DO REGISTRO EXISTENTE
      matchedExistingIds.add(match.id);
      updatedCount++;

      const isIncPrinter = isPrinterItem(inc);

      finalItems.push({
        ...match,
        setor: inc.setor || match.setor,
        sala: inc.sala || match.sala,
        marca: inc.marca || match.marca,
        modelo: inc.modelo || match.modelo,
        nome: inc.nome || match.nome,
        serial: inc.serial || match.serial,
        monitor1Serial: isIncPrinter ? '-' : (inc.monitor1Serial || match.monitor1Serial),
        monitor1Marca: isIncPrinter ? '-' : (inc.monitor1Marca || match.monitor1Marca),
        monitor2Serial: isIncPrinter ? '-' : (inc.monitor2Serial || match.monitor2Serial),
        monitor2Marca: isIncPrinter ? '-' : (inc.monitor2Marca || match.monitor2Marca),
        adaptador: isIncPrinter ? 'NÃO' : (inc.adaptador || match.adaptador),
        nobreakModelo: isIncPrinter ? '-' : (inc.nobreakModelo || match.nobreakModelo),
        nobreakSerial: isIncPrinter ? '-' : (inc.nobreakSerial || match.nobreakSerial),
        responsavel: isIncPrinter ? '-' : (inc.responsavel || match.responsavel),
        matriculaCpf: isIncPrinter ? '-' : (inc.matriculaCpf || match.matriculaCpf),
        funcao: isIncPrinter ? '-' : (inc.funcao || match.funcao),
        termoAssinado: isIncPrinter ? 'NÃO' : (inc.termoAssinado || match.termoAssinado),
        observacoes: inc.observacoes !== undefined ? inc.observacoes : match.observacoes,
        signatureDataUrl: match.signatureDataUrl || inc.signatureDataUrl || '',
        updatedAt: new Date().toLocaleString('pt-BR')
      });
    } else {
      // INCLUSÃO DO QUE FALTAVA (NOVO EQUIPAMENTO)
      addedCount++;
      maxItemNumber++;
      const newId = `inv-${maxItemNumber}`;

      finalItems.push({
        ...inc,
        id: newId,
        itemNumber: maxItemNumber,
        signatureDataUrl: inc.signatureDataUrl || '',
        updatedAt: new Date().toLocaleString('pt-BR')
      });
    }
  }

  // 3. Preservar itens existentes que NÃO vieram na planilha importada
  for (const existing of cleanExisting) {
    if (!matchedExistingIds.has(existing.id)) {
      finalItems.push(existing);
    }
  }

  // 4. Garantir deduplicação final
  const dedupedFinal = deduplicateInventory(finalItems);

  // 5. Ordenação e reindexação limpa de itemNumber:
  // Coloca primeiro todos os computadores na ordem da planilha,
  // seguido por todas as impressoras na ordem da planilha.
  const comps = dedupedFinal.filter((i) => !isPrinterItem(i));
  const printers = dedupedFinal.filter(isPrinterItem);

  let seqNumber = 1;
  comps.forEach((c) => {
    c.itemNumber = seqNumber++;
  });
  printers.forEach((p) => {
    p.itemNumber = seqNumber++;
  });

  const orderedItems = [...comps, ...printers];

  return {
    reconciled: orderedItems,
    updatedCount,
    addedCount
  };
}
