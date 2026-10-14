import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  BCH_VENUE_SLUG,
  type VenueOperationAlert,
  type VenueOperationContractRef,
  type VenueOperationDetailDto,
  type VenueOperationListItemDto,
  type VenueOperationProposalRef,
  type VenueOperationUpcomingItemDto,
  type VenueReceivableSummaryDto,
} from './boston-city-hall.constants';
import { BostonCityHallFinanceService } from './boston-city-hall-finance.service';

function moneyToString(value: Prisma.Decimal | number | string): string {
  if (value instanceof Prisma.Decimal) return value.toFixed(2);
  return new Prisma.Decimal(value).toFixed(2);
}

function startOfTodayLocal(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function endOfTodayLocal(): Date {
  const s = startOfTodayLocal();
  return new Date(s.getFullYear(), s.getMonth(), s.getDate(), 23, 59, 59, 999);
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

const operationBookingInclude = {
  space: { select: { id: true, name: true } },
  pipelineLead: {
    select: {
      id: true,
      contactName: true,
      contactEmail: true,
      contactPhone: true,
      companyName: true,
      stage: true,
    },
  },
  venueProposals: {
    select: {
      id: true,
      proposalNumber: true,
      status: true,
      total: true,
      updatedAt: true,
    },
    orderBy: [{ updatedAt: 'desc' as const }],
  },
  event: { select: { id: true, name: true, slug: true, status: true } },
  venueContracts: {
    select: {
      id: true,
      contractNumber: true,
      status: true,
      total: true,
      signedAt: true,
      updatedAt: true,
      venueReceivable: {
        include: {
          installments: {
            orderBy: [{ sequence: 'asc' as const }],
            include: {
              payments: { where: { voidedAt: null } },
            },
          },
        },
      },
    },
    orderBy: [{ updatedAt: 'desc' as const }],
  },
} satisfies Prisma.VenueBookingInclude;

type BookingRow = Prisma.VenueBookingGetPayload<{ include: typeof operationBookingInclude }>;

function pickProposal(proposals: BookingRow['venueProposals']): VenueOperationProposalRef | null {
  if (!proposals.length) return null;
  const preferred = proposals.find((p) => p.status === 'accepted' || p.status === 'sent') ?? proposals[0];
  return {
    id: preferred.id,
    proposalNumber: preferred.proposalNumber,
    status: preferred.status,
    total: moneyToString(preferred.total),
  };
}

function pickContract(contracts: BookingRow['venueContracts']): {
  contract: VenueOperationContractRef | null;
  finance: VenueReceivableSummaryDto | null;
  receivableId: string | null;
  receivableRow: BookingRow['venueContracts'][number]['venueReceivable'];
} {
  if (!contracts.length) {
    return { contract: null, finance: null, receivableId: null, receivableRow: null };
  }
  const row =
    contracts.find((c) => c.status === 'signed') ??
    contracts.find((c) => c.status === 'sent') ??
    contracts[0];
  return {
    contract: {
      id: row.id,
      contractNumber: row.contractNumber,
      status: row.status,
      total: moneyToString(row.total),
      signedAt: row.signedAt?.toISOString() ?? null,
    },
    receivableRow: row.venueReceivable,
    receivableId: row.venueReceivable?.id ?? null,
    finance: null,
  };
}

function deriveAlerts(input: {
  bookingStatus: string;
  startAt: Date;
  contract: VenueOperationContractRef | null;
  finance: VenueReceivableSummaryDto | null;
}): VenueOperationAlert[] {
  const alerts: VenueOperationAlert[] = [];
  const today = startOfTodayLocal();
  const endToday = endOfTodayLocal();

  if (input.bookingStatus === 'cancelled') {
    alerts.push({ code: 'booking_cancelled', label: 'Reserva cancelada', severity: 'danger' });
    return alerts;
  }

  if (input.startAt >= today && input.startAt <= endToday) {
    alerts.push({ code: 'event_today', label: 'Evento hoje', severity: 'info' });
  }

  if (input.bookingStatus === 'hold') {
    const soon = addDays(today, 14);
    if (input.startAt <= soon) {
      alerts.push({ code: 'hold_near_date', label: 'Pré-reserva próxima da data', severity: 'warning' });
    }
  }

  if (!input.contract) {
    alerts.push({ code: 'contract_missing', label: 'Sem contrato', severity: 'warning' });
  } else if (input.contract.status !== 'signed') {
    alerts.push({ code: 'contract_unsigned', label: 'Contrato não assinado', severity: 'warning' });
  }

  if (input.contract?.status === 'signed') {
    if (!input.finance) {
      alerts.push({ code: 'finance_missing', label: 'Financeiro não criado', severity: 'warning' });
    } else {
      if (input.finance.status === 'overdue') {
        alerts.push({ code: 'finance_overdue', label: 'Saldo vencido', severity: 'danger' });
      } else if (
        input.finance.status === 'unpaid' ||
        input.finance.status === 'partial'
      ) {
        if (Number.parseFloat(input.finance.balance) > 0) {
          alerts.push({ code: 'finance_open_balance', label: 'Saldo em aberto', severity: 'info' });
        }
      }
    }
  }

  return alerts;
}

@Injectable()
export class BostonCityHallOperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly finance: BostonCityHallFinanceService,
  ) {}

  private async resolveTenantId(venueSlug = BCH_VENUE_SLUG): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: venueSlug },
      select: { id: true },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant do venue "${venueSlug}" não encontrado.`);
    }
    return tenant.id;
  }

  private mapListItem(row: BookingRow): VenueOperationListItemDto {
    const proposal = pickProposal(row.venueProposals);
    const picked = pickContract(row.venueContracts);
    const finance = this.finance.receivableToSummary(picked.receivableRow ?? undefined);
    const contract = picked.contract;
    const companyName =
      row.pipelineLead?.companyName?.trim() ||
      null;

    return {
      bookingId: row.id,
      event: row.event
        ? {
            id: row.event.id,
            name: row.event.name,
            slug: row.event.slug,
            status: row.event.status,
          }
        : null,
      title: row.title,
      eventType: row.eventType,
      startAt: row.startAt.toISOString(),
      endAt: row.endAt.toISOString(),
      spaceId: row.spaceId,
      spaceName: row.space.name,
      guestCount: row.guestCount,
      bookingStatus: row.status,
      contactName: row.contactName ?? row.pipelineLead?.contactName ?? null,
      companyName,
      pipelineLeadId: row.pipelineLeadId,
      proposal,
      contract,
      finance,
      receivableId: picked.receivableId,
      alerts: deriveAlerts({
        bookingStatus: row.status,
        startAt: row.startAt,
        contract,
        finance,
      }),
    };
  }

  private defaultRange(view?: string): { from: Date; to: Date } {
    const today = startOfTodayLocal();
    if (view === 'past') {
      return { from: addDays(today, -60), to: addDays(today, -1) };
    }
    if (view === 'today') {
      return { from: today, to: endOfTodayLocal() };
    }
    if (view === 'all') {
      return { from: addDays(today, -90), to: addDays(today, 365) };
    }
    return { from: today, to: addDays(today, 120) };
  }

  async listOperations(filters: {
    q?: string;
    spaceId?: string;
    status?: string;
    financeStatus?: string;
    view?: string;
    from?: string;
    to?: string;
  }): Promise<VenueOperationListItemDto[]> {
    const tenantId = await this.resolveTenantId();
    const view = filters.view?.trim() || 'upcoming';
    const range = this.defaultRange(view);

    let from = filters.from?.trim() ? new Date(filters.from.trim()) : range.from;
    let to = filters.to?.trim() ? new Date(filters.to.trim()) : range.to;
    if (Number.isNaN(from.getTime())) from = range.from;
    if (Number.isNaN(to.getTime())) to = range.to;

    const where: Prisma.VenueBookingWhereInput = {
      tenantId,
      venueSlug: BCH_VENUE_SLUG,
      startAt: { gte: from, lte: to },
    };

    if (filters.spaceId?.trim()) where.spaceId = filters.spaceId.trim();
    if (filters.status?.trim()) where.status = filters.status.trim();

    const q = filters.q?.trim();
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { contactName: { contains: q, mode: 'insensitive' } },
        { contactEmail: { contains: q, mode: 'insensitive' } },
        { pipelineLead: { companyName: { contains: q, mode: 'insensitive' } } },
        { pipelineLead: { contactName: { contains: q, mode: 'insensitive' } } },
        { venueProposals: { some: { proposalNumber: { contains: q, mode: 'insensitive' } } } },
        { venueContracts: { some: { contractNumber: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    const rows = await this.prisma.venueBooking.findMany({
      where,
      include: operationBookingInclude,
      orderBy: [{ startAt: view === 'past' ? 'desc' : 'asc' }],
    });

    let list = rows.map((r) => this.mapListItem(r));

    const financeFilter = filters.financeStatus?.trim();
    if (
      financeFilter &&
      financeFilter !== 'all' &&
      (financeFilter === 'unpaid' ||
        financeFilter === 'partial' ||
        financeFilter === 'paid' ||
        financeFilter === 'overdue' ||
        financeFilter === 'none')
    ) {
      list = list.filter((item) => {
        if (financeFilter === 'none') return !item.finance;
        return item.finance?.status === financeFilter;
      });
    }

    if (view === 'upcoming') {
      const today = startOfTodayLocal();
      list.sort((a, b) => {
        const aStart = new Date(a.startAt).getTime();
        const bStart = new Date(b.startAt).getTime();
        const aToday = aStart >= today.getTime() && aStart <= endOfTodayLocal().getTime();
        const bToday = bStart >= today.getTime() && bStart <= endOfTodayLocal().getTime();
        if (aToday !== bToday) return aToday ? -1 : 1;
        return aStart - bStart;
      });
    }

    return list;
  }

  async getOperationListItemByEventId(eventId: string): Promise<VenueOperationListItemDto | null> {
    const tenantId = await this.resolveTenantId();
    const row = await this.prisma.venueBooking.findFirst({
      where: { tenantId, eventId: eventId.trim(), venueSlug: BCH_VENUE_SLUG },
      include: operationBookingInclude,
    });
    if (!row) return null;
    return this.mapListItem(row);
  }

  async getOperationByEventId(eventId: string): Promise<VenueOperationDetailDto | null> {
    const tenantId = await this.resolveTenantId();
    const row = await this.prisma.venueBooking.findFirst({
      where: { tenantId, eventId: eventId.trim(), venueSlug: BCH_VENUE_SLUG },
      include: operationBookingInclude,
    });
    if (!row) return null;
    return this.buildOperationDetail(row);
  }

  async getOperation(bookingId: string): Promise<VenueOperationDetailDto> {
    const tenantId = await this.resolveTenantId();
    const row = await this.prisma.venueBooking.findFirst({
      where: { id: bookingId, tenantId, venueSlug: BCH_VENUE_SLUG },
      include: operationBookingInclude,
    });
    if (!row) throw new NotFoundException('Reserva não encontrada');

    return this.buildOperationDetail(row);
  }

  private buildOperationDetail(row: BookingRow): VenueOperationDetailDto {
    const base = this.mapListItem(row);
    const proposals: VenueOperationProposalRef[] = row.venueProposals.map((p) => ({
      id: p.id,
      proposalNumber: p.proposalNumber,
      status: p.status,
      total: moneyToString(p.total),
    }));

    const lead = row.pipelineLead
      ? {
          id: row.pipelineLead.id,
          contactName: row.pipelineLead.contactName,
          contactEmail: row.pipelineLead.contactEmail,
          contactPhone: row.pipelineLead.contactPhone,
          companyName: row.pipelineLead.companyName,
          stage: row.pipelineLead.stage,
        }
      : null;

    return {
      ...base,
      contactEmail: row.contactEmail ?? row.pipelineLead?.contactEmail ?? null,
      contactPhone: row.contactPhone ?? row.pipelineLead?.contactPhone ?? null,
      notes: row.notes,
      lead,
      proposals,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async getUpcomingPreview(limit = 5): Promise<VenueOperationUpcomingItemDto[]> {
    const list = await this.listOperations({ view: 'upcoming' });
    const active = list.filter((i) => i.bookingStatus !== 'cancelled');
    return active.slice(0, limit).map((i) => ({
      bookingId: i.bookingId,
      title: i.title,
      startAt: i.startAt,
      endAt: i.endAt,
      spaceName: i.spaceName,
      contactName: i.contactName,
      companyName: i.companyName,
      bookingStatus: i.bookingStatus,
      alerts: i.alerts,
    }));
  }
}
