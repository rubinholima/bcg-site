import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { parseDateOnlyBrazil } from '../common/brazil-time.util';
import { PrismaService } from '../prisma/prisma.service';
import {
  BCH_CONTRACT_NUMBER_PREFIX,
  BCH_VENUE_SLUG,
  VENUE_CONTRACT_STATUSES,
  type VenueContractDto,
  type VenueContractItemDto,
  type VenueContractListDto,
  type VenueContractStatus,
} from './boston-city-hall.constants';
import { BostonCityHallFinanceService } from './boston-city-hall-finance.service';

function moneyToString(value: Prisma.Decimal | number | string): string {
  if (value instanceof Prisma.Decimal) return value.toFixed(2);
  return new Prisma.Decimal(value).toFixed(2);
}

function assertContractStatus(status: string): asserts status is VenueContractStatus {
  if (!VENUE_CONTRACT_STATUSES.includes(status as VenueContractStatus)) {
    throw new BadRequestException(`Status inválido: ${status}`);
  }
}

const TERMINAL: VenueContractStatus[] = ['signed', 'cancelled', 'expired'];

function assertContractTransition(from: VenueContractStatus, to: VenueContractStatus) {
  if (from === to) return;
  if (TERMINAL.includes(from)) {
    throw new BadRequestException('Contrato encerrado não pode mudar de status.');
  }
  const allowed: Record<VenueContractStatus, VenueContractStatus[]> = {
    draft: ['sent', 'cancelled'],
    sent: ['signed', 'cancelled', 'expired'],
    signed: [],
    cancelled: [],
    expired: [],
  };
  if (!allowed[from].includes(to)) {
    throw new BadRequestException(`Transição não permitida: ${from} → ${to}`);
  }
}

function isContentLocked(status: string): boolean {
  return status !== 'draft';
}

function toItemDto(row: {
  id: string;
  sourceProposalItemId: string | null;
  name: string;
  description: string | null;
  quantity: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
  totalPrice: Prisma.Decimal;
  sortOrder: number;
}): VenueContractItemDto {
  return {
    id: row.id,
    sourceProposalItemId: row.sourceProposalItemId,
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
  contractNumber: string;
  proposalId: string;
  proposal: { proposalNumber: string };
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
  sentAt: Date | null;
  signedAt: Date | null;
  updatedAt: Date;
  _count?: { items: number };
}): VenueContractListDto {
  return {
    id: row.id,
    tenantId: row.tenantId,
    contractNumber: row.contractNumber,
    proposalId: row.proposalId,
    proposalNumber: row.proposal.proposalNumber,
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
    sentAt: row.sentAt?.toISOString() ?? null,
    signedAt: row.signedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
    itemsCount: row._count?.items ?? 0,
  };
}

function toDetailDto(
  row: Parameters<typeof toListDto>[0] & {
    contactPhone: string | null;
    notes: string | null;
    terms: string | null;
    validFrom: Date | null;
    validUntil: Date | null;
    cancelledAt: Date | null;
    createdAt: Date;
    items: Array<Parameters<typeof toItemDto>[0]>;
  },
): VenueContractDto {
  const base = toListDto(row);
  return {
    ...base,
    contactPhone: row.contactPhone,
    notes: row.notes,
    terms: row.terms,
    validFrom: row.validFrom?.toISOString() ?? null,
    validUntil: row.validUntil?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    items: row.items.map(toItemDto),
    itemsCount: row.items.length,
    receivableId: null,
    financialSummary: null,
  };
}

const listInclude = {
  proposal: { select: { proposalNumber: true } },
  _count: { select: { items: true } },
} as const;

const detailInclude = {
  proposal: { select: { proposalNumber: true } },
  items: { orderBy: [{ sortOrder: 'asc' as const }, { id: 'asc' as const }] },
  venueReceivable: { select: { id: true } },
} satisfies Prisma.VenueContractInclude;

@Injectable()
export class BostonCityHallContractsService {
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

  private async nextContractNumber(
    tx: Prisma.TransactionClient,
    tenantId: string,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const seqRow = await tx.venueContractNumberSeq.upsert({
      where: { tenantId_year: { tenantId, year } },
      create: { tenantId, year, lastSeq: 1 },
      update: { lastSeq: { increment: 1 } },
    });
    return `${BCH_CONTRACT_NUMBER_PREFIX}-${year}-${String(seqRow.lastSeq).padStart(4, '0')}`;
  }

