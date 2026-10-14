import type { EventTicketingEventListItem } from "@/types/boston-city-hall";

/** Próximo evento operacional (futuro mais próximo; senão o mais recente). */
export function pickFeaturedTicketingEvent(
  events: EventTicketingEventListItem[],
): EventTicketingEventListItem | null {
  if (events.length === 0) return null;
  const now = Date.now();
  const withDate = events
    .map((ev) => ({
      ev,
      t: ev.startDate ? new Date(ev.startDate).getTime() : Number.NaN,
    }))
    .filter((x) => !Number.isNaN(x.t));

  const future = withDate.filter((x) => x.t >= now).sort((a, b) => a.t - b.t);
  if (future[0]) return future[0].ev;

  const past = withDate.sort((a, b) => b.t - a.t);
  if (past[0]) return past[0].ev;

  return events[0] ?? null;
}
