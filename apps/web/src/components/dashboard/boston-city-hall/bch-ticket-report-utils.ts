import type { TicketReportSeating } from "@/types/boston-city-hall";

export function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

/** Normaliza payload parcial da API de seating (evita crash quando byTable ausente). */
export function normalizeTicketReportSeating(
  raw: TicketReportSeating | null | undefined,
): TicketReportSeating | null {
  if (raw == null) return null;
  if (raw.seatingEnabled === false) return null;
  return {
    ...raw,
    byTable: asArray(raw.byTable),
    bySection: asArray(raw.bySection),
    tablesConfigured: raw.tablesConfigured ?? 0,
    seatsConfigured: raw.seatsConfigured ?? 0,
    assignedSeats: raw.assignedSeats ?? 0,
    unassignedSeats: raw.unassignedSeats ?? 0,
    usedAssignedSeats: raw.usedAssignedSeats ?? 0,
    unusedAssignedSeats: raw.unusedAssignedSeats ?? 0,
    seatingEnabled: raw.seatingEnabled ?? true,
  };
}

export function hasSeatingReportData(seating: TicketReportSeating | null): boolean {
  if (!seating) return false;
  if (!seating.seatingEnabled) return false;
  return (
    seating.tablesConfigured > 0 ||
    seating.seatsConfigured > 0 ||
    seating.byTable.length > 0 ||
    seating.bySection.length > 0
  );
}
