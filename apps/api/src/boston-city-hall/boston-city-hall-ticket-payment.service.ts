import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentCoreService } from '../payments/payment-core.service';
import type { PaymentMethod } from '../payments/payment-core.constants';
import { BCH_VENUE_SLUG } from './boston-city-hall.constants';
import {
  evaluateTicketOrderConfirmation,
  type TicketOrderConfirmOutcome,
} from './boston-city-hall-ticket-order-confirmation';
import { BostonCityHallTicketFinanceProjectionService } from './boston-city-hall-ticket-finance-projection.service';
import { BostonCityHallTicketIssuanceService } from './boston-city-hall-ticket-issuance.service';
import { BostonCityHallPublicNotificationService } from './boston-city-hall-public-notification.service';

export type EventTicketOrderPaymentDto = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  paymentMethod: string | null;
  paidAt: string | null;
  manualReference: string | null;
  externalProviderLabel: string | null;
  expiresAt: string | null;
};

export type ConfirmTicketOrderFromPaymentResult = {
  outcome: TicketOrderConfirmOutcome;
  orderId: string;
  paymentId: string;
  reconciliationRequired: boolean;
};

export function paymentIdempotencyKeyForTicketOrder(orderId: string): string {
  return `event_ticket_order:${orderId}`;
}

