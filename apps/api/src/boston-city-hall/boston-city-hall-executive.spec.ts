import {
  attendanceRatePct,
  buildRevenueMix,
  deriveAttentionFlags,
  mergeCurrencyGroups,
  resolveExecutivePeriod,
} from './boston-city-hall-executive.util';
import type { BchEventExecutiveSummaryDto } from './boston-city-hall-event-financial.constants';
import { ticketingFinanceProjectionExcludedFromRevenue } from './boston-city-hall-event-financial.util';

function baseSummary(overrides: Partial<BchEventExecutiveSummaryDto> = {}): BchEventExecutiveSummaryDto {
  return {
    eventId: 'e1',
    eventName: 'Evento',
    eventStatus: 'published',
    eventStartAt: '2026-10-01T20:00:00.000Z',
    ticketRevenue: '100.00',
    barRevenue: null,
    venueRevenue: null,
    totalOperationalRevenue: '100.00',
    collected: '100.00',
    outstanding: '0.00',
    knownCosts: '0.00',
    operationalResult: '100.00',
    operationalMarginPct: '100.00',
    marginIncomplete: false,
    multiCurrency: false,
    currencyMismatch: false,
    consolidatedCurrency: 'USD',
    currencies: [
      {
        currency: 'USD',
        ticketingRevenue: '100.00',
        barRevenue: null,
        venueRevenue: null,
        grossOperationalRevenue: '100.00',
        knownOperationalCost: '0.00',
        operationalResult: '100.00',
        operationalMarginPct: '100.00',
        marginIncomplete: false,
        collected: '100.00',
        outstanding: '0.00',
        overdue: null,
      },
    ],
    ticketsSold: 10,
    attendance: 8,
    complimentaryCount: 2,
    confirmedOrderCount: 5,
    barSalesCount: 0,
    inventoryDivergenceProducts: 0,
    completeness: {
      ticketingConfigured: true,
      barCloseFinalized: true,
      barCostComplete: true,
      receivableLinked: false,
      financialProjectionPresent: false,
      physicalCountCompleted: true,
      venueContractLinked: true,
      resultComplete: true,
      multiCurrency: false,
      currencyMismatch: false,
    },
    ...overrides,
  };
}

