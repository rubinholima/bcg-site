import { Prisma } from '@prisma/client';
import type { BchEventFinancialCurrencyGroupDto } from './boston-city-hall-event-financial.constants';

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

export function normalizeCurrencyCode(code: string | null | undefined): string | null {
  const c = code?.trim().toUpperCase();
  return c || null;
}

export type PerCurrencyBuildInput = {
  ticketing: {
    applicable: boolean;
    currency: string | null;
    revenue: string | null;
    collected: string | null;
  };
  bar: {
    applicable: boolean;
    currency: string;
    revenue: string | null;
    cogs: string | null;
    collected: string | null;
    marginIncomplete: boolean;
  };
  venue: {
    applicable: boolean;
    currency: string | null;
    revenue: string | null;
    collected: string | null;
    outstanding: string | null;
    overdue: string | null;
  };
};

function addInCurrency(total: Prisma.Decimal, currency: string | null, amount: string | null): Prisma.Decimal {
  if (!currency || amount == null) return total;
  return total.plus(new Prisma.Decimal(amount));
}

function pickAmount(
  sliceCurrency: string | null,
  groupCurrency: string,
  amount: string | null,
  applicable: boolean,
): string | null {
  if (!applicable || amount == null || !sliceCurrency) return null;
  return sliceCurrency === groupCurrency ? amount : null;
}

/** Agrega receita/custo/cobrança por moeda — nunca soma moedas diferentes. */
export function buildPerCurrencyAggregates(input: PerCurrencyBuildInput): {
  currencies: BchEventFinancialCurrencyGroupDto[];
  multiCurrency: boolean;
  currencyMismatch: boolean;
  consolidatedCurrency: string | null;
} {
  const codes = new Set<string>();
  const register = (applicable: boolean, currency: string | null, hasMoney: boolean) => {
    const c = normalizeCurrencyCode(currency);
    if (applicable && c && hasMoney) codes.add(c);
  };

  register(input.ticketing.applicable, input.ticketing.currency, input.ticketing.revenue != null);
  register(input.bar.applicable, input.bar.currency, input.bar.revenue != null || input.bar.applicable);
  register(input.venue.applicable, input.venue.currency, input.venue.revenue != null);

  if (input.venue.applicable && input.venue.outstanding != null && input.venue.currency) {
    codes.add(normalizeCurrencyCode(input.venue.currency)!);
  }

  const sorted = [...codes].sort();
  const multiCurrency = sorted.length > 1;
  const currencyMismatch = multiCurrency;

  const currencies: BchEventFinancialCurrencyGroupDto[] = sorted.map((currency) => {
    const ticketingRevenue = pickAmount(
      normalizeCurrencyCode(input.ticketing.currency),
      currency,
      input.ticketing.revenue,
      input.ticketing.applicable,
    );
    const barRevenue = pickAmount(
      normalizeCurrencyCode(input.bar.currency),
      currency,
      input.bar.revenue,
      input.bar.applicable,
    );
    const venueRevenue = pickAmount(
      normalizeCurrencyCode(input.venue.currency),
      currency,
      input.venue.revenue,
      input.venue.applicable,
    );

    let gross = new Prisma.Decimal(0);
    if (ticketingRevenue != null) gross = gross.plus(ticketingRevenue);
    if (barRevenue != null) gross = gross.plus(barRevenue);
    if (venueRevenue != null) gross = gross.plus(venueRevenue);

    const barInGroup = normalizeCurrencyCode(input.bar.currency) === currency;
    let knownCost = new Prisma.Decimal(0);
    if (barInGroup && input.bar.cogs != null) knownCost = new Prisma.Decimal(input.bar.cogs);

    const grossStr = moneyDec(gross);
    const costStr = moneyDec(knownCost);
    const operationalResult = moneyDec(gross.minus(knownCost));

    let collected = new Prisma.Decimal(0);
    if (normalizeCurrencyCode(input.ticketing.currency) === currency) {
      collected = addInCurrency(collected, currency, input.ticketing.collected);
    }
    if (barInGroup) collected = addInCurrency(collected, currency, input.bar.collected);
    if (normalizeCurrencyCode(input.venue.currency) === currency) {
      collected = addInCurrency(collected, currency, input.venue.collected);
    }

    let outstanding = new Prisma.Decimal(0);
    if (normalizeCurrencyCode(input.venue.currency) === currency && input.venue.outstanding != null) {
      outstanding = outstanding.plus(input.venue.outstanding);
    }
    if (normalizeCurrencyCode(input.ticketing.currency) === currency && input.ticketing.applicable) {
      outstanding = outstanding.plus(0);
    }
    if (barInGroup && input.bar.applicable) {
      outstanding = outstanding.plus(0);
    }

    const overdue =
      normalizeCurrencyCode(input.venue.currency) === currency ? input.venue.overdue : null;

    const marginIncomplete = barInGroup && input.bar.marginIncomplete && (barRevenue != null || input.bar.applicable);

    return {
      currency,
      ticketingRevenue,
      barRevenue,
      venueRevenue,
      grossOperationalRevenue: grossStr,
      knownOperationalCost: costStr,
      operationalResult,
      operationalMarginPct: operationalMarginPct(grossStr, costStr),
      marginIncomplete,
      collected: moneyDec(collected),
      outstanding: moneyDec(outstanding),
      overdue,
    };
  });

  return {
    currencies,
    multiCurrency,
    currencyMismatch,
    consolidatedCurrency: sorted.length === 1 ? sorted[0]! : null,
  };
}

/** Retorna totais consolidados só quando há uma única moeda; senão null. */
export function consolidatedFromGroups(
  groups: BchEventFinancialCurrencyGroupDto[],
  multiCurrency: boolean,
): {
  grossOperationalRevenue: string | null;
  knownOperationalCost: string | null;
  operationalResult: string | null;
  operationalMarginPct: string | null;
  totalCollected: string | null;
  totalOutstanding: string | null;
  marginIncomplete: boolean;
} {
  if (multiCurrency || groups.length !== 1) {
    return {
      grossOperationalRevenue: null,
      knownOperationalCost: null,
      operationalResult: null,
      operationalMarginPct: null,
      totalCollected: null,
      totalOutstanding: null,
      marginIncomplete: groups.some((g) => g.marginIncomplete),
    };
  }
  const g = groups[0]!;
  return {
    grossOperationalRevenue: g.grossOperationalRevenue,
    knownOperationalCost: g.knownOperationalCost,
    operationalResult: g.operationalResult,
    operationalMarginPct: g.operationalMarginPct,
    totalCollected: g.collected,
    totalOutstanding: g.outstanding,
    marginIncomplete: g.marginIncomplete,
  };
}
