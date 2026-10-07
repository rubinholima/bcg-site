import type { BchPublicOrder } from "@/lib/bch-public-checkout";

export type BchPublicTicket = NonNullable<BchPublicOrder["tickets"]>[number];

export type BchMyTicketsList = {
  email: string;
  orders: Array<{
    orderNumber: string;
    publicAccessToken: string;
    confirmedAt: string | null;
    total: string;
    currency: string;
    event: BchPublicOrder["event"];
    items: BchPublicOrder["items"];
    ticketCount: number;
    tickets: BchPublicTicket[];
    orderPath: string;
  }>;
};

export const BCH_PASSWORDLESS_NEUTRAL_MESSAGE =
  "Se este e-mail tiver ingressos elegíveis, enviaremos um link de acesso em instantes.";

export async function requestBchMyTicketsAccess(email: string): Promise<{ message: string }> {
  const res = await fetch("/api/public/boston-city-hall/my-tickets/request-access", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = (await res.json().catch(() => ({}))) as { message?: string };
  if (!res.ok) {
    throw new Error(data.message || "Não foi possível processar a solicitação.");
  }
  return { message: data.message || BCH_PASSWORDLESS_NEUTRAL_MESSAGE };
}

export async function exchangeBchMyTicketsMagicLink(token: string): Promise<{ ok: boolean; redirectPath?: string }> {
  const res = await fetch("/api/public/boston-city-hall/my-tickets/exchange", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ token }),
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; redirectPath?: string; message?: string };
  if (!res.ok) {
    throw new Error(data.message || "Link inválido ou expirado.");
  }
  return { ok: Boolean(data.ok), redirectPath: data.redirectPath };
}

export async function fetchBchMyTickets(): Promise<BchMyTicketsList | null> {
  const res = await fetch("/api/public/boston-city-hall/my-tickets", {
    cache: "no-store",
    credentials: "include",
  });
  if (res.status === 401) return null;
  if (!res.ok) return null;
  return (await res.json()) as BchMyTicketsList;
}

export function publicTicketStatusLabel(
  status: BchPublicTicket["status"],
  lang: "pt" | "en",
): string {
  const mapPt: Record<BchPublicTicket["status"], string> = {
    VALID: "Válido",
    USED: "Utilizado",
    CANCELLED: "Cancelado",
  };
  const mapEn: Record<BchPublicTicket["status"], string> = {
    VALID: "Valid",
    USED: "Used",
    CANCELLED: "Cancelled",
  };
  return lang === "pt" ? mapPt[status] : mapEn[status];
}
