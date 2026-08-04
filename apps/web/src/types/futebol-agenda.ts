export type FootballAgendaCalendarItem = {
  id: string;
  source: "travel" | "entry" | "bch_booking";
  type: string;
  title: string;
  startAt: string;
  endAt: string | null;
  allDay: boolean;
  dayPeriod?: string | null;
  tenantId: string;
  tenantName?: string;
  category: string | null;
  status: string;
  location: string | null;
  spaceId?: string | null;
  spaceName?: string | null;
  opponentName?: string | null;
  championshipName?: string | null;
  isOurTeamHome?: boolean | null;
  href: string;
  externalId?: string | null;
  agendaLocked?: boolean;
  categories?: string[];
};

export type FootballAgendaEntry = {
  id: string;
  tenantId: string;
  tenantName?: string;
  category: string | null;
  type: string;
  title: string;
  startAt: string;
  endAt: string | null;
  allDay: boolean;
  dayPeriod?: string | null;
  location: string | null;
  spaceId: string | null;
  spaceName?: string | null;
  description: string | null;
  status: string;
  travelLogisticsId: string | null;
  playerIds?: string[];
  externalId?: string | null;
  agendaLocked?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FootballAgendaOverview = {
  travelsInMonth: number;
  entriesInMonth: number;
  upcomingSevenDays: number;
  byType: Record<string, number>;
};

export const FOOTBALL_AGENDA_ENTRY_TYPES = [
  "treino",
  "reuniao",
  "jogo",
  "compromisso",
  "preparacao",
  "aniversario",
  "outro",
] as const;

export const FOOTBALL_AGENDA_TYPE_LABEL: Record<string, string> = {
  viagem: "VIAGEM",
  treino: "TREINO",
  reuniao: "REUNIÃO",
  jogo: "JOGO",
  compromisso: "COMPROMISSO",
  preparacao: "PREPARAÇÃO",
  aniversario: "ANIVERSÁRIO",
  palco: "BOSTON CITY HALL",
  outro: "OUTRO",
};

export const FOOTBALL_AGENDA_TYPE_COLOR: Record<string, string> = {
  viagem:
    "border-l-4 border-l-amber-500 bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-500/20 dark:text-amber-50 dark:border-amber-500/40",
  treino:
    "border-l-4 border-l-emerald-500 bg-emerald-100 text-emerald-950 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-50 dark:border-emerald-500/40",
  reuniao:
    "border-l-4 border-l-sky-500 bg-sky-100 text-sky-950 border-sky-300 dark:bg-sky-500/20 dark:text-sky-50 dark:border-sky-500/40",
  jogo:
    "border-l-4 border-l-violet-500 bg-violet-100 text-violet-950 border-violet-300 dark:bg-violet-500/20 dark:text-violet-50 dark:border-violet-500/40",
  compromisso:
    "border-l-4 border-l-cyan-500 bg-cyan-100 text-cyan-950 border-cyan-300 dark:bg-cyan-500/20 dark:text-cyan-50 dark:border-cyan-500/40",
  preparacao:
    "border-l-4 border-l-orange-500 bg-orange-100 text-orange-950 border-orange-300 dark:bg-orange-500/20 dark:text-orange-50 dark:border-orange-500/40",
  aniversario:
    "border-l-4 border-l-pink-500 bg-pink-100 text-pink-950 border-pink-300 dark:bg-pink-500/20 dark:text-pink-50 dark:border-pink-500/40",
  palco:
    "border-l-4 border-l-fuchsia-500 bg-fuchsia-100 text-fuchsia-950 border-fuchsia-300 dark:bg-fuchsia-500/20 dark:text-fuchsia-50 dark:border-fuchsia-500/40",
  outro:
    "border-l-4 border-l-zinc-500 bg-zinc-100 text-zinc-900 border-zinc-300 dark:bg-zinc-500/20 dark:text-zinc-100 dark:border-zinc-500/40",
};

export const TRAVEL_STATUS_LABEL: Record<string, string> = {
  rascunho: "RASCUNHO",
  planejamento: "PLANEJAMENTO",
  aprovado: "APROVADO",
  em_andamento: "EM ANDAMENTO",
  concluido: "CONCLUÍDO",
  cancelado: "CANCELADO",
};
