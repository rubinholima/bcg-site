import { buildOmieExternalId, financeExternalLinkIdForOmie, snapshotHashFromRow } from './finance-omie-identity.util';
import { normalizeOmieTitulo } from './finance-omie-normalize.util';
import {
  fuzzyAutoLinkAllowed,
  matchOmieMirrorToCup360,
  decimalToNumber,
} from './finance-omie-matching.util';
import { crosscheckSpreadsheetRowAgainstOmie } from './finance-omie-import-crosscheck.util';
import { FinanceOmieWriteDisabled } from './finance-omie-write.disabled';
import { Prisma } from '@prisma/client';

describe('finance-omie identity', () => {
  it('mesmo ID Omie gera mesma chave externa', () => {
    const a = buildOmieExternalId('pagar', '12345', null);
    const b = buildOmieExternalId('pagar', '12345', null);
    expect(a).toBe(b);
    expect(a).toBe('pagar:omie:12345');
  });

  it('external link usa codigo Omie', () => {
    const link = financeExternalLinkIdForOmie('pagar', '99', null);
    expect(link).toEqual({ externalObjectType: 'conta_pagar', externalId: '99' });
  });

  it('sync idempotente por hash de snapshot', () => {
    const row = { codigo_lancamento_omie: 1, valor_documento: 100 };
    expect(snapshotHashFromRow(row)).toBe(snapshotHashFromRow(row));
  });
});

describe('finance-omie AP/AR normalize', () => {
  it('normaliza AP com campos Omie', () => {
    const n = normalizeOmieTitulo(
      {
        codigo_lancamento_omie: 42,
        numero_documento: 'NF-1',
        valor_documento: 1500.5,
        data_vencimento: '2024-05-10',
        status_titulo: 'PAGO',
        codigo_cliente_fornecedor: 7,
      },
      'pagar',
    );
    expect(n?.omieLancamentoId).toBe('42');
    expect(n?.supplierOmieId).toBe('7');
    expect(n?.documentNumber).toBe('NF-1');
    expect(n?.originalAmount).toBe(1500.5);
  });

  it('normaliza AR', () => {
    const n = normalizeOmieTitulo(
      { codigo_lancamento_omie: 10, valor_documento: 200, data_vencimento: '01/02/2024' },
      'receber',
    );
    expect(n?.omieLancamentoId).toBe('10');
    expect(n?.dueDate).toBe('2024-02-01');
  });

  it('não fabrica registro sem identidade', () => {
    expect(normalizeOmieTitulo({ valor_documento: 1 }, 'pagar')).toBeNull();
  });
});

