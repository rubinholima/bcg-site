import { api } from "@/lib/api";
import { agendaHubUrl, AGENDA_VISAO, type AgendaVisao } from "@/lib/agenda-hub";
import { FOOTBALL_AGENDA_TYPE_LABEL } from "@/types/futebol-agenda";
import { BOOKING_STATUS_LABEL } from "@/types/boston-city-hall";
import type { FootballAgendaCalendarItem } from "@/types/futebol-agenda";
import type { VenueBooking } from "@/types/boston-city-hall";

export type AgendaSource = "futebol" | "boston-hall" | "consultas" | "marketing";

export type UnifiedAgendaEvent = {
  id: string;
  source: AgendaSource;
  title: string;
  subtitle: string;
  startAt: string;
  endAt: string | null;
  allDay: boolean;
  typeLabel: string;
  href: string;
  tone: string;
  dotClass: string;
};

export const AGENDA_SOURCE_LABELS: Record<AgendaSource, string> = {
  futebol: "Futebol",
  "boston-hall": "Boston City Hall",
  consultas: "Consultas",
  marketing: "Marketing",
};

export const AGENDA_SOURCE_DOT: Record<AgendaSource, string> = {
  futebol: "bg-sky-400",
  "boston-hall": "bg-amber-400",
  consultas: "bg-emerald-400",
  marketing: "bg-violet-400",
};

export const AGENDA_SOURCE_TONE: Record<AgendaSource, string> = {
  futebol: "bg-sky-500/15 text-sky-100 border-sky-500/40",
  "boston-hall": "bg-amber-500/15 text-amber-100 border-amber-500/40",
  consultas: "bg-emerald-500/15 text-emerald-100 border-emerald-500/40",
  marketing: "bg-violet-500/15 text-violet-100 border-violet-500/40",
};

export const AGENDA_SOURCE_MANAGE_HREF: Record<AgendaSource, string> = {
  futebol: "/dashboard/futebol/logistica/agenda",
  "boston-hall": "/dashboard/eventos/boston-city-hall/agenda",
  consultas: "/dashboard/consultas",
  marketing: "/dashboard/marketing",
};

export const AGENDA_SOURCE_CREATE_HREF: Record<AgendaSource, string> = {
  futebol: "/dashboard/futebol/logistica/agenda?new=1",
  "boston-hall": "/dashboard/eventos/boston-city-hall/reservas",
  consultas: "/dashboard/consultas",
  marketing: "/dashboard/marketing",
};

const FUTEBOL_TONE: Record<string, string> = {
  viagem: "bg-amber-500/25 text-amber-50 border-amber-500/50",
  treino: "bg-emerald-500/25 text-emerald-50 border-emerald-500/50",
  reuniao: "bg-sky-500/25 text-sky-50 border-sky-500/50",
  jogo: "bg-violet-500/25 text-violet-50 border-violet-500/50",
  compromisso: "bg-cyan-500/25 text-cyan-50 border-cyan-500/50",
  preparacao: "bg-orange-500/25 text-orange-50 border-orange-500/50",
  aniversario: "bg-pink-500/25 text-pink-50 border-pink-500/50",
  palco: "bg-fuchsia-500/25 text-fuchsia-50 border-fuchsia-500/50",
  outro: "bg-zinc-500/25 text-zinc-100 border-zinc-500/40",
};

const FUTEBOL_DOT: Record<string, string> = {
  viagem: "bg-amber-400",
  treino: "bg-emerald-400",
  reuniao: "bg-sky-400",
  jogo: "bg-violet-400",
  compromisso: "bg-cyan-400",
  preparacao: "bg-orange-400",
  aniversario: "bg-pink-400",
  palco: "bg-fuchsia-400",
  outro: "bg-zinc-400",
};

export function visaoToSourceFilter(visao: AgendaVisao): AgendaSource | "all" {
  if (visao === AGENDA_VISAO.GERAL) return "all";
  return visao as AgendaSource;
}

export function sourceFilterToVisao(filter: AgendaSource | "all"): AgendaVisao {
  if (filter === "all") return AGENDA_VISAO.GERAL;
  return filter;
}

