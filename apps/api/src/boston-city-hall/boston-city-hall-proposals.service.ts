import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { parseDateOnlyBrazil } from '../common/brazil-time.util';
import { PrismaService } from '../prisma/prisma.service';
import {
  BCH_PROPOSAL_NUMBER_PREFIX,
  BCH_VENUE_SLUG,
  VENUE_PROPOSAL_ITEM_SOURCE_TYPES,
  VENUE_PROPOSAL_STATUSES,
  type VenueProposalDto,
  type VenueProposalItemDto,
  type VenueProposalListDto,
  type VenueProposalStatus,
} from './boston-city-hall.constants';

function moneyToString(value: Prisma.Decimal | number | string): string {
  if (value instanceof Prisma.Decimal) return value.toFixed(2);
  return new Prisma.Decimal(value).toFixed(2);
}

function parseMoney(value: number | string, field = 'Valor'): Prisma.Decimal {
  const n =
    typeof value === 'number' ? value : Number.parseFloat(String(value).replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) {
    throw new BadRequestException(`${field} inválido.`);
  }
  return new Prisma.Decimal(n.toFixed(2));
}

function parseQuantity(value: number | string): Prisma.Decimal {
  const n =
    typeof value === 'number' ? value : Number.parseFloat(String(value).replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) {
    throw new BadRequestException('Quantidade inválida.');
  }
  return new Prisma.Decimal(n.toFixed(2));
}

