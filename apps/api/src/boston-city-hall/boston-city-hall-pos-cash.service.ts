import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BostonCityHallBarService } from './boston-city-hall-bar.service';

@Injectable()
export class BostonCityHallPosCashService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bar: BostonCityHallBarService,
  ) {}

  private async tenantId() {
    return this.bar.resolveBchTenantId();
  }

  private async assertEvent(tenantId: string, eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId.trim(), tenantId },
      select: { id: true },
    });
    if (!event) throw new NotFoundException('Evento não encontrado.');
    return event;
  }

  async getActiveSession(eventId: string, locationId: string, operatorUserId: string | null) {
    const tenantId = await this.tenantId();
    await this.assertEvent(tenantId, eventId);
    return this.prisma.bchPosCashSession.findFirst({
      where: {
        tenantId,
        eventId: eventId.trim(),
        locationId: locationId.trim(),
        status: 'open',
        ...(operatorUserId ? { operatorUserId } : {}),
      },
      include: { location: { select: { id: true, name: true } } },
      orderBy: { openedAt: 'desc' },
    });
  }

  async openSession(
    eventId: string,
    body: {
      locationId: string;
      openingFloat?: number | string;
      terminalLabel?: string | null;
      currency?: string;
    },
    operatorUserId: string | null,
  ) {
    const tenantId = await this.tenantId();
    await this.assertEvent(tenantId, eventId);
    const locationId = body.locationId.trim();
    const location = await this.prisma.bchBarInventoryLocation.findFirst({
      where: { id: locationId, tenantId },
    });
    if (!location) throw new BadRequestException('Local inválido.');
    const open = await this.prisma.bchPosCashSession.findFirst({
      where: { tenantId, locationId, status: 'open' },
    });
    if (open) throw new BadRequestException('Já existe caixa aberto neste local.');
    const openingFloat =
      body.openingFloat == null || body.openingFloat === ''
        ? new Prisma.Decimal(0)
        : new Prisma.Decimal(String(body.openingFloat));
    return this.prisma.bchPosCashSession.create({
      data: {
        tenantId,
        eventId: eventId.trim(),
        locationId,
        operatorUserId,
        terminalLabel: body.terminalLabel?.trim() || null,
        openingFloat,
        currency: body.currency?.trim() || 'BRL',
        status: 'open',
      },
      include: { location: { select: { id: true, name: true } } },
    });
  }

  private async salesTotalsForSession(sessionId: string) {
    const sales = await this.prisma.bchBarSale.findMany({
      where: { cashSessionId: sessionId, status: 'completed' },
      include: { payments: true },
    });
    let cash = new Prisma.Decimal(0);
    let card = new Prisma.Decimal(0);
    let pix = new Prisma.Decimal(0);
    let other = new Prisma.Decimal(0);
    let total = new Prisma.Decimal(0);
    for (const sale of sales) {
      total = total.plus(sale.total);
      for (const p of sale.payments) {
        const amt = p.amount;
        if (p.method === 'cash') cash = cash.plus(amt);
        else if (p.method === 'card') card = card.plus(amt);
        else if (p.method === 'pix') pix = pix.plus(amt);
        else other = other.plus(amt);
      }
    }
    return { cash, card, pix, other, total, saleCount: sales.length };
  }

  async closeSession(
    eventId: string,
    sessionId: string,
    body: {
      declaredCash?: number | string | null;
      declaredCard?: number | string | null;
      declaredPix?: number | string | null;
      declaredOther?: number | string | null;
      closeNotes?: string | null;
    },
  ) {
    const tenantId = await this.tenantId();
    await this.assertEvent(tenantId, eventId);
    const session = await this.prisma.bchPosCashSession.findFirst({
      where: { id: sessionId, tenantId, eventId: eventId.trim(), status: 'open' },
    });
    if (!session) throw new NotFoundException('Sessão de caixa não encontrada ou já fechada.');
    const expected = await this.salesTotalsForSession(sessionId);
    const dec = (v: number | string | null | undefined) =>
      v == null || v === '' ? null : new Prisma.Decimal(String(v));
    const declaredCash = dec(body.declaredCash);
    const declaredCard = dec(body.declaredCard);
    const declaredPix = dec(body.declaredPix);
    const declaredOther = dec(body.declaredOther);
    const declaredTotal = [declaredCash, declaredCard, declaredPix, declaredOther]
      .filter((d): d is Prisma.Decimal => d != null)
      .reduce((a, b) => a.plus(b), new Prisma.Decimal(0));
    const variance = declaredTotal.minus(expected.total);
    return this.prisma.bchPosCashSession.update({
      where: { id: sessionId },
      data: {
        status: 'closed',
        closedAt: new Date(),
        declaredCash,
        declaredCard,
        declaredPix,
        declaredOther,
        expectedTotal: expected.total,
        varianceAmount: variance,
        closeNotes: body.closeNotes?.trim() || null,
      },
      include: { location: { select: { id: true, name: true } } },
    });
  }

  async listSessions(eventId: string, limit = 20) {
    const tenantId = await this.tenantId();
    await this.assertEvent(tenantId, eventId);
    return this.prisma.bchPosCashSession.findMany({
      where: { tenantId, eventId: eventId.trim() },
      orderBy: { openedAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
      include: { location: { select: { id: true, name: true } } },
    });
  }
}
