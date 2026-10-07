import {
  classifyCheckinInput,
  resolveCheckinResultForTicket,
} from './boston-city-hall-ticket-checkin.util';
import { buildCup360TicketQrPayload, generateQrToken } from './boston-city-hall-ticket-credential.util';
import { BostonCityHallTicketCheckinService } from './boston-city-hall-ticket-checkin.service';

describe('classifyCheckinInput', () => {
  it('aceita payload CUP360-T1', () => {
    const token = generateQrToken();
    const payload = buildCup360TicketQrPayload(token);
    expect(classifyCheckinInput(payload)).toEqual({ kind: 'token', token });
  });

  it('aceita código BCH', () => {
    expect(classifyCheckinInput('BCH-26-ABC123')).toEqual({
      kind: 'code',
      code: 'BCH-26-ABC123',
    });
  });

  it('rejeita cuid como credencial', () => {
    expect(classifyCheckinInput('clxyz1234567890123456789012').kind).toBe('reject_id');
  });
});

describe('resolveCheckinResultForTicket', () => {
  it('valid + mesmo evento → accepted', () => {
    expect(
      resolveCheckinResultForTicket({
        ticketStatus: 'valid',
        ticketEventId: 'ev1',
        selectedEventId: 'ev1',
      }),
    ).toBe('accepted');
  });

  it('used → already_used', () => {
    expect(
      resolveCheckinResultForTicket({
        ticketStatus: 'used',
        ticketEventId: 'ev1',
        selectedEventId: 'ev1',
      }),
    ).toBe('already_used');
  });

  it('cancelled → cancelled', () => {
    expect(
      resolveCheckinResultForTicket({
        ticketStatus: 'cancelled',
        ticketEventId: 'ev1',
        selectedEventId: 'ev1',
      }),
    ).toBe('cancelled');
  });

  it('outro evento → wrong_event', () => {
    expect(
      resolveCheckinResultForTicket({
        ticketStatus: 'valid',
        ticketEventId: 'ev2',
        selectedEventId: 'ev1',
      }),
    ).toBe('wrong_event');
  });
});

