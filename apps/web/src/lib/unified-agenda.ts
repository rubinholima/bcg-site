import { api } from "@/lib/api";
import { agendaHubUrl, AGENDA_VISAO, type AgendaVisao } from "@/lib/agenda-hub";
import {
  FOOTBALL_AGENDA_TYPE_LABEL,
  TRAVEL_STATUS_LABEL,
  type FootballAgendaCalendarItem,
} from "@/types/futebol-agenda";
import { BOOKING_STATUS_LABEL } from "@/types/boston-city-hall";
import type { VenueBooking } from "@/types/boston-city-hall";
import { getCategoryLabel } from "@/lib/fixture-categories";
import {
  agendaCalendarPillClass,
  compareAgendaEventsByPriority,
  type AgendaMatchSide,
} from "@/lib/agenda-match-style";
import { dateKeyInBrazil, BRAZIL_TZ } from "@/lib/brazil-time";
import {
  type AgendaConfigPayload,
  type AgendaColorSwatch,
  type AgendaDataSource,
  buildPermissionsFromAreas,
  categoryPillStyle,
  findAgendaCategory,
  resolveAgendaCategorySlug,
  swatchToStyle,
} from "@/lib/agenda-config";

/** Slug da área na agenda (vem do cadastro AgendaArea). */
export type AgendaSource = string;

export type AgendaDataSourceKey = AgendaDataSource;

export type UnifiedAgendaEvent = {
  id: string;
  source: AgendaSource;
  /** Tipo bruto do futebol (jogo, viagem, aniversario…) */
  eventType?: string;
  title: string;
  subtitle: string;
  startAt: string;
  endAt: string | null;
  allDay: boolean;
  typeLabel: string;
  href: string;
  tone: string;
  dotClass: string;
  tenantId?: string;
  tenantName?: string;
  location?: string | null;
  championshipName?: string | null;
  statusLabel?: string | null;
  categoryLabel?: string | null;
  /** Slug da categoria de elenco principal (ex.: sub20). */
  categoryValue?: string | null;
  /** Todas as categorias de elenco do evento (viagens podem ter várias). */
  squadCategories?: string[];
  categorySlug?: string | null;
  categoryPillStyle?: { backgroundColor: string; color: string; borderColor: string };
  matchSide?: "casa" | "fora" | null;
};

function collectSquadCategories(item: FootballAgendaCalendarItem): string[] {
  const set = new Set<string>();
  if (item.category?.trim()) set.add(item.category.trim());
  for (const c of item.categories ?? []) {
    if (c?.trim()) set.add(c.trim());
  }
  return [...set];
}

export function eventMatchesSquadCategory(
  event: UnifiedAgendaEvent,
  categoryValue: string,
): boolean {
  if (!categoryValue || categoryValue === "all") return true;
  return (event.squadCategories ?? []).includes(categoryValue);
}

/** @deprecated use config areas — fallback estático */
export const AGENDA_SOURCE_LABELS: Record<string, string> = {
  futebol: "Futebol",
  psicologia: "Psicologia",
  consultas: "Psicologia",
  "boston-hall": "Boston City Hall",
  marketing: "Marketing",
};

export const AGENDA_SOURCE_DOT: Record<string, string> = {
  futebol: "bg-sky-400",
  "boston-hall": "bg-amber-400",
  psicologia: "bg-emerald-400",
  consultas: "bg-emerald-400",
  marketing: "bg-violet-400",
};

export const AGENDA_SOURCE_TONE: Record<string, string> = {
  futebol: "bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-500/15 dark:text-sky-100 dark:border-sky-500/40",
  "boston-hall": "bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-500/15 dark:text-amber-100 dark:border-amber-500/40",
  psicologia: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-100 dark:border-emerald-500/40",
  consultas: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-100 dark:border-emerald-500/40",
  marketing: "bg-violet-100 text-violet-900 border-violet-300 dark:bg-violet-500/15 dark:text-violet-100 dark:border-violet-500/40",
};

export const AGENDA_SOURCE_MANAGE_HREF: Record<string, string> = {
  futebol: "/dashboard/futebol/logistica/agenda",
  psicologia: "/dashboard/consultas",
  "boston-hall": "/dashboard/eventos/boston-city-hall/agenda",
  consultas: "/dashboard/consultas",
  marketing: "/dashboard/marketing",
};

export const AGENDA_SOURCE_CREATE_HREF: Record<string, string> = {
  futebol: "/dashboard/futebol/logistica/agenda?new=1",
  psicologia: "/dashboard/consultas",
  "boston-hall": "/dashboard/eventos/boston-city-hall/reservas",
  consultas: "/dashboard/consultas",
  marketing: "/dashboard/marketing",
};

