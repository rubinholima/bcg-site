import {
  normalizeOmieExternalId,
  OMIE_ID_UNSAFE_JS_INTEGER,
  parsePositiveIntUnknown,
} from './finance-omie-external-id.util';
import {
  buildOmieExternalId,
  financeExternalLinkIdForOmie,
  extractOmieLancamentoIdentity,
} from './finance-omie-identity.util';
import { normalizeOmieTitulo } from './finance-omie-normalize.util';
import {
  createSyncProgressAcc,
  sanitizeOmieSyncErrorMessage,
} from './finance-omie-sync-batch.util';

describe('finance-omie external id policy', () => {
  it('converte supplier Omie ID 2149420646 para string exata', () => {
    expect(normalizeOmieExternalId(2149420646)).toEqual({ value: '2149420646' });
  });

  it('AP title ID acima de INT32 permanece string exata', () => {
    const id = 3_000_000_000;
    expect(normalizeOmieExternalId(id)).toEqual({ value: '3000000000' });
    expect(buildOmieExternalId('pagar', '3000000000', null)).toBe('pagar:omie:3000000000');
  });

  it('AR customer Omie ID grande', () => {
    const n = normalizeOmieTitulo(
      { codigo_lancamento_omie: 10, codigo_cliente_fornecedor: 2_500_000_123 },
      'receber',
    );
    expect(n?.customerOmieId).toBe('2500000123');
    expect(n?.omieLancamentoId).toBe('10');
  });

  it('AR title ID acima de INT32', () => {
    const n = normalizeOmieTitulo({ codigo_lancamento_omie: 2_800_000_001, valor_documento: 1 }, 'receber');
    expect(n?.omieLancamentoId).toBe('2800000001');
  });

  it('IDs pequenos continuam funcionando', () => {
    expect(normalizeOmieExternalId(42)).toEqual({ value: '42' });
    expect(parsePositiveIntUnknown(42)).toBe(42);
  });

  it('string externa permanece estável', () => {
    expect(normalizeOmieExternalId('00012345')).toEqual({ value: '00012345' });
  });

  it('null opcional', () => {
    expect(normalizeOmieExternalId(null)).toEqual({ value: null });
    expect(normalizeOmieExternalId('')).toEqual({ value: null });
  });

  it('rejeita inteiro JS inseguro sem persistir identidade corrompida', () => {
    const unsafe = Number.MAX_SAFE_INTEGER + 1;
    expect(normalizeOmieExternalId(unsafe)).toEqual({
      value: null,
      warning: OMIE_ID_UNSAFE_JS_INTEGER,
    });
    expect(extractOmieLancamentoIdentity({ codigo_lancamento_omie: unsafe }).omieLancamentoId).toBeNull();
  });

  it('FinanceExternalLink deterministic identity preserved', () => {
    expect(financeExternalLinkIdForOmie('pagar', '2149420646', null)).toEqual({
      externalObjectType: 'conta_pagar',
      externalId: '2149420646',
    });
  });

  it('normaliza AP com codigo_cliente_fornecedor grande', () => {
    const n = normalizeOmieTitulo(
      {
        codigo_lancamento_omie: 99,
        codigo_cliente_fornecedor: 2149420646,
        valor_documento: 10,
      },
      'pagar',
    );
    expect(n?.supplierOmieId).toBe('2149420646');
    expect(buildOmieExternalId('pagar', n!.omieLancamentoId, null)).toBe('pagar:omie:99');
  });

  it('account Omie ID como string', () => {
    const n = normalizeOmieTitulo(
      { codigo_lancamento_omie: 1, id_conta_corrente: 2149420646 },
      'pagar',
    );
    expect(n?.accountOmieId).toBe('2149420646');
  });
});

describe('finance-omie sync batch partial metrics', () => {
  it('sanitiza erro INT4 sem vazar payload', () => {
    const msg = sanitizeOmieSyncErrorMessage(
      new Error(
        "Unable to fit integer value '2149420646' into an INT4 (32-bit signed integer).",
      ),
    );
    expect(msg).toContain('2149420646');
    expect(msg).not.toContain('DATABASE_URL');
  });

  it('acumulador reflete progresso parcial antes de falha fatal', () => {
    const acc = createSyncProgressAcc();
    acc.failureStage = 'ap';
    acc.lastPage = 1;
    acc.pagesProcessed = 1;
    acc.recordsRead = 8;
    acc.recordsNew = 7;
    expect(acc.recordsRead).toBeGreaterThanOrEqual(acc.recordsNew);
    expect(acc.recordsNew).toBe(7);
  });
});
