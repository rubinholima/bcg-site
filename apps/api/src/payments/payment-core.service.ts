import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PAYMENT_METHODS, type PaymentMethod, type PaymentStatus } from './payment-core.constants';
import { assertPaymentStatusTransition, isPaymentStatus } from './payment-status.transition';
import {
  serializePayment,
  serializePaymentAttempt,
  serializePaymentRefund,
} from './payment-serialize.util';

export type CreatePaymentInput = {
  tenantId: string;
  idempotencyKey: string;
  amount: number;
  currency: string;
  eventTicketOrderId?: string;
  venueReceivableInstallmentId?: string;
  paymentMethod?: PaymentMethod;
  expiresAt?: string | null;
  paymentProviderAccountId?: string | null;
  createdByUserId?: string | null;
};

export type RecordManualPaymentInput = {
  paymentMethod: PaymentMethod;
  paidAt?: string;
  manualReference?: string;
  manualNotes?: string;
  externalProviderLabel?: string;
  updatedByUserId?: string | null;
};

export type CreatePaymentAttemptInput = {
  tenantId: string;
  paymentId: string;
  idempotencyKey: string;
  requestedMethod: PaymentMethod;
  amount: number;
  currency: string;
  paymentProviderAccountId?: string | null;
  expiresAt?: string | null;
};

export type CreatePaymentRefundInput = {
  tenantId: string;
  paymentId: string;
  idempotencyKey: string;
  amount: number;
  currency: string;
  reason?: string;
  createdByUserId?: string | null;
};

function normalizeCurrency(raw: string): string {
  const c = raw.trim().toUpperCase();
  if (c.length !== 3) throw new BadRequestException('currency deve ser ISO 4217 (3 letras).');
  return c;
}

function assertMethod(raw: string): PaymentMethod {
  if (!PAYMENT_METHODS.includes(raw as PaymentMethod)) {
    throw new BadRequestException('Método de pagamento inválido.');
  }
  return raw as PaymentMethod;
}

@Injectable()
export class PaymentCoreService {
  constructor(private readonly prisma: PrismaService) {}

  private async validateCommercialOrigin(
    tenantId: string,
    eventTicketOrderId?: string,
    venueReceivableInstallmentId?: string,
  ): Promise<{ eventTicketOrderId: string | null; venueReceivableInstallmentId: string | null }> {
    const hasOrder = !!eventTicketOrderId?.trim();
    const hasInstallment = !!venueReceivableInstallmentId?.trim();
    if (hasOrder === hasInstallment) {
      throw new BadRequestException(
        'Informe exatamente uma origem comercial: eventTicketOrderId ou venueReceivableInstallmentId.',
      );
    }
    if (hasOrder) {
      const orderId = eventTicketOrderId!.trim();
      const order = await this.prisma.eventTicketOrder.findFirst({
        where: { id: orderId, tenantId },
      });
      if (!order) throw new NotFoundException('Pedido de ingresso não encontrado para este tenant.');
      const existing = await this.prisma.payment.findUnique({ where: { eventTicketOrderId: orderId } });
      if (existing) {
        throw new BadRequestException('Já existe pagamento vinculado a este pedido de ingresso.');
      }
      return { eventTicketOrderId: orderId, venueReceivableInstallmentId: null };
    }
    const installmentId = venueReceivableInstallmentId!.trim();
    const inst = await this.prisma.venueReceivableInstallment.findUnique({
      where: { id: installmentId },
      include: { receivable: { select: { tenantId: true } } },
    });
    if (!inst || inst.receivable.tenantId !== tenantId) {
      throw new NotFoundException('Parcela a receber não encontrada para este tenant.');
    }
    const existing = await this.prisma.payment.findUnique({
      where: { venueReceivableInstallmentId: installmentId },
    });
    if (existing) {
      throw new BadRequestException('Já existe pagamento vinculado a esta parcela.');
    }
    return { eventTicketOrderId: null, venueReceivableInstallmentId: installmentId };
  }