/** Tons legíveis — preferir agendaCalendarPillClass no calendário. */
const FUTEBOL_TONE: Record<string, string> = {
  viagem: agendaCalendarPillClass("viagem", "fora"),
  treino: agendaCalendarPillClass("treino"),
  reuniao: agendaCalendarPillClass("reuniao"),
  jogo: agendaCalendarPillClass("jogo"),
  compromisso: agendaCalendarPillClass("compromisso"),
  preparacao: agendaCalendarPillClass("preparacao"),
  aniversario: agendaCalendarPillClass("aniversario"),
  palco: agendaCalendarPillClass("palco"),
  outro: agendaCalendarPillClass("outro"),
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
  if (visao === AGENDA_VISAO.PSICOLOGIA || visao === AGENDA_VISAO.CONSULTAS) return "psicologia";
  return visao as AgendaSource;
}

export function sourceFilterToVisao(filter: AgendaSource | "all"): AgendaVisao {
  if (filter === "all") return AGENDA_VISAO.GERAL;
  if (filter === "psicologia") return AGENDA_VISAO.PSICOLOGIA;
  if (filter === "futebol") return AGENDA_VISAO.FUTEBOL;
  if (filter === "boston-hall") return AGENDA_VISAO.BOSTON_HALL;
  if (filter === "marketing") return AGENDA_VISAO.MARKETING;
  if (filter === "consultas") return AGENDA_VISAO.CONSULTAS;
  return AGENDA_VISAO.GERAL;
}

export function monthRangeIso(year: number, month: number) {
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function dateKeyFromIso(iso: string): string {
  return dateKeyInBrazil(iso);
}

export function todayDateKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatAgendaTime(iso: string, allDay: boolean): string {
  if (allDay) return "Dia inteiro";
  const date = new Date(iso);
  return date.toLocaleTimeString("pt-BR", {
    timeZone: BRAZIL_TZ,
    hour: "2-digit",
    minute: "2-digit",
  });
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

function applyCategoryColors(
  config: AgendaConfigPayload,
  areaSlug: string,
  eventType?: string | null,
  matchSide?: AgendaMatchSide,
): {
  categorySlug: string;
  pillStyle: { backgroundColor: string; color: string; borderColor: string };
  swatch: AgendaColorSwatch;
} {
  const categorySlug = resolveAgendaCategorySlug({
    areaSlug,
    eventType,
    matchSide,
  });
  const cat = findAgendaCategory(config.categories, categorySlug);
  const swatch = categoryPillStyle(cat);
  return { categorySlug, pillStyle: swatchToStyle(swatch), swatch };
}

function normalizeFutebol(
  item: FootballAgendaCalendarItem,
  config: AgendaConfigPayload,
): UnifiedAgendaEvent {
  const type = item.type || "outro";
  const squadCategories = collectSquadCategories(item);
  const categoryLabel = squadCategories.length
    ? squadCategories.map((c) => getCategoryLabel(c, "pt")).join(", ")
    : null;
  const primaryCategory = squadCategories[0] ?? null;
  const statusLabel =
    item.source === "travel"
      ? TRAVEL_STATUS_LABEL[item.status] ?? item.status
      : item.status === "confirmado"
        ? "CONFIRMADO"
        : item.status === "provisorio"
          ? "PROVISÓRIO"
          : item.status === "cancelado"
            ? "CANCELADO"
            : item.status;

  const matchSide: AgendaMatchSide =
    item.isOurTeamHome === true
      ? "casa"
      : item.isOurTeamHome === false
        ? "fora"
        : null;

  const typeLabel =
    matchSide === "casa"
      ? "JOGO EM CASA"
      : matchSide === "fora"
        ? "JOGO FORA"
        : FOOTBALL_AGENDA_TYPE_LABEL[type] ?? type;

  const subtitleParts = [item.tenantName, categoryLabel].filter(Boolean);
  const { categorySlug, pillStyle } = applyCategoryColors(config, "futebol", type, matchSide);

  return {
    id: `futebol-${item.id}`,
    source: "futebol",
    eventType: type,
    title: item.title,
    subtitle: subtitleParts.join(" · ") || "Futebol",
    startAt: item.startAt,
    endAt: item.endAt,
    allDay: item.allDay,
    typeLabel,
    href: item.href || agendaHubUrl(AGENDA_VISAO.FUTEBOL),
    tone: agendaCalendarPillClass(type, matchSide),
    dotClass:
      matchSide === "casa"
        ? "bg-emerald-500"
        : matchSide === "fora"
          ? "bg-amber-400"
          : FUTEBOL_DOT[type] ?? FUTEBOL_DOT.outro,
    tenantId: item.tenantId || undefined,
    tenantName: item.tenantName,
    location: item.location,
    championshipName: item.championshipName,
    statusLabel,
    categoryLabel,
    categoryValue: primaryCategory,
    squadCategories,
    categorySlug,
    categoryPillStyle: pillStyle,
    matchSide,
  };
}

function normalizeBch(booking: VenueBooking, config: AgendaConfigPayload): UnifiedAgendaEvent {
  const { pillStyle } = applyCategoryColors(config, "boston-hall");
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
    categoryPillStyle: pillStyle,
  };
}

function normalizeConsulta(
  c: {
    id: string;
    playerName?: string;
    tenantName?: string;
    date?: string;
    time?: string;
    status?: string;
  },
  config: AgendaConfigPayload,
  areaSlug = "psicologia",
): UnifiedAgendaEvent | null {
  if (!c.date || c.status === "cancelled" || c.status === "completed") return null;
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  if (c.date < todayKey) return null;
  const startAt = `${c.date}T${c.time ?? "09:00"}:00`;
  const { pillStyle } = applyCategoryColors(config, areaSlug);
  return {
    id: `consulta-${c.id}`,
    source: areaSlug,
    title: c.playerName ?? "Consulta",
    subtitle: c.tenantName ?? "Psicologia",
    startAt,
    endAt: null,
    allDay: false,
    typeLabel: "Consulta",
    href: "/dashboard/consultas",
    tone: AGENDA_SOURCE_TONE.psicologia ?? AGENDA_SOURCE_TONE.consultas,
    dotClass: AGENDA_SOURCE_DOT.psicologia ?? AGENDA_SOURCE_DOT.consultas,
    categoryPillStyle: pillStyle,
  };
}

function normalizeMarketing(
  p: {
    id: string;
    title: string | null;
    scheduledAt: string | null;
    status: string;
    tenant?: { name: string } | null;
  },
  config: AgendaConfigPayload,
): UnifiedAgendaEvent | null {
  if (!p.scheduledAt) return null;
  const statusLabel =
    p.status === "scheduled" ? "Agendada" : p.status === "published" ? "Publicada" : "Rascunho";
  const { pillStyle } = applyCategoryColors(config, "marketing");
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
    categoryPillStyle: pillStyle,
  };
}