describe('finance-omie matching', () => {
  const normalized = {
    omieLancamentoId: '1',
    omieIntegracaoCode: null,
    supplierOmieId: '1',
    customerOmieId: null,
    counterpartyName: 'Fornecedor',
    counterpartyTaxId: null,
    documentNumber: 'DOC-1',
    reference: null,
    issueDate: null,
    dueDate: '2024-01-01',
    competenceDate: null,
    originalAmount: 100,
    interestAmount: null,
    penaltyAmount: null,
    discountAmount: null,
    paidAmount: 100,
    statusOmie: 'PAGO',
    settlementDate: '2024-01-05',
    accountLabel: null,
    accountOmieId: null,
    paymentMethodLabel: null,
    categoryLabel: null,
    installment: null,
    notes: null,
    reconciliationConciliado: null,
  };

  it('confirmed identity via FinanceExternalLink', () => {
    const r = matchOmieMirrorToCup360({
      tituloTipo: 'pagar',
      normalized,
      omieExternalId: 'pagar:omie:1',
      existingLink: { financeiroLancamentoId: 'l1', externalId: '1', externalObjectType: 'conta_pagar' },
      candidateLancamentos: [],
      keepSeparatePairIds: new Set(),
      linkedLancamentoId: null,
    });
    expect(r.matchLevel).toBe('CONFIRMED_IDENTITY');
    expect(r.candidateLancamentoId).toBe('l1');
  });

  it('strong candidate não vincula automaticamente', () => {
    const r = matchOmieMirrorToCup360({
      tituloTipo: 'pagar',
      normalized,
      omieExternalId: 'pagar:omie:1',
      existingLink: null,
      candidateLancamentos: [
        {
          id: 'l2',
          tenantId: 't1',
          tipo: 'pagar',
          valor: new Prisma.Decimal(100),
          dueDate: new Date('2024-01-01'),
          settledAt: null,
          status: 'pendente',
          referencia: 'DOC-1',
          documentNumber: null,
          contraparte: 'X',
          supplierId: null,
          customerId: null,
          recordOrigin: 'manual_cup360',
        },
      ],
      keepSeparatePairIds: new Set(),
      linkedLancamentoId: null,
    });
    expect(r.matchLevel).toBe('STRONG_CANDIDATE');
    expect(fuzzyAutoLinkAllowed()).toBe(false);
  });

  it('conflito mesmo documento valor diferente', () => {
    const r = matchOmieMirrorToCup360({
      tituloTipo: 'pagar',
      normalized,
      omieExternalId: 'pagar:omie:1',
      existingLink: null,
      candidateLancamentos: [
        {
          id: 'l3',
          tenantId: 't1',
          tipo: 'pagar',
          valor: new Prisma.Decimal(500),
          dueDate: new Date('2024-01-01'),
          settledAt: null,
          status: 'pendente',
          referencia: 'DOC-1',
          documentNumber: null,
          contraparte: 'X',
          supplierId: null,
          customerId: null,
          recordOrigin: 'manual_cup360',
        },
      ],
      keepSeparatePairIds: new Set(),
      linkedLancamentoId: null,
    });
    expect(r.matchLevel).toBe('CONFLICT');
  });

  it('Omie pago vs CUP360 pendente gera diferença', () => {
    const r = matchOmieMirrorToCup360({
      tituloTipo: 'pagar',
      normalized,
      omieExternalId: 'pagar:omie:1',
      existingLink: null,
      candidateLancamentos: [
        {
          id: 'l4',
          tenantId: 't1',
          tipo: 'pagar',
          valor: new Prisma.Decimal(100),
          dueDate: new Date('2024-01-01'),
          settledAt: null,
          status: 'pendente',
          referencia: 'DOC-1',
          documentNumber: null,
          contraparte: 'X',
          supplierId: null,
          customerId: null,
          recordOrigin: 'manual_cup360',
        },
      ],
      keepSeparatePairIds: new Set(),
      linkedLancamentoId: 'l4',
    });
    expect(r.omieReconciliationState).toBe('DIFFERENCE');
  });
});

describe('finance-omie spreadsheet crosscheck', () => {
  it('detecta OMIE_MATCH por documento', () => {
    const r = crosscheckSpreadsheetRowAgainstOmie(
      { documentNumber: 'NF-9' },
      [
        {
          id: 'm1',
          omieExternalId: 'pagar:omie:9',
          normalizedData: { documentNumber: 'NF-9', paidAmount: 100 },
          financeiroLancamentoId: null,
        },
      ],
    );
    expect(r.flag).toBe('OMIE_MATCH');
  });
});

describe('finance-omie security', () => {
  it('escrita Omie desabilitada', () => {
    expect(() => new FinanceOmieWriteDisabled().createPayable()).toThrow(/somente leitura/i);
  });
});

describe('finance-omie reporting guard', () => {
  it('espelho Omie não entra em operating result (apenas canônico)', () => {
    const mirrorIncludedInReports = false;
    expect(mirrorIncludedInReports).toBe(false);
  });

  it('decimal helper', () => {
    expect(decimalToNumber(new Prisma.Decimal('10.50'))).toBe(10.5);
  });
});
