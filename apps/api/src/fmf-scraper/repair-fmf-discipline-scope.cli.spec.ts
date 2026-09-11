import {
  parseRepairCliArgs,
  runRepairDisciplineCli,
} from '../../scripts/repair-fmf-discipline-scope.cli';
import type { ParsedFmfMatchReport } from './fmf-match-report.parser';

describe('repair-fmf-discipline-scope CLI', () => {
  it('rejeita terceira partida arbitrária fora da allowlist', async () => {
    const result = await runRepairDisciplineCli(
      { tenant: { findUnique: async () => ({ id: 't1' }) } } as never,
      {
        tenantId: 't1',
        matchIds: ['cmsgaqgl3009ep894q6k2jcb4', 'forbidden-match-id'],
        apply: false,
      },
      async () => ({}) as ParsedFmfMatchReport,
    );
    expect(result.exitCode).toBe(1);
    expect(JSON.stringify(result.payload)).toContain('allowlist');
  });

  it('apply sem planFingerprint aborta antes de planejar', async () => {
    const planSpy = jest.fn();
    const result = await runRepairDisciplineCli(
      { tenant: { findUnique: async () => ({ id: 't1' }) } } as never,
      {
        tenantId: 't1',
        matchIds: ['cmt26oqqc0062p85b2q6ubovq'],
        apply: true,
      },
      planSpy,
    );
    expect(result.exitCode).toBe(1);
    expect(JSON.stringify(result.payload)).toContain('planFingerprint');
    expect(planSpy).not.toHaveBeenCalled();
  });

  it('apply com planFingerprint errado aborta', async () => {
    const parsedBostonAway = {
      homeTeam: 'ATHLETIC',
      awayTeam: 'Boston City FUTEBOL CLUBE SAF',
      stats: [],
      playerCardEvents: [],
      staffCardEvents: [],
    } as ParsedFmfMatchReport;

    const prisma = {
      tenant: {
        findUnique: async () => ({
          id: 't1',
          name: 'Boston City',
          tradeName: 'Boston City',
          slug: 'boston',
        }),
      },
      fmfMatchReport: {
        findMany: async () => [
          {
            id: 'cmt26oqqc0062p85b2q6ubovq',
            externalMatchId: '45104',
            competition: 'SUB 13',
            homeTeam: 'ATHLETIC',
            awayTeam: 'Boston City',
            matchDate: new Date('2026-05-31'),
            sourceUrl: 'https://example.com/s.pdf',
            rawParsed: parsedBostonAway,
            occurrencesText: 'ok',
            playerStats: [],
            matchOfficialEvents: [],
            coachStatOverride: null,
          },
        ],
      },
      player: { findMany: async () => [] },
      technicalStaff: { findMany: async () => [] },
    } as never;

    const result = await runRepairDisciplineCli(
      prisma,
      {
        tenantId: 't1',
        matchIds: ['cmt26oqqc0062p85b2q6ubovq'],
        apply: true,
        planFingerprint: 'fingerprint-invalido',
      },
      async () => parsedBostonAway,
    );
    expect(result.exitCode).toBe(1);
    expect(JSON.stringify(result.payload)).toContain('planFingerprint');
  });

  it('parseRepairCliArgs extrai planFingerprint', () => {
    const args = parseRepairCliArgs([
      '--tenantId=t1',
      '--matchIds=cmt26oqqc0062p85b2q6ubovq',
      '--apply',
      '--planFingerprint=abc123',
    ]);
    expect(args.planFingerprint).toBe('abc123');
    expect(args.apply).toBe(true);
  });
});
