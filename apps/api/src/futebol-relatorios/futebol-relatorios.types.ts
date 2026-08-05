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
  /** Ordem dos titulares no gramado (máx. 11) */
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
  homeMatchAgenda: { label: string; time: string | null; notes: string | null }[];
  uniforms: {
    athletesGame: string | null;
    athletesTravel: string | null;
    staffGame: string | null;
    staffTravel: string | null;
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
