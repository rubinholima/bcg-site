export const FOOTBALL_AGENDA_ENTRY_TYPES = [
  'treino',
  'reuniao',
  'jogo',
  'compromisso',
  'preparacao',
  'aniversario',
  'outro',
] as const;

export type FootballAgendaEntryType = (typeof FOOTBALL_AGENDA_ENTRY_TYPES)[number];

export const FOOTBALL_AGENDA_ENTRY_STATUSES = [
  'confirmado',
  'provisorio',
  'cancelado',
] as const;

export const FOOTBALL_AGENDA_TYPE_LABEL: Record<string, string> = {
  viagem: 'Viagem / jogo fora',
  palco: 'Boston City Hall (palco)',
  treino: 'Treino',
  reuniao: 'Reunião',
  jogo: 'Jogo',
  compromisso: 'Compromisso',
  preparacao: 'Preparação',
  aniversario: 'Aniversário',
  outro: 'Outro',
};

export type FootballAgendaCalendarItemDto = {
  id: string;
  source: 'travel' | 'entry' | 'bch_booking';
  type: string;
  title: string;
  startAt: string;
  endAt: string | null;
  allDay: boolean;
  tenantId: string;
  tenantName?: string;
  category: string | null;
  status: string;
  location: string | null;
  spaceId?: string | null;
  spaceName?: string | null;
  opponentName?: string | null;
  championshipName?: string | null;
  href: string;
  externalId?: string | null;
  agendaLocked?: boolean;
  categories?: string[];
};

export type FootballAgendaEntryDto = {
  id: string;
  tenantId: string;
  tenantName?: string;
  category: string | null;
  type: string;
  title: string;
  startAt: string;
  endAt: string | null;
  allDay: boolean;
  location: string | null;
  spaceId: string | null;
  spaceName?: string | null;
  description: string | null;
  status: string;
  travelLogisticsId: string | null;
  playerIds: string[];
  externalId?: string | null;
  agendaLocked?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FootballAgendaConflictDto = {
  id: string;
  title: string;
  category: string | null;
  type: string;
  startAt: string;
  endAt: string | null;
};

export type FootballAgendaOverviewDto = {
  travelsInMonth: number;
  entriesInMonth: number;
  upcomingSevenDays: number;
  byType: Record<string, number>;
};
