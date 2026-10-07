import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HomeContentService } from '../home-content/home-content.service';
import { BCH_VENUE_SLUG } from './boston-city-hall.constants';
import {
  type BchPublicEventDetailDto,
  type BchPublicEventListItemDto,
} from './boston-city-hall-public-events.constants';
import {
  listItemFromEventRow,
  pastPublishedWhere,
  toPublicTicketType,
  upcomingPublishedWhere,
} from './boston-city-hall-public-events.util';
import { BostonCityHallTicketingService } from './boston-city-hall-ticketing.service';
import { buildDefaultEventPageContent } from '../events/events.service';

const eventInclude = {
  venueBooking: {
    select: { space: { select: { name: true } } },
  },
  ticketing: { select: { enabled: true, currency: true } },
} as const;

@Injectable()
export class BostonCityHallPublicEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ticketing: BostonCityHallTicketingService,
    private readonly homeContent: HomeContentService,
  ) {}

  private async resolveBchTenantId(): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: BCH_VENUE_SLUG },
      select: { id: true },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant do venue "${BCH_VENUE_SLUG}" não encontrado.`);
    }
    return tenant.id;
  }

  async list(options?: { past?: boolean }): Promise<BchPublicEventListItemDto[]> {
    const tenantId = await this.resolveBchTenantId();
    const where = options?.past ? pastPublishedWhere(tenantId) : upcomingPublishedWhere(tenantId);
    const orderBy = options?.past
      ? ([{ startDate: 'desc' }, { name: 'asc' }] as const)
      : ([{ startDate: 'asc' }, { name: 'asc' }] as const);

    const rows = await this.prisma.event.findMany({
      where,
      orderBy: [...orderBy],
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        logoUrl: true,
        startDate: true,
        endDate: true,
        ...eventInclude,
      },
    });

    const items: BchPublicEventListItemDto[] = [];
    for (const row of rows) {
      const ticketingEnabled = row.ticketing?.enabled ?? false;
      let ticketTypes: Awaited<ReturnType<BostonCityHallTicketingService['getEventTicketing']>>['types'] =
        [];
      let currency = row.ticketing?.currency ?? 'USD';
      if (ticketingEnabled) {
        try {
          const detail = await this.ticketing.getEventTicketing(row.id);
          ticketTypes = detail.types;
          currency = detail.currency;
        } catch {
          ticketTypes = [];
        }
      }
      items.push(
        listItemFromEventRow({
          slug: row.slug,
          name: row.name,
          description: row.description,
          logoUrl: row.logoUrl,
          startDate: row.startDate,
          endDate: row.endDate,
          spaceName: row.venueBooking?.space?.name,
          ticketingEnabled,
          ticketTypes,
          currency,
        }),
      );
    }
    return items;
  }

  async getBySlug(slug: string): Promise<BchPublicEventDetailDto | null> {
    const tenantId = await this.resolveBchTenantId();
    const normalized = slug.trim();
    if (!normalized) return null;

    const row = await this.prisma.event.findFirst({
      where: {
        slug: normalized,
        tenantId,
        organizer: 'tenant',
        status: 'published',
      },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        logoUrl: true,
        startDate: true,
        endDate: true,
        content: true,
        ...eventInclude,
      },
    });
    if (!row) return null;

    const ticketingEnabled = row.ticketing?.enabled ?? false;
    let currency = row.ticketing?.currency ?? 'USD';
    let publicTypes: NonNullable<ReturnType<typeof toPublicTicketType>>[] = [];
    let ticketTypesForSummary: Awaited<
      ReturnType<BostonCityHallTicketingService['getEventTicketing']>
    >['types'] = [];

    if (ticketingEnabled) {
      const detail = await this.ticketing.getEventTicketing(row.id);
      currency = detail.currency;
      ticketTypesForSummary = detail.types;
      publicTypes = detail.types
        .map((t) => toPublicTicketType(t, currency))
        .filter((t): t is NonNullable<typeof t> => t !== null);
    }

    const listBase = listItemFromEventRow({
      slug: row.slug,
      name: row.name,
      description: row.description,
      logoUrl: row.logoUrl,
      startDate: row.startDate,
      endDate: row.endDate,
      spaceName: row.venueBooking?.space?.name,
      ticketingEnabled,
      ticketTypes: ticketTypesForSummary,
      currency,
    });

    const rawContent = row.content as {
      theme?: Record<string, unknown>;
      blocks?: Array<{ id: string; type: string; sortOrder: number; config?: Record<string, unknown> }>;
    };
    const def = buildDefaultEventPageContent(row.name);
    const baseContent =
      Array.isArray(rawContent?.blocks) && rawContent.blocks.length > 0
        ? rawContent
        : { ...def, theme: { ...def.theme, ...(rawContent?.theme ?? {}) } };
    const blocks = await this.homeContent.enrichBlocksWithGlobalPresence(baseContent.blocks ?? []);

    return {
      ...listBase,
      content: { theme: baseContent.theme, blocks },
      ticketing: ticketingEnabled
        ? { enabled: true, currency, types: publicTypes }
        : null,
    };
  }
}
