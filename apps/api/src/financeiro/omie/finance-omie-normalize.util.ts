import type { FinanceOmieNormalizedTitulo, FinanceOmieTituloTipo } from './finance-omie.types';
import { extractOmieLancamentoIdentity, normalizeOmieExternalId } from './finance-omie-identity.util';

function asText(v: unknown): string | null {
  if (v == null || v === '') return null;
  const s = String(v).trim();
  return s || null;
}

function asMoney(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? Math.abs(n) : null;
}

function asIsoDate(v: unknown): string | null {
  const s = asText(v);
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
}

function settlementFromRow(row: Record<string, unknown>, tituloTipo: FinanceOmieTituloTipo) {
  const block = (tituloTipo === 'pagar' ? row.pagamento : row.recebimento) as Record<string, unknown> | undefined;
  if (!block || typeof block !== 'object') return { paid: null as number | null, date: null as string | null };
  return {
    paid: asMoney(block.valor ?? block.valor_baixa ?? block.valorPago),
    date: asIsoDate(block.data ?? block.data_baixa ?? block.data_credito),
  };
}

export function normalizeOmieTitulo(
  row: Record<string, unknown>,
  tituloTipo: FinanceOmieTituloTipo,
): FinanceOmieNormalizedTitulo | null {
  const { omieLancamentoId, omieIntegracaoCode, identityWarning } = extractOmieLancamentoIdentity(row);
  if (!omieLancamentoId && !omieIntegracaoCode) return null;

  const counterpartyRaw = normalizeOmieExternalId(row.codigo_cliente_fornecedor);
  const accountRaw = normalizeOmieExternalId(row.id_conta_corrente);
  const identityWarnings: string[] = [];
  if (identityWarning) identityWarnings.push(identityWarning);
  if (counterpartyRaw.warning) identityWarnings.push(counterpartyRaw.warning);
  if (accountRaw.warning) identityWarnings.push(accountRaw.warning);

  const counterpartyOmieId = counterpartyRaw.value;
  const settlement = settlementFromRow(row, tituloTipo);

  return {
    omieLancamentoId,
    omieIntegracaoCode,
    supplierOmieId: tituloTipo === 'pagar' ? counterpartyOmieId : null,
    customerOmieId: tituloTipo === 'receber' ? counterpartyOmieId : null,
    identityWarnings: identityWarnings.length ? identityWarnings : undefined,
    counterpartyName: asText(row.nome_cliente_fornecedor ?? row._nomeEnriquecidoOmie),
    counterpartyTaxId: asText(row._cnpjCpfCadastroOmie ?? row.cnpj_cpf),
    documentNumber: asText(row.numero_documento ?? row.numero_pedido),
    reference: asText(row.codigo_barras_ficha_compensacao ?? row.chave_nfe),
    issueDate: asIsoDate(row.data_emissao ?? row.data_emissao_documento),
    dueDate: asIsoDate(row.data_vencimento),
    competenceDate: asIsoDate(row.data_competencia),
    originalAmount: asMoney(row.valor_documento),
    interestAmount: asMoney(row.valor_juros),
    penaltyAmount: asMoney(row.valor_multa),
    discountAmount: asMoney(row.valor_desconto),
    paidAmount: settlement.paid ?? asMoney(row.valor_documento),
    statusOmie: asText(row.status_titulo),
    settlementDate: settlement.date,
    accountLabel: asText(row.nome_conta_corrente),
    accountOmieId: accountRaw.value,
    paymentMethodLabel: asText(row.codigo_forma_pagamento ?? row.descricao_forma_pagamento),
    categoryLabel: asText(row.categoria ?? row.codigo_categoria),
    installment: asText(row.numero_parcela),
    notes: asText(row.observacao ?? row.observacoes),
    reconciliationConciliado: asText(row.conciliado),
  };
}
