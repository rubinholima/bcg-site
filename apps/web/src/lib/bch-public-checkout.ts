export type BchPublicPaymentStatus = "pending" | "paid" | "cancelled" | "expired" | "unknown";

export type BchPublicOrder = {
  orderNumber: string;
  publicAccessToken: string;
  status: "pending" | "confirmed" | "cancelled" | "expired";
  paymentStatus: BchPublicPaymentStatus;
  holdExpiresAt: string | null;
  subtotal: string;
  total: string;
  currency: string;
  customerName: string;
  customerEmail: string;
  event: {
    slug: string;
    name: string;
    startDate: string | null;
    endDate: string | null;
    detailPath: string;
  };
  items: Array<{
    ticketTypeName: string;
    lotName: string | null;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
  }>;
  orderPath: string;
  confirmedAt: string | null;
  ticketCount: number;
  tickets: Array<{
    publicTicketRef: string;
    ticketCode: string;
    ticketTypeName: string;
    lotName: string | null;
    holderName: string;
    status: "VALID" | "USED" | "CANCELLED";
    issuedAt: string;
    seating: {
      tableName: string | null;
      seatLabel: string | null;
      section: string | null;
    } | null;
    qrPath: string;
  }>;
};

export type CheckoutLineSelection = {
  ticketTypeId: string;
  ticketLotId: string | null;
  quantity: number;
};

export function generateCheckoutIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `bch-${crypto.randomUUID()}`;
  }
  return `bch-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export async function submitBchPublicOrder(
  eventSlug: string,
  payload: {
    idempotencyKey: string;
    items: CheckoutLineSelection[];
    customer: { name: string; email: string; phone?: string };
  },
): Promise<BchPublicOrder> {
  const encoded = encodeURIComponent(eventSlug);
  const res = await fetch(`/api/public/boston-city-hall/events/${encoded}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as BchPublicOrder & { message?: string | string[] };
  if (!res.ok) {
    const msg = Array.isArray(data.message) ? data.message[0] : data.message;
    throw new Error(msg || "Não foi possível criar o pedido.");
  }
  return data;
}

export async function fetchBchPublicOrder(token: string): Promise<BchPublicOrder | null> {
  const encoded = encodeURIComponent(token);
  const res = await fetch(`/api/public/boston-city-hall/orders/${encoded}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as BchPublicOrder;
}

export function formatCheckoutMoney(amount: string, currency: string): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return amount;
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(n);
  } catch {
    return `${currency} ${amount}`;
  }
}

export function canPurchaseTickets(
  availability: import("@/lib/bch-public-events").BchPublicTicketAvailability,
): boolean {
  return availability === "AVAILABLE" || availability === "LOW_AVAILABILITY";
}
