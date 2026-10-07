import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../common/mail.service';
import { BCH_VENUE_SLUG } from './boston-city-hall.constants';
import {
  BCH_MAGIC_LINK_TTL_MS,
  BCH_MY_TICKETS_SESSION_TTL_MS,
  BCH_PASSWORDLESS_NEUTRAL_MESSAGE,
  type BchMyTicketsListDto,
  type BchMyTicketsOrderSummaryDto,
  bchMyTicketsAccessPath,
  bchMyTicketsPagePath,
  buildMyTicketsOrderPath,
} from './boston-city-hall-my-tickets.constants';
import {
  generateOpaqueAccessToken,
  hashOpaqueToken,
  normalizeBchCustomerEmail,
  resolveBchPublicAppOrigin,
} from './boston-city-hall-public-access.util';
import { assertMyTicketsPasswordlessRateLimit } from './boston-city-hall-my-tickets.rate-limit';
import { BostonCityHallPublicTicketService } from './boston-city-hall-public-ticket.service';
import { bchPublicDetailPath } from './boston-city-hall-public-events.constants';

@Injectable()
export class BostonCityHallMyTicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly publicTickets: BostonCityHallPublicTicketService,
  ) {}

  private async resolveTenantId(): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: BCH_VENUE_SLUG },
      select: { id: true },
    });
    if (!tenant) throw new BadRequestException('Venue indisponível.');
    return tenant.id;
  }

  private neutralResponse(): { message: string } {
    return { message: BCH_PASSWORDLESS_NEUTRAL_MESSAGE };
  }

  async requestPasswordlessAccess(emailRaw: string, clientIp: string): Promise<{ message: string }> {
    const email = normalizeBchCustomerEmail(emailRaw);
    if (!email || !email.includes('@')) {
      throw new BadRequestException('Informe um e-mail válido.');
    }

    try {
      assertMyTicketsPasswordlessRateLimit(clientIp, email);
    } catch {
      throw new HttpException(
        'Muitas tentativas. Aguarde um momento e tente novamente.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const tenantId = await this.resolveTenantId();
    const hasEligible = await this.prisma.eventTicketOrder.findFirst({
      where: {
        tenantId,
        status: 'confirmed',
        customerEmail: { equals: email, mode: 'insensitive' },
        tickets: { some: { admissionSource: 'paid_order' } },
      },
      select: { id: true },
    });

    if (!hasEligible) {
      return this.neutralResponse();
    }

    const rawToken = generateOpaqueAccessToken();
    const tokenHash = hashOpaqueToken(rawToken);
    const expiresAt = new Date(Date.now() + BCH_MAGIC_LINK_TTL_MS);

    await this.prisma.bchMyTicketsMagicLink.create({
      data: {
        tenantId,
        emailNormalized: email,
        tokenHash,
        expiresAt,
      },
    });

    const origin = resolveBchPublicAppOrigin();
    const link = `${origin}${bchMyTicketsAccessPath(rawToken)}`;
    const text = [
      'Boston City Hall — acesso aos seus ingressos',
      '',
      'Use o link abaixo para ver seus ingressos confirmados. O link expira em 15 minutos e só pode ser usado uma vez.',
      '',
      link,
      '',
      'Se você não solicitou este acesso, ignore este e-mail.',
    ].join('\n');

    const result = await this.mail.sendMail({
      to: email,
      subject: 'Seus ingressos — Boston City Hall',
      text,
      html: `<p>Use o link abaixo para acessar seus ingressos (válido por 15 minutos, uso único):</p><p><a href="${link}">${link}</a></p>`,
    });
    if (!result.sent) {
      // Resposta neutra — não revelar falha de entrega vs inexistência
    }

    return this.neutralResponse();
  }

  async exchangeMagicLink(rawToken: string): Promise<{ sessionToken: string; expiresAt: string }> {
    const trimmed = rawToken?.trim();
    if (!trimmed) throw new BadRequestException('Token inválido.');

    const tenantId = await this.resolveTenantId();
    const tokenHash = hashOpaqueToken(trimmed);
    const now = new Date();

    const link = await this.prisma.bchMyTicketsMagicLink.findFirst({
      where: { tenantId, tokenHash },
    });
    if (!link) throw new ForbiddenException('Link inválido ou expirado.');
    if (link.usedAt) throw new ForbiddenException('Este link já foi utilizado.');
    if (link.expiresAt.getTime() <= now.getTime()) {
      throw new ForbiddenException('Link expirado.');
    }

    const sessionRaw = generateOpaqueAccessToken();
    const sessionHash = hashOpaqueToken(sessionRaw);
    const sessionExpires = new Date(now.getTime() + BCH_MY_TICKETS_SESSION_TTL_MS);

    await this.prisma.$transaction([
      this.prisma.bchMyTicketsMagicLink.update({
        where: { id: link.id },
        data: { usedAt: now },
      }),
      this.prisma.bchMyTicketsSession.create({
        data: {
          tenantId,
          emailNormalized: link.emailNormalized,
          sessionTokenHash: sessionHash,
          expiresAt: sessionExpires,
        },
      }),
    ]);

    return { sessionToken: sessionRaw, expiresAt: sessionExpires.toISOString() };
  }

  async resolveSessionEmail(sessionTokenRaw: string | undefined | null): Promise<string> {
    const trimmed = sessionTokenRaw?.trim();
    if (!trimmed) throw new UnauthorizedException('Sessão não encontrada.');

    const tenantId = await this.resolveTenantId();
    const hash = hashOpaqueToken(trimmed);
    const now = new Date();
    const row = await this.prisma.bchMyTicketsSession.findFirst({
      where: { tenantId, sessionTokenHash: hash },
    });
    if (!row || row.expiresAt.getTime() <= now.getTime()) {
      throw new UnauthorizedException('Sessão expirada. Solicite um novo link por e-mail.');
    }
    return row.emailNormalized;
  }

  async listTicketsForSession(sessionTokenRaw: string | undefined | null): Promise<BchMyTicketsListDto> {
    const email = await this.resolveSessionEmail(sessionTokenRaw);
    const tenantId = await this.resolveTenantId();

    const orders = await this.prisma.eventTicketOrder.findMany({
      where: {
        tenantId,
        status: 'confirmed',
        customerEmail: { equals: email, mode: 'insensitive' },
        tickets: { some: { admissionSource: 'paid_order' } },
      },
      include: {
        event: { select: { id: true, slug: true, name: true, startDate: true, endDate: true } },
        items: true,
      },
      orderBy: [{ confirmedAt: 'desc' }, { createdAt: 'desc' }],
    });

    const summaries: BchMyTicketsOrderSummaryDto[] = [];
    for (const order of orders) {
      const token = order.publicAccessToken?.trim();
      if (!token) continue;

      const { tickets, ticketCount } = await this.publicTickets.listPublicTicketsForConfirmedOrder(token);
      summaries.push({
        orderNumber: order.orderNumber,
        publicAccessToken: token,
        confirmedAt: order.confirmedAt?.toISOString() ?? null,
        total: order.total.toFixed(2),
        currency: order.currency,
        event: {
          slug: order.event.slug,
          name: order.event.name,
          startDate: order.event.startDate?.toISOString() ?? null,
          endDate: order.event.endDate?.toISOString() ?? null,
          detailPath: bchPublicDetailPath(order.event.slug),
        },
        items: order.items.map((it) => ({
          ticketTypeName: it.ticketTypeName,
          lotName: it.lotName,
          quantity: it.quantity,
          unitPrice: it.unitPrice.toFixed(2),
          totalPrice: it.totalPrice.toFixed(2),
        })),
        ticketCount,
        tickets,
        orderPath: buildMyTicketsOrderPath(token),
      });
    }

    return { email, orders: summaries };
  }

  myTicketsPagePath(): string {
    return bchMyTicketsPagePath();
  }
}
