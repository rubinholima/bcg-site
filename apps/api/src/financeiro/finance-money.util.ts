import { Prisma } from '@prisma/client';

export function moneyDecimal(value: number | string | Prisma.Decimal): Prisma.Decimal {
  if (value instanceof Prisma.Decimal) return value;
  return new Prisma.Decimal(value);
}

export function moneyZero(): Prisma.Decimal {
  return new Prisma.Decimal(0);
}

export function sumMoney(...parts: Array<number | string | Prisma.Decimal>): Prisma.Decimal {
  return parts.reduce<Prisma.Decimal>(
    (acc, p) => acc.add(moneyDecimal(p)),
    moneyZero(),
  );
}

export function subMoney(a: Prisma.Decimal, b: Prisma.Decimal): Prisma.Decimal {
  return a.sub(b);
}

export function moneyEquals(a: Prisma.Decimal, b: Prisma.Decimal): boolean {
  return a.equals(b);
}

export function moneyToNumber(v: Prisma.Decimal): number {
  return v.toNumber();
}

/** Valor original da obrigação (não sobrescreve legado). */
export function obligationAmount(lanc: {
  originalAmount?: Prisma.Decimal | null;
  valor: Prisma.Decimal;
}): Prisma.Decimal {
  return lanc.originalAmount != null ? moneyDecimal(lanc.originalAmount) : moneyDecimal(lanc.valor);
}

export function computeSettlementFinal(input: {
  amountSettled: Prisma.Decimal;
  interestAmount?: Prisma.Decimal;
  penaltyAmount?: Prisma.Decimal;
  discountAmount?: Prisma.Decimal;
  abatementAmount?: Prisma.Decimal;
  otherAdjustmentAmount?: Prisma.Decimal;
}): Prisma.Decimal {
  return sumMoney(
    input.amountSettled,
    input.interestAmount ?? 0,
    input.penaltyAmount ?? 0,
  )
    .sub(input.discountAmount ?? 0)
    .sub(input.abatementAmount ?? 0)
    .add(input.otherAdjustmentAmount ?? 0);
}

export function splitInstallmentAmounts(
  total: Prisma.Decimal,
  count: number,
): Prisma.Decimal[] {
  if (count < 1) throw new Error('count');
  const cents = total.mul(100).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);
  const base = cents.div(count).floor();
  const remainder = cents.sub(base.mul(count));
  const out: Prisma.Decimal[] = [];
  for (let i = 0; i < count; i++) {
    const extra = i < remainder.toNumber() ? 1 : 0;
    out.push(base.add(extra).div(100));
  }
  return out;
}
