import { BCH_BASE } from "@/components/dashboard/boston-city-hall/bch-navigation.config";

/** Slug público do tenant BCH no portfolio. */
export const BCH_PORTFOLIO_SLUG = "boston-city-hall";

export function bchEventSetupPath(eventId: string): string {
  return `${BCH_BASE}/eventos/${encodeURIComponent(eventId)}/setup`;
}

export function bchEventSetupPathWithBooking(
  eventId: string,
  bookingId?: string | null,
): string {
  const base = bchEventSetupPath(eventId);
  if (!bookingId?.trim()) return base;
  return `${base}?bookingId=${encodeURIComponent(bookingId.trim())}`;
}

export function bchPublicEventPath(eventSlug: string): string {
  return `/portfolio/${BCH_PORTFOLIO_SLUG}/events/${encodeURIComponent(eventSlug)}`;
}

export function slugifyEventName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}
