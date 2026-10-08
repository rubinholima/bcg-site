import { Prisma } from '@prisma/client';

export function moneyDec(v: Prisma.Decimal | number | string): string {
  const d = v instanceof Prisma.Decimal ? v : new Prisma.Decimal(v);
  return d.toFixed(2);
}

export function addMoneyStrings(a: string, b: string): string {
  return moneyDec(new Prisma.Decimal(a).plus(new Prisma.Decimal(b)));
}

/** Soma apenas linhas aplicáveis com amount numérico. */
export function sumApplicableRevenues(
  lines: Array<{ applicable: boolean; amount: string | null }>,
): string {
  let total = new Prisma.Decimal(0);
  for (const line of lines) {
    if (!line.applicable || line.amount == null) continue;
    total = total.plus(new Prisma.Decimal(line.amount));
  }
  return moneyDec(total);
}

export function operationalMarginPct(revenue: string, cost: string): string | null {
  const rev = new Prisma.Decimal(revenue);
  if (rev.lte(0)) return null;
  const margin = rev.minus(new Prisma.Decimal(cost));
  return margin.div(rev).mul(100).toFixed(2);
}

/** Projeções Financeiro de pedidos de ingresso não entram na receita operacional. */
export function ticketingFinanceProjectionExcludedFromRevenue(): true {
  return true;
}

export function pickSignedVenueContract<
  T extends { status: string; total: Prisma.Decimal; id: string; contractNumber: string },
>(contracts: T[]): T | null {
  if (!contracts.length) return null;
  return (
    contracts.find((c) => c.status === 'signed') ??
    contracts.find((c) => c.status === 'sent') ??
    null
  );
}
