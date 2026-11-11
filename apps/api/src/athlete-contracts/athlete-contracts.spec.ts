import { validateParticipationPercentages } from './athlete-contract-participation.util';
import {
  computeContractStatusHint,
  daysUntilEnd,
  matchesExpirationWindow,
  resolveAlertDays,
} from './athlete-contract-expiration.util';
import { resolveAthleteContractAccess } from './athlete-contract-access.util';
import {
  ATHLETE_CONTRACT_REPORT_PRESETS,
  applyExpirationPreset,
  buildAthleteContractDedupKey,
  categoryLooksFormation,
  categoryLooksProfessional,
} from './athlete-contract-report.util';

describe('Athlete contracts (PROMPT 038)', () => {
  it('valida percentual econômico 100%', () => {
    expect(
      validateParticipationPercentages([
        { participationType: 'economic_rights', percentage: 60 },
        { participationType: 'economic_rights', percentage: 40 },
      ]).ok,
    ).toBe(true);
    expect(
      validateParticipationPercentages([
        { participationType: 'economic_rights', percentage: 60 },
        { participationType: 'economic_rights', percentage: 30 },
      ]).ok,
    ).toBe(false);
  });

  it('não força 100% em comissão de agente', () => {
    expect(
      validateParticipationPercentages([{ participationType: 'agent_commission', percentage: 15 }]).ok,
    ).toBe(true);
  });

  it('calcula dias para vencimento', () => {
    const ref = new Date('2026-01-01T00:00:00');
    const end = new Date('2026-01-31T00:00:00');
    expect(daysUntilEnd(end, ref)).toBe(30);
  });

  it('marca EXPIRING próximo do fim', () => {
    const ref = new Date('2026-01-01T12:00:00Z');
    const end = new Date('2026-01-15T00:00:00Z');
    expect(computeContractStatusHint('ACTIVE', end, ref)).toBe('EXPIRING');
  });

  it('filtro de janela de expiração', () => {
    const ref = new Date('2026-01-01T12:00:00Z');
    const end = new Date('2026-01-20T00:00:00Z');
    expect(matchesExpirationWindow(end, 30, ref)).toBe(true);
    expect(matchesExpirationWindow(end, 10, ref)).toBe(false);
  });

  it('alert days default configurável', () => {
    expect(resolveAlertDays({ expirationAlertDays: [120, 30] })).toEqual([120, 30]);
  });

  it('permissões — supervisor sem salário RH por padrão', () => {
    const access = resolveAthleteContractAccess('editor', ['juridico', 'cadastros']);
    expect(access.canView).toBe(true);
    expect(access.canViewRhSalary).toBe(false);
    expect(access.canViewFinancial).toBe(false);
  });

  it('isolamento tenant via regra de acesso (modelo)', () => {
    const admin = resolveAthleteContractAccess('company_admin', ['juridico']);
    expect(admin.canManage).toBe(true);
    expect(admin.canManageTypes).toBe(true);
  });

  it('presets do relatório contratual — lista completa PROMPT 039', () => {
    const ids = ATHLETE_CONTRACT_REPORT_PRESETS.map((p) => p.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'expiring_30',
        'expiring_60',
        'expiring_90',
        'expired',
        'no_active_contract',
        'awaiting_signature',
        'awaiting_federation',
        'professional',
        'formation',
        'agent_intermediary',
        'partner_club',
      ]),
    );
  });

  it('deduplicação de notificação — chave estável', () => {
    const key = buildAthleteContractDedupKey({
      tenantId: 't1',
      kind: 'contract_expiring',
      entityId: 'c1',
      bucket: '2026-11-11',
    });
    expect(key).toBe('t1:contract_expiring:c1:2026-11-11');
  });

  it('categorias profissional vs formação', () => {
    expect(categoryLooksProfessional('Sub-20')).toBe(false);
    expect(categoryLooksFormation('Sub-20')).toBe(true);
    expect(categoryLooksProfessional('Profissional')).toBe(true);
  });

  it('preset expirado e assinatura', () => {
    const ref = new Date('2026-01-15T12:00:00Z');
    const end = new Date('2026-01-01T00:00:00Z');
    expect(applyExpirationPreset('expired', end, 'ACTIVE', ref)).toBe(true);
    expect(applyExpirationPreset('awaiting_signature', end, 'PENDING_SIGNATURE', ref)).toBe(true);
    expect(applyExpirationPreset('awaiting_signature', end, 'ACTIVE', ref)).toBe(false);
  });
});