@Injectable()
export class BostonCityHallTicketPaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentCore: PaymentCoreService,
    private readonly ticketFinanceProjection: BostonCityHallTicketFinanceProjectionService,
    private readonly ticketIssuance: BostonCityHallTicketIssuanceService,
    private readonly publicNotifications: BostonCityHallPublicNotificationService,
  ) {}

  private async resolveTenantId(venueSlug = BCH_VENUE_SLUG): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: venueSlug },
      select: { id: true },
    });
    if (!tenant) throw new NotFoundException(`Tenant "${venueSlug}" não encontrado.`);
    return tenant.id;
  }

  serializePaymentRow(
    row: Prisma.PaymentGetPayload<object> | null,
  ): EventTicketOrderPaymentDto | null {
    if (!row) return null;
    const amount = typeof row.amount === 'number' ? row.amount : row.amount.toNumber();
    return {
      id: row.id,
      status: row.status,
      amount,
      currency: row.currency,
      paymentMethod: row.paymentMethod,
      paidAt: row.paidAt?.toISOString() ?? null,
      manualReference: row.manualReference,
      externalProviderLabel: row.externalProviderLabel,
      expiresAt: row.expiresAt?.toISOString() ?? null,
    };
  }

  async ensurePaymentForOrder(orderId: string, tenantId: string): Promise<EventTicketOrderPaymentDto> {
    const order = await this.prisma.eventTicketOrder.findFirst({
      where: { id: orderId, tenantId },
    });
    if (!order) throw new NotFoundException('Pedido não encontrado.');

    const existing = await this.prisma.payment.findUnique({
      where: { eventTicketOrderId: orderId },
    });
    if (existing) return this.serializePaymentRow(existing)!;

    const total = typeof order.total === 'number' ? order.total : order.total.toNumber();
    const created = await this.paymentCore.createPayment({
      tenantId,
      idempotencyKey: paymentIdempotencyKeyForTicketOrder(orderId),
      amount: total,
      currency: order.currency,
      eventTicketOrderId: orderId,
      expiresAt: order.holdExpiresAt?.toISOString() ?? undefined,
    });
    const paidAtRaw = created.paidAt;
    const expiresAtRaw = created.expiresAt;
    return {
      id: created.id,
      status: created.status,
      amount: created.amount as number,
      currency: created.currency,
      paymentMethod: created.paymentMethod,
      paidAt: paidAtRaw
        ? paidAtRaw instanceof Date
          ? paidAtRaw.toISOString()
          : String(paidAtRaw)
        : null,
      manualReference: created.manualReference ?? null,
      externalProviderLabel: created.externalProviderLabel ?? null,
      expiresAt: expiresAtRaw
        ? expiresAtRaw instanceof Date
          ? expiresAtRaw.toISOString()
          : String(expiresAtRaw)
        : null,
    };
  }

  /**
   * Caminho canônico: Payment `paid` → pedido `confirmed` (idempotente, com lock).
   */
  async confirmOrderFromPaidPayment(
    paymentId: string,
    tenantId: string,
  ): Promise<ConfirmTicketOrderFromPaymentResult> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(
        Prisma.sql`SELECT id FROM "Payment" WHERE id = ${paymentId} AND "tenantId" = ${tenantId} FOR UPDATE`,
      );

      const payment = await tx.payment.findFirst({
        where: { id: paymentId, tenantId },
      });
      if (!payment?.eventTicketOrderId) {
        throw new BadRequestException('Pagamento não vinculado a pedido de ingresso.');
      }
      if (payment.status !== 'paid') {
        throw new BadRequestException('Pagamento ainda não está quitado.');
      }

      const orderId = payment.eventTicketOrderId;
      await tx.$queryRaw(
        Prisma.sql`SELECT id FROM "EventTicketOrder" WHERE id = ${orderId} AND "tenantId" = ${tenantId} FOR UPDATE`,
      );

      const order = await tx.eventTicketOrder.findFirst({
        where: { id: orderId, tenantId },
      });
      if (!order) throw new NotFoundException('Pedido não encontrado.');

      const now = new Date();
      const evaluation = evaluateTicketOrderConfirmation({
        orderStatus: order.status,
        holdExpiresAt: order.holdExpiresAt,
        now,
      });

      if (evaluation === 'already_confirmed') {
        return {
          outcome: evaluation,
          orderId,
          paymentId,
          reconciliationRequired: false,
        };
      }

      if (evaluation === 'reconciliation_hold_expired' || evaluation === 'reconciliation_order_not_pending') {
        return {
          outcome: evaluation,
          orderId,
          paymentId,
          reconciliationRequired: true,
        };
      }

      const updated = await tx.eventTicketOrder.updateMany({
        where: {
          id: orderId,
          tenantId,
          status: 'pending',
          holdExpiresAt: { gt: now },
        },
        data: { status: 'confirmed', confirmedAt: now },
      });

      if (updated.count === 1) {
        return {
          outcome: 'confirmed',
          orderId,
          paymentId,
          reconciliationRequired: false,
        };
      }

      const fresh = await tx.eventTicketOrder.findFirst({ where: { id: orderId, tenantId } });
      if (fresh?.status === 'confirmed') {
        return {
          outcome: 'already_confirmed',
          orderId,
          paymentId,
          reconciliationRequired: false,
        };
      }

      return {
        outcome: evaluateTicketOrderConfirmation({
          orderStatus: fresh?.status ?? order.status,
          holdExpiresAt: fresh?.holdExpiresAt ?? order.holdExpiresAt,
          now,
        }),
        orderId,
        paymentId,
        reconciliationRequired: true,
      };
    });
  }

  async syncPaymentAfterOrderCancelled(orderId: string, tenantId: string, now: Date): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { eventTicketOrderId: orderId },
    });
    if (!payment || payment.tenantId !== tenantId) return;
    if (payment.status === 'paid' || payment.status === 'refunded' || payment.status === 'partially_refunded') {
      return;
    }
    if (payment.status === 'cancelled' || payment.status === 'expired') return;

    try {
      if (payment.status === 'pending' || payment.status === 'processing' || payment.status === 'authorized') {
        await this.paymentCore.transitionStatus(payment.id, tenantId, 'cancelled', null, {
          cancelledAt: now,
        });
      }
    } catch {
      /* conflito de transição — pagamento já terminal */
    }
  }

  async syncPaymentAfterOrderExpired(orderId: string, tenantId: string, now: Date): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { eventTicketOrderId: orderId },
    });
    if (!payment || payment.tenantId !== tenantId) return;
    if (payment.status === 'paid' || payment.status === 'refunded' || payment.status === 'partially_refunded') {
      return;
    }
    if (payment.status === 'expired' || payment.status === 'cancelled') return;

    try {
      if (payment.status === 'pending') {
        await this.paymentCore.transitionStatus(payment.id, tenantId, 'expired', null, {
          expiredAt: now,
        });
      }
    } catch {
      /* ignore */
    }
  }

  async recordManualPaymentForOrder(
    orderId: string,
    tenantId: string,
    input: {
      paymentMethod: PaymentMethod;
      paidAt?: string;
      manualReference?: string;
      manualNotes?: string;
      externalProviderLabel?: string;
      updatedByUserId?: string | null;
    },
  ): Promise<{ payment: EventTicketOrderPaymentDto; confirmation: ConfirmTicketOrderFromPaymentResult }> {
    const paymentDto = await this.ensurePaymentForOrder(orderId, tenantId);
    await this.paymentCore.recordManualPayment(paymentDto.id, tenantId, input);
    const confirmation = await this.confirmOrderFromPaidPayment(paymentDto.id, tenantId);
    await this.ticketFinanceProjection.afterOrderConfirmation(confirmation, tenantId);
    await this.ticketIssuance.afterOrderConfirmation(confirmation, tenantId);
    if (confirmation.outcome === 'confirmed') {
      await this.publicNotifications.sendOrderConfirmedEmailIfNeeded(confirmation.orderId, tenantId);
    }
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentDto.id, tenantId },
    });
    return {
      payment: this.serializePaymentRow(payment)!,
      confirmation,
    };
  }

  async recordManualPaymentForOrderId(
    orderId: string,
    input: {
      paymentMethod: PaymentMethod;
      paidAt?: string;
      manualReference?: string;
      manualNotes?: string;
      externalProviderLabel?: string;
    },
  ) {
    const tenantId = await this.resolveTenantId();
    return this.recordManualPaymentForOrder(orderId, tenantId, input);
  }
}