describe('BostonCityHallTicketCheckinService.performCheckin', () => {
  const baseTicket = {
    id: 'ticket-1',
    tenantId: 't1',
    eventId: 'ev1',
    orderId: 'o1',
    orderItemId: 'oi1',
    ticketTypeId: 'tt1',
    ticketLotId: null,
    lineIndex: 0,
    ticketCode: 'BCH-26-TEST01',
    qrToken: 'tokensecret123456789012345',
    status: 'valid',
    orderNumber: 'BCH-T-2026-000001',
    ticketTypeName: 'General',
    lotName: null,
    unitPrice: { toNumber: () => 10 } as never,
    currency: 'USD',
    eventName: 'Show',
    holderName: 'João',
    holderEmail: 'a@b.com',
    issuedAt: new Date(),
    cancelledAt: null,
    usedAt: null,
  };

  function buildService(overrides: {
    eventTicket?: {
      findFirst: jest.Mock;
      findUnique?: jest.Mock;
      updateMany?: jest.Mock;
    };
    event?: { findFirst: jest.Mock };
    eventTicketCheckin?: { create: jest.Mock; findMany?: jest.Mock };
    tenant?: { findUnique: jest.Mock };
    $transaction?: jest.Mock;
  }) {
    const prisma = {
      tenant: {
        findUnique: overrides.tenant ?? jest.fn().mockResolvedValue({ id: 't1' }),
      },
      event: {
        findFirst: overrides.event?.findFirst ?? jest.fn().mockResolvedValue({ id: 'ev1' }),
      },
      eventTicket: {
        findFirst: overrides.eventTicket?.findFirst ?? jest.fn().mockResolvedValue(baseTicket),
        findUnique:
          overrides.eventTicket?.findUnique ??
          jest.fn().mockResolvedValue({ ...baseTicket, status: 'used', usedAt: new Date() }),
        updateMany: overrides.eventTicket?.updateMany ?? jest.fn().mockResolvedValue({ count: 1 }),
      },
      eventTicketCheckin: {
        create:
          overrides.eventTicketCheckin?.create ??
          jest.fn().mockImplementation(({ data }) =>
            Promise.resolve({
              id: 'chk-1',
              ...data,
              createdAt: new Date(),
            }),
          ),
        findMany: overrides.eventTicketCheckin?.findMany ?? jest.fn(),
      },
      $transaction:
        overrides.$transaction ??
        jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            eventTicket: prisma.eventTicket,
            eventTicketCheckin: prisma.eventTicketCheckin,
          };
          return fn(tx);
        }),
    };
    return new BostonCityHallTicketCheckinService(prisma as never);
  }

  it('ingresso válido → accepted e updateMany', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const service = buildService({
      eventTicket: {
        findFirst: jest.fn().mockResolvedValue(baseTicket),
        findUnique: jest.fn().mockResolvedValue({ ...baseTicket, status: 'used', usedAt: new Date() }),
        updateMany,
      },
    });

    const res = await service.performCheckin({
      tenantId: 't1',
      eventId: 'ev1',
      scanInput: buildCup360TicketQrPayload(baseTicket.qrToken),
      operatorUserId: 'u1',
    });

    expect(res.result).toBe('accepted');
    expect(updateMany).toHaveBeenCalled();
  });

  it('segundo scan (updateMany 0) → already_used', async () => {
    const used = { ...baseTicket, status: 'used', usedAt: new Date('2026-01-01') };
    const service = buildService({
      eventTicket: {
        findFirst: jest.fn().mockResolvedValue({ ...baseTicket, status: 'used', usedAt: used.usedAt }),
        findUnique: jest.fn().mockResolvedValue(used),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    });

    const res = await service.performCheckin({
      tenantId: 't1',
      eventId: 'ev1',
      scanInput: baseTicket.ticketCode,
      operatorUserId: 'u1',
    });

    expect(res.result).toBe('already_used');
    expect(res.ticket?.usedAt).toBeTruthy();
  });

  it('concorrência: updateMany 0 com ticket used → already_used', async () => {
    const used = { ...baseTicket, status: 'used', usedAt: new Date() };
    const service = buildService({
      eventTicket: {
        findFirst: jest.fn().mockResolvedValue(baseTicket),
        findUnique: jest.fn().mockResolvedValue(used),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    });

    const res = await service.performCheckin({
      tenantId: 't1',
      eventId: 'ev1',
      scanInput: buildCup360TicketQrPayload(baseTicket.qrToken),
      operatorUserId: null,
    });

    expect(res.result).toBe('already_used');
  });

  it('cancelled → rejected', async () => {
    const service = buildService({
      eventTicket: {
        findFirst: jest.fn().mockResolvedValue({ ...baseTicket, status: 'cancelled' }),
      },
    });

    const res = await service.performCheckin({
      tenantId: 't1',
      eventId: 'ev1',
      scanInput: baseTicket.ticketCode,
      operatorUserId: null,
    });

    expect(res.result).toBe('cancelled');
  });

  it('wrong event → wrong_event sem marcar used', async () => {
    const updateMany = jest.fn();
    const service = buildService({
      eventTicket: {
        findFirst: jest.fn().mockResolvedValue({ ...baseTicket, eventId: 'ev-other' }),
        updateMany,
      },
    });

    const res = await service.performCheckin({
      tenantId: 't1',
      eventId: 'ev1',
      scanInput: baseTicket.ticketCode,
      operatorUserId: null,
    });

    expect(res.result).toBe('wrong_event');
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('malformado → invalid', async () => {
    const service = buildService({
      eventTicket: {
        findFirst: jest.fn(),
      },
    });

    const res = await service.performCheckin({
      tenantId: 't1',
      eventId: 'ev1',
      scanInput: 'not-a-valid-credential',
      operatorUserId: null,
    });

    expect(res.result).toBe('invalid');
  });
});
