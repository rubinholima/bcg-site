import { shouldProjectTicketOrderToFinanceiro } from './boston-city-hall-ticket-finance-projection';

export function shouldIssueTicketsForOrder(params: {
  orderStatus: string;
  paymentStatus: string | null | undefined;
  reconciliationRequired: boolean;
}): boolean {
  return shouldProjectTicketOrderToFinanceiro(params);
}

export function expectedTicketCountForItems(items: { quantity: number }[]): number {
  return items.reduce((sum, item) => sum + Math.max(0, item.quantity), 0);
}

export function missingTicketsForLineItem(quantity: number, existingCount: number): number {
  return Math.max(0, quantity - Math.max(0, existingCount));
}

export function lineIndexesToIssue(quantity: number, existingCount: number): number[] {
  const start = Math.max(0, existingCount);
  const end = Math.max(0, quantity);
  const indexes: number[] = [];
  for (let i = start; i < end; i++) indexes.push(i);
  return indexes;
}
