export const FOOTBALL_AGENDA_ENTRY_TYPES = [
  'treino',
  'reuniao',
  'jogo',
  'compromisso',
  'preparacao',
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
  treino: 'Treino',
  reuniao: 'Reunião',
  jogo: 'Jogo',
  compromisso: 'Compromisso',
  preparacao: 'Preparação',
  outro: 'Outro',
};

export type FootballAgendaCalendarItemDto = {
  id: string;
  source: 'travel' | 'entry';
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
  opponentName?: string | null;
  championshipName?: string | null;
  href: string;
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
  description: string | null;
  status: string;
  travelLogisticsId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FootballAgendaOverviewDto = {
  travelsInMonth: number;
  entriesInMonth: number;
  upcomingSevenDays: number;
  byType: Record<string, number>;
};
