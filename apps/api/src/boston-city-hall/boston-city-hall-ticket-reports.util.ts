import type { EventTicketCheckinResult } from './boston-city-hall-ticket-checkin.constants';

export type TicketAdmissionSource = 'paid_order' | 'complimentary';

export type TicketRowForReports = {
  status: string;
  admissionSource: string;
  ticketTypeId: string;
  ticketLotId: string | null;
  unitPrice: string;
};

export type OrderRowForSales = {
  status: string;
  total: string;
  currency: string;
  createdAt: Date;
};

export type OrderItemRowForSales = {
  ticketTypeId: string;
  ticketLotId: string | null;
  quantity: number;
  totalPrice: string;
  orderStatus: string;
};

export type CheckinRowForReports = {
  result: string;
  ticketId: string | null;
  ticketTypeName: string | null;
  stationLabel: string | null;
  operatorUserId: string | null;
  createdAt: Date;
};

/** Receita comercial: apenas pedidos confirmados (não pending/cancelled/expired). */
export function isConfirmedCommercialOrder(status: string): boolean {
  return status === 'confirmed';
}

export function sumConfirmedOrderTotals(orders: OrderRowForSales[]): {
  grossSales: number;
  confirmedOrderCount: number;
  currency: string | null;
} {
  let gross = 0;
  let count = 0;
  let currency: string | null = null;
  for (const o of orders) {
    if (!isConfirmedCommercialOrder(o.status)) continue;
    count += 1;
    gross += Number.parseFloat(o.total) || 0;
    if (!currency) currency = o.currency;
  }
  return { grossSales: gross, confirmedOrderCount: count, currency };
}

export function countOrdersByStatus(orders: OrderRowForSales[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const o of orders) {
    out[o.status] = (out[o.status] ?? 0) + 1;
  }
  return out;
}

export function ticketsSoldFromConfirmedItems(items: OrderItemRowForSales[]): number {
  let n = 0;
  for (const row of items) {
    if (!isConfirmedCommercialOrder(row.orderStatus)) continue;
    n += row.quantity;
  }
  return n;
}

export function aggregateTickets(tickets: TicketRowForReports[]) {
  let paidIssued = 0;
  let complimentaryIssued = 0;
  let activeIssued = 0;
  let used = 0;
  let cancelled = 0;
  let paidValid = 0;
  let complimentaryValid = 0;
  let faceValueComplimentary = 0;

  for (const t of tickets) {
    const src = t.admissionSource === 'complimentary' ? 'complimentary' : 'paid_order';
    if (src === 'complimentary') complimentaryIssued += 1;
    else paidIssued += 1;

    if (t.status === 'used') used += 1;
    if (t.status === 'cancelled') cancelled += 1;
    if (t.status === 'valid' || t.status === 'used') {
      activeIssued += 1;
      if (t.status === 'valid') {
        if (src === 'complimentary') complimentaryValid += 1;
        else paidValid += 1;
      }
      if (src === 'complimentary') {
        faceValueComplimentary += Number.parseFloat(t.unitPrice) || 0;
      }
    }
  }

  return {
    paidIssued,
    complimentaryIssued,
    activeIssued,
    used,
    cancelled,
    paidNoShow: paidValid,
    complimentaryNoShow: complimentaryValid,
    noShowTotal: paidValid + complimentaryValid,
    faceValueComplimentary,
  };
}

/** Ingressos que consomem capacidade (mesma regra do inventário). */
export function countCapacityConsumed(tickets: TicketRowForReports[]): number {
  return tickets.filter((t) => t.status === 'valid' || t.status === 'used').length;
}

export function computeOccupancyPercent(checkedIn: number, configuredCapacity: number): number {
  if (configuredCapacity <= 0) return 0;
  return Math.round((checkedIn / configuredCapacity) * 1000) / 10;
}

export function computeRemainingCapacity(
  configuredCapacity: number,
  consumed: number,
  held: number,
): number {
  return Math.max(0, configuredCapacity - consumed - held);
}

export function aggregateCheckinResults(rows: CheckinRowForReports[]) {
  const byResult: Record<string, number> = {};
  for (const r of rows) {
    byResult[r.result] = (byResult[r.result] ?? 0) + 1;
  }
  const accepted = byResult.accepted ?? 0;
  return {
    byResult,
    acceptedAttempts: accepted,
    alreadyUsedAttempts: byResult.already_used ?? 0,
    cancelledAttempts: byResult.cancelled ?? 0,
    invalidAttempts: byResult.invalid ?? 0,
    wrongEventAttempts: byResult.wrong_event ?? 0,
  };
}

/** Presença canônica: tickets com status used (não tentativas rejeitadas). */
export function uniqueCheckedInFromTickets(tickets: TicketRowForReports[]): number {
  return tickets.filter((t) => t.status === 'used').length;
}

export function isAttendanceResult(result: string): result is EventTicketCheckinResult {
  return result === 'accepted';
}

export function sumTypeCapacityFromLotsOrType(input: {
  lots: { quantity: number }[];
  typeQuantity: number | null;
}): number {
  if (input.lots.length > 0) {
    return input.lots.reduce((s, l) => s + l.quantity, 0);
  }
  return input.typeQuantity ?? 0;
}

export function bucketByDay(isoDates: Date[]): { date: string; count: number }[] {
  const map = new Map<string, number>();
  for (const d of isoDates) {
    const key = d.toISOString().slice(0, 10);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}