export type AgendaFetchPermissions = Record<AgendaDataSource, boolean>;

export async function fetchUnifiedAgendaEvents(
  year: number,
  month: number,
  permissions: AgendaFetchPermissions,
  config?: AgendaConfigPayload,
): Promise<UnifiedAgendaEvent[]> {
  const { fetchAgendaConfig } = await import("@/lib/agenda-config");
  const cfg = config ?? (await fetchAgendaConfig());
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
          for (const row of Array.isArray(data) ? data : []) events.push(normalizeFutebol(row, cfg));
        })
        .catch(() => undefined),
    );
  }

  if (permissions["boston-hall"]) {
    tasks.push(
      api
        .get<VenueBooking[]>(
          `/boston-city-hall/bookings?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        )
        .then(({ data }) => {
          for (const row of Array.isArray(data) ? data : []) {
            if (row.status !== "cancelled") events.push(normalizeBch(row, cfg));
          }
        })
        .catch(() => undefined),
    );
  }

  if (permissions.consultas) {
    const psiArea = cfg.areas.find((a) => a.dataSource === "consultas");
    const areaSlug = psiArea?.slug ?? "psicologia";
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
            const ev = normalizeConsulta(row, cfg, areaSlug);
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
            const ev = normalizeMarketing(row, cfg);
            if (ev) events.push(ev);
          }
        })
        .catch(() => undefined),
    );
  }

  await Promise.all(tasks);
  return events.sort((a, b) =>
    compareAgendaEventsByPriority(
      { type: a.eventType ?? "", startAt: a.startAt },
      { type: b.eventType ?? "", startAt: b.startAt },
    ),
  );
}

export { buildPermissionsFromAreas };

export function groupEventsByDate(events: UnifiedAgendaEvent[]): Map<string, UnifiedAgendaEvent[]> {
  const map = new Map<string, UnifiedAgendaEvent[]>();
  for (const ev of events) {
    const key = dateKeyFromIso(ev.startAt);
    const list = map.get(key) ?? [];
    list.push(ev);
    map.set(key, list);
  }
  for (const [key, list] of map) {
    map.set(
      key,
      [...list].sort((a, b) =>
        compareAgendaEventsByPriority(
          { type: a.eventType ?? "", startAt: a.startAt },
          { type: b.eventType ?? "", startAt: b.startAt },
        ),
      ),
    );
  }
  return map;
}
