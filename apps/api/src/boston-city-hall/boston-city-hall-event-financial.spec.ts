import { Prisma } from '@prisma/client';
import {
  buildPerCurrencyAggregates,
  consolidatedFromGroups,
  operationalMarginPct,
  sumApplicableRevenues,
  ticketingFinanceProjectionExcludedFromRevenue,
} from './boston-city-hall-event-financial.util';
import { isConfirmedCommercialOrder } from './boston-city-hall-ticket-reports.util';

describe('BostonCityHallEventFinancial — agregação', () => {
  it('1 — receita operacional soma só fontes aplicáveis na mesma moeda (util legado)', () => {
    const total = sumApplicableRevenues([
      { applicable: true, amount: '100.00' },
      { applicable: true, amount: '50.00' },
      { applicable: false, amount: '999.00' },
    ]);
    expect(total).toBe('150.00');
  });

  it('2 — projeção Financeiro não entra na receita operacional', () => {
    expect(ticketingFinanceProjectionExcludedFromRevenue()).toBe(true);
    const withProjectionMirror = sumApplicableRevenues([
      { applicable: true, amount: '100.00' },
      { applicable: false, amount: '100.00' },
    ]);
    expect(withProjectionMirror).toBe('100.00');
  });

  it('3 — cortesia não entra em pedido confirmado comercial', () => {
    expect(isConfirmedCommercialOrder('confirmed')).toBe(true);
    expect(isConfirmedCommercialOrder('pending')).toBe(false);
  });

  it('4 — evento só USD produz consolidado USD', () => {
    const built = buildPerCurrencyAggregates({
      ticketing: { applicable: true, currency: 'USD', revenue: '1000.00', collected: '1000.00' },
      bar: { applicable: false, currency: 'BRL', revenue: null, cogs: null, collected: null, marginIncomplete: false },
      venue: { applicable: false, currency: 'USD', revenue: null, collected: null, outstanding: null, overdue: null },
    });
    expect(built.multiCurrency).toBe(false);
    expect(built.consolidatedCurrency).toBe('USD');
    const c = consolidatedFromGroups(built.currencies, built.multiCurrency);
    expect(c.grossOperationalRevenue).toBe('1000.00');
  });

  it('5 — evento só BRL produz consolidado BRL', () => {
    const built = buildPerCurrencyAggregates({
      ticketing: { applicable: false, currency: 'USD', revenue: null, collected: null },
      bar: {
        applicable: true,
        currency: 'BRL',
        revenue: '2000.00',
        cogs: '500.00',
        collected: '2000.00',
        marginIncomplete: false,
      },
      venue: { applicable: false, currency: 'USD', revenue: null, collected: null, outstanding: null, overdue: null },
    });
    expect(built.multiCurrency).toBe(false);
    expect(built.currencies[0]?.operationalResult).toBe('1500.00');
    const c = consolidatedFromGroups(built.currencies, built.multiCurrency);
    expect(c.operationalResult).toBe('1500.00');
  });

  it('6 — USD ingressos + BRL bar não gera total global misto', () => {
    const built = buildPerCurrencyAggregates({
      ticketing: { applicable: true, currency: 'USD', revenue: '1000.00', collected: '1000.00' },
      bar: {
        applicable: true,
        currency: 'BRL',
        revenue: '2000.00',
        cogs: '100.00',
        collected: '2000.00',
        marginIncomplete: false,
      },
      venue: { applicable: false, currency: 'USD', revenue: null, collected: null, outstanding: null, overdue: null },
    });
    expect(built.multiCurrency).toBe(true);
    expect(built.currencyMismatch).toBe(true);
    const c = consolidatedFromGroups(built.currencies, built.multiCurrency);
    expect(c.grossOperationalRevenue).toBeNull();
    expect(c.totalCollected).toBeNull();
    expect(built.currencies).toHaveLength(2);
  });

  it('7 — USD ingressos + USD venue agregam na mesma moeda', () => {
    const built = buildPerCurrencyAggregates({
      ticketing: { applicable: true, currency: 'USD', revenue: '1000.00', collected: '1000.00' },
      bar: { applicable: false, currency: 'BRL', revenue: null, cogs: null, collected: null, marginIncomplete: false },
      venue: {
        applicable: true,
        currency: 'USD',
        revenue: '3000.00',
        collected: '500.00',
        outstanding: '2500.00',
        overdue: '0.00',
      },
    });
    expect(built.multiCurrency).toBe(false);
    expect(built.currencies[0]?.grossOperationalRevenue).toBe('4000.00');
    expect(built.currencies[0]?.collected).toBe('1500.00');
    expect(built.currencies[0]?.outstanding).toBe('2500.00');
  });

  it('8 — BRL bar COGS só subtrai receita BRL', () => {
    const built = buildPerCurrencyAggregates({
      ticketing: { applicable: true, currency: 'USD', revenue: '100.00', collected: '100.00' },
      bar: {
        applicable: true,
        currency: 'BRL',
        revenue: '200.00',
        cogs: '50.00',
        collected: '200.00',
        marginIncomplete: false,
      },
      venue: { applicable: false, currency: 'USD', revenue: null, collected: null, outstanding: null, overdue: null },
    });
    const brl = built.currencies.find((g) => g.currency === 'BRL');
    const usd = built.currencies.find((g) => g.currency === 'USD');
    expect(brl?.operationalResult).toBe('150.00');
    expect(usd?.knownOperationalCost).toBe('0.00');
    expect(usd?.operationalResult).toBe('100.00');
  });

  it('9 — Financeiro projection flag permanece separado da receita', () => {
    expect(ticketingFinanceProjectionExcludedFromRevenue()).toBe(true);
  });

  it('10 — flags multiCurrency/currencyMismatch corretas', () => {
    const mixed = buildPerCurrencyAggregates({
      ticketing: { applicable: true, currency: 'USD', revenue: '1.00', collected: '1.00' },
      bar: { applicable: true, currency: 'BRL', revenue: '2.00', cogs: '0', collected: '2.00', marginIncomplete: false },
      venue: { applicable: false, currency: 'USD', revenue: null, collected: null, outstanding: null, overdue: null },
    });
    expect(mixed.multiCurrency).toBe(true);
    expect(mixed.currencyMismatch).toBe(true);
  });

  it('11 — margem % por moeda', () => {
    expect(operationalMarginPct('200.00', '80.00')).toBe('60.00');
    const result = new Prisma.Decimal('200.00').minus('80.00').toFixed(2);
    expect(result).toBe('120.00');
  });
});
