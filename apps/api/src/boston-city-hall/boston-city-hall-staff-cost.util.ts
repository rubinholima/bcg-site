import { Prisma } from '@prisma/client';

export const BCH_STAFF_RATE_TYPES = ['daily', 'hourly', 'fixed'] as const;
export type BchStaffRateType = (typeof BCH_STAFF_RATE_TYPES)[number];

export const BCH_STAFF_PAYMENT_STATUSES = ['planned', 'incurred', 'paid', 'outstanding'] as const;
export type BchStaffPaymentStatus = (typeof BCH_STAFF_PAYMENT_STATUSES)[number];

export function decOrNull(v: number | string | null | undefined): Prisma.Decimal | null {
  if (v == null || v === '') return null;
  return new Prisma.Decimal(String(v));
}

export function computeStaffPlannedCost(input: {
  rateType?: string | null;
  rateAmount?: Prisma.Decimal | null;
  plannedQuantity?: Prisma.Decimal | null;
  plannedStartAt?: Date | null;
  plannedEndAt?: Date | null;
}): Prisma.Decimal | null {
  const rate = input.rateAmount;
  if (!rate) return null;
  const type = (input.rateType ?? 'fixed').toLowerCase();
  if (type === 'fixed') return rate;
  if (type === 'daily') {
    const qty = input.plannedQuantity ?? new Prisma.Decimal(1);
    return rate.mul(qty);
  }
  if (type === 'hourly') {
    if (input.plannedQuantity) return rate.mul(input.plannedQuantity);
    const start = input.plannedStartAt;
    const end = input.plannedEndAt;
    if (start && end && end > start) {
      const hours = new Prisma.Decimal((end.getTime() - start.getTime()) / 3600000);
      return rate.mul(hours);
    }
    return rate;
  }
  return rate;
}

export function computeStaffActualCost(input: {
  rateType?: string | null;
  rateAmount?: Prisma.Decimal | null;
  actualQuantity?: Prisma.Decimal | null;
  plannedQuantity?: Prisma.Decimal | null;
  plannedStartAt?: Date | null;
  plannedEndAt?: Date | null;
  actualStartAt?: Date | null;
  actualEndAt?: Date | null;
}): Prisma.Decimal | null {
  const rate = input.rateAmount;
  if (!rate) return null;
  const type = (input.rateType ?? 'fixed').toLowerCase();
  if (type === 'fixed') return rate;
  if (type === 'daily') {
    const qty = input.actualQuantity ?? input.plannedQuantity ?? new Prisma.Decimal(1);
    return rate.mul(qty);
  }
  if (type === 'hourly') {
    if (input.actualQuantity) return rate.mul(input.actualQuantity);
    const start = input.actualStartAt ?? input.plannedStartAt;
    const end = input.actualEndAt ?? input.plannedEndAt;
    if (start && end && end > start) {
      const hours = new Prisma.Decimal((end.getTime() - start.getTime()) / 3600000);
      return rate.mul(hours);
    }
    if (input.plannedQuantity) return rate.mul(input.plannedQuantity);
    return null;
  }
  return rate;
}

export type LaborCostRow = {
  rateCurrency: string | null;
  plannedCost: Prisma.Decimal | null;
  actualCost: Prisma.Decimal | null;
  paymentStatus: string | null;
};

export type LaborCostByCurrency = {
  currency: string;
  planned: Prisma.Decimal;
  incurred: Prisma.Decimal;
  paid: Prisma.Decimal;
  outstanding: Prisma.Decimal;
};

function normCurrency(c: string | null | undefined): string | null {
  const u = c?.trim().toUpperCase();
  return u || null;
}

/** Agrega mão de obra por moeda — nunca mistura USD/BRL. */
export function aggregateLaborCostsByCurrency(rows: LaborCostRow[]): LaborCostByCurrency[] {
  const map = new Map<string, LaborCostByCurrency>();
  for (const row of rows) {
    const currency = normCurrency(row.rateCurrency) ?? 'USD';
    let bucket = map.get(currency);
    if (!bucket) {
      bucket = {
        currency,
        planned: new Prisma.Decimal(0),
        incurred: new Prisma.Decimal(0),
        paid: new Prisma.Decimal(0),
        outstanding: new Prisma.Decimal(0),
      };
      map.set(currency, bucket);
    }
    const planned = row.plannedCost ?? new Prisma.Decimal(0);
    const actual = row.actualCost;
    const status = (row.paymentStatus ?? 'planned').toLowerCase();

    bucket.planned = bucket.planned.plus(planned);

    if (actual != null && actual.gt(0)) {
      if (status === 'paid') {
        bucket.paid = bucket.paid.plus(actual);
      } else if (status === 'incurred' || status === 'outstanding') {
        bucket.incurred = bucket.incurred.plus(actual);
        if (status === 'outstanding') {
          bucket.outstanding = bucket.outstanding.plus(actual);
        }
      } else {
        bucket.incurred = bucket.incurred.plus(actual);
      }
    } else if (planned.gt(0) && status === 'planned') {
      // planejado ainda não incorrido
    }
  }
  return [...map.values()].sort((a, b) => a.currency.localeCompare(b.currency));
}

/** Custo operacional de mão de obra para DRE do evento (real > planejado). */
export function laborOperationalCostForEvent(rows: LaborCostRow[]): Map<string, Prisma.Decimal> {
  const out = new Map<string, Prisma.Decimal>();
  for (const row of rows) {
    const currency = normCurrency(row.rateCurrency) ?? 'USD';
    const amount = row.actualCost != null && row.actualCost.gt(0) ? row.actualCost : row.plannedCost;
    if (!amount || amount.lte(0)) continue;
    out.set(currency, (out.get(currency) ?? new Prisma.Decimal(0)).plus(amount));
  }
  return out;
}
