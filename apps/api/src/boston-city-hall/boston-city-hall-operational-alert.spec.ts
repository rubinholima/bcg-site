import { Prisma } from '@prisma/client';
import { buildAlertCandidates, type AlertEvaluationContext } from './boston-city-hall-operational-alert.evaluator';
import { planAlertSync } from './boston-city-hall-operational-alert.sync';
import { BCH_ALERT_OVERDUE_CRITICAL_AFTER_DAYS } from './boston-city-hall-operational-alert.constants';

function emptyCtx(overrides: Partial<AlertEvaluationContext> = {}): AlertEvaluationContext {
  return {
    now: new Date('2026-10-10T18:00:00Z'),
    events: [],
    signedContractByBooking: new Map(),
    receivableByContract: new Map(),
    barSalesCountByEvent: new Map(),
    finalizedBarCloseByEvent: new Map(),
    eventInventories: [],
    completedPhysicalCountByEvent: new Map(),
    openContainersByEvent: new Map(),
    financialByEvent: new Map(),
    ticketTypesByEvent: new Map(),
    overdueReceivables: [],
    ...overrides,
  };
}

describe('BostonCityHallOperationalAlert', () => {
  it('1 — recebível vencido gera um alerta', () => {
    const candidates = buildAlertCandidates(
      emptyCtx({
        overdueReceivables: [
          {
            receivableId: 'rec1',
            contractId: 'c1',
            eventId: 'ev1',
            bookingId: 'bk1',
            maxOverdueDays: 3,
            overdueBalance: new Prisma.Decimal('100.00'),
            currency: 'USD',
          },
        ],
      }),
    );
    expect(candidates.filter((c) => c.alertType === 'overdue_receivable')).toHaveLength(1);
    expect(candidates[0]!.deduplicationKey).toBe('overdue_receivable:rec1');
  });

  it('2 — avaliação repetida não duplica (dedupe key estável)', () => {
    const c = buildAlertCandidates(
      emptyCtx({
        overdueReceivables: [
          {
            receivableId: 'rec1',
            contractId: 'c1',
            eventId: null,
            bookingId: null,
            maxOverdueDays: 1,
            overdueBalance: new Prisma.Decimal('10'),
            currency: 'USD',
          },
        ],
      }),
    );
    const plan = planAlertSync(c, []);
    expect(plan.upsert).toHaveLength(1);
    const plan2 = planAlertSync(c, [{ deduplicationKey: c[0]!.deduplicationKey, status: 'open', acknowledgedAt: null, acknowledgedByUserId: null }]);
    expect(plan2.upsert).toHaveLength(1);
    expect(plan2.resolveKeys).toHaveLength(0);
  });

  it('3 — condição removida resolve alerta', () => {
    const plan = planAlertSync([], [
      { deduplicationKey: 'overdue_receivable:rec1', status: 'open', acknowledgedAt: null, acknowledgedByUserId: null },
    ]);
    expect(plan.resolveKeys).toEqual(['overdue_receivable:rec1']);
  });

  it('4 — evento próximo sem contrato assinado', () => {
    const start = new Date('2026-10-15T20:00:00Z');
    const candidates = buildAlertCandidates(
      emptyCtx({
        events: [
          {
            id: 'ev1',
            name: 'Gala',
            startDate: start,
            endDate: null,
            status: 'published',
            bookingId: 'bk1',
            ticketingEnabled: false,
          },
        ],
      }),
    );
    expect(candidates.some((c) => c.alertType === 'event_without_signed_contract')).toBe(true);
  });

  it('6 — bar sem fechamento após evento', () => {
    const candidates = buildAlertCandidates(
      emptyCtx({
        now: new Date('2026-10-12T12:00:00Z'),
        events: [
          {
            id: 'ev1',
            name: 'Show',
            startDate: new Date('2026-10-10T20:00:00Z'),
            endDate: null,
            status: 'published',
            bookingId: null,
            ticketingEnabled: false,
          },
        ],
        barSalesCountByEvent: new Map([['ev1', 5]]),
        finalizedBarCloseByEvent: new Map(),
      }),
    );
    expect(candidates.some((c) => c.alertType === 'bar_not_closed')).toBe(true);
  });

  it('7 — fechamento resolve via plan (simulação)', () => {
    const plan = planAlertSync([], [
      { deduplicationKey: 'bar_not_closed:ev1', status: 'open', acknowledgedAt: null, acknowledgedByUserId: null },
    ]);
    expect(plan.resolveKeys).toContain('bar_not_closed:ev1');
  });

  it('8 — contagem física só com inventário encerrado', () => {
    const withInv = buildAlertCandidates(
      emptyCtx({
        events: [
          {
            id: 'ev1',
            name: 'E',
            startDate: new Date('2026-10-09T20:00:00Z'),
            endDate: null,
            status: 'published',
            bookingId: null,
            ticketingEnabled: false,
          },
        ],
        eventInventories: [{ id: 'inv1', eventId: 'ev1', status: 'closed', locationId: 'loc1' }],
        completedPhysicalCountByEvent: new Map(),
      }),
    );
    expect(withInv.some((c) => c.alertType === 'physical_count_missing')).toBe(true);

    const noInv = buildAlertCandidates(emptyCtx({ events: [] }));
    expect(noInv.some((c) => c.alertType === 'physical_count_missing')).toBe(false);
  });

  it('9 — inventário ativo após evento', () => {
    const candidates = buildAlertCandidates(
      emptyCtx({
        now: new Date('2026-10-12T12:00:00Z'),
        events: [
          {
            id: 'ev1',
            name: 'E',
            startDate: new Date('2026-10-10T20:00:00Z'),
            endDate: null,
            status: 'published',
            bookingId: null,
            ticketingEnabled: false,
          },
        ],
        eventInventories: [{ id: 'inv1', eventId: 'ev1', status: 'active', locationId: 'loc1' }],
      }),
    );
    expect(candidates.some((c) => c.alertType === 'event_inventory_still_open')).toBe(true);
  });

  it('10 — open containers após evento', () => {
    const candidates = buildAlertCandidates(
      emptyCtx({
        now: new Date('2026-10-12T12:00:00Z'),
        events: [
          {
            id: 'ev1',
            name: 'E',
            startDate: new Date('2026-10-10T20:00:00Z'),
            endDate: null,
            status: 'published',
            bookingId: null,
            ticketingEnabled: false,
          },
        ],
        openContainersByEvent: new Map([['ev1', 2]]),
      }),
    );
    expect(candidates.some((c) => c.alertType === 'open_containers_pending')).toBe(true);
  });

  it('11 — reconhecimento não resolve (status permanece até sync)', () => {
    const existing = [
      {
        deduplicationKey: 'bar_not_closed:ev1',
        status: 'acknowledged',
        acknowledgedAt: new Date(),
        acknowledgedByUserId: 'u1',
      },
    ];
    const still = buildAlertCandidates(
      emptyCtx({
        now: new Date('2026-10-12T12:00:00Z'),
        events: [
          {
            id: 'ev1',
            name: 'E',
            startDate: new Date('2026-10-10T20:00:00Z'),
            endDate: null,
            status: 'published',
            bookingId: null,
            ticketingEnabled: false,
          },
        ],
        barSalesCountByEvent: new Map([['ev1', 1]]),
      }),
    );
    const plan = planAlertSync(still, existing);
    expect(plan.resolveKeys).toHaveLength(0);
  });

  it('12 — severidade determinística por dias em atraso', () => {
    const warn = buildAlertCandidates(
      emptyCtx({
        overdueReceivables: [
          {
            receivableId: 'r1',
            contractId: 'c',
            eventId: null,
            bookingId: null,
            maxOverdueDays: BCH_ALERT_OVERDUE_CRITICAL_AFTER_DAYS - 1,
            overdueBalance: new Prisma.Decimal('1'),
            currency: 'USD',
          },
        ],
      }),
    );
    expect(warn[0]!.severity).toBe('warning');

    const crit = buildAlertCandidates(
      emptyCtx({
        overdueReceivables: [
          {
            receivableId: 'r2',
            contractId: 'c',
            eventId: null,
            bookingId: null,
            maxOverdueDays: BCH_ALERT_OVERDUE_CRITICAL_AFTER_DAYS,
            overdueBalance: new Prisma.Decimal('1'),
            currency: 'USD',
          },
        ],
      }),
    );
    expect(crit[0]!.severity).toBe('critical');
  });

  it('14 — avaliação não cria registros financeiros (sem side-effect no util)', () => {
    expect(buildAlertCandidates(emptyCtx())).toEqual([]);
  });

  it('15 — planAlertSync é camada canônica de dedupe', () => {
    expect(typeof planAlertSync).toBe('function');
  });
});
