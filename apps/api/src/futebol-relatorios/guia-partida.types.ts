import type {
  PressKitConfigDto,
  RelatorioPessoaRow,
  RelatorioTravelMeta,
} from './futebol-relatorios.types';

export type GuiaCampaignLine = {
  label: string;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  winRate: number;
};

export type GuiaStatLine = {
  label: string;
  matches: number;
  starts: number;
  minutes: number;
  goals: number;
  yellowCards: number;
  redCards: number;
};

export type GuiaPositionGroup = 'GOL' | 'DEF' | 'MEI' | 'ATA';

export type GuiaSquadPlayer = {
  playerId: string | null;
  name: string;
  shortName: string;
  jerseyNumber: number | null;
  position: string | null;
  positionLabel: string;
  positionGroup: GuiaPositionGroup;
  birthDate: string | null;
  age: number | null;
  height: number | null;
  weight: number | null;
  photoUrl: string | null;
  isStarter: boolean;
  season: GuiaStatLine;
  byCompetition: GuiaStatLine[];
  career: {
    matches: number;
    minutes: number;
    goals: number;
    yellowCards: number;
    redCards: number;
  };
};

export type GuiaMatchLine = {
  id: string;
  date: string;
  dateLabel: string;
  competition: string;
  phase: string | null;
  round: number | null;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  scoreLabel: string;
  isHome: boolean;
  opponent: string;
  result: 'V' | 'E' | 'D' | null;
};

export type GuiaLineupPlayer = {
  playerId: string | null;
  name: string;
  shortName: string;
  jerseyNumber: number | null;
  positionGroup: GuiaPositionGroup;
  minutes: number;
  goals: number;
  enteredMinute: number | null;
  exitedMinute: number | null;
};

export type GuiaLineup = {
  match: GuiaMatchLine;
  starters: GuiaLineupPlayer[];
  bench: GuiaLineupPlayer[];
};

export type GuiaRankingRow = {
  playerId: string | null;
  name: string;
  shortName: string;
  jerseyNumber: number | null;
  value: number;
  detail: string | null;
};

export type GuiaAgendaDay = {
  date: string;
  weekdayLabel: string;
  dateLabel: string;
  isMatchDay: boolean;
  items: {
    time: string;
    title: string;
    typeLabel: string;
    location: string | null;
  }[];
};

export type GuiaStandingRow = {
  position: number;
  team: string;
  points: number;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  winRate: number;
  isClub: boolean;
};

export type GuiaNextMatch = {
  id: string;
  date: string;
  dateLabel: string;
  opponent: string;
  competition: string | null;
  venue: string | null;
  isHome: boolean;
};

export type GuiaPartidaReportDto = {
  travel: RelatorioTravelMeta;
  config: PressKitConfigDto;
  opponentLogoUrl: string | null;
  championshipLogoUrl: string | null;
  season: number;
  /** Elenco relacionado para a partida, com números da temporada */
  squad: GuiaSquadPlayer[];
  staff: RelatorioPessoaRow[];
  campaign: {
    overall: GuiaCampaignLine;
    byCompetition: GuiaCampaignLine[];
    home: GuiaCampaignLine;
    away: GuiaCampaignLine;
  };
  headToHead: {
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    matches: GuiaMatchLine[];
  };
  recentResults: GuiaMatchLine[];
  lastLineups: GuiaLineup[];
  topScorers: GuiaRankingRow[];
  topMinutes: GuiaRankingRow[];
  topCards: GuiaRankingRow[];
  agenda: GuiaAgendaDay[];
  nextMatches: GuiaNextMatch[];
  standings: GuiaStandingRow[];
  /** Sem dados oficiais importados — o guia exibe só cadastro/planejamento */
  hasOfficialData: boolean;
  generatedAt: string;
};
