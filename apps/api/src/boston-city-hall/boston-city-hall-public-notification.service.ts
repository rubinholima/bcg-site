import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../common/mail.service';
import { resolveBchPublicAppOrigin } from './boston-city-hall-public-access.util';
import { bchPublicOrderPath } from './boston-city-hall-public-events.constants';
import { bchMyTicketsPagePath } from './boston-city-hall-my-tickets.constants';

@Injectable()
export class BostonCityHallPublicNotificationService {
  private readonly logger = new Logger(BostonCityHallPublicNotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  /** Idempotente — não reenvia se confirmationEmailSentAt já estiver definido. */
  async sendOrderConfirmedEmailIfNeeded(orderId: string, tenantId: string): Promise<void> {
    const locked = await this.prisma.eventTicketOrder.updateMany({
      where: {
        id: orderId,
        tenantId,
        status: 'confirmed',
        confirmationEmailSentAt: null,
      },
      data: { confirmationEmailSentAt: new Date() },
    });
    if (locked.count === 0) return;

    const order = await this.prisma.eventTicketOrder.findFirst({
      where: { id: orderId, tenantId },
      include: {
        event: { select: { name: true } },
      },
    });
    if (!order?.publicAccessToken?.trim() || !order.customerEmail?.trim()) {
      return;
    }

    const origin = resolveBchPublicAppOrigin();
    const orderUrl = `${origin}${bchPublicOrderPath(order.publicAccessToken)}`;
    const myTicketsUrl = `${origin}${bchMyTicketsPagePath()}`;

    const text = [
      `Pedido confirmado — ${order.event.name}`,
      '',
      `Número do pedido: ${order.orderNumber}`,
      '',
      `Acesse seu pedido e ingressos: ${orderUrl}`,
      '',
      `Para ver todos os seus ingressos por e-mail: ${myTicketsUrl}`,
    ].join('\n');

    const result = await this.mail.sendMail({
      to: order.customerEmail.trim(),
      subject: `Ingressos confirmados — ${order.event.name}`,
      text,
      html: `<p>Seu pedido <strong>${order.orderNumber}</strong> para <strong>${order.event.name}</strong> foi confirmado.</p><p><a href="${orderUrl}">Abrir pedido e ingressos</a></p><p><a href="${myTicketsUrl}">Meus ingressos (acesso por e-mail)</a></p>`,
    });

    if (!result.sent) {
      this.logger.warn(
        `Confirmação BCH não enviada para pedido ${order.orderNumber}: ${result.error ?? 'SMTP indisponível'}`,
      );
    }
  }
}
