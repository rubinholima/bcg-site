export type RelatorioPessoaRow = {
  num: number;
  name: string;
  /** Apelido do cadastro (registrationProfile.personal.nickname) */
  nickname?: string | null;
  cpf: string | null;
  rg: string | null;
  /** Órgão emissor do RG (cadastro do atleta / convidado) */
  rgIssuer?: string | null;
  birthDate: string | null;
  role?: string | null;
  /** FK no cadastro — relatório da vida do atleta */
  playerId?: string | null;
  staffId?: string | null;
  jerseyNumber?: number | null;
  cbfRegistration?: string | null;
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

export type PressKitNamedRole = {
  name: string;
  role: string;
  /** FK do cadastro de árbitros (quando houver) */
  refereeId?: string | null;
  photoUrl?: string | null;
};

export type PressKitUniformKitDto = {
  name: string;
  imageUrl: string | null;
  items: Array<{ name: string; imageUrl: string | null }>;
};

/** Config persistida em TravelLogistics.beatscodeMeta.pressKit */
export type PressKitConfigDto = {
  phase: string | null;
  matchTime: string | null;
  referees: PressKitNamedRole[];
  directors: PressKitNamedRole[];
  /** Ordem dos titulares no gramado (máx. 11) — índice = slot da formação */
  starterPlayerIds: string[];
  /** Esquema tático (ex.: 4-3-3, 4-4-2) */
  formation: string | null;
  /** Camisa editada só neste jogo (playerId → número) */
  jerseyOverrides: Record<string, number | null>;
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
  /** Escudo do adversário (cadastro de times visitantes, por nome) */
  opponentLogoUrl: string | null;
  /** Logo do campeonato (cadastro de campeonatos, por nome) */
  championshipLogoUrl: string | null;
  /** Kit de jogo escolhido no planejamento (camisa, calção e meião). */
  uniformKit: PressKitUniformKitDto | null;
  generatedAt: string;
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
  homeMatchAgenda: {
    date: string | null;
    label: string;
    time: string | null;
    notes: string | null;
  }[];
  uniforms: {
    athletesGame: string | null;
    athletesTravel: string | null;
    staffGame: string | null;
    staffTravel: string | null;
  };
  /** Kits resolvidos do cadastro (com fotos) — paralelo a `uniforms` */
  uniformKits: {
    athletesGame: PressKitUniformKitDto | null;
    athletesTravel: PressKitUniformKitDto | null;
    staffGame: PressKitUniformKitDto | null;
    staffTravel: PressKitUniformKitDto | null;
  };
  generatedAt: string;
};

export const DEFAULT_PRESS_KIT_REFEREE_ROLES = [
  'Árbitro(a)',
  'Árbitro(a) Assistente 1',
  'Árbitro(a) Assistente 2',
  'Quarto(a) Árbitro(a)',
] as const;

export const DEFAULT_PRESS_KIT_DIRECTOR_ROLES = [
  'Presidente',
  'Gerente de Futebol',
  'Gestor de Futebol',
  'Supervisor de Futebol',
] as const;

export type SumulaMatchListItemDto = {
  id: string;
  matchDate: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  competition: string;
  category: string;
  season: number;
  label: string;
};

export type SumulaCartoesMatchPlayerDto = {
  jerseyNumber: number | null;
  name: string;
  cbfRegistration: string | null;
  starter: boolean;
  played: boolean;
  minutesPlayed: number;
  goals: number;
  yellowCards: number;
  redCards: number;
  playerId?: string | null;
};

export type SumulaCartoesMatchTeamDto = {
  teamName: string;
  score: number | null;
  players: SumulaCartoesMatchPlayerDto[];
};

export type SumulaCartoesMatchDto = {
  id: string;
  competition: string;
  phase: string | null;
  round: number | null;
  category: string;
  categoryLabel: string;
  season: number;
  matchDate: string;
  kickoffTime: string | null;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  sourceUrl: string;
  home: SumulaCartoesMatchTeamDto;
  away: SumulaCartoesMatchTeamDto;
};

export type SumulaCartoesDisciplineRowDto = {
  num: number;
  playerId: string;
  name: string;
  jerseyNumber: number | null;
  category: string | null;
  categoryLabel: string;
  yellowCards: number;
  redCards: number;
  matches: Array<{
    matchDate: string;
    label: string;
    yellowCards: number;
    redCards: number;
  }>;
};

export type SumulaCartoesReportDto = {
  tenant: {
    id: string;
    name: string;
    logoUrl: string | null;
  };
  filters: {
    season: number;
    category: string | null;
    categoryLabel: string;
    matchId: string | null;
  };
  match: SumulaCartoesMatchDto | null;
  discipline: SumulaCartoesDisciplineRowDto[];
  generatedAt: string;
};

export type CartoesSuspensaoRoundDto = {
  matchId: string;
  round: number | null;
  matchDate: string;
  shortLabel: string;
  opponentName: string;
  yellowCards: number;
  redCards: number;
};

export type CartoesSuspensaoPlayerDto = {
  num: number;
  playerId: string;
  name: string;
  positionLabel: string;
  jerseyNumber: number | null;
  roundCells: Array<'A' | 'AM' | 'V' | 'VM' | 'P' | 'SA' | 'ST' | ''>;
  yellowCardsTotal: number;
  redCardsTotal: number;
  unavailable: boolean;
  unavailableReason: string | null;
  aptoForNextRound: boolean;
};

export type CartoesSuspensaoReportDto = {
  tenant: {
    id: string;
    name: string;
    logoUrl: string | null;
  };
  filters: {
    season: number;
    category: string;
    categoryLabel: string;
    competition: string | null;
    phase: string | null;
  };
  nextRound: {
    round: number | null;
    matchDate: string;
    label: string;
  } | null;
  rounds: CartoesSuspensaoRoundDto[];
  players: CartoesSuspensaoPlayerDto[];
  totals: {
    yellowByRound: number[];
    redByRound: number[];
    yellowCards: number;
    redCards: number;
    matchCount: number;
    avgYellowPerMatch: number;
    avgRedPerMatch: number;
  };
  generatedAt: string;
};