  async createPayment(input: CreatePaymentInput) {
    const idempotencyKey = input.idempotencyKey.trim();
    if (!idempotencyKey) throw new BadRequestException('idempotencyKey é obrigatório.');

    const existing = await this.prisma.payment.findUnique({
      where: {
        tenantId_idempotencyKey: { tenantId: input.tenantId, idempotencyKey },
      },
    });
    if (existing) return serializePayment(existing);

    const origin = await this.validateCommercialOrigin(
      input.tenantId,
      input.eventTicketOrderId,
      input.venueReceivableInstallmentId,
    );

    const currency = normalizeCurrency(input.currency);
    if (input.amount < 0) throw new BadRequestException('amount inválido.');

    if (input.paymentProviderAccountId) {
      const acc = await this.prisma.paymentProviderAccount.findFirst({
        where: { id: input.paymentProviderAccountId, tenantId: input.tenantId, active: true },
      });
      if (!acc) throw new BadRequestException('Conta de provedor inválida ou inativa.');
    }

    const row = await this.prisma.payment.create({
      data: {
        tenantId: input.tenantId,
        idempotencyKey,
        amount: input.amount,
        currency,
        status: 'pending',
        paymentMethod: input.paymentMethod ? assertMethod(input.paymentMethod) : null,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        paymentProviderAccountId: input.paymentProviderAccountId ?? null,
        createdByUserId: input.createdByUserId ?? null,
        updatedByUserId: input.createdByUserId ?? null,
        ...origin,
      },
    });
    return serializePayment(row);
  }