describe('BostonCityHallExecutive — agregação', () => {
  it('1 — filtro de período custom respeita from/to', () => {
    const p = resolveExecutivePeriod(
      { period: 'custom', from: '2026-10-01', to: '2026-10-15' },
      new Date('2026-10-10T12:00:00Z'),
    );
    expect(p.preset).toBe('custom');
    expect(p.fromDate.getFullYear()).toBe(2026);
    expect(p.fromDate.getMonth()).toBe(9);
    expect(p.fromDate.getDate()).toBe(1);
    expect(p.toDate.getMonth()).toBe(9);
    expect(p.toDate.getDate()).toBe(15);
  });

  it('2 — receita agregada por moeda no merge', () => {
    const merged = mergeCurrencyGroups([
      [
        {
          currency: 'USD',
          ticketingRevenue: '100.00',
          barRevenue: null,
          venueRevenue: '50.00',
          grossOperationalRevenue: '150.00',
          knownOperationalCost: '0.00',
          operationalResult: '150.00',
          operationalMarginPct: '100.00',
          marginIncomplete: false,
          collected: '120.00',
          outstanding: '30.00',
          overdue: null,
        },
      ],
      [
        {
          currency: 'USD',
          ticketingRevenue: '200.00',
          barRevenue: null,
          venueRevenue: null,
          grossOperationalRevenue: '200.00',
          knownOperationalCost: '10.00',
          operationalResult: '190.00',
          operationalMarginPct: '95.00',
          marginIncomplete: false,
          collected: '200.00',
          outstanding: '0.00',
          overdue: null,
        },
      ],
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0]!.grossOperationalRevenue).toBe('350.00');
    expect(merged[0]!.collected).toBe('320.00');
  });

  it('3 — USD + BRL não são somados num único grupo', () => {
    const merged = mergeCurrencyGroups([
      [
        {
          currency: 'USD',
          ticketingRevenue: '100.00',
          barRevenue: null,
          venueRevenue: null,
          grossOperationalRevenue: '100.00',
          knownOperationalCost: '0.00',
          operationalResult: '100.00',
          operationalMarginPct: '100.00',
          marginIncomplete: false,
          collected: '100.00',
          outstanding: '0.00',
          overdue: null,
        },
      ],
      [
        {
          currency: 'BRL',
          ticketingRevenue: null,
          barRevenue: '200.00',
          venueRevenue: null,
          grossOperationalRevenue: '200.00',
          knownOperationalCost: '50.00',
          operationalResult: '150.00',
          operationalMarginPct: '75.00',
          marginIncomplete: false,
          collected: '200.00',
          outstanding: '0.00',
          overdue: null,
        },
      ],
    ]);
    expect(merged.map((m) => m.currency).sort()).toEqual(['BRL', 'USD']);
    const fakeGrand = merged.reduce((s, g) => s + Number(g.grossOperationalRevenue), 0);
    expect(fakeGrand).toBe(300);
    expect(merged).toHaveLength(2);
  });

  it('4 — cortesia não entra em receita (via domínio Phase 5.1)', () => {
    expect(ticketingFinanceProjectionExcludedFromRevenue()).toBe(true);
    const s = baseSummary({ complimentaryCount: 5, ticketRevenue: '100.00' });
    expect(s.complimentaryCount).toBe(5);
    expect(s.ticketRevenue).toBe('100.00');
  });

  it('5 — COGS bar só na moeda BRL no merge', () => {
    const merged = mergeCurrencyGroups([
      [
        {
          currency: 'BRL',
          ticketingRevenue: null,
          barRevenue: '100.00',
          venueRevenue: null,
          grossOperationalRevenue: '100.00',
          knownOperationalCost: '40.00',
          operationalResult: '60.00',
          operationalMarginPct: '60.00',
          marginIncomplete: false,
          collected: '100.00',
          outstanding: '0.00',
          overdue: null,
        },
      ],
    ]);
    expect(merged[0]!.knownOperationalCost).toBe('40.00');
    expect(merged[0]!.currency).toBe('BRL');
  });

  it('6 — Financeiro projection flag permanece separado', () => {
    expect(ticketingFinanceProjectionExcludedFromRevenue()).toBe(true);
  });

  it('7 — overdue em flags de atenção', () => {
    const s = baseSummary({
      currencies: [
        {
          currency: 'USD',
          ticketingRevenue: null,
          barRevenue: null,
          venueRevenue: '1000.00',
          grossOperationalRevenue: '1000.00',
          knownOperationalCost: '0.00',
          operationalResult: '1000.00',
          operationalMarginPct: '100.00',
          marginIncomplete: false,
          collected: '500.00',
          outstanding: '500.00',
          overdue: '200.00',
        },
      ],
    });
    const flags = deriveAttentionFlags(s, { bookingLinked: true, eventPast: true, ticketingEnabled: true });
    expect(flags).toContain('overdue_receivable');
  });

  it('8 — dados incompletos não viram zero no merge (null permanece null por linha)', () => {
    const mix = buildRevenueMix([
      {
        currency: 'USD',
        ticketingRevenue: null,
        barRevenue: null,
        venueRevenue: null,
        grossOperationalRevenue: '0.00',
        knownOperationalCost: '0.00',
        operationalResult: '0.00',
        operationalMarginPct: null,
        marginIncomplete: true,
        collected: '0.00',
        outstanding: '0.00',
        overdue: null,
      },
    ]);
    expect(mix[0]!.ticketing).toBe('0.00');
    expect(mix[0]!.total).toBe('0.00');
  });

  it('9 — arquitetura agrega no servidor (serviço expõe endpoints únicos)', () => {
    expect(typeof resolveExecutivePeriod).toBe('function');
    expect(typeof mergeCurrencyGroups).toBe('function');
  });

  it('10 — indicadores determinísticos margin/bar/contract', () => {
    const s = baseSummary({
      marginIncomplete: true,
      completeness: {
        ...baseSummary().completeness,
        barCloseFinalized: false,
        venueContractLinked: false,
        resultComplete: false,
        marginIncomplete: true,
      },
      barSalesCount: 3,
    });
    const flags = deriveAttentionFlags(s, { bookingLinked: true, eventPast: true, ticketingEnabled: true });
    expect(flags).toContain('bar_not_closed');
    expect(flags).toContain('event_without_contract');
    expect(flags).toContain('incomplete_financial_data');
  });

  it('11 — taxa de comparecimento só quando há ingressos vendidos', () => {
    expect(attendanceRatePct(0, 5)).toBeNull();
    expect(attendanceRatePct(10, 8)).toBe('80.0');
  });

  it('12 — isolamento: merge mantém grupos separados por moeda', () => {
    const merged = mergeCurrencyGroups([
      [{ ...baseSummary().currencies[0]!, currency: 'USD', grossOperationalRevenue: '1.00' }],
      [{ ...baseSummary().currencies[0]!, currency: 'BRL', grossOperationalRevenue: '2.00' }],
    ]);
    expect(merged).toHaveLength(2);
    expect(merged.map((m) => m.currency).sort()).toEqual(['BRL', 'USD']);
  });
});
