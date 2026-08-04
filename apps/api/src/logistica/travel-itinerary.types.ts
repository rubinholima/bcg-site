/** Tipos compartilhados — itinerário / hotel / uniformes da viagem (logística). */

export type TravelBusType = "LD" | "DD";

export type TravelItineraryStop = {
  id?: string;
  place: string;
  arriveAt?: string | null;
  departAt?: string | null;
  notes?: string | null;
};

export type TravelHomeAgendaItem = {
  id?: string;
  label: string;
  time?: string | null;
  notes?: string | null;
};

export type TravelItinerary = {
  busType?: TravelBusType | null;
  outbound?: TravelItineraryStop[];
  return?: TravelItineraryStop[];
  homeMatchAgenda?: TravelHomeAgendaItem[];
};

export type TravelHotelStay = {
  checkIn?: string | null;
  checkOut?: string | null;
};

export type TravelUniforms = {
  athletesGame?: string | null;
  athletesTravel?: string | null;
  staffGame?: string | null;
  staffTravel?: string | null;
};

export const AGENDA_DAY_PERIODS = ["manha", "tarde", "noite"] as const;
export type AgendaDayPeriod = (typeof AGENDA_DAY_PERIODS)[number];

export const AGENDA_DAY_PERIOD_LABEL: Record<AgendaDayPeriod, string> = {
  manha: "MANHÃ",
  tarde: "TARDE",
  noite: "NOITE",
};

/** Faixas BRT padrão para período do dia. */
export const AGENDA_DAY_PERIOD_HOURS: Record<
  AgendaDayPeriod,
  { start: string; end: string }
> = {
  manha: { start: "08:00", end: "12:00" },
  tarde: { start: "13:00", end: "18:00" },
  noite: { start: "19:00", end: "23:00" },
};

export function isAgendaDayPeriod(v: unknown): v is AgendaDayPeriod {
  return v === "manha" || v === "tarde" || v === "noite";
}
