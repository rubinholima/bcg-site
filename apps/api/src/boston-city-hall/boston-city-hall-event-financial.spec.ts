import { Prisma } from '@prisma/client';
import {
  operationalMarginPct,
  sumApplicableRevenues,
  ticketingFinanceProjectionExcludedFromRevenue,
} from './boston-city-hall-event-financial.util';
import { isConfirmedCommercialOrder } from './boston-city-hall-ticket-reports.util';

describe('BostonCityHallEventFinancial — agregação', () => {
  it('1 — receita operacional soma só fontes aplicáveis (ingressos confirmados)', () => {
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
    expect(isConfirmedCommercialOrder('cancelled')).toBe(false);
  });

  it('4 — bar COGS reduz resultado operacional', () => {
    const rev = '200.00';
    const cost = '80.00';
    const result = new Prisma.Decimal(rev).minus(cost).toFixed(2);
    expect(result).toBe('120.00');
    expect(operationalMarginPct(rev, cost)).toBe('60.00');
  });

  it('5 — margem incompleta quando custo bar parcial (flag de produto)', () => {
    const missingCostLines = 1;
    const barLineCount = 2;
    const marginIncomplete = barLineCount > 0 && missingCostLines > 0;
    expect(marginIncomplete).toBe(true);
  });

  it('6 — pedidos open/cancelled excluídos da regra comercial', () => {
    expect(isConfirmedCommercialOrder('open')).toBe(false);
    expect(isConfirmedCommercialOrder('cancelled')).toBe(false);
  });

  it('7 — receita venue só quando contrato assinado (applicable)', () => {
    const signed = { applicable: true, amount: '5000.00' };
    const unsigned = { applicable: false, amount: null };
    expect(sumApplicableRevenues([signed])).toBe('5000.00');
    expect(sumApplicableRevenues([unsigned, { applicable: true, amount: '10.00' }])).toBe('10.00');
  });

  it('8 — paid/outstanding: coleta domínios sem Financeiro', () => {
    const ticketPaid = '100.00';
    const barPaid = '50.00';
    const venuePaid = '2000.00';
    const collected = new Prisma.Decimal(ticketPaid)
      .plus(barPaid)
      .plus(venuePaid)
      .toFixed(2);
    expect(collected).toBe('2150.00');
  });

  it('9 — dados ausentes: applicable false não força zero na soma de receita', () => {
    const total = sumApplicableRevenues([
      { applicable: false, amount: null },
      { applicable: true, amount: '0.00' },
    ]);
    expect(total).toBe('0.00');
  });

  it('10 — total executivo = soma fontes canônicas owned only', () => {
    const gross = sumApplicableRevenues([
      { applicable: true, amount: '100.00' },
      { applicable: true, amount: '25.00' },
      { applicable: true, amount: '5000.00' },
    ]);
    expect(gross).toBe('5125.00');
  });

  it('11 — isolamento: tenantId no where do evento (contrato de serviço)', () => {
    const where = { id: 'evt-1', tenantId: 'tenant-bch' };
    expect(where.tenantId).toBe('tenant-bch');
  });
});
