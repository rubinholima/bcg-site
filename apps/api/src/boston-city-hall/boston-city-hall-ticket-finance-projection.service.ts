import { Injectable, Logger } from '@nestjs/common';
import { FinanceiroLancamentosService } from '../financeiro/financeiro-lancamentos.service';
import { PrismaService } from '../prisma/prisma.service';
import type { ConfirmTicketOrderFromPaymentResult } from './boston-city-hall-ticket-payment.service';
import {
  BCH_TICKETING_FINANCE_CATEGORY,
  BCH_TICKETING_FINANCE_SOURCE_MODULE,
  BCH_TICKETING_FINANCE_SOURCE_TYPE,
  buildTicketOrderFinanceDescription,
  shouldProjectTicketOrderToFinanceiro,
} from './boston-city-hall-ticket-finance-projection';

export type TicketOrderFinanceProjectionDto = {
  id: string;
  status: string;
  created: boolean;
} | null;

@Injectable()
export class BostonCityHallTicketFinanceProjectionService {
  private readonly logger = new Logger(BostonCityHallTicketFinanceProjectionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly financeiro: FinanceiroLancamentosService,
  ) {}

  async findProjectionForOrder(tenantId: string, orderId: string) {
    return this.financeiro.findProjectionBySource(
      tenantId,
      BCH_TICKETING_FINANCE_SOURCE_MODULE,
      BCH_TICKETING_FINANCE_SOURCE_TYPE,
      orderId,
    );
  }

  /**
   * Cria ou reutiliza projeção Financeiro para pedido confirmado + pagamento pago.
   * Falhas não revertem confirmação/pagamento — retry seguro.
   */
  async ensureProjectionForOrder(
    orderId: string,
    tenantId: string,
  ): Promise<{ projection: TicketOrderFinanceProjectionDto; error?: string }> {
    const order = await this.prisma.eventTicketOrder.findFirst({
      where: { id: orderId, tenantId },
    });
    if (!order) {
      return { projection: null, error: 'Pedido não encontrado.' };
    }

    const payment = await this.prisma.payment.findUnique({
      where: { eventTicketOrderId: orderId },
    });

    if (
      !shouldProjectTicketOrderToFinanceiro({
        orderStatus: order.status,
        paymentStatus: payment?.status,
        reconciliationRequired: false,
      })
    ) {
      return { projection: null };
    }

    const total =
      typeof order.total === 'number' ? order.total : order.total.toNumber();
    const settledAt = payment?.paidAt ?? order.confirmedAt ?? new Date();
    const dueDate = order.confirmedAt ?? settledAt;

    try {
      const { lancamento, created } = await this.financeiro.createOrGetProjection({
        tenantId,
        tipo: 'receber',
        status: 'pago',
        ownershipKind: 'projection',
        sourceModule: BCH_TICKETING_FINANCE_SOURCE_MODULE,
        sourceType: BCH_TICKETING_FINANCE_SOURCE_TYPE,
        sourceId: orderId,
        valor: total,
        currency: order.currency,
        descricao: buildTicketOrderFinanceDescription(order.orderNumber),
        categoria: BCH_TICKETING_FINANCE_CATEGORY,
        dueDate: dueDate.toISOString(),
        settledAt: settledAt.toISOString(),
        customerId: order.customerId ?? undefined,
        contraparte: order.customerName,
      });
      return {
        projection: {
          id: lancamento.id,
          status: lancamento.status,
          created,
        },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Falha ao projetar pedido ${order.orderNumber} (${orderId}) no Financeiro: ${msg}`,
      );
      return { projection: null, error: msg };
    }
  }

  async afterOrderConfirmation(
    confirmation: ConfirmTicketOrderFromPaymentResult,
    tenantId: string,
  ): Promise<{ projection: TicketOrderFinanceProjectionDto; error?: string }> {
    if (confirmation.reconciliationRequired) {
      return { projection: null };
    }
    if (
      confirmation.outcome !== 'confirmed' &&
      confirmation.outcome !== 'already_confirmed'
    ) {
      return { projection: null };
    }
    return this.ensureProjectionForOrder(confirmation.orderId, tenantId);
  }
}
