import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BostonCityHallBarService } from './boston-city-hall-bar.service';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type BchBuyerListItem = {
  id: string;
  email: string;
  displayName: string | null;
  phone: string | null;
  customerId: string | null;
  marketingOptIn: boolean;
  orderCount: number;
  ticketCount: number;
  eventCount: number;
  lastPurchaseAt: string | null;
  spendByCurrency: Record<string, string>;
};

@Injectable()
export class BostonCityHallBuyerCrmService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bar: BostonCityHallBarService,
  ) {}

  private async tenantId(): Promise<string> {
    return this.bar.resolveBchTenantId();
  }

  async upsertFromOrder(orderId: string) {
    const tenantId = await this.tenantId();
    const order = await this.prisma.eventTicketOrder.findFirst({
      where: { id: orderId.trim(), tenantId },
      select: {
        customerEmail: true,
        customerName: true,
        customerPhone: true,
        customerId: true,
      },
    });
    if (!order?.customerEmail?.trim()) return null;
    return this.upsertProfile(tenantId, {
      email: order.customerEmail,
      displayName: order.customerName,
      phone: order.customerPhone,
      customerId: order.customerId,
    });
  }

  async upsertProfile(
    tenantId: string,
    input: {
      email: string;
      displayName?: string | null;
      phone?: string | null;
      customerId?: string | null;
    },
  ) {
    const emailNormalized = normalizeEmail(input.email);
    if (!emailNormalized) return null;
    return this.prisma.bchTicketBuyerProfile.upsert({
      where: { tenantId_emailNormalized: { tenantId, emailNormalized } },
      create: {
        tenantId,
        emailNormalized,
        displayName: input.displayName?.trim() || null,
        phone: input.phone?.trim() || null,
        customerId: input.customerId?.trim() || null,
        marketingOptIn: false,
      },
      update: {
        displayName: input.displayName?.trim() || undefined,
        phone: input.phone?.trim() || undefined,
        customerId: input.customerId?.trim() || undefined,
      },
    });
  }

  async listBuyers(filters: { q?: string; marketingOptIn?: boolean; limit?: number }) {
    const tenantId = await this.tenantId();
    const term = filters.q?.trim();
    const where: Prisma.BchTicketBuyerProfileWhereInput = { tenantId };
    if (filters.marketingOptIn === true) where.marketingOptIn = true;
    if (term) {
      where.OR = [
        { emailNormalized: { contains: term, mode: 'insensitive' } },
        { displayName: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
      ];
    }
    const profiles = await this.prisma.bchTicketBuyerProfile.findMany({
      where,
      take: Math.min(filters.limit ?? 100, 200),
      orderBy: { updatedAt: 'desc' },
    });
    const enriched: BchBuyerListItem[] = [];
    for (const p of profiles) {
      enriched.push(await this.enrichProfile(tenantId, p));
    }
    return enriched;
  }

  private async enrichProfile(
    tenantId: string,
    profile: {
      id: string;
      emailNormalized: string;
      displayName: string | null;
      phone: string | null;
      customerId: string | null;
      marketingOptIn: boolean;
    },
  ): Promise<BchBuyerListItem> {
    const orders = await this.prisma.eventTicketOrder.findMany({
      where: {
        tenantId,
        customerEmail: { equals: profile.emailNormalized, mode: 'insensitive' },
      },
      select: {
        id: true,
        eventId: true,
        status: true,
        total: true,
        currency: true,
        confirmedAt: true,
        createdAt: true,
        _count: { select: { tickets: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const spendByCurrency: Record<string, Prisma.Decimal> = {};
    let ticketCount = 0;
    const eventIds = new Set<string>();
    let lastPurchaseAt: Date | null = null;
    for (const o of orders) {
      if (o.status === 'confirmed') {
        const cur = o.currency || 'USD';
        spendByCurrency[cur] = (spendByCurrency[cur] ?? new Prisma.Decimal(0)).add(o.total);
      }
      ticketCount += o._count.tickets;
      eventIds.add(o.eventId);
      const at = o.confirmedAt ?? o.createdAt;
      if (!lastPurchaseAt || at > lastPurchaseAt) lastPurchaseAt = at;
    }
    return {
      id: profile.id,
      email: profile.emailNormalized,
      displayName: profile.displayName,
      phone: profile.phone,
      customerId: profile.customerId,
      marketingOptIn: profile.marketingOptIn,
      orderCount: orders.length,
      ticketCount,
      eventCount: eventIds.size,
      lastPurchaseAt: lastPurchaseAt?.toISOString() ?? null,
      spendByCurrency: Object.fromEntries(
        Object.entries(spendByCurrency).map(([k, v]) => [k, v.toString()]),
      ),
    };
  }

  async getBuyerDetail(profileId: string) {
    const tenantId = await this.tenantId();
    const profile = await this.prisma.bchTicketBuyerProfile.findFirst({
      where: { id: profileId.trim(), tenantId },
    });
    if (!profile) throw new NotFoundException('Comprador não encontrado.');
    const summary = await this.enrichProfile(tenantId, profile);
    const orders = await this.prisma.eventTicketOrder.findMany({
      where: {
        tenantId,
        customerEmail: { equals: profile.emailNormalized, mode: 'insensitive' },
      },
      include: {
        event: { select: { id: true, name: true, startDate: true } },
        payment: { select: { status: true, paidAt: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return {
      profile: {
        ...profile,
        email: profile.emailNormalized,
      },
      summary,
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        eventId: o.eventId,
        eventName: o.event.name,
        eventStart: o.event.startDate?.toISOString() ?? null,
        total: o.total.toString(),
        currency: o.currency,
        createdAt: o.createdAt.toISOString(),
        paymentStatus: o.payment?.status ?? null,
      })),
    };
  }

  async syncFromOrders() {
    const tenantId = await this.tenantId();
    const orders = await this.prisma.eventTicketOrder.findMany({
      where: { tenantId },
      select: {
        customerEmail: true,
        customerName: true,
        customerPhone: true,
        customerId: true,
      },
      distinct: ['customerEmail'],
    });
    let upserted = 0;
    for (const o of orders) {
      if (!o.customerEmail?.trim()) continue;
      await this.upsertProfile(tenantId, {
        email: o.customerEmail,
        displayName: o.customerName,
        phone: o.customerPhone,
        customerId: o.customerId,
      });
      upserted += 1;
    }
    return { upserted };
  }

  async updateMarketingOptIn(
    profileId: string,
    body: { marketingOptIn: boolean; source?: string | null },
  ) {
    const tenantId = await this.tenantId();
    const existing = await this.prisma.bchTicketBuyerProfile.findFirst({
      where: { id: profileId.trim(), tenantId },
    });
    if (!existing) throw new NotFoundException('Comprador não encontrado.');
    return this.prisma.bchTicketBuyerProfile.update({
      where: { id: existing.id },
      data: {
        marketingOptIn: body.marketingOptIn,
        marketingOptInAt: body.marketingOptIn ? new Date() : null,
        marketingOptInSource: body.marketingOptIn ? body.source?.trim() || 'manual_dashboard' : null,
      },
    });
  }

  async exportMarketingOptIn() {
    const tenantId = await this.tenantId();
    const rows = await this.prisma.bchTicketBuyerProfile.findMany({
      where: { tenantId, marketingOptIn: true },
      orderBy: { emailNormalized: 'asc' },
    });
    return rows.map((r) => ({
      email: r.emailNormalized,
      name: r.displayName ?? '',
      phone: r.phone ?? '',
    }));
  }

  async findByEmail(email: string) {
    const tenantId = await this.tenantId();
    const emailNormalized = normalizeEmail(email);
    if (!emailNormalized) return null;
    const profile = await this.prisma.bchTicketBuyerProfile.findUnique({
      where: { tenantId_emailNormalized: { tenantId, emailNormalized } },
    });
    if (!profile) {
      const order = await this.prisma.eventTicketOrder.findFirst({
        where: { tenantId, customerEmail: { equals: emailNormalized, mode: 'insensitive' } },
        orderBy: { createdAt: 'desc' },
      });
      if (!order) return null;
      const created = await this.upsertProfile(tenantId, {
        email: order.customerEmail,
        displayName: order.customerName,
        phone: order.customerPhone,
        customerId: order.customerId,
      });
      if (!created) return null;
      return this.enrichProfile(tenantId, created);
    }
    return this.enrichProfile(tenantId, profile);
  }
}
