export type PrintPageSize = "A4" | "Letter";

export type RelatorioPessoaRow = {
  num: number;
  name: string;
  cpf: string | null;
  rg: string | null;
  birthDate: string | null;
  role?: string | null;
  /** FK no cadastro — relatório da vida do atleta */
  playerId?: string | null;
  staffId?: string | null;
  jerseyNumber?: number | null;
  position?: string | null;
  photoUrl?: string | null;
  seasonStats?: {
    season: number;
    matches: number;
    starts: number;
    minutes: number;
    goals: number;
    yellowCards: number;
    redCards: number;
  } | null;
};

export type RelatorioHospedeRow = RelatorioPessoaRow & {
  roomNumber: string;
  roomType: string;
  groupIndex: number;
  isFirstInGroup: boolean;
  groupSize: number;
};

export type RelatorioTravelMeta = {
  id: string;
  tenant: {
    id: string;
    name: string;
    tradeName: string | null;
    logoUrl: string | null;
  };
  categories: string[];
  categoryLabel: string;
  matchDate: string;
  opponentName: string | null;
  championshipName: string | null;
  stadiumName: string | null;
  city: string | null;
  country: string | null;
  transportType: string | null;
  transportLabel: string | null;
  transportDetails: string | null;
  estimatedDeparture: string | null;
  estimatedArrival: string | null;
  hotelName: string | null;
  hotelAddress: string | null;
  hotelCheckIn: string | null;
  hotelCheckOut: string | null;
  isHomeMatch: boolean;
  notes: string | null;
};

export type PassageirosReportDto = {
  travel: RelatorioTravelMeta;
  athletes: RelatorioPessoaRow[];
  staff: RelatorioPessoaRow[];
  guests: RelatorioPessoaRow[];
  generatedAt: string;
};

export type HospedesReportDto = {
  travel: RelatorioTravelMeta;
  rows: RelatorioHospedeRow[];
  generatedAt: string;
};

export type ProgramacaoSemanalCell = {
  time: string;
  title: string;
  type: string;
  typeLabel: string;
  location: string | null;
};

export type ProgramacaoSemanalDay = {
  date: string;
  weekdayLabel: string;
  dateLabel: string;
  byCategory: Record<string, ProgramacaoSemanalCell[]>;
};

export type ProgramacaoSemanalReportDto = {
  tenant: { id: string; name: string; logoUrl: string | null };
  period: { from: string; to: string; label: string };
  categories: string[];
  categoryLabels: Record<string, string>;
  days: ProgramacaoSemanalDay[];
  generatedAt: string;
};

export type LayoutRelacionadosStop = {
  place: string;
  arriveAt: string | null;
  departAt: string | null;
  notes: string | null;
};

export type LayoutRelacionadosReportDto = {
  travel: RelatorioTravelMeta;
  athletes: RelatorioPessoaRow[];
  staff: RelatorioPessoaRow[];
  guests: RelatorioPessoaRow[];
  busType: string | null;
  outbound: LayoutRelacionadosStop[];
  returnStops: LayoutRelacionadosStop[];
  homeMatchAgenda: { label: string; time: string | null; notes: string | null }[];
  uniforms: {
    athletesGame: string | null;
    athletesTravel: string | null;
    staffGame: string | null;
    staffTravel: string | null;
  };
  generatedAt: string;
};

export type PressKitNamedRole = {
  name: string;
  role: string;
};

export type PressKitConfigDto = {
  phase: string | null;
  matchTime: string | null;
  referees: PressKitNamedRole[];
  directors: PressKitNamedRole[];
  starterPlayerIds: string[];
  contactLine: string | null;
  showDisclaimer: boolean;
};

export type PressKitReportDto = {
  travel: RelatorioTravelMeta;
  athletes: RelatorioPessoaRow[];
  staff: RelatorioPessoaRow[];
  starters: RelatorioPessoaRow[];
  substitutes: RelatorioPessoaRow[];
  config: PressKitConfigDto;
  opponentLogoUrl: string | null;
  championshipLogoUrl: string | null;
  generatedAt: string;
};

export const DEFAULT_PRESS_KIT_REFEREE_ROLES = [
  "Árbitro(a)",
  "Árbitro(a) Assistente 1",
  "Árbitro(a) Assistente 2",
  "Quarto(a) Árbitro(a)",
] as const;

export const DEFAULT_PRESS_KIT_DIRECTOR_ROLES = [
  "Presidente",
  "Gerente de Futebol",
  "Gestor de Futebol",
  "Supervisor de Futebol",
] as const;

export type FutebolReportKind =
  | "passageiros"
  | "hospedes"
  | "programacao"
  | "layout-relacionados"
  | "press-kit"
  | "guia-partida";

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

export type GuiaPositionGroup = "GOL" | "DEF" | "MEI" | "ATA";

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
  result: "V" | "E" | "D" | null;
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
  hasOfficialData: boolean;
  generatedAt: string;
};
