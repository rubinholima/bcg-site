import { createHash } from 'crypto';
import type { FinanceOmieTituloTipo } from './finance-omie.types';
import { normalizeOmieExternalId } from './finance-omie-external-id.util';

export { normalizeOmieExternalId, parsePositiveIntUnknown, OMIE_ID_UNSAFE_JS_INTEGER } from './finance-omie-external-id.util';

export function extractOmieLancamentoIdentity(row: Record<string, unknown>): {
  omieLancamentoId: string | null;
  omieIntegracaoCode: string | null;
  identityWarning?: string;
} {
  const fromOmie = normalizeOmieExternalId(row.codigo_lancamento_omie);
  const fromChave = normalizeOmieExternalId(row.chave_lancamento);
  let omie = fromOmie.value ?? fromChave.value ?? null;
  let identityWarning = fromOmie.warning ?? fromChave.warning;

  let integracao = row.codigo_lancamento_integracao
    ? String(row.codigo_lancamento_integracao).trim() || null
    : null;

  for (const [key, val] of Object.entries(row)) {
    const kl = key.toLowerCase();
    if (omie == null && kl.includes('codigo_lancamento_omie') && !kl.includes('integracao')) {
      const r = normalizeOmieExternalId(val);
      omie = r.value;
      if (r.warning) identityWarning = r.warning;
    }
    if (integracao == null && kl === 'codigo_lancamento_integracao') {
      const s = String(val ?? '').trim();
      if (s) integracao = s;
    }
  }

  return { omieLancamentoId: omie, omieIntegracaoCode: integracao, identityWarning };
}

/** Identidade externa determinística — nunca usar valor/data como chave primária. */
export function buildOmieExternalId(
  tituloTipo: FinanceOmieTituloTipo,
  omieLancamentoId: string | null,
  omieIntegracaoCode: string | null,
): string | null {
  if (omieLancamentoId) {
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
  omieLancamentoId: string | null,
  omieIntegracaoCode: string | null,
): { externalObjectType: string; externalId: string } | null {
  if (omieLancamentoId) {
    return {
      externalObjectType: tituloTipo === 'pagar' ? 'conta_pagar' : 'conta_receber',
      externalId: omieLancamentoId,
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
