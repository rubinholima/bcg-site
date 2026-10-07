import {
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BostonCityHallPublicCheckoutService } from './boston-city-hall-public-checkout.service';
import { BostonCityHallPublicTicketService } from './boston-city-hall-public-ticket.service';
import { BostonCityHallMyTicketsService } from './boston-city-hall-my-tickets.service';
import { BostonCityHallPublicNotificationService } from './boston-city-hall-public-notification.service';
import { PrismaService } from '../prisma/prisma.service';
import { BostonCityHallPublicEventsService } from './boston-city-hall-public-events.service';
import { BostonCityHallTicketOrdersService } from './boston-city-hall-ticket-orders.service';
import { MailService } from '../common/mail.service';
import {
  BCH_PASSWORDLESS_NEUTRAL_MESSAGE,
} from './boston-city-hall-my-tickets.constants';
import { hashOpaqueToken, normalizeBchCustomerEmail } from './boston-city-hall-public-access.util';
import { mapTicketToPublicStatusLabel } from './boston-city-hall-public-tickets.constants';

describe('BCH public ticket access (Phase 3.3)', () => {
  describe('BostonCityHallPublicCheckoutService + tickets', () => {
    let checkout: BostonCityHallPublicCheckoutService;
    let publicTickets: BostonCityHallPublicTicketService;
    let ticketOrders: { getOrderByPublicAccessToken: jest.Mock };

    beforeEach(async () => {
      ticketOrders = { getOrderByPublicAccessToken: jest.fn() };
      const prisma = {
        tenant: { findUnique: jest.fn().mockResolvedValue({ id: 't1' }) },
        event: {
          findFirst: jest.fn().mockResolvedValue({
            startDate: null,
            endDate: null,
            status: 'published',
            tenant: { slug: 'boston-city-hall' },
          }),
        },
        eventTicketOrder: {
          findFirst: jest.fn().mockResolvedValue({ publicAccessToken: 'tok-a' }),
        },
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          BostonCityHallPublicCheckoutService,
          BostonCityHallPublicTicketService,
          { provide: PrismaService, useValue: prisma },
          { provide: BostonCityHallPublicEventsService, useValue: {} },
          { provide: BostonCityHallTicketOrdersService, useValue: ticketOrders },
        ],
      }).compile();

      checkout = module.get(BostonCityHallPublicCheckoutService);
      publicTickets = module.get(BostonCityHallPublicTicketService);
    });

    it('1 — pedido confirmado expõe ingressos emitidos', async () => {
      ticketOrders.getOrderByPublicAccessToken.mockResolvedValue({
        id: 'ord-1',
        eventId: 'ev-1',
        orderNumber: 'BCH-1',
        status: 'confirmed',
        confirmedAt: '2026-01-01T12:00:00.000Z',
        subtotal: '10',
        total: '10',
        currency: 'USD',
        customerName: 'A',
        customerEmail: 'a@test.com',
        eventSlug: 'gala',
        eventName: 'Gala',
        holdExpiresAt: null,
        payment: { status: 'paid' },
        items: [],
      });

      jest.spyOn(publicTickets, 'listPublicTicketsForConfirmedOrder').mockResolvedValue({
        ticketCount: 1,
        tickets: [
          {
            publicTicketRef: 'ref-1',
            ticketCode: 'BCH-26-ABC',
            ticketTypeName: 'Geral',
            lotName: null,
            holderName: 'A',
            status: 'VALID',
            issuedAt: '2026-01-01T12:00:00.000Z',
            seating: null,
            qrPath: '/api/public/boston-city-hall/orders/tok-a/tickets/ref-1/qr',
          },
        ],
      });

      const dto = await checkout.getOrderByPublicToken('tok-a');
      expect(dto.ticketCount).toBe(1);
      expect(dto.tickets[0]?.publicTicketRef).toBe('ref-1');
      expect(dto.tickets[0]).not.toHaveProperty('qrToken');
    });

    it('2 — pedido pending não expõe ingressos', async () => {
      ticketOrders.getOrderByPublicAccessToken.mockResolvedValue({
        id: 'ord-2',
        eventId: 'ev-1',
        orderNumber: 'BCH-2',
        status: 'pending',
        confirmedAt: null,
        subtotal: '10',
        total: '10',
        currency: 'USD',
        customerName: 'A',
        customerEmail: 'a@test.com',
        eventSlug: 'gala',
        eventName: 'Gala',
        holdExpiresAt: new Date().toISOString(),
        payment: { status: 'pending' },
        items: [],
      });

      const listSpy = jest.spyOn(publicTickets, 'listPublicTicketsForConfirmedOrder');
      const dto = await checkout.getOrderByPublicToken('tok-a');
      expect(listSpy).not.toHaveBeenCalled();
      expect(dto.tickets).toEqual([]);
      expect(dto.ticketCount).toBe(0);
    });
  });

  describe('BostonCityHallPublicTicketService QR', () => {
    let service: BostonCityHallPublicTicketService;
    let prisma: {
      tenant: { findUnique: jest.Mock };
      eventTicketOrder: { findFirst: jest.Mock };
      eventTicket: { findFirst: jest.Mock };
    };

    beforeEach(async () => {
      prisma = {
        tenant: { findUnique: jest.fn().mockResolvedValue({ id: 't1' }) },
        eventTicketOrder: { findFirst: jest.fn() },
        eventTicket: { findFirst: jest.fn() },
      };
      const module = await Test.createTestingModule({
        providers: [BostonCityHallPublicTicketService, { provide: PrismaService, useValue: prisma }],
      }).compile();
      service = module.get(BostonCityHallPublicTicketService);
    });

    it('3 — QR rejeita ingresso de outro pedido', async () => {
      prisma.eventTicketOrder.findFirst.mockResolvedValue({ id: 'ord-a', status: 'confirmed' });
      prisma.eventTicket.findFirst.mockResolvedValue(null);
      await expect(service.renderQrPngForOrderTicket('tok-a', 'ref-x')).rejects.toThrow();
    });

    it('4 — assertOrderOwnsTicket não retorna qrToken em DTO público (serviço interno)', async () => {
      prisma.eventTicketOrder.findFirst.mockResolvedValue({ id: 'ord-a', status: 'confirmed' });
      prisma.eventTicket.findFirst.mockResolvedValue({ qrToken: 'secret-qr' });
      const internal = await service.assertOrderOwnsTicket('tok-a', 'ref-x');
      expect(internal.qrToken).toBe('secret-qr');
    });
  });

  describe('BostonCityHallMyTicketsService passwordless', () => {
    let service: BostonCityHallMyTicketsService;
    let prisma: {
      tenant: { findUnique: jest.Mock };
      eventTicketOrder: { findFirst: jest.Mock; findMany: jest.Mock };
      bchMyTicketsMagicLink: { create: jest.Mock; findFirst: jest.Mock; update: jest.Mock };
      bchMyTicketsSession: { create: jest.Mock; findFirst: jest.Mock };
      $transaction: jest.Mock;
    };
    let mail: { sendMail: jest.Mock };
    let publicTickets: { listPublicTicketsForConfirmedOrder: jest.Mock };

    beforeEach(async () => {
      mail = { sendMail: jest.fn().mockResolvedValue({ sent: true }) };
      publicTickets = {
        listPublicTicketsForConfirmedOrder: jest.fn().mockResolvedValue({ tickets: [], ticketCount: 0 }),
      };
      prisma = {
        tenant: { findUnique: jest.fn().mockResolvedValue({ id: 't1' }) },
        eventTicketOrder: {
          findFirst: jest.fn(),
          findMany: jest.fn().mockResolvedValue([]),
        },
        bchMyTicketsMagicLink: {
          create: jest.fn(),
          findFirst: jest.fn(),
          update: jest.fn(),
        },
        bchMyTicketsSession: {
          create: jest.fn(),
          findFirst: jest.fn(),
        },
        $transaction: jest.fn((ops) => Promise.all(ops)),
      };

      const module = await Test.createTestingModule({
        providers: [
          BostonCityHallMyTicketsService,
          { provide: PrismaService, useValue: prisma },
          { provide: MailService, useValue: mail },
          { provide: BostonCityHallPublicTicketService, useValue: publicTickets },
        ],
      }).compile();
      service = module.get(BostonCityHallMyTicketsService);
    });

    it('5 — request-access resposta neutra (e-mail conhecido e desconhecido)', async () => {
      prisma.eventTicketOrder.findFirst.mockResolvedValueOnce(null);
      const unknown = await service.requestPasswordlessAccess('unknown@test.com', '1.1.1.1');
      expect(unknown.message).toBe(BCH_PASSWORDLESS_NEUTRAL_MESSAGE);

      prisma.eventTicketOrder.findFirst.mockResolvedValueOnce({ id: 'o1' });
      const known = await service.requestPasswordlessAccess('buyer@test.com', '1.1.1.1');
      expect(known.message).toBe(BCH_PASSWORDLESS_NEUTRAL_MESSAGE);
    });

    it('6 — magic link válido troca sessão', async () => {
      const raw = 'magic-raw-token-12345678901234567890123456789012';
      const hash = hashOpaqueToken(raw);
      prisma.bchMyTicketsMagicLink.findFirst.mockResolvedValue({
        id: 'ml-1',
        emailNormalized: 'a@test.com',
        usedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      });
      prisma.bchMyTicketsMagicLink.update.mockResolvedValue({});
      prisma.bchMyTicketsSession.create.mockResolvedValue({});

      const out = await service.exchangeMagicLink(raw);
      expect(out.sessionToken.length).toBeGreaterThan(20);
      expect(prisma.bchMyTicketsMagicLink.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ tokenHash: hash }) }),
      );
    });

    it('7 — magic link expirado falha', async () => {
      prisma.bchMyTicketsMagicLink.findFirst.mockResolvedValue({
        id: 'ml-1',
        usedAt: null,
        expiresAt: new Date(Date.now() - 1000),
      });
      await expect(service.exchangeMagicLink('expired-token')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('8 — magic link usado não reutiliza', async () => {
      prisma.bchMyTicketsMagicLink.findFirst.mockResolvedValue({
        id: 'ml-1',
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      });
      await expect(service.exchangeMagicLink('used-token')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('9 — sessão retorna só pedidos confirmados do e-mail', async () => {
      const email = normalizeBchCustomerEmail('buyer@test.com');
      prisma.bchMyTicketsSession.findFirst.mockResolvedValue({
        emailNormalized: email,
        expiresAt: new Date(Date.now() + 60_000),
      });
      prisma.eventTicketOrder.findMany.mockResolvedValue([
        {
          orderNumber: 'BCH-9',
          publicAccessToken: 'tok-9',
          confirmedAt: new Date(),
          total: { toFixed: () => '50.00' },
          currency: 'USD',
          event: { slug: 'gala', name: 'Gala', startDate: null, endDate: null },
          items: [],
        },
      ]);
      publicTickets.listPublicTicketsForConfirmedOrder.mockResolvedValue({
        ticketCount: 1,
        tickets: [{ publicTicketRef: 'r1', ticketCode: 'C', ticketTypeName: 'T', lotName: null, holderName: 'H', status: 'VALID', issuedAt: '', seating: null, qrPath: '/qr' }],
      });

      const list = await service.listTicketsForSession('session-raw');
      expect(list.email).toBe(email);
      expect(list.orders).toHaveLength(1);
      expect(prisma.eventTicketOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'confirmed',
            customerEmail: expect.objectContaining({ equals: email }),
          }),
        }),
      );
    });

    it('10 — sessão e-mail A não lista pedidos de B', async () => {
      prisma.bchMyTicketsSession.findFirst.mockResolvedValue({
        emailNormalized: 'a@test.com',
        expiresAt: new Date(Date.now() + 60_000),
      });
      prisma.eventTicketOrder.findMany.mockResolvedValue([]);
      await service.listTicketsForSession('sess-a');
      expect(prisma.eventTicketOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            customerEmail: expect.objectContaining({ equals: 'a@test.com' }),
          }),
        }),
      );
    });

    it('11 — status used/cancelled mapeados', () => {
      expect(mapTicketToPublicStatusLabel('used')).toBe('USED');
      expect(mapTicketToPublicStatusLabel('cancelled')).toBe('CANCELLED');
      expect(mapTicketToPublicStatusLabel('valid')).toBe('VALID');
    });
  });

  describe('BostonCityHallPublicNotificationService', () => {
    it('12 — confirmação idempotente não reenvia e-mail', async () => {
      const prisma = {
        eventTicketOrder: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          findFirst: jest.fn(),
        },
      };
      const mail = { sendMail: jest.fn() };
      const module = await Test.createTestingModule({
        providers: [
          BostonCityHallPublicNotificationService,
          { provide: PrismaService, useValue: prisma },
          { provide: MailService, useValue: mail },
        ],
      }).compile();
      const svc = module.get(BostonCityHallPublicNotificationService);
      await svc.sendOrderConfirmedEmailIfNeeded('ord-1', 't1');
      expect(mail.sendMail).not.toHaveBeenCalled();
    });
  });

  describe('session guard', () => {
    it('sessão ausente → unauthorized', async () => {
      const module = await Test.createTestingModule({
        providers: [
          BostonCityHallMyTicketsService,
          {
            provide: PrismaService,
            useValue: { tenant: { findUnique: jest.fn().mockResolvedValue({ id: 't1' }) } },
          },
          { provide: MailService, useValue: {} },
          { provide: BostonCityHallPublicTicketService, useValue: {} },
        ],
      }).compile();
      const svc = module.get(BostonCityHallMyTicketsService);
      await expect(svc.listTicketsForSession(undefined)).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