  async listContracts(filters: {
    q?: string;
    status?: string;
    updatedFrom?: string;
    updatedTo?: string;
  } = {}): Promise<VenueContractListDto[]> {
    const tenantId = await this.resolveTenantId();
    const where: Prisma.VenueContractWhereInput = { tenantId };

    if (filters.status?.trim()) {
      assertContractStatus(filters.status.trim());
      where.status = filters.status.trim();
    }

    const q = filters.q?.trim();
    if (q) {
      where.OR = [
        { contractNumber: { contains: q, mode: 'insensitive' } },
        { title: { contains: q, mode: 'insensitive' } },
        { contactName: { contains: q, mode: 'insensitive' } },
        { contactEmail: { contains: q, mode: 'insensitive' } },
        { companyName: { contains: q, mode: 'insensitive' } },
        { proposal: { proposalNumber: { contains: q, mode: 'insensitive' } } },
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

    const rows = await this.prisma.venueContract.findMany({
      where,
      include: listInclude,
      orderBy: [{ updatedAt: 'desc' }],
    });
    return rows.map(toListDto);
  }

  async getContract(id: string): Promise<VenueContractDto> {
    const tenantId = await this.resolveTenantId();
    const row = await this.prisma.venueContract.findFirst({
      where: { id, tenantId },
      include: detailInclude,
    });
    if (!row) throw new NotFoundException('Contrato não encontrado');
    const dto = toDetailDto({ ...row, _count: { items: row.items.length } });
    dto.receivableId = row.venueReceivable?.id ?? null;
    if (dto.receivableId) {
      dto.financialSummary = await this.finance.getSummaryByContractId(id, tenantId);
    }
    return dto;
  }

  async createContractFromProposal(dto: { proposalId: string }): Promise<VenueContractDto> {
    const tenantId = await this.resolveTenantId();
    const proposalId = dto.proposalId?.trim();
    if (!proposalId) throw new BadRequestException('Proposta é obrigatória.');

    const proposal = await this.prisma.venueProposal.findFirst({
      where: { id: proposalId, tenantId },
      include: {
        items: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
        venueContract: { select: { id: true } },
      },
    });
    if (!proposal) throw new NotFoundException('Proposta não encontrada');
    if (proposal.status !== 'accepted') {
      throw new BadRequestException('Só é possível gerar contrato a partir de proposta aceita.');
    }
    if (proposal.venueContract) {
      throw new ConflictException('Esta proposta já possui contrato.');
    }

    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const contractNumber = await this.nextContractNumber(tx, tenantId);
        return tx.venueContract.create({
          data: {
            tenantId,
            contractNumber,
            proposalId: proposal.id,
            pipelineLeadId: proposal.pipelineLeadId,
            bookingId: proposal.bookingId,
            status: 'draft',
            title: proposal.title,
            contactName: proposal.contactName,
            contactEmail: proposal.contactEmail,
            contactPhone: proposal.contactPhone,
            companyName: proposal.companyName,
            eventType: proposal.eventType,
            eventDate: proposal.eventDate,
            guestCount: proposal.guestCount,
            subtotal: proposal.subtotal,
            discount: proposal.discount,
            tax: proposal.tax,
            total: proposal.total,
            notes: proposal.notes,
            terms: proposal.terms,
            validUntil: proposal.validUntil,
            items: {
              create: proposal.items.map((it) => ({
                sourceProposalItemId: it.id,
                name: it.name,
                description: it.description,
                quantity: it.quantity,
                unitPrice: it.unitPrice,
                totalPrice: it.totalPrice,
                sortOrder: it.sortOrder,
              })),
            },
          },
          include: detailInclude,
        });
      });
      return toDetailDto({ ...row, _count: { items: row.items.length } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Esta proposta já possui contrato.');
      }
      throw e;
    }
  }

  async updateContract(
    id: string,
    dto: Partial<{
      status: string;
      notes: string | null;
      terms: string | null;
      validFrom: string | null;
      validUntil: string | null;
    }>,
  ): Promise<VenueContractDto> {
    const tenantId = await this.resolveTenantId();
    const existing = await this.prisma.venueContract.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('Contrato não encontrado');

    const locked = isContentLocked(existing.status);

    const touchedKeys = Object.keys(dto).filter(
      (k) => dto[k as keyof typeof dto] !== undefined,
    ) as Array<keyof typeof dto>;

    if (locked) {
      const onlyStatus = touchedKeys.length === 1 && touchedKeys[0] === 'status';
      if (!onlyStatus) {
        throw new ForbiddenException(
          'Contrato enviado ou encerrado: altere apenas o status.',
        );
      }
    }

    const data: Prisma.VenueContractUpdateInput = {};
    const now = new Date();

    if (dto.status !== undefined) {
      assertContractStatus(dto.status);
      assertContractTransition(existing.status as VenueContractStatus, dto.status);
      data.status = dto.status;
      if (dto.status === 'sent' && !existing.sentAt) data.sentAt = now;
      if (dto.status === 'signed') data.signedAt = existing.signedAt ?? now;
      if (dto.status === 'cancelled') data.cancelledAt = existing.cancelledAt ?? now;
    }

    if (!locked) {
      if (dto.notes !== undefined) data.notes = dto.notes?.trim() || null;
      if (dto.terms !== undefined) data.terms = dto.terms?.trim() || null;
      if (dto.validFrom !== undefined) {
        data.validFrom = dto.validFrom?.trim()
          ? parseDateOnlyBrazil(dto.validFrom.trim())
          : null;
      }
      if (dto.validUntil !== undefined) {
        data.validUntil = dto.validUntil?.trim()
          ? parseDateOnlyBrazil(dto.validUntil.trim())
          : null;
      }
    }

    const row = await this.prisma.venueContract.update({
      where: { id },
      data,
      include: detailInclude,
    });
    return toDetailDto({ ...row, _count: { items: row.items.length } });
  }
}
