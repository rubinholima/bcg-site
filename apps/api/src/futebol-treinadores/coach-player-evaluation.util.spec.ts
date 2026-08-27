import {
  classifyEvaluationPercentage,
  computeEvaluationAverages,
  buildIndividualPlayerPeriodStats,
  buildCategorySortOrderMap,
  isHigherCategory,
  resolvePlayerEvaluationCumulativeRange,
} from './coach-player-evaluation.util';

describe('coach-player-evaluation.util', () => {
  describe('classifyEvaluationPercentage', () => {
    it('aplica limites exatos da especificação', () => {
      expect(classifyEvaluationPercentage(90)).toBe('internacional_elite');
      expect(classifyEvaluationPercentage(89.99)).toBe('nacional_elite');
      expect(classifyEvaluationPercentage(80)).toBe('nacional_elite');
      expect(classifyEvaluationPercentage(79.99)).toBe('estadual');
      expect(classifyEvaluationPercentage(60)).toBe('estadual');
      expect(classifyEvaluationPercentage(59.99)).toBe('nao_pro');
    });
  });

  describe('computeEvaluationAverages', () => {
    it('calcula médias e percentual', () => {
      const result = computeEvaluationAverages({
        techIndividualSkill: 4,
        techBilaterality: 4,
        techNonDominantLeg: 4,
        tacCollective: 4,
        tacIndividual: 4,
        tacGameVision: 4,
        tacDecisionMaking: 4,
        physStrength: 4,
        physSpeed: 4,
        physPotential: 4,
        physMaturity: 4,
        behEmotionalControl: 4,
        behPersonality: 4,
        behDetermination: 4,
        behIntelligence: 4,
        offBuildUp: 4,
        offOrganization: 4,
        offPositioning: 4,
        defOrganization: 4,
        defRecovery: 4,
        defPositioning: 4,
        competitiveness: 4,
      });
      expect(result.overallAverage).toBe(4);
      expect(result.percentage).toBe(80);
      expect(result.classification).toBe('nacional_elite');
    });
  });

  describe('resolvePlayerEvaluationCumulativeRange', () => {
    it('acumula do início do ano até o fim da janela do período', () => {
      expect(resolvePlayerEvaluationCumulativeRange(2026, 'setembro')).toEqual({
        periodKey: 'setembro',
        season: 2026,
        start: '2026-01-01',
        end: '2026-09-30',
      });
      expect(resolvePlayerEvaluationCumulativeRange(2026, 'fim_temporada')).toEqual({
        periodKey: 'fim_temporada',
        season: 2026,
        start: '2026-01-01',
        end: '2026-12-31',
      });
    });
  });

  describe('buildIndividualPlayerPeriodStats', () => {
    const sortMap = buildCategorySortOrderMap([
      { value: 'sub17', sortOrder: 1 },
      { value: 'sub20', sortOrder: 2 },
    ]);

    it('separa convocado de jogou e subida', () => {
      const stats = buildIndividualPlayerPeriodStats({
        tenantId: 't1',
        playerId: 'p1',
        playerCategory: 'sub17',
        from: '2026-02-01',
        to: '2026-02-28',
        categorySortOrder: sortMap,
        fmfStats: [
          {
            matchId: 'm1',
            matchDate: new Date('2026-02-10T12:00:00Z'),
            category: 'sub20',
            listed: true,
            played: false,
            starter: false,
            minutesPlayed: 0,
            goals: 0,
          },
          {
            matchId: 'm2',
            matchDate: new Date('2026-02-15T12:00:00Z'),
            category: 'sub17',
            listed: true,
            played: true,
            starter: true,
            minutesPlayed: 70,
            goals: 1,
          },
        ],
        travels: [],
        coachMatchReports: [],
        trainingSessions: [],
      });

      expect(stats.gamesListed).toBe(2);
      expect(stats.gamesPlayed).toBe(1);
      expect(stats.gamesStarted).toBe(1);
      expect(stats.gamesListedHigherCategory).toBe(1);
      expect(stats.gamesPlayedHigherCategory).toBe(0);
      expect(stats.matchMinutes).toBe(70);
      expect(stats.goals).toBe(1);
    });

    it('deduplica FMF e convocação da mesma viagem', () => {
      const stats = buildIndividualPlayerPeriodStats({
        tenantId: 't1',
        playerId: 'p1',
        playerCategory: 'sub17',
        from: '2026-02-01',
        to: '2026-02-28',
        categorySortOrder: sortMap,
        fmfStats: [
          {
            matchId: 'm1',
            matchDate: new Date('2026-02-10T12:00:00Z'),
            category: 'sub20',
            listed: true,
            played: true,
            starter: false,
            minutesPlayed: 20,
            goals: 0,
          },
        ],
        travels: [
          {
            id: 'tr1',
            matchDate: new Date('2026-02-10T12:00:00Z'),
            category: 'sub20',
            categories: null,
            status: 'aprovado',
            fmfMatchReportId: 'm1',
          },
        ],
        coachMatchReports: [],
        trainingSessions: [],
      });

      expect(stats.gamesListed).toBe(1);
      expect(stats.gamesPlayed).toBe(1);
      expect(stats.gamesListedHigherCategory).toBe(1);
      expect(stats.gamesPlayedHigherCategory).toBe(1);
    });

    it('inclui jogos de meses anteriores quando o intervalo é acumulado na temporada', () => {
      const stats = buildIndividualPlayerPeriodStats({
        tenantId: 't1',
        playerId: 'p1',
        playerCategory: 'sub17',
        from: '2026-01-01',
        to: '2026-09-30',
        categorySortOrder: sortMap,
        fmfStats: [
          {
            matchId: 'm-fev',
            matchDate: new Date('2026-02-10T12:00:00Z'),
            category: 'sub17',
            listed: true,
            played: true,
            starter: true,
            minutesPlayed: 60,
            goals: 1,
          },
          {
            matchId: 'm-set',
            matchDate: new Date('2026-09-20T12:00:00Z'),
            category: 'sub17',
            listed: true,
            played: true,
            starter: false,
            minutesPlayed: 30,
            goals: 0,
          },
        ],
        travels: [],
        coachMatchReports: [],
        trainingSessions: [],
      });

      expect(stats.gamesPlayed).toBe(2);
      expect(stats.matchMinutes).toBe(90);
      expect(stats.goals).toBe(1);
    });
  });

  describe('isHigherCategory', () => {
    const sortMap = buildCategorySortOrderMap([
      { value: 'sub17', sortOrder: 1 },
      { value: 'sub20', sortOrder: 2 },
    ]);

    it('identifica categoria superior pelo sortOrder', () => {
      expect(isHigherCategory('sub17', 'sub20', sortMap)).toBe(true);
      expect(isHigherCategory('sub20', 'sub17', sortMap)).toBe(false);
    });
  });
});
