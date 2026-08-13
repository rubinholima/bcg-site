/** Estilos e ordenação da agenda de futebol — alto contraste no calendário. */

import { dateKeyInBrazil } from "@/lib/brazil-time";

export type AgendaMatchSide = "casa" | "fora" | null;

/** Prioridade: jogos (casa/fora) → demais → aniversário por último. */
export function agendaEventSortPriority(type: string): number {
  if (type === "jogo" || type === "viagem") return 0;
  if (type === "aniversario") return 90;
  return 40;
}

const AGENDA_PERIOD_SORT_TIME: Record<string, string> = {
  manha: "08:00:00",
  tarde: "13:00:00",
  noite: "19:00:00",
};

function agendaEffectiveSortAt(
  startAt: string,
  opts?: { allDay?: boolean; dayPeriod?: string | null },
): string {
  const period = opts?.dayPeriod;
  if (period === "manha" || period === "tarde" || period === "noite") {
    const dateKey = startAt.slice(0, 10);
    return `${dateKey}T${AGENDA_PERIOD_SORT_TIME[period]}-03:00`;
  }
  if (opts?.allDay) {
    const dateKey = startAt.slice(0, 10);
    return `${dateKey}T11:58:00-03:00`;
  }
  return startAt;
}

export function compareAgendaEventsByPriority(
  a: { type: string; startAt: string; allDay?: boolean; dayPeriod?: string | null },
  b: { type: string; startAt: string; allDay?: boolean; dayPeriod?: string | null },
): number {
  const byTime = agendaEffectiveSortAt(a.startAt, a).localeCompare(
    agendaEffectiveSortAt(b.startAt, b),
  );
  if (byTime !== 0) return byTime;
  return agendaEventSortPriority(a.type) - agendaEventSortPriority(b.type);
}

/** Dia no calendário — jogos/viagens na data do jogo, não do embarque. */
export function resolveAgendaCalendarDateKey(item: {
  source: string;
  type: string;
  startAt: string;
  endAt?: string | null;
}): string {
  if (
    item.source === "travel" &&
    (item.type === "jogo" || item.type === "viagem") &&
    item.endAt
  ) {
    return dateKeyInBrazil(item.endAt);
  }
  return dateKeyInBrazil(item.startAt);
}

/**
 * Pills do calendário — fundo sólido + texto claro (não depende só de dark:).
 * Casa = verde; Fora = âmbar; resto por tipo.
 */
export function agendaCalendarPillClass(
  type: string,
  matchSide?: AgendaMatchSide,
): string {
  if (type === "viagem" || matchSide === "fora") {
    return "bg-amber-500 text-zinc-950 border-amber-300 font-semibold shadow-sm";
  }
  if (type === "jogo" && matchSide === "casa") {
    return "bg-emerald-600 text-white border-emerald-400 font-semibold shadow-sm";
  }
  if (type === "jogo") {
    return "bg-violet-600 text-white border-violet-400 font-semibold shadow-sm";
  }
  if (type === "aniversario") {
    return "bg-pink-600 text-white border-pink-400 font-semibold shadow-sm";
  }
  if (type === "treino") {
    return "bg-teal-600 text-white border-teal-400 font-semibold shadow-sm";
  }
  if (type === "reuniao") {
    return "bg-sky-600 text-white border-sky-400 font-semibold shadow-sm";
  }
  if (type === "preparacao") {
    return "bg-orange-600 text-white border-orange-400 font-semibold shadow-sm";
  }
  if (type === "palco") {
    return "bg-fuchsia-600 text-white border-fuchsia-400 font-semibold shadow-sm";
  }
  return "bg-zinc-600 text-white border-zinc-400 font-semibold shadow-sm";
}

export function agendaMatchSideLabel(side: AgendaMatchSide): string | null {
  if (side === "casa") return "Casa";
  if (side === "fora") return "Fora";
  return null;
}

export function agendaMatchSideBadgeClass(side: AgendaMatchSide): string {
  if (side === "casa") {
    return "bg-emerald-600 text-white border-emerald-400";
  }
  if (side === "fora") {
    return "bg-amber-500 text-zinc-950 border-amber-300";
  }
  return "bg-muted text-foreground border-border";
}
