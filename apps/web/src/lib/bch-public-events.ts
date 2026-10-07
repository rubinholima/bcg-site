import { getServerBackendBaseUrl } from "@/lib/apiProxy";

export type BchPublicTicketAvailability =
  | "AVAILABLE"
  | "LOW_AVAILABILITY"
  | "SOLD_OUT"
  | "NOT_YET_ON_SALE"
  | "SALES_ENDED"
  | "NO_TICKETING";

export type BchPublicEventListItem = {
  slug: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  startDate: string | null;
  endDate: string | null;
  locationLabel: string | null;
  detailPath: string;
  ticketingEnabled: boolean;
  ticketAvailability: BchPublicTicketAvailability;
};

export type BchPublicTicketType = {
  name: string;
  description: string | null;
  price: string | null;
  currency: string;
  salesStartAt: string | null;
  salesEndAt: string | null;
  availability: BchPublicTicketAvailability;
  currentLot: {
    name: string;
    price: string;
    salesStartAt: string | null;
    salesEndAt: string | null;
    availability: BchPublicTicketAvailability;
  } | null;
};

export type BchPublicEventDetail = BchPublicEventListItem & {
  content: {
    theme?: Record<string, unknown>;
    blocks?: Array<{
      id: string;
      type: string;
      sortOrder: number;
      config?: Record<string, unknown>;
    }>;
  };
  ticketing: {
    enabled: boolean;
    currency: string;
    types: BchPublicTicketType[];
  } | null;
};

export const BCH_TICKET_AVAILABILITY_LABEL: Record<BchPublicTicketAvailability, string> = {
  AVAILABLE: "Disponível",
  LOW_AVAILABILITY: "Últimos ingressos",
  SOLD_OUT: "Esgotado",
  NOT_YET_ON_SALE: "Venda em breve",
  SALES_ENDED: "Vendas encerradas",
  NO_TICKETING: "Sem venda online",
};

function publicBase(isClient: boolean): string {
  return isClient ? "/api" : getServerBackendBaseUrl().replace(/\/$/, "");
}

export async function fetchBchPublicEvents(options?: {
  past?: boolean;
}): Promise<BchPublicEventListItem[]> {
  const isClient = typeof window !== "undefined";
  const qs = options?.past ? "?past=1" : "";
  const url = `${publicBase(isClient)}/public/boston-city-hall/events${qs}`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as BchPublicEventListItem[];
  return Array.isArray(data) ? data : [];
}

export async function fetchBchPublicEventBySlug(
  slug: string,
): Promise<BchPublicEventDetail | null> {
  const isClient = typeof window !== "undefined";
  const encoded = encodeURIComponent(slug);
  const url = `${publicBase(isClient)}/public/boston-city-hall/events/${encoded}`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as BchPublicEventDetail | null;
  if (!data || typeof data !== "object" || !("slug" in data)) return null;
  return data;
}

export function formatBchEventDateTime(iso: string | null, lang: "pt" | "en"): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(lang === "pt" ? "pt-BR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
