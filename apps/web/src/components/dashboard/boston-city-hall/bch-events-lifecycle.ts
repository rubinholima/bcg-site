import type { EventTicketingEventListItem } from "@/types/boston-city-hall";

export type BchEventLifecycleBucket =
  | "upcoming"
  | "preparation"
  | "in_progress"
  | "completed"
  | "archived";

export function dedupeEventsById(
  events: EventTicketingEventListItem[],
): EventTicketingEventListItem[] {
  const seen = new Set<string>();
  const out: EventTicketingEventListItem[] = [];
  for (const ev of events) {
    if (seen.has(ev.id)) continue;
    seen.add(ev.id);
    out.push(ev);
  }
  return out;
}

export function classifyBchEventLifecycle(
  ev: EventTicketingEventListItem,
  now: Date = new Date(),
): BchEventLifecycleBucket {
  if (ev.status === "archived") return "archived";
  if (ev.status === "draft") return "preparation";
  const start = ev.startDate ? new Date(ev.startDate) : null;
  const end = ev.endDate ? new Date(ev.endDate) : null;
  if (!start || Number.isNaN(start.getTime())) return "preparation";
  if (end && !Number.isNaN(end.getTime()) && end < now) return "completed";
  if (start > now) return "upcoming";
  if (start <= now && (!end || end >= now)) return "in_progress";
  return "completed";
}

export function countBchEventLifecycle(events: EventTicketingEventListItem[]) {
  const counts = {
    total: events.length,
    upcoming: 0,
    preparation: 0,
    in_progress: 0,
    completed: 0,
    archived: 0,
  };
  for (const ev of events) {
    const bucket = classifyBchEventLifecycle(ev);
    counts[bucket] += 1;
  }
  return counts;
}

/** KPI “Cancelados” — modelo Event usa arquivado, não cancelado. */
export function bchEventCancelledKpiCount(events: EventTicketingEventListItem[]): number {
  return events.filter((e) => e.status === "cancelled").length;
}