  async getPayment(id: string, tenantId: string) {
    const row = await this.prisma.payment.findFirst({
      where: { id, tenantId },
      include: {
        attempts: { orderBy: { attemptSequence: 'asc' } },
        refunds: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!row) throw new NotFoundException('Pagamento não encontrado.');
    return {
      ...serializePayment(row),
      attempts: row.attempts.map(serializePaymentAttempt),
      refunds: row.refunds.map(serializePaymentRefund),
    };
  }

  async transitionStatus(
    paymentId: string,
    tenantId: string,
    nextStatus: PaymentStatus,
    actorUserId?: string | null,
    timestamps?: Partial<{
      paidAt: Date;
      cancelledAt: Date;
      failedAt: Date;
      expiredAt: Date;
    }>,
  ) {
    const row = await this.prisma.payment.findFirst({ where: { id: paymentId, tenantId } });
    if (!row) throw new NotFoundException('Pagamento não encontrado.');
    if (!isPaymentStatus(row.status)) {
      throw new BadRequestException('Status atual do pagamento é inválido no banco.');
    }
    assertPaymentStatusTransition(row.status, nextStatus);

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: nextStatus,
        updatedByUserId: actorUserId ?? undefined,
        ...(timestamps?.paidAt !== undefined ? { paidAt: timestamps.paidAt } : {}),
        ...(timestamps?.cancelledAt !== undefined ? { cancelledAt: timestamps.cancelledAt } : {}),
        ...(timestamps?.failedAt !== undefined ? { failedAt: timestamps.failedAt } : {}),
        ...(timestamps?.expiredAt !== undefined ? { expiredAt: timestamps.expiredAt } : {}),
      },
    });
    return serializePayment(updated);
  }

  /** Pagamento confirmado fora de gateway (cash, wire, Zelle, etc.). */
  async recordManualPayment(paymentId: string, tenantId: string, input: RecordManualPaymentInput) {
    const row = await this.prisma.payment.findFirst({ where: { id: paymentId, tenantId } });
    if (!row) throw new NotFoundException('Pagamento não encontrado.');
    const method = assertMethod(input.paymentMethod);
    const paidAt = input.paidAt ? new Date(input.paidAt) : new Date();
    const amount = typeof row.amount === 'number' ? row.amount : row.amount.toNumber();

    if (!isPaymentStatus(row.status)) {
      throw new BadRequestException('Status atual do pagamento é inválido no banco.');
    }
    assertPaymentStatusTransition(row.status, 'paid');

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'paid',
        paymentMethod: method,
        paidAmount: amount,
        paidAt,
        manualReference: input.manualReference?.trim() || null,
        manualNotes: input.manualNotes?.trim() || null,
        externalProviderLabel: input.externalProviderLabel?.trim() || null,
        updatedByUserId: input.updatedByUserId ?? null,
      },
    });
    return serializePayment(updated);
  }

  async createAttempt(input: CreatePaymentAttemptInput) {
    const idempotencyKey = input.idempotencyKey.trim();
    if (!idempotencyKey) throw new BadRequestException('idempotencyKey é obrigatório.');

    const existing = await this.prisma.paymentAttempt.findUnique({
      where: { tenantId_idempotencyKey: { tenantId: input.tenantId, idempotencyKey } },
    });
    if (existing) return serializePaymentAttempt(existing);

    const payment = await this.prisma.payment.findFirst({
      where: { id: input.paymentId, tenantId: input.tenantId },
    });
    if (!payment) throw new NotFoundException('Pagamento não encontrado.');

    const last = await this.prisma.paymentAttempt.findFirst({
      where: { paymentId: payment.id },
      orderBy: { attemptSequence: 'desc' },
    });
    const attemptSequence = (last?.attemptSequence ?? 0) + 1;

    if (input.paymentProviderAccountId) {
      const acc = await this.prisma.paymentProviderAccount.findFirst({
        where: { id: input.paymentProviderAccountId, tenantId: input.tenantId, active: true },
      });
      if (!acc) throw new BadRequestException('Conta de provedor inválida.');
    }

    const row = await this.prisma.paymentAttempt.create({
      data: {
        tenantId: input.tenantId,
        paymentId: payment.id,
        attemptSequence,
        idempotencyKey,
        requestedMethod: assertMethod(input.requestedMethod),
        amount: input.amount,
        currency: normalizeCurrency(input.currency),
        status: 'pending',
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        paymentProviderAccountId: input.paymentProviderAccountId ?? null,
      },
    });
    return serializePaymentAttempt(row);
  }

  async createRefund(input: CreatePaymentRefundInput) {
    const idempotencyKey = input.idempotencyKey.trim();
    if (!idempotencyKey) throw new BadRequestException('idempotencyKey é obrigatório.');

    const existing = await this.prisma.paymentRefund.findUnique({
      where: { tenantId_idempotencyKey: { tenantId: input.tenantId, idempotencyKey } },
    });
    if (existing) return serializePaymentRefund(existing);

    const payment = await this.prisma.payment.findFirst({
      where: { id: input.paymentId, tenantId: input.tenantId },
    });
    if (!payment) throw new NotFoundException('Pagamento não encontrado.');
    if (payment.status !== 'paid' && payment.status !== 'partially_refunded') {
      throw new BadRequestException('Só é possível reembolsar pagamento quitado ou parcialmente reembolsado.');
    }

    const paidAmount =
      typeof payment.paidAmount === 'number' ? payment.paidAmount : payment.paidAmount.toNumber();
    const refundedAmount =
      typeof payment.refundedAmount === 'number'
        ? payment.refundedAmount
        : payment.refundedAmount.toNumber();
    if (input.amount <= 0 || input.amount > paidAmount - refundedAmount) {
      throw new BadRequestException('Valor de reembolso inválido.');
    }

    const currency = normalizeCurrency(input.currency);
    if (currency !== payment.currency) {
      throw new BadRequestException('Moeda do reembolso deve coincidir com a do pagamento.');
    }

    const refund = await this.prisma.$transaction(async (tx) => {
      const created = await tx.paymentRefund.create({
        data: {
          tenantId: input.tenantId,
          paymentId: payment.id,
          amount: input.amount,
          currency,
          status: 'pending',
          reason: input.reason?.trim() || null,
          idempotencyKey,
          createdByUserId: input.createdByUserId ?? null,
        },
      });

      const newRefunded = refundedAmount + input.amount;
      const nextStatus: PaymentStatus =
        newRefunded >= paidAmount ? 'refunded' : 'partially_refunded';
      assertPaymentStatusTransition(payment.status as PaymentStatus, nextStatus);

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          refundedAmount: newRefunded,
          status: nextStatus,
          updatedByUserId: input.createdByUserId ?? undefined,
        },
      });
      return created;
    });

    return serializePaymentRefund(refund);
  }

  async listPayments(tenantId: string, limit = 50) {
    const rows = await this.prisma.payment.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 200),
    });
    return rows.map(serializePayment);
  }
}
