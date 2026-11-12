import { createHash } from 'crypto';
import type { FinanceOmieTituloTipo } from './finance-omie.types';

export function parsePositiveIntUnknown(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : parseInt(String(v).replace(/\D/g, ''), 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function extractOmieLancamentoIdentity(row: Record<string, unknown>): {
  omieLancamentoId: number | null;
  omieIntegracaoCode: string | null;
} {
  let omie = parsePositiveIntUnknown(row.codigo_lancamento_omie) ?? parsePositiveIntUnknown(row.chave_lancamento);
  let integracao = row.codigo_lancamento_integracao
    ? String(row.codigo_lancamento_integracao).trim() || null
  : null;

  for (const [key, val] of Object.entries(row)) {
    const kl = key.toLowerCase();
    if (omie == null && kl.includes('codigo_lancamento_omie') && !kl.includes('integracao')) {
      omie = parsePositiveIntUnknown(val);
    }
    if (integracao == null && kl === 'codigo_lancamento_integracao') {
      const s = String(val ?? '').trim();
      if (s) integracao = s;
    }
  }

  return { omieLancamentoId: omie, omieIntegracaoCode: integracao };
}

/** Identidade externa determinística — nunca usar valor/data como chave primária. */
export function buildOmieExternalId(
  tituloTipo: FinanceOmieTituloTipo,
  omieLancamentoId: number | null,
  omieIntegracaoCode: string | null,
): string | null {
  if (omieLancamentoId && omieLancamentoId > 0) {
    return `${tituloTipo}:omie:${omieLancamentoId}`;
  }
  if (omieIntegracaoCode) {
    const hash = createHash('sha256').update(omieIntegracaoCode).digest('hex').slice(0, 24);
    return `${tituloTipo}:integ:${hash}`;
  }
  return null;
}

export function financeExternalLinkIdForOmie(
  tituloTipo: FinanceOmieTituloTipo,
  omieLancamentoId: number | null,
  omieIntegracaoCode: string | null,
): { externalObjectType: string; externalId: string } | null {
  if (omieLancamentoId && omieLancamentoId > 0) {
    return {
      externalObjectType: tituloTipo === 'pagar' ? 'conta_pagar' : 'conta_receber',
      externalId: String(omieLancamentoId),
    };
  }
  if (omieIntegracaoCode) {
    return {
      externalObjectType: tituloTipo === 'pagar' ? 'conta_pagar_integracao' : 'conta_receber_integracao',
      externalId: omieIntegracaoCode,
    };
  }
  return null;
}

export function snapshotHashFromRow(row: Record<string, unknown>): string {
  return createHash('sha256').update(JSON.stringify(row)).digest('hex');
}

export function sanitizeOmieSnapshot(row: Record<string, unknown>): Record<string, unknown> {
  const clone: Record<string, unknown> = {};
  const allow = [
    'codigo_lancamento_omie',
    'codigo_lancamento_integracao',
    'codigo_cliente_fornecedor',
    'numero_documento',
    'numero_parcela',
    'valor_documento',
    'data_vencimento',
    'data_emissao',
    'data_previsao',
    'status_titulo',
    'categoria',
    'id_conta_corrente',
    'codigo_categoria',
  ];
  for (const k of allow) {
    if (row[k] != null) clone[k] = row[k];
  }
  return clone;
}
