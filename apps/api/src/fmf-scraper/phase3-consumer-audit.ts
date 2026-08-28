/** Matriz de auditoria read-only — consumidores de Player.goals/yellowCards/redCards (Fase 3). */
export const PLAYER_CAREER_TOTALS_AUDIT = [
  {
    consumer: 'Player model (cadastro)',
    expectedSemantics: 'Totais de carreira globais no perfil do atleta',
    currentSemantics: 'refreshPlayerCareerTotals agrega todas categorias/competições',
    risk: 'high',
    futureReplacement: 'Manter como carreira global; não usar para stats por categoria',
  },
  {
    consumer: 'players.service refreshPlayerCareerTotals',
    expectedSemantics: 'Soma FmfPlayerMatchStat + overrides',
    currentSemantics: 'Agrega cross-category após import súmula',
    risk: 'high',
    futureReplacement: 'Derivar de MatchOfficialEvent com filtro explícito quando necessário',
  },
  {
    consumer: 'futebol-relatorios (Cartões e Suspensão)',
    expectedSemantics: 'Disciplina por competição/categoria do relatório',
    currentSemantics: 'FmfPlayerMatchStat + rawParsed por partida filtrada',
    risk: 'medium',
    futureReplacement: 'MatchOfficialEvent com competition context',
  },
  {
    consumer: 'Press Kit season stats',
    expectedSemantics: 'Indefinido — pode ser global ou por categoria',
    currentSemantics: 'Agrega FmfPlayerMatchStat da temporada sem separar categorias',
    risk: 'medium',
    futureReplacement: 'Decisão de produto antes do cutover',
  },
  {
    consumer: 'Team Report / Avaliação individual',
    expectedSemantics: 'Stats da categoria/competição do relatório',
    currentSemantics: 'Mistura cadastro Player.* com stats de partida',
    risk: 'high',
    futureReplacement: 'projectPlayerStatsFromOfficialFacts filtrado por contexto',
  },
  {
    consumer: 'player-match-availability.util',
    expectedSemantics: 'Suspensão acumulada',
    currentSemantics: 'Usa yellowCards/redCards passados como input',
    risk: 'medium',
    futureReplacement: 'Eventos oficiais por competição',
  },
] as const;

/** Auditoria Team Report cross-category (read-only). */
export const TEAM_REPORT_CROSS_CATEGORY_AUDIT = {
  scenario: 'Atleta cadastrado U15 joga partida oficial U17',
  u15ReportBehavior: 'Team Report U15 usa FmfPlayerMatchStat filtrado por category=sub15 — aparição U17 não entra',
  u17ReportBehavior: 'Team Report U17 inclui partida se category da súmula = sub17',
  risk: 'Atleta pode aparecer só no relatório da categoria da súmula, não do cadastro default',
  decisionPending: true,
} as const;

/** Auditoria Press Kit cross-category (read-only). */
export const PRESS_KIT_CROSS_CATEGORY_AUDIT = {
  currentBehavior: 'Agrega stats de todas categorias na mesma temporada via FmfPlayerMatchStat',
  aggregatesAllCategories: true,
  decisionPending: true,
} as const;
