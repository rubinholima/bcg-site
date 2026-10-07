import { Prisma } from '@prisma/client';
import type { EventTicketingSalesStatus } from './boston-city-hall-ticketing.constants';

export type LotRow = {
  id: string;
  name: string;
  price: Prisma.Decimal;
  quantity: number;
  active: boolean;
  sortOrder: number;
  salesStartAt: Date | null;
  salesEndAt: Date | null;
};

export type TypeRow = {
  active: boolean;
  price: Prisma.Decimal | null;
  quantity: number | null;
  salesStartAt: Date | null;
  salesEndAt: Date | null;
  lots: LotRow[];
};

/** Reservado para Fase 2.2 — contadores transacionais ou agregação por Order. */
export function soldForType(_typeId: string): number {
  return 0;
}

export function heldForType(_typeId: string): number {
  return 0;
}

export function soldForLot(_lotId: string): number {
  return 0;
}

export function heldForLot(_lotId: string): number {
  return 0;
}

function inSalesWindow(now: Date, start: Date | null, end: Date | null): boolean {
  if (start && now < start) return false;
  if (end && now > end) return false;
  return true;
}

export function pickCurrentLot(
  lots: LotRow[],
  now: Date = new Date(),
  soldFn: (lotId: string) => number = soldForLot,
  heldFn: (lotId: string) => number = heldForLot,
): { lot: LotRow; available: number } | null {
  const sorted = [...lots].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
  for (const lot of sorted) {
    if (!lot.active) continue;
    if (!inSalesWindow(now, lot.salesStartAt, lot.salesEndAt)) continue;
    const sold = soldFn(lot.id);
    const held = heldFn(lot.id);
    const available = Math.max(0, lot.quantity - sold - held);
    if (available > 0) return { lot, available };
  }
  return null;
}

export function deriveSalesStatus(input: {
  active: boolean;
  salesStartAt: Date | null;
  salesEndAt: Date | null;
  available: number;
  now?: Date;
}): EventTicketingSalesStatus {
  const now = input.now ?? new Date();
  if (!input.active) return 'inactive';
  if (input.salesStartAt && now < input.salesStartAt) return 'not_started';
  if (input.salesEndAt && now > input.salesEndAt) return 'ended';
  if (input.available <= 0) return 'sold_out';
  return 'on_sale';
}

export function resolveTypeAvailability(
  type: TypeRow,
  typeId: string,
  now: Date = new Date(),
): {
  usesLots: boolean;
  currentPrice: Prisma.Decimal | null;
  capacity: number;
  sold: number;
  held: number;
  available: number;
  salesStatus: EventTicketingSalesStatus;
  currentLotId: string | null;
} {
  const usesLots = type.lots.length > 0;

  if (usesLots) {
    const current = pickCurrentLot(type.lots, now);
    if (!current) {
      const capacity = type.lots.reduce((s, l) => s + l.quantity, 0);
      const sold = type.lots.reduce((s, l) => s + soldForLot(l.id), 0);
      const held = type.lots.reduce((s, l) => s + heldForLot(l.id), 0);
      return {
        usesLots: true,
        currentPrice: null,
        capacity,
        sold,
        held,
        available: 0,
        salesStatus: deriveSalesStatus({
          active: type.active,
          salesStartAt: type.salesStartAt,
          salesEndAt: type.salesEndAt,
          available: 0,
          now,
        }),
        currentLotId: null,
      };
    }
    const sold = soldForLot(current.lot.id);
    const held = heldForLot(current.lot.id);
    return {
      usesLots: true,
      currentPrice: current.lot.price,
      capacity: current.lot.quantity,
      sold,
      held,
      available: current.available,
      salesStatus: deriveSalesStatus({
        active: type.active && current.lot.active,
        salesStartAt: current.lot.salesStartAt,
        salesEndAt: current.lot.salesEndAt,
        available: current.available,
        now,
      }),
      currentLotId: current.lot.id,
    };
  }

  const qty = type.quantity ?? 0;
  const sold = soldForType(typeId);
  const held = heldForType(typeId);
  const available = Math.max(0, qty - sold - held);
  return {
    usesLots: false,
    currentPrice: type.price,
    capacity: qty,
    sold,
    held,
    available,
    salesStatus: deriveSalesStatus({
      active: type.active,
      salesStartAt: type.salesStartAt,
      salesEndAt: type.salesEndAt,
      available,
      now,
    }),
    currentLotId: null,
  };
}
