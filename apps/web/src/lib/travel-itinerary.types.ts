/** Tipos — itinerário / hotel / uniformes / período da agenda (espelho API). */

import {
  parseDateTimeLocalBrazil,
  toDateTimeLocalBrazil,
} from "@/lib/brazil-time";

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
  /** YYYY-MM-DD — preparação pode ser D-1 / D-2 */
  date?: string | null;
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

export function emptyItineraryStop(): TravelItineraryStop {
  return {
    id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    place: "",
    arriveAt: "",
    departAt: "",
    notes: "",
  };
}

export function emptyHomeAgendaItem(label = "", date = ""): TravelHomeAgendaItem {
  return {
    id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    date: date || "",
    label,
    time: "",
    notes: "",
  };
}

export const EMPTY_TRAVEL_ITINERARY: TravelItinerary = {
  busType: null,
  outbound: [],
  return: [],
  homeMatchAgenda: [],
};

export const EMPTY_TRAVEL_HOTEL_STAY: TravelHotelStay = {
  checkIn: "",
  checkOut: "",
};

export const EMPTY_TRAVEL_UNIFORMS: TravelUniforms = {
  athletesGame: "",
  athletesTravel: "",
  staffGame: "",
  staffTravel: "",
};

function normalizeStoredDateTime(value: string | null | undefined): string {
  if (!value?.trim()) return "";
  return toDateTimeLocalBrazil(value);
}

function serializeStoredDateTime(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return parseDateTimeLocalBrazil(trimmed) ?? trimmed;
}

function asStopArray(raw: unknown): TravelItineraryStop[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
    .map((s, i) => ({
      id: typeof s.id === "string" ? s.id : `s-${i}`,
      place: typeof s.place === "string" ? s.place : "",
      arriveAt: typeof s.arriveAt === "string" ? normalizeStoredDateTime(s.arriveAt) : "",
      departAt: typeof s.departAt === "string" ? normalizeStoredDateTime(s.departAt) : "",
      notes: typeof s.notes === "string" ? s.notes : "",
    }));
}

export function parseTravelItinerary(raw: unknown): TravelItinerary {
  if (!raw || typeof raw !== "object") return { ...EMPTY_TRAVEL_ITINERARY };
  const o = raw as Record<string, unknown>;
  const busType = o.busType === "LD" || o.busType === "DD" ? o.busType : null;
  const homeMatchAgenda = Array.isArray(o.homeMatchAgenda)
    ? o.homeMatchAgenda
        .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
        .map((s, i) => ({
          id: typeof s.id === "string" ? s.id : `h-${i}`,
          date: typeof s.date === "string" ? s.date : "",
          label: typeof s.label === "string" ? s.label : "",
          time: typeof s.time === "string" ? s.time : "",
          notes: typeof s.notes === "string" ? s.notes : "",
        }))
    : [];
  return {
    busType,
    outbound: asStopArray(o.outbound),
    return: asStopArray(o.return),
    homeMatchAgenda,
  };
}

export function parseTravelHotelStay(raw: unknown): TravelHotelStay {
  if (!raw || typeof raw !== "object") return { ...EMPTY_TRAVEL_HOTEL_STAY };
  const o = raw as Record<string, unknown>;
  return {
    checkIn: typeof o.checkIn === "string" ? normalizeStoredDateTime(o.checkIn) : "",
    checkOut: typeof o.checkOut === "string" ? normalizeStoredDateTime(o.checkOut) : "",
  };
}

export function parseTravelUniforms(raw: unknown): TravelUniforms {
  if (!raw || typeof raw !== "object") return { ...EMPTY_TRAVEL_UNIFORMS };
  const o = raw as Record<string, unknown>;
  return {
    athletesGame: typeof o.athletesGame === "string" ? o.athletesGame : "",
    athletesTravel: typeof o.athletesTravel === "string" ? o.athletesTravel : "",
    staffGame: typeof o.staffGame === "string" ? o.staffGame : "",
    staffTravel: typeof o.staffTravel === "string" ? o.staffTravel : "",
  };
}

/** Payload limpo para API (sem strings vazias desnecessárias). */
export function serializeTravelItinerary(it: TravelItinerary): TravelItinerary {
  const mapStop = (s: TravelItineraryStop): TravelItineraryStop => ({
    ...s,
    arriveAt: serializeStoredDateTime(s.arriveAt),
    departAt: serializeStoredDateTime(s.departAt),
  });
  return {
    busType: it.busType ?? null,
    outbound: (it.outbound ?? []).filter((s) => s.place.trim()).map(mapStop),
    return: (it.return ?? []).filter((s) => s.place.trim()).map(mapStop),
    homeMatchAgenda: (it.homeMatchAgenda ?? []).filter((s) => s.label.trim()),
  };
}

export function serializeTravelHotelStay(h: TravelHotelStay): TravelHotelStay {
  return {
    checkIn: serializeStoredDateTime(h.checkIn),
    checkOut: serializeStoredDateTime(h.checkOut),
  };
}

export function serializeTravelUniforms(u: TravelUniforms): TravelUniforms {
  return {
    athletesGame: u.athletesGame?.trim() || null,
    athletesTravel: u.athletesTravel?.trim() || null,
    staffGame: u.staffGame?.trim() || null,
    staffTravel: u.staffTravel?.trim() || null,
  };
}
