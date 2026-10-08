export const BCH_BAR_CLOSE_STATUSES = ['draft', 'finalized'] as const;

export type BchBarCloseDto = {
  id: string;
  eventId: string;
  eventTitle: string | null;
  eventInventoryId: string;
  locationId: string;
  locationName: string;
  status: string;
  closedAt: string | null;
  closedByName: string | null;
  warnings: string[];
  notes: string | null;
  snapshot: Record<string, unknown> | null;
};
