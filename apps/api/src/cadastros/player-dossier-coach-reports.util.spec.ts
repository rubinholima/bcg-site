import {
  canAccessCoachReportsInDossier,
  dedupeCoachReportSelections,
  parseCoachReportSelectionsRaw,
  parseCoachReportSelectionsBody,
} from './player-dossier-coach-reports.util';

describe('player-dossier-coach-reports.util', () => {
  it('deduplica seleções', () => {
    expect(
      dedupeCoachReportSelections([
        { kind: 'coach_player_evaluation', id: 'a' },
        { kind: 'coach_player_evaluation', id: 'a' },
        { kind: 'coach_match_rating', id: 'b' },
      ]),
    ).toEqual([
      { kind: 'coach_player_evaluation', id: 'a' },
      { kind: 'coach_match_rating', id: 'b' },
    ]);
  });

  it('parseia query coachReports', () => {
    expect(
      parseCoachReportSelectionsRaw(
        'coach_player_evaluation:ev1,coach_team_report_player:tr1,invalid,x',
      ),
    ).toEqual([
      { kind: 'coach_player_evaluation', id: 'ev1' },
      { kind: 'coach_team_report_player', id: 'tr1' },
    ]);
  });

  it('parseia body JSON', () => {
    expect(
      parseCoachReportSelectionsBody([
        { kind: 'coach_match_rating', id: 'm1' },
        { kind: 'coach_player_evaluation', id: 'e1' },
      ]),
    ).toEqual([
      { kind: 'coach_match_rating', id: 'm1' },
      { kind: 'coach_player_evaluation', id: 'e1' },
    ]);
  });

  it('RBAC de relatórios de treinadores', () => {
    expect(canAccessCoachReportsInDossier(['futebol_treinadores'], 'gestor')).toBe(true);
    expect(canAccessCoachReportsInDossier(['futebol_analise'], 'gestor')).toBe(false);
    expect(canAccessCoachReportsInDossier([], 'super_admin')).toBe(true);
    expect(canAccessCoachReportsInDossier([], 'company_admin')).toBe(true);
  });
});
