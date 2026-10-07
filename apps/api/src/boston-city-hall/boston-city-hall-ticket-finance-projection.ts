/** Categoria estável — projeção de venda de ingressos BCH. */
export const BCH_TICKETING_FINANCE_CATEGORY = 'BCH_INGRESSOS';

export const BCH_TICKETING_FINANCE_SOURCE_MODULE = 'bch_ticketing';
export const BCH_TICKETING_FINANCE_SOURCE_TYPE = 'event_ticket_order';

export function shouldProjectTicketOrderToFinanceiro(params: {
  orderStatus: string;
  paymentStatus: string | null | undefined;
  reconciliationRequired: boolean;
}): boolean {
  if (params.reconciliationRequired) return false;
  if (params.orderStatus !== 'confirmed') return false;
  if (params.paymentStatus !== 'paid') return false;
  return true;
}

export function buildTicketOrderFinanceDescription(orderNumber: string): string {
  return `BCH Ticketing — Order ${orderNumber.trim()}`;
}
