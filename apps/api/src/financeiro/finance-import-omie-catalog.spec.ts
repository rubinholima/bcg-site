import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { hasFinanceCapability } from './finance-access.util';
import { FinanceOmieWriteDisabled } from './omie/finance-omie-write.disabled';

const IMPORT_OMIE_SLUGS = [
  'finance_import_view',
  'finance_import_create',
  'finance_import_approve',
  'finance_import_execute',
  'finance_omie_view',
  'finance_omie_sync',
  'finance_omie_reconcile',
] as const;

function migrationSql(): string {
  const migrationDir = join(
    __dirname,
    '..',
    '..',
    'prisma',
    'migrations',
    '20261112270000_cup360_finance_import_omie_permissions',
    'migration.sql',
  );
  expect(existsSync(migrationDir)).toBe(true);
  return readFileSync(migrationDir, 'utf8');
}

describe('CUP360 finance import/omie module catalog (PROMPT 067)', () => {
  it('migration declara os 7 slugs no INSERT de Module', () => {
    const sql = migrationSql();
    for (const slug of IMPORT_OMIE_SLUGS) {
      expect(sql).toContain(`('${slug}'`);
    }
    expect(sql).toMatch(/WHERE NOT EXISTS.*"Module"/s);
  });

  it('migration usa NOT EXISTS em ModuleRole (idempotente)', () => {
    const sql = migrationSql();
    expect(sql.match(/NOT EXISTS/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  describe('granular import capabilities', () => {
    it('finance_import_view independente', () => {
      expect(hasFinanceCapability(['finance_import_view'], 'finance_import_view')).toBe(true);
      expect(hasFinanceCapability(['finance_import_view'], 'finance_import_create')).toBe(false);
      expect(hasFinanceCapability(['finance_import_view'], 'finance_import_execute')).toBe(false);
    });

    it('finance_import_create independente', () => {
      expect(hasFinanceCapability(['finance_import_create'], 'finance_import_create')).toBe(true);
      expect(hasFinanceCapability(['finance_import_create'], 'finance_import_approve')).toBe(false);
      expect(hasFinanceCapability(['finance_import_create'], 'finance_import_execute')).toBe(false);
    });

    it('finance_import_approve independente', () => {
      expect(hasFinanceCapability(['finance_import_approve'], 'finance_import_approve')).toBe(true);
      expect(hasFinanceCapability(['finance_import_approve'], 'finance_import_execute')).toBe(false);
    });

    it('finance_import_execute independente', () => {
      expect(hasFinanceCapability(['finance_import_execute'], 'finance_import_execute')).toBe(true);
      expect(hasFinanceCapability(['finance_import_execute'], 'finance_import_view')).toBe(false);
    });

    it('finance_import_view não concede execute', () => {
      expect(hasFinanceCapability(['finance_import_view'], 'finance_import_execute')).toBe(false);
    });
  });

  describe('granular Omie capabilities (somente leitura — sem write)', () => {
    it('finance_omie_view independente', () => {
      expect(hasFinanceCapability(['finance_omie_view'], 'finance_omie_view')).toBe(true);
      expect(hasFinanceCapability(['finance_omie_view'], 'finance_omie_sync')).toBe(false);
      expect(hasFinanceCapability(['finance_omie_view'], 'finance_omie_reconcile')).toBe(false);
    });

    it('finance_omie_sync independente de view explícita na cadeia view→sync', () => {
      expect(hasFinanceCapability(['finance_omie_sync'], 'finance_omie_sync')).toBe(true);
      expect(hasFinanceCapability(['finance_omie_sync'], 'finance_omie_reconcile')).toBe(false);
    });

    it('finance_omie_reconcile independente', () => {
      expect(hasFinanceCapability(['finance_omie_reconcile'], 'finance_omie_reconcile')).toBe(true);
      expect(hasFinanceCapability(['finance_omie_reconcile'], 'finance_omie_sync')).toBe(false);
    });

    it('finance_omie_view não concede sync', () => {
      expect(hasFinanceCapability(['finance_omie_view'], 'finance_omie_sync')).toBe(false);
    });

    it('finance_omie_sync não habilita escrita Omie', () => {
      expect(() => new FinanceOmieWriteDisabled().createPayable()).toThrow(/desabilitada/);
    });
  });

  describe('compatibilidade adm_financeiro e super_admin', () => {
    it('adm_financeiro implica import/omie (compatibilidade)', () => {
      expect(hasFinanceCapability(['adm_financeiro'], 'finance_import_view')).toBe(true);
      expect(hasFinanceCapability(['adm_financeiro'], 'finance_import_execute')).toBe(true);
      expect(hasFinanceCapability(['adm_financeiro'], 'finance_omie_view')).toBe(true);
      expect(hasFinanceCapability(['adm_financeiro'], 'finance_omie_sync')).toBe(true);
    });

    it('super_admin', () => {
      expect(hasFinanceCapability([], 'finance_import_execute', 'super_admin')).toBe(true);
      expect(hasFinanceCapability([], 'finance_omie_sync', 'super_admin')).toBe(true);
    });
  });

  describe('entrada financeira ordinária (sem privilégios perigosos)', () => {
    const entrySlugs = ['finance_view', 'finance_create', 'finance_edit'];

    it('não recebe import execute automaticamente', () => {
      expect(hasFinanceCapability(entrySlugs, 'finance_import_execute')).toBe(false);
    });

    it('não recebe Omie sync automaticamente', () => {
      expect(hasFinanceCapability(entrySlugs, 'finance_omie_sync')).toBe(false);
    });
  });
});