function lineTotal(qty: Prisma.Decimal, unit: Prisma.Decimal): Prisma.Decimal {
  return qty.mul(unit).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

function assertStatus(status: string): asserts status is VenueProposalStatus {
  if (!VENUE_PROPOSAL_STATUSES.includes(status as VenueProposalStatus)) {
    throw new BadRequestException(`Status inválido: ${status}`);
  }
}

function isCommercialLocked(status: string): boolean {
  return status !== 'draft';
}

const TERMINAL_STATUSES: VenueProposalStatus[] = ['accepted', 'rejected', 'expired', 'cancelled'];

function assertStatusTransition(from: VenueProposalStatus, to: VenueProposalStatus) {
  if (from === to) return;
  if (TERMINAL_STATUSES.includes(from)) {
    throw new BadRequestException('Proposta encerrada não pode mudar de status.');
  }
  const allowed: Record<VenueProposalStatus, VenueProposalStatus[]> = {
    draft: ['sent', 'cancelled'],
    sent: ['accepted', 'rejected', 'expired', 'cancelled'],
    accepted: [],
    rejected: [],
    expired: [],
    cancelled: [],
  };
  if (!allowed[from].includes(to)) {
    throw new BadRequestException(`Transição de status não permitida: ${from} → ${to}`);
  }
}

type ItemInput = {
  sourceType: string;
  sourceServiceId?: string;
  sourcePackageId?: string;
  name?: string;
  description?: string | null;
  quantity: number | string;
  unitPrice?: number | string;
  sortOrder?: number;
};

const proposalInclude = {
  items: { orderBy: [{ sortOrder: 'asc' as const }, { id: 'asc' as const }] },
  _count: { select: { items: true } },
} as const;

function toItemDto(row: {
  id: string;
  sourceType: string;
  sourceServiceId: string | null;
  sourcePackageId: string | null;
  name: string;
  description: string | null;
  quantity: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
  totalPrice: Prisma.Decimal;
  sortOrder: number;
}): VenueProposalItemDto {
  return {
    id: row.id,
    sourceType: row.sourceType,
    sourceServiceId: row.sourceServiceId,
    sourcePackageId: row.sourcePackageId,
    name: row.name,
    description: row.description,
    quantity: moneyToString(row.quantity),
    unitPrice: moneyToString(row.unitPrice),
    totalPrice: moneyToString(row.totalPrice),
    sortOrder: row.sortOrder,
  };
}

function toListDto(row: {
  id: string;
  tenantId: string;
  proposalNumber: string;
  pipelineLeadId: string | null;
  bookingId: string | null;
  status: string;
  title: string;
  contactName: string;
  contactEmail: string;
  companyName: string | null;
  eventType: string | null;
  eventDate: Date | null;
  guestCount: number | null;
  subtotal: Prisma.Decimal;
  discount: Prisma.Decimal;
  tax: Prisma.Decimal;
  total: Prisma.Decimal;
  validUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { items: number };
}): VenueProposalListDto {
  return {
    id: row.id,
    tenantId: row.tenantId,
    proposalNumber: row.proposalNumber,
    pipelineLeadId: row.pipelineLeadId,
    bookingId: row.bookingId,
    status: row.status,
    title: row.title,
    contactName: row.contactName,
    contactEmail: row.contactEmail,
    companyName: row.companyName,
    eventType: row.eventType,
    eventDate: row.eventDate?.toISOString() ?? null,
    guestCount: row.guestCount,
    subtotal: moneyToString(row.subtotal),
    discount: moneyToString(row.discount),
    tax: moneyToString(row.tax),
    total: moneyToString(row.total),
    validUntil: row.validUntil?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    itemsCount: row._count?.items ?? 0,
  };
}

function toDetailDto(
  row: Parameters<typeof toListDto>[0] & {
    contactPhone: string | null;
    notes: string | null;
    terms: string | null;
    items: Array<Parameters<typeof toItemDto>[0]>;
  },
): VenueProposalDto {
  const base = toListDto(row);
  return {
    ...base,
    contactPhone: row.contactPhone,
    notes: row.notes,
    terms: row.terms,
    items: row.items.map(toItemDto),
    itemsCount: row.items.length,
  };
}

@Injectable()
export class BostonCityHallProposalsService {
  constructor(private readonly prisma: PrismaService) {}

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

  private async nextProposalNumber(
    tx: Prisma.TransactionClient,
    tenantId: string,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const seqRow = await tx.venueProposalNumberSeq.upsert({
      where: { tenantId_year: { tenantId, year } },
      create: { tenantId, year, lastSeq: 1 },
      update: { lastSeq: { increment: 1 } },
    });
    const seq = seqRow.lastSeq;
    return `${BCH_PROPOSAL_NUMBER_PREFIX}-${year}-${String(seq).padStart(4, '0')}`;
  }

  private async resolveSnapshotItems(
    tenantId: string,
    items: ItemInput[],
  ): Promise<
    Array<{
      sourceType: string;
      sourceServiceId: string | null;
      sourcePackageId: string | null;
      name: string;
      description: string | null;
      quantity: Prisma.Decimal;
      unitPrice: Prisma.Decimal;
      totalPrice: Prisma.Decimal;
      sortOrder: number;
    }>
  > {
    const result: Array<{
      sourceType: string;
      sourceServiceId: string | null;
      sourcePackageId: string | null;
      name: string;
      description: string | null;
      quantity: Prisma.Decimal;
      unitPrice: Prisma.Decimal;
      totalPrice: Prisma.Decimal;
      sortOrder: number;
    }> = [];

    for (let i = 0; i < items.length; i++) {
      const raw = items[i];
      const sourceType = raw.sourceType?.trim();
      if (
        !sourceType ||
        !VENUE_PROPOSAL_ITEM_SOURCE_TYPES.includes(
          sourceType as (typeof VENUE_PROPOSAL_ITEM_SOURCE_TYPES)[number],
        )
      ) {
        throw new BadRequestException(`Tipo de item inválido na linha ${i + 1}.`);
      }
      const quantity = parseQuantity(raw.quantity);
      const sortOrder = raw.sortOrder ?? i;

      if (sourceType === 'service') {
        const serviceId = raw.sourceServiceId?.trim();
        if (!serviceId) {
          throw new BadRequestException(`Serviço obrigatório na linha ${i + 1}.`);
        }
        const svc = await this.prisma.venueCatalogService.findFirst({
          where: { id: serviceId, tenantId },
        });
        if (!svc) {
          throw new BadRequestException(`Serviço inválido na linha ${i + 1}.`);
        }
        const unitPrice =
          raw.unitPrice !== undefined ? parseMoney(raw.unitPrice, 'Preço unitário') : svc.defaultPrice;
        result.push({
          sourceType: 'service',
          sourceServiceId: svc.id,
          sourcePackageId: null,
          name: svc.name,
          description: svc.description,
          quantity,
          unitPrice,
          totalPrice: lineTotal(quantity, unitPrice),
          sortOrder,
        });
      } else if (sourceType === 'package') {
        const packageId = raw.sourcePackageId?.trim();
        if (!packageId) {
          throw new BadRequestException(`Pacote obrigatório na linha ${i + 1}.`);
        }
        const pkg = await this.prisma.venueCatalogPackage.findFirst({
          where: { id: packageId, tenantId },
        });
        if (!pkg) {
          throw new BadRequestException(`Pacote inválido na linha ${i + 1}.`);
        }
        const unitPrice =
          raw.unitPrice !== undefined ? parseMoney(raw.unitPrice, 'Preço unitário') : pkg.defaultPrice;
        result.push({
          sourceType: 'package',
          sourceServiceId: null,
          sourcePackageId: pkg.id,
          name: pkg.name,
          description: pkg.description,
          quantity,
          unitPrice,
          totalPrice: lineTotal(quantity, unitPrice),
          sortOrder,
        });
      } else {
        const name = raw.name?.trim();
        if (!name) {
          throw new BadRequestException(`Nome obrigatório no item customizado (linha ${i + 1}).`);
        }
        if (raw.unitPrice === undefined) {
          throw new BadRequestException(`Preço unitário obrigatório no item customizado (linha ${i + 1}).`);
        }
        const unitPrice = parseMoney(raw.unitPrice, 'Preço unitário');
        result.push({
          sourceType: 'custom',
          sourceServiceId: null,
          sourcePackageId: null,
          name,
          description: raw.description?.trim() || null,
          quantity,
          unitPrice,
          totalPrice: lineTotal(quantity, unitPrice),
          sortOrder,
        });
      }
    }

    return result;
  }

  private computeTotals(
    items: Array<{ totalPrice: Prisma.Decimal }>,
    discount: Prisma.Decimal,
    tax: Prisma.Decimal,
  ) {
    const subtotal = items.reduce(
      (acc, it) => acc.add(it.totalPrice),
      new Prisma.Decimal(0),
    );
    const sub = subtotal.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    const disc = discount.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    const taxV = tax.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    let total = sub.sub(disc).add(taxV);
    if (total.isNegative()) total = new Prisma.Decimal(0);
    total = total.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    if (disc.gt(sub)) {
      throw new BadRequestException('Desconto não pode ser maior que o subtotal.');
    }
    return { subtotal: sub, discount: disc, tax: taxV, total };
  }

  private async assertLeadOwnership(tenantId: string, pipelineLeadId: string) {
    const lead = await this.prisma.venuePipelineLead.findFirst({
      where: { id: pipelineLeadId, tenantId },
    });
    if (!lead) throw new BadRequestException('Lead inválido para este tenant.');
    return lead;
  }

  private async assertBookingOwnership(tenantId: string, bookingId: string) {
    const booking = await this.prisma.venueBooking.findFirst({
      where: { id: bookingId, tenantId },
    });
    if (!booking) throw new BadRequestException('Reserva inválida para este tenant.');
    return booking;
  }

  private leadSnapshot(lead: {
    contactName: string;
    contactEmail: string;
    contactPhone: string | null;
    companyName: string | null;
    eventType: string | null;
    guestCount: number | null;
    preferredDate: Date | null;
  }) {
    return {
      contactName: lead.contactName,
      contactEmail: lead.contactEmail,
      contactPhone: lead.contactPhone,
      companyName: lead.companyName,
      eventType: lead.eventType,
      guestCount: lead.guestCount,
      eventDate: lead.preferredDate,
    };
  }

  private bookingSnapshot(booking: {
    title: string;
    eventType: string | null;
    startAt: Date;
    contactName: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    guestCount: number | null;
    pipelineLeadId: string | null;
  }) {
    return {
      title: booking.title,
      eventType: booking.eventType,
      eventDate: booking.startAt,
      contactName: booking.contactName ?? '',
      contactEmail: booking.contactEmail ?? '',
      contactPhone: booking.contactPhone,
      guestCount: booking.guestCount,
      pipelineLeadId: booking.pipelineLeadId,
    };
  }

  async listProposals(filters: {
    q?: string;
    status?: string;
    updatedFrom?: string;
    updatedTo?: string;
  } = {}): Promise<VenueProposalListDto[]> {
    const tenantId = await this.resolveTenantId();
    const where: Prisma.VenueProposalWhereInput = { tenantId };

    if (filters.status?.trim()) {
      assertStatus(filters.status.trim());
      where.status = filters.status.trim();
    }

    const q = filters.q?.trim();
    if (q) {
      where.OR = [
        { proposalNumber: { contains: q, mode: 'insensitive' } },
        { title: { contains: q, mode: 'insensitive' } },
        { contactName: { contains: q, mode: 'insensitive' } },
        { contactEmail: { contains: q, mode: 'insensitive' } },
        { companyName: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (filters.updatedFrom?.trim()) {
      const d = new Date(filters.updatedFrom.trim());
      if (!Number.isNaN(d.getTime())) {
        where.updatedAt = { ...(where.updatedAt as object), gte: d };
      }
    }
    if (filters.updatedTo?.trim()) {
      const d = new Date(filters.updatedTo.trim());
      if (!Number.isNaN(d.getTime())) {
        where.updatedAt = { ...(where.updatedAt as object), lte: d };
      }
    }

    const rows = await this.prisma.venueProposal.findMany({
      where,
      include: { _count: { select: { items: true } } },
      orderBy: [{ updatedAt: 'desc' }],
    });
    return rows.map(toListDto);
  }

  async getProposal(id: string): Promise<VenueProposalDto> {
    const tenantId = await this.resolveTenantId();
    const row = await this.prisma.venueProposal.findFirst({
      where: { id, tenantId },
      include: { items: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } },
    });
    if (!row) throw new NotFoundException('Proposta não encontrada');
    return toDetailDto({ ...row, _count: { items: row.items.length } });
  }

  async createProposal(dto: {
    title?: string;
    pipelineLeadId?: string;
    bookingId?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    companyName?: string;
    eventType?: string;
    eventDate?: string;
    guestCount?: number;
    discount?: number | string;
    tax?: number | string;
    notes?: string;
    terms?: string;
    validUntil?: string;
    items?: ItemInput[];
  }): Promise<VenueProposalDto> {
    const tenantId = await this.resolveTenantId();

    let pipelineLeadId = dto.pipelineLeadId?.trim() || null;
    let bookingId = dto.bookingId?.trim() || null;

    let contactName = dto.contactName?.trim() ?? '';
    let contactEmail = dto.contactEmail?.trim() ?? '';
    let contactPhone = dto.contactPhone?.trim() || null;
    let companyName = dto.companyName?.trim() || null;
    let eventType = dto.eventType?.trim() || null;
    let eventDate: Date | null = dto.eventDate?.trim()
      ? parseDateOnlyBrazil(dto.eventDate.trim())
      : null;
    let guestCount = dto.guestCount ?? null;
    let title = dto.title?.trim() ?? '';

    if (bookingId) {
      const booking = await this.assertBookingOwnership(tenantId, bookingId);
      const snap = this.bookingSnapshot(booking);
      if (!title) title = snap.title;
      if (!contactName && snap.contactName) contactName = snap.contactName;
      if (!contactEmail && snap.contactEmail) contactEmail = snap.contactEmail;
      if (!contactPhone && snap.contactPhone) contactPhone = snap.contactPhone;
      if (eventType == null && snap.eventType) eventType = snap.eventType;
      if (eventDate == null) eventDate = snap.eventDate;
      if (guestCount == null && snap.guestCount != null) guestCount = snap.guestCount;
      if (!pipelineLeadId && snap.pipelineLeadId) pipelineLeadId = snap.pipelineLeadId;
    }

    if (pipelineLeadId) {
      const lead = await this.assertLeadOwnership(tenantId, pipelineLeadId);
      const snap = this.leadSnapshot(lead);
      if (!contactName) contactName = snap.contactName;
      if (!contactEmail) contactEmail = snap.contactEmail;
      if (!contactPhone && snap.contactPhone) contactPhone = snap.contactPhone;
      if (!companyName && snap.companyName) companyName = snap.companyName;
      if (!eventType && snap.eventType) eventType = snap.eventType;
      if (guestCount == null && snap.guestCount != null) guestCount = snap.guestCount;
      if (eventDate == null && snap.eventDate) eventDate = snap.eventDate;
      if (!title) {
        title = companyName
          ? `Proposta — ${companyName}`
          : `Proposta — ${contactName || lead.contactName}`;
      }
    }

    if (!contactName) throw new BadRequestException('Nome do contato é obrigatório.');
    if (!contactEmail) throw new BadRequestException('E-mail do contato é obrigatório.');
    if (!title) title = `Proposta — ${contactName}`;

    const itemsInput = dto.items ?? [];
    const snapshotItems = await this.resolveSnapshotItems(tenantId, itemsInput);
    const discount = parseMoney(dto.discount ?? 0, 'Desconto');
    const tax = parseMoney(dto.tax ?? 0, 'Impostos/taxas');
    const totals = this.computeTotals(snapshotItems, discount, tax);

    let validUntil: Date | null = null;
    if (dto.validUntil?.trim()) {
      validUntil = parseDateOnlyBrazil(dto.validUntil.trim());
    }

    const row = await this.prisma.$transaction(async (tx) => {
      const proposalNumber = await this.nextProposalNumber(tx, tenantId);
      const created = await tx.venueProposal.create({
        data: {
          tenantId,
          proposalNumber,
          pipelineLeadId,
          bookingId,
          status: 'draft',
          title,
          contactName,
          contactEmail,
          contactPhone,
          companyName,
          eventType,
          eventDate,
          guestCount,
          subtotal: totals.subtotal,
          discount: totals.discount,
          tax: totals.tax,
          total: totals.total,
          notes: dto.notes?.trim() || null,
          terms: dto.terms?.trim() || null,
          validUntil,
          items: {
            create: snapshotItems.map((it) => ({
              sourceType: it.sourceType,
              sourceServiceId: it.sourceServiceId,
              sourcePackageId: it.sourcePackageId,
              name: it.name,
              description: it.description,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              totalPrice: it.totalPrice,
              sortOrder: it.sortOrder,
            })),
          },
        },
        include: { items: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } },
      });
      return created;
    });

    return toDetailDto({ ...row, _count: { items: row.items.length } });
  }

  async updateProposal(
    id: string,
    dto: Partial<{
      status: string;
      title: string;
      pipelineLeadId: string | null;
      bookingId: string | null;
      contactName: string;
      contactEmail: string;
      contactPhone: string | null;
      companyName: string | null;
      eventType: string | null;
      eventDate: string | null;
      guestCount: number | null;
      discount: number | string;
      tax: number | string;
      notes: string | null;
      terms: string | null;
      validUntil: string | null;
      items: ItemInput[];
    }>,
  ): Promise<VenueProposalDto> {
    const tenantId = await this.resolveTenantId();
    const existing = await this.prisma.venueProposal.findFirst({
      where: { id, tenantId },
      include: { items: true },
    });
    if (!existing) throw new NotFoundException('Proposta não encontrada');

    const locked = isCommercialLocked(existing.status);

    const touchedKeys = Object.keys(dto).filter(
      (k) => dto[k as keyof typeof dto] !== undefined,
    ) as Array<keyof typeof dto>;

    if (locked) {
      const onlyStatus = touchedKeys.length === 1 && touchedKeys[0] === 'status';
      if (!onlyStatus) {
        throw new ForbiddenException(
          'Proposta enviada ou encerrada: altere apenas o status ou duplique para revisar valores.',
        );
      }
    }

    if (dto.status !== undefined) {
      assertStatus(dto.status);
      assertStatusTransition(existing.status as VenueProposalStatus, dto.status);
    }

    if (dto.pipelineLeadId) {
      await this.assertLeadOwnership(tenantId, dto.pipelineLeadId);
    }
    if (dto.bookingId) {
      await this.assertBookingOwnership(tenantId, dto.bookingId);
    }

    let snapshotItems = existing.items.map((it) => ({
      sourceType: it.sourceType,
      sourceServiceId: it.sourceServiceId,
      sourcePackageId: it.sourcePackageId,
      name: it.name,
      description: it.description,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      totalPrice: it.totalPrice,
      sortOrder: it.sortOrder,
    }));

    if (dto.items !== undefined && !locked) {
      snapshotItems = await this.resolveSnapshotItems(tenantId, dto.items);
    }

    const discount =
      dto.discount !== undefined && !locked
        ? parseMoney(dto.discount, 'Desconto')
        : existing.discount;
    const tax =
      dto.tax !== undefined && !locked ? parseMoney(dto.tax, 'Impostos/taxas') : existing.tax;
    const totals = this.computeTotals(snapshotItems, discount, tax);

    const data: Prisma.VenueProposalUpdateInput = {};

    if (dto.status !== undefined) data.status = dto.status;
    if (!locked) {
      if (dto.title !== undefined) {
        const title = dto.title.trim();
        if (!title) throw new BadRequestException('Título é obrigatório.');
        data.title = title;
      }
      if (dto.contactName !== undefined) {
        const v = dto.contactName.trim();
        if (!v) throw new BadRequestException('Nome do contato é obrigatório.');
        data.contactName = v;
      }
      if (dto.contactEmail !== undefined) {
        const v = dto.contactEmail.trim();
        if (!v) throw new BadRequestException('E-mail do contato é obrigatório.');
        data.contactEmail = v;
      }
      if (dto.contactPhone !== undefined) data.contactPhone = dto.contactPhone?.trim() || null;
      if (dto.companyName !== undefined) data.companyName = dto.companyName?.trim() || null;
      if (dto.eventType !== undefined) data.eventType = dto.eventType?.trim() || null;
      if (dto.eventDate !== undefined) {
        data.eventDate = dto.eventDate?.trim()
          ? parseDateOnlyBrazil(dto.eventDate.trim())
          : null;
      }
      if (dto.guestCount !== undefined) data.guestCount = dto.guestCount;
      if (dto.notes !== undefined) data.notes = dto.notes?.trim() || null;
      if (dto.terms !== undefined) data.terms = dto.terms?.trim() || null;
      if (dto.validUntil !== undefined) {
        data.validUntil = dto.validUntil?.trim()
          ? parseDateOnlyBrazil(dto.validUntil.trim())
          : null;
      }
      if (dto.pipelineLeadId !== undefined) {
        data.pipelineLead = dto.pipelineLeadId
          ? { connect: { id: dto.pipelineLeadId } }
          : { disconnect: true };
      }
      if (dto.bookingId !== undefined) {
        data.booking = dto.bookingId
          ? { connect: { id: dto.bookingId } }
          : { disconnect: true };
      }
      data.subtotal = totals.subtotal;
      data.discount = totals.discount;
      data.tax = totals.tax;
      data.total = totals.total;
    }

    const row = await this.prisma.$transaction(async (tx) => {
      if (dto.items !== undefined && !locked) {
        await tx.venueProposalItem.deleteMany({ where: { proposalId: id } });
        if (snapshotItems.length > 0) {
          await tx.venueProposalItem.createMany({
            data: snapshotItems.map((it) => ({
              proposalId: id,
              sourceType: it.sourceType,
              sourceServiceId: it.sourceServiceId,
              sourcePackageId: it.sourcePackageId,
              name: it.name,
              description: it.description,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              totalPrice: it.totalPrice,
              sortOrder: it.sortOrder,
            })),
          });
        }
      }

      return tx.venueProposal.update({
        where: { id },
        data,
        include: { items: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } },
      });
    });

    return toDetailDto({ ...row, _count: { items: row.items.length } });
  }

  async duplicateProposal(id: string): Promise<VenueProposalDto> {
    const tenantId = await this.resolveTenantId();
    const source = await this.prisma.venueProposal.findFirst({
      where: { id, tenantId },
      include: { items: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } },
    });
    if (!source) throw new NotFoundException('Proposta não encontrada');

    const row = await this.prisma.$transaction(async (tx) => {
      const proposalNumber = await this.nextProposalNumber(tx, tenantId);
      return tx.venueProposal.create({
        data: {
          tenantId,
          proposalNumber,
          pipelineLeadId: source.pipelineLeadId,
          bookingId: source.bookingId,
          status: 'draft',
          title: `${source.title} (cópia)`,
          contactName: source.contactName,
          contactEmail: source.contactEmail,
          contactPhone: source.contactPhone,
          companyName: source.companyName,
          eventType: source.eventType,
          eventDate: source.eventDate,
          guestCount: source.guestCount,
          subtotal: source.subtotal,
          discount: source.discount,
          tax: source.tax,
          total: source.total,
          notes: source.notes,
          terms: source.terms,
          validUntil: source.validUntil,
          items: {
            create: source.items.map((it) => ({
              sourceType: it.sourceType,
              sourceServiceId: it.sourceServiceId,
              sourcePackageId: it.sourcePackageId,
              name: it.name,
              description: it.description,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              totalPrice: it.totalPrice,
              sortOrder: it.sortOrder,
            })),
          },
        },
        include: { items: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } },
      });
    });

    return toDetailDto({ ...row, _count: { items: row.items.length } });
  }
}