export function monthRangeIso(year: number, month: number) {
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function dateKeyFromIso(iso: string): string {
  return iso.slice(0, 10);
}

export function todayDateKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatAgendaTime(iso: string, allDay: boolean): string {
  if (allDay) return "Dia inteiro";
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function formatAgendaDateLong(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00`);
  return d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function normalizeFutebol(item: FootballAgendaCalendarItem): UnifiedAgendaEvent {
  const type = item.type || "outro";
  return {
    id: `futebol-${item.id}`,
    source: "futebol",
    title: item.title,
    subtitle: [item.tenantName, item.category].filter(Boolean).join(" · ") || "Futebol",
    startAt: item.startAt,
    endAt: item.endAt,
    allDay: item.allDay,
    typeLabel: FOOTBALL_AGENDA_TYPE_LABEL[type] ?? type,
    href: item.href || agendaHubUrl(AGENDA_VISAO.FUTEBOL),
    tone: FUTEBOL_TONE[type] ?? FUTEBOL_TONE.outro,
    dotClass: FUTEBOL_DOT[type] ?? FUTEBOL_DOT.outro,
  };
}

function normalizeBch(booking: VenueBooking): UnifiedAgendaEvent {
  return {
    id: `bch-${booking.id}`,
    source: "boston-hall",
    title: booking.title?.trim() || booking.contactName || "Reserva",
    subtitle: booking.spaceName ?? "Boston City Hall",
    startAt: booking.startAt,
    endAt: booking.endAt,
    allDay: false,
    typeLabel: BOOKING_STATUS_LABEL[booking.status] ?? booking.status,
    href: "/dashboard/eventos/boston-city-hall/reservas",
    tone: AGENDA_SOURCE_TONE["boston-hall"],
    dotClass: AGENDA_SOURCE_DOT["boston-hall"],
  };
}

function normalizeConsulta(c: {
  id: string;
  playerName?: string;
  tenantName?: string;
  date?: string;
  time?: string;
  status?: string;
}): UnifiedAgendaEvent | null {
  if (!c.date || c.status === "cancelled") return null;
  const startAt = `${c.date}T${c.time ?? "09:00"}:00`;
  return {
    id: `consulta-${c.id}`,
    source: "consultas",
    title: c.playerName ?? "Consulta",
    subtitle: c.tenantName ?? "Psicologia",
    startAt,
    endAt: null,
    allDay: false,
    typeLabel: c.status === "completed" ? "Realizada" : "Agendada",
    href: "/dashboard/consultas",
    tone: AGENDA_SOURCE_TONE.consultas,
    dotClass: AGENDA_SOURCE_DOT.consultas,
  };
}

function normalizeMarketing(p: {
  id: string;
  title: string | null;
  scheduledAt: string | null;
  status: string;
  tenant?: { name: string } | null;
}): UnifiedAgendaEvent | null {
  if (!p.scheduledAt) return null;
  const statusLabel =
    p.status === "scheduled" ? "Agendada" : p.status === "published" ? "Publicada" : "Rascunho";
  return {
    id: `mkt-${p.id}`,
    source: "marketing",
    title: p.title?.trim() || "Publicação",
    subtitle: p.tenant?.name ?? "Marketing",
    startAt: p.scheduledAt,
    endAt: null,
    allDay: false,
    typeLabel: statusLabel,
    href: "/dashboard/marketing",
    tone: AGENDA_SOURCE_TONE.marketing,
    dotClass: AGENDA_SOURCE_DOT.marketing,
  };
}

export type AgendaFetchPermissions = {
  futebol: boolean;
  bostonHall: boolean;
  consultas: boolean;
  marketing: boolean;
};

export async function fetchUnifiedAgendaEvents(
  year: number,
  month: number,
  permissions: AgendaFetchPermissions,
): Promise<UnifiedAgendaEvent[]> {
  const { from, to } = monthRangeIso(year, month);
  const events: UnifiedAgendaEvent[] = [];
  const tasks: Promise<void>[] = [];

  if (permissions.futebol) {
    tasks.push(
      api
        .get<FootballAgendaCalendarItem[]>(
          `/futebol-agenda/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        )
        .then(({ data }) => {
          for (const row of Array.isArray(data) ? data : []) events.push(normalizeFutebol(row));
        })
        .catch(() => undefined),
    );
  }

  if (permissions.bostonHall) {
    tasks.push(
      api
        .get<VenueBooking[]>(
          `/boston-city-hall/bookings?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        )
        .then(({ data }) => {
          for (const row of Array.isArray(data) ? data : []) {
            if (row.status !== "cancelled") events.push(normalizeBch(row));
          }
        })
        .catch(() => undefined),
    );
  }

  if (permissions.consultas) {
    tasks.push(
      api
        .get<
          Array<{
            id: string;
            playerName?: string;
            tenantName?: string;
            date?: string;
            time?: string;
            status?: string;
          }>
        >("/consultations")
        .then(({ data }) => {
          for (const row of Array.isArray(data) ? data : []) {
            const ev = normalizeConsulta(row);
            if (!ev) continue;
            const key = dateKeyFromIso(ev.startAt);
            const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
            const monthEnd = `${year}-${String(month + 1).padStart(2, "0")}-31`;
            if (key >= monthStart && key <= monthEnd) events.push(ev);
          }
        })
        .catch(() => undefined),
    );
  }

  if (permissions.marketing) {
    tasks.push(
      api
        .get<
          Array<{
            id: string;
            title: string | null;
            scheduledAt: string | null;
            status: string;
            tenant?: { name: string } | null;
          }>
        >(`/marketing/posts?year=${year}&month=${month + 1}`)
        .then(({ data }) => {
          for (const row of Array.isArray(data) ? data : []) {
            const ev = normalizeMarketing(row);
            if (ev) events.push(ev);
          }
        })
        .catch(() => undefined),
    );
  }

  await Promise.all(tasks);
  return events.sort((a, b) => a.startAt.localeCompare(b.startAt));
}

export function groupEventsByDate(events: UnifiedAgendaEvent[]): Map<string, UnifiedAgendaEvent[]> {
  const map = new Map<string, UnifiedAgendaEvent[]>();
  for (const ev of events) {
    const key = dateKeyFromIso(ev.startAt);
    const list = map.get(key) ?? [];
    list.push(ev);
    map.set(key, list);
  }
  return map;
}
