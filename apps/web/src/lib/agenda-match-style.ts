/** Estilos e ordenação da agenda de futebol — alto contraste no calendário. */

export type AgendaMatchSide = "casa" | "fora" | null;

/** Prioridade: jogos (casa/fora) → demais → aniversário por último. */
export function agendaEventSortPriority(type: string): number {
  if (type === "jogo" || type === "viagem") return 0;
  if (type === "aniversario") return 90;
  return 40;
}

export function compareAgendaEventsByPriority(
  a: { type: string; startAt: string },
  b: { type: string; startAt: string },
): number {
  const pa = agendaEventSortPriority(a.type);
  const pb = agendaEventSortPriority(b.type);
  if (pa !== pb) return pa - pb;
  return a.startAt.localeCompare(b.startAt);
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
