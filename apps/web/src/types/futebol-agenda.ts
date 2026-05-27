export type FootballAgendaCalendarItem = {
  id: string;
  source: "travel" | "entry";
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
  location: string | null;
  description: string | null;
  status: string;
  travelLogisticsId: string | null;
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
  "outro",
] as const;

export const FOOTBALL_AGENDA_TYPE_LABEL: Record<string, string> = {
  viagem: "Viagem",
  treino: "Treino",
  reuniao: "Reunião",
  jogo: "Jogo",
  compromisso: "Compromisso",
  preparacao: "Preparação",
  outro: "Outro",
};

export const FOOTBALL_AGENDA_TYPE_COLOR: Record<string, string> = {
  viagem: "bg-amber-500/20 text-amber-200 border-amber-500/35",
  treino: "bg-emerald-500/20 text-emerald-200 border-emerald-500/35",
  reuniao: "bg-sky-500/20 text-sky-200 border-sky-500/35",
  jogo: "bg-violet-500/20 text-violet-200 border-violet-500/35",
  compromisso: "bg-cyan-500/20 text-cyan-200 border-cyan-500/35",
  preparacao: "bg-orange-500/20 text-orange-200 border-orange-500/35",
  outro: "bg-zinc-500/20 text-zinc-300 border-zinc-500/35",
};

export const TRAVEL_STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  planejamento: "Planejamento",
  aprovado: "Aprovado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};
