import {
  buildCup360TicketQrPayload,
  generateQrToken,
  parseCup360TicketQrCredential,
} from './boston-city-hall-ticket-credential.util';
import { CUP360_TICKET_QR_PREFIX } from './boston-city-hall-event-ticket.constants';
import {
  expectedTicketCountForItems,
  lineIndexesToIssue,
  missingTicketsForLineItem,
  shouldIssueTicketsForOrder,
} from './boston-city-hall-ticket-issuance';

describe('shouldIssueTicketsForOrder', () => {
  it('emite só para pedido confirmado e pago', () => {
    expect(
      shouldIssueTicketsForOrder({
        orderStatus: 'confirmed',
        paymentStatus: 'paid',
        reconciliationRequired: false,
      }),
    ).toBe(true);
    expect(
      shouldIssueTicketsForOrder({
        orderStatus: 'pending',
        paymentStatus: 'paid',
        reconciliationRequired: false,
      }),
    ).toBe(false);
  });
});

describe('expectedTicketCountForItems', () => {
  it('soma quantidades dos itens', () => {
    expect(
      expectedTicketCountForItems([{ quantity: 2 }, { quantity: 3 }]),
    ).toBe(5);
  });
});

describe('lineIndexesToIssue', () => {
  it('gera índices faltantes idempotentemente', () => {
    expect(lineIndexesToIssue(4, 0)).toEqual([0, 1, 2, 3]);
    expect(lineIndexesToIssue(4, 3)).toEqual([3]);
    expect(lineIndexesToIssue(4, 4)).toEqual([]);
  });

  it('missingTicketsForLineItem', () => {
    expect(missingTicketsForLineItem(5, 2)).toBe(3);
    expect(missingTicketsForLineItem(5, 5)).toBe(0);
  });
});

describe('QR credential', () => {
  it('tokens opacos são únicos', () => {
    const tokens = new Set(Array.from({ length: 20 }, () => generateQrToken()));
    expect(tokens.size).toBe(20);
  });

  it('payload versionado e parse simétrico', () => {
    const token = 'abc123xyz789012345678901234';
    const payload = buildCup360TicketQrPayload(token);
    expect(payload.startsWith(CUP360_TICKET_QR_PREFIX)).toBe(true);
    expect(parseCup360TicketQrCredential(payload)).toBe(token);
  });
});
