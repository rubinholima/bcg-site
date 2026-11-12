import type { FinanceOmieMatchLevel, FinanceOmieNormalizedTitulo, FinanceOmieReconciliationState } from './finance-omie.types';

export type Cup360LancamentoLike = {
  id: string;
  tenantId: string;
  tipo: string;
  valor: unknown;
  dueDate: Date;
  settledAt: Date | null;
  status: string;
  referencia: string | null;
  documentNumber: string | null;
  contraparte: string | null;
  supplierId: string | null;
  customerId: string | null;
  recordOrigin: string | null;
};

export type ExistingOmieLink = {
  financeiroLancamentoId: string | null;
  externalId: string;
  externalObjectType: string;
};

export type MatchResult = {
  matchLevel: FinanceOmieMatchLevel;
  matchReason: string;
  candidateLancamentoId: string | null;
  omieReconciliationState: FinanceOmieReconciliationState;
  conflictCodes: string[];
};

export function decimalToNumber(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'object' && v !== null && 'toNumber' in v) {
    return (v as { toNumber: () => number }).toNumber();
  }
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

function sameDay(a: Date | null, bIso: string | null): boolean {
  if (!a || !bIso) return false;
  return a.toISOString().slice(0, 10) === bIso.slice(0, 10);
}

function amountClose(a: number, b: number): boolean {
  return Math.abs(a - b) <= 0.05;
}

export function matchOmieMirrorToCup360(input: {
  tituloTipo: 'pagar' | 'receber';
  normalized: FinanceOmieNormalizedTitulo;
  omieExternalId: string;
  existingLink: ExistingOmieLink | null;
  candidateLancamentos: Cup360LancamentoLike[];
  keepSeparatePairIds: Set<string>;
  linkedLancamentoId: string | null;
}): MatchResult {
  const conflictCodes: string[] = [];

  if (input.linkedLancamentoId) {
    return evaluateDifference(input.normalized, input.candidateLancamentos.find((l) => l.id === input.linkedLancamentoId));
  }

  if (input.existingLink?.financeiroLancamentoId) {
    return {
      matchLevel: 'CONFIRMED_IDENTITY',
      matchReason: 'FinanceExternalLink Omie com ID determinístico já vinculado.',
      candidateLancamentoId: input.existingLink.financeiroLancamentoId,
      omieReconciliationState: 'LINKED',
      conflictCodes: [],
    };
  }

  const tipoExpected = input.tituloTipo;
  const candidates = input.candidateLancamentos.filter((l) => l.tipo === tipoExpected);

  const doc = (input.normalized.documentNumber ?? input.normalized.reference ?? '').trim().toLowerCase();
  const omieAmt = input.normalized.paidAmount ?? input.normalized.originalAmount ?? 0;

  let strong: Cup360LancamentoLike | null = null;
  for (const l of candidates) {
    const ref = (l.referencia ?? l.documentNumber ?? '').trim().toLowerCase();
    const amt = decimalToNumber(l.valor);
    const docMatch = doc && ref && doc === ref;
    const amtMatch = amountClose(omieAmt, amt);
    const dueMatch = sameDay(l.dueDate, input.normalized.dueDate);
    const pairKey = `${input.omieExternalId}::${l.id}`;
    if (input.keepSeparatePairIds.has(pairKey)) continue;

    if (docMatch && amtMatch) {
      strong = l;
      break;
    }
    if (docMatch && !amtMatch) {
      conflictCodes.push('same_document_different_amount');
    }
    if (amtMatch && dueMatch && !strong) {
      strong = l;
    }
  }

  if (strong) {
    const pairKey = `${input.omieExternalId}::${strong.id}`;
    if (input.keepSeparatePairIds.has(pairKey)) {
      return {
        matchLevel: 'NO_MATCH',
        matchReason: 'Par marcado como manter separado.',
        candidateLancamentoId: null,
        omieReconciliationState: 'KEEP_SEPARATE',
        conflictCodes: [],
      };
    }
    return {
      matchLevel: 'STRONG_CANDIDATE',
      matchReason: 'Mesmo documento/referência e valor compatível — revisão obrigatória.',
      candidateLancamentoId: strong.id,
      omieReconciliationState: 'POSSIBLE_MATCH',
      conflictCodes,
    };
  }

  let possible: Cup360LancamentoLike | null = null;
  for (const l of candidates) {
    const amt = decimalToNumber(l.valor);
    if (!amountClose(omieAmt, amt)) continue;
    if (sameDay(l.dueDate, input.normalized.dueDate) || sameDay(l.settledAt, input.normalized.settlementDate)) {
      possible = l;
      break;
    }
  }

  if (possible) {
    return {
      matchLevel: 'POSSIBLE_MATCH',
      matchReason: 'Valor e datas compatíveis — não vincular automaticamente.',
      candidateLancamentoId: possible.id,
      omieReconciliationState: 'POSSIBLE_MATCH',
      conflictCodes,
    };
  }

  if (conflictCodes.length) {
    return {
      matchLevel: 'CONFLICT',
      matchReason: conflictCodes.join(', '),
      candidateLancamentoId: null,
      omieReconciliationState: 'UNMATCHED',
      conflictCodes,
    };
  }

  return {
    matchLevel: 'NO_MATCH',
    matchReason: 'Sem correspondência determinística.',
    candidateLancamentoId: null,
    omieReconciliationState: 'UNMATCHED',
    conflictCodes: [],
  };
}

function evaluateDifference(
  normalized: FinanceOmieNormalizedTitulo,
  lanc: Cup360LancamentoLike | undefined,
): MatchResult {
  if (!lanc) {
    return {
      matchLevel: 'CONFLICT',
      matchReason: 'Vínculo CUP360 ausente ou de outro tenant.',
      candidateLancamentoId: null,
      omieReconciliationState: 'DIFFERENCE',
      conflictCodes: ['missing_canonical_link'],
    };
  }
  const omiePaid = normalized.paidAmount ?? 0;
  const cupAmt = decimalToNumber(lanc.valor);
  const codes: string[] = [];
  if (normalized.statusOmie?.toLowerCase().includes('pago') && lanc.status === 'pendente') {
    codes.push('omie_paid_cup360_pending');
  }
  if (!amountClose(omiePaid, cupAmt)) {
    codes.push('settlement_amount_difference');
  }
  if (codes.length) {
    return {
      matchLevel: 'CONFLICT',
      matchReason: codes.join(', '),
      candidateLancamentoId: lanc.id,
      omieReconciliationState: 'DIFFERENCE',
      conflictCodes: codes,
    };
  }
  return {
    matchLevel: 'CONFIRMED_IDENTITY',
    matchReason: 'Vínculo confirmado e valores compatíveis.',
    candidateLancamentoId: lanc.id,
    omieReconciliationState: 'MATCHED',
    conflictCodes: [],
  };
}

export function fuzzyAutoLinkAllowed(): false {
  return false;
}
