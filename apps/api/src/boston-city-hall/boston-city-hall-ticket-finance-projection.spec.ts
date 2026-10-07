import {
  shouldProjectTicketOrderToFinanceiro,
  buildTicketOrderFinanceDescription,
} from './boston-city-hall-ticket-finance-projection';

describe('shouldProjectTicketOrderToFinanceiro', () => {
  it('projeta quando pedido confirmado e pagamento pago', () => {
    expect(
      shouldProjectTicketOrderToFinanceiro({
        orderStatus: 'confirmed',
        paymentStatus: 'paid',
        reconciliationRequired: false,
      }),
    ).toBe(true);
  });

  it('não projeta com reconciliação pendente', () => {
    expect(
      shouldProjectTicketOrderToFinanceiro({
        orderStatus: 'confirmed',
        paymentStatus: 'paid',
        reconciliationRequired: true,
      }),
    ).toBe(false);
  });

  it('não projeta pedido pendente mesmo com pagamento pago', () => {
    expect(
      shouldProjectTicketOrderToFinanceiro({
        orderStatus: 'pending',
        paymentStatus: 'paid',
        reconciliationRequired: false,
      }),
    ).toBe(false);
  });
});

describe('buildTicketOrderFinanceDescription', () => {
  it('inclui número do pedido', () => {
    expect(buildTicketOrderFinanceDescription('BCH-T-2026-000001')).toContain(
      'BCH-T-2026-000001',
    );
  });
});
