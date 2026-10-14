import { Prisma } from '@prisma/client';
import {
  aggregateLaborCostsByCurrency,
  computeStaffActualCost,
  computeStaffPlannedCost,
  laborOperationalCostForEvent,
} from './boston-city-hall-staff-cost.util';

describe('boston-city-hall-staff-cost.util', () => {
  it('calcula diária × dias planejados', () => {
    const cost = computeStaffPlannedCost({
      rateType: 'daily',
      rateAmount: new Prisma.Decimal('150'),
      plannedQuantity: new Prisma.Decimal('3'),
    });
    expect(cost?.toFixed(2)).toBe('450.00');
  });

  it('calcula hora × horas planejadas', () => {
    const cost = computeStaffPlannedCost({
      rateType: 'hourly',
      rateAmount: new Prisma.Decimal('25'),
      plannedQuantity: new Prisma.Decimal('8'),
    });
    expect(cost?.toFixed(2)).toBe('200.00');
  });

  it('fixo retorna valor da taxa', () => {
    const cost = computeStaffPlannedCost({
      rateType: 'fixed',
      rateAmount: new Prisma.Decimal('500'),
    });
    expect(cost?.toFixed(2)).toBe('500.00');
  });

  it('agrega mão de obra por moeda sem misturar', () => {
    const groups = aggregateLaborCostsByCurrency([
      {
        rateCurrency: 'USD',
        plannedCost: new Prisma.Decimal('100'),
        actualCost: null,
        paymentStatus: 'planned',
      },
      {
        rateCurrency: 'BRL',
        plannedCost: new Prisma.Decimal('200'),
        actualCost: new Prisma.Decimal('180'),
        paymentStatus: 'paid',
      },
    ]);
    expect(groups).toHaveLength(2);
    const usd = groups.find((g) => g.currency === 'USD')!;
    const brl = groups.find((g) => g.currency === 'BRL')!;
    expect(usd.planned.toFixed(2)).toBe('100.00');
    expect(brl.paid.toFixed(2)).toBe('180.00');
  });

  it('custo operacional usa real quando existir', () => {
    const map = laborOperationalCostForEvent([
      {
        rateCurrency: 'USD',
        plannedCost: new Prisma.Decimal('100'),
        actualCost: new Prisma.Decimal('90'),
        paymentStatus: 'incurred',
      },
    ]);
    expect(map.get('USD')?.toFixed(2)).toBe('90.00');
  });

  it('actual hourly com quantidade real', () => {
    const cost = computeStaffActualCost({
      rateType: 'hourly',
      rateAmount: new Prisma.Decimal('30'),
      actualQuantity: new Prisma.Decimal('6'),
    });
    expect(cost?.toFixed(2)).toBe('180.00');
  });
});
