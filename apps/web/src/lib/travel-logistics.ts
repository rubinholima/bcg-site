export interface PlayerTravelHistoryItem {
  id: string;
  tenantId: string;
  tenant?: { id: string; name: string; slug: string };
  category?: string | null;
  matchDate: string;
  opponentName?: string | null;
  stadiumName?: string | null;
  city?: string | null;
  country?: string | null;
  championshipName?: string | null;
  distanceKm?: number | null;
  transportType?: string | null;
  transportDetails?: string | null;
  estimatedDeparture?: string | null;
  estimatedArrival?: string | null;
  hotelName?: string | null;
  status: string;
}

export const TRANSPORT_LABELS: Record<string, string> = {
  aereo_comercial: "Aéreo comercial",
  aereo_fretado: "Aéreo fretado",
  rodoviario: "Rodoviário",
  misto: "Misto",
};

export const TRAVEL_STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  planejamento: "Planejamento",
  aprovado: "Aprovado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export function formatTravelDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR");
}

export function formatTravelDestination(city?: string | null, country?: string | null): string {
  const parts = [city?.trim(), country?.trim()].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}
