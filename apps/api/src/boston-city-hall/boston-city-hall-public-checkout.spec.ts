import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BostonCityHallPublicCheckoutService } from './boston-city-hall-public-checkout.service';
import { PrismaService } from '../prisma/prisma.service';
import { BostonCityHallPublicEventsService } from './boston-city-hall-public-events.service';
import { BostonCityHallTicketOrdersService } from './boston-city-hall-ticket-orders.service';
import { mapPaymentToPublicStatus } from './boston-city-hall-public-checkout.constants';

describe('BostonCityHallPublicCheckoutService', () => {
  let service: BostonCityHallPublicCheckoutService;
  let prisma: {
    tenant: { findUnique: jest.Mock };
    event: { findFirst: jest.Mock };
    eventTicketOrder: { findFirst: jest.Mock };
  };
  let publicEvents: { getBySlug: jest.Mock };
  let ticketOrders: { createOrder: jest.Mock; getOrderByPublicAccessToken: jest.Mock };

  beforeEach(async () => {
    prisma = {
      tenant: { findUnique: jest.fn().mockResolvedValue({ id: 'tenant-bch' }) },
      event: { findFirst: jest.fn() },
      eventTicketOrder: { findFirst: jest.fn() },
    };
    publicEvents = { getBySlug: jest.fn() };
    ticketOrders = {
      createOrder: jest.fn(),
      getOrderByPublicAccessToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BostonCityHallPublicCheckoutService,
        { provide: PrismaService, useValue: prisma },
        { provide: BostonCityHallPublicEventsService, useValue: publicEvents },
        { provide: BostonCityHallTicketOrdersService, useValue: ticketOrders },
      ],
    }).compile();

    service = module.get(BostonCityHallPublicCheckoutService);
  });

  it('rejeita campos monetários enviados pelo cliente', async () => {
    prisma.event.findFirst.mockResolvedValue({
      id: 'ev-1',
      slug: 'show',
      name: 'Show',
      startDate: null,
      endDate: null,
      ticketing: { enabled: true },
    });
    await expect(
      service.createOrderForEventSlug(
        'show',
        {
          idempotencyKey: 'idem-key-12345678',
          total: '999',
          items: [{ ticketTypeId: 't1', quantity: 1 }],
          customer: { name: 'A', email: 'a@test.com' },
        },
        '127.0.0.1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(ticketOrders.createOrder).not.toHaveBeenCalled();
  });

  it('cria pedido publicado BCH com preço resolvido no servidor', async () => {
    prisma.event.findFirst.mockResolvedValue({
      id: 'ev-1',
      slug: 'gala',
      name: 'Gala',
      startDate: null,
      endDate: null,
      ticketing: { enabled: true },
    });
    publicEvents.getBySlug.mockResolvedValue({
      slug: 'gala',
      ticketing: {
        enabled: true,
        types: [
          {
            ticketTypeId: 'type-1',
            availability: 'AVAILABLE',
            currentLot: { ticketLotId: 'lot-1' },
          },
        ],
      },
    });
    ticketOrders.createOrder.mockResolvedValue({
      id: 'ord-1',
      orderNumber: 'BCH-T-2026-000001',
      eventSlug: 'gala',
      eventName: 'Gala',
      status: 'pending',
      holdExpiresAt: new Date().toISOString(),
      subtotal: '100.00',
      total: '100.00',
      currency: 'USD',
      customerName: 'Maria',
      customerEmail: 'maria@test.com',
      payment: { status: 'pending' },
      items: [
        {
          ticketTypeName: 'Geral',
          lotName: null,
          quantity: 2,
          unitPrice: '50.00',
          totalPrice: '100.00',
        },
      ],
    });
    prisma.eventTicketOrder.findFirst.mockResolvedValue({
      publicAccessToken: 'tok-public-abc',
    });

    const result = await service.createOrderForEventSlug(
      'gala',
      {
        idempotencyKey: 'checkout-idem-12345678',
        items: [{ ticketTypeId: 'type-1', ticketLotId: 'lot-1', quantity: 2 }],
        customer: { name: 'Maria', email: 'maria@test.com' },
      },
      '127.0.0.1',
    );

    expect(ticketOrders.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'ev-1',
        checkoutIdempotencyKey: 'checkout-idem-12345678',
        items: [{ ticketTypeId: 'type-1', ticketLotId: 'lot-1', quantity: 2 }],
      }),
    );
    expect(result.publicAccessToken).toBe('tok-public-abc');
    expect(result.paymentStatus).toBe('pending');
    expect(result).not.toHaveProperty('tenantId');
  });

  it('lookup público exige token', async () => {
    ticketOrders.getOrderByPublicAccessToken.mockRejectedValue(new Error('not found'));
    await expect(service.getOrderByPublicToken('short')).rejects.toThrow();
  });
});

describe('mapPaymentToPublicStatus', () => {
  it('pending order → paymentStatus pending', () => {
    expect(mapPaymentToPublicStatus('pending', 'pending')).toBe('pending');
  });
  it('expired order → paymentStatus expired', () => {
    expect(mapPaymentToPublicStatus('expired', 'pending')).toBe('expired');
  });
});
