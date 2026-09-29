import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { cadastroUpper, cadastroUpperRequired } from '../common/cadastro-text';
import { FinanceiroLancamentosService } from '../financeiro/financeiro-lancamentos.service';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { appendNegotiationAudit } from './player-negotiation-audit.util';
import {
  INSTALLMENT_STATUSES,
  NEGOTIATION_ACTIVE_LIST_STATUSES,
  NEGOTIATION_STATUSES,
  NEGOTIATION_TYPES,
  type InstallmentStatus,
  type NegotiationStatus,
} from './player-negotiation.constants';
import { PlayerNegotiationIntegrationService } from './player-negotiation-integration.service';
import {
  AddNegotiationDocumentDto,
  CreateInstallmentFinanceiroDto,
  CreatePlayerNegotiationDto,
  NegotiationInstallmentDto,
  UpdatePlayerNegotiationDto,
} from './dto/player-negotiation.dto';

type Editor = { sub: string; name?: string | null };

const includeFull = {
  player: {
    select: {
      id: true,
      name: true,
      category: true,
      photoUrl: true,
      tenantId: true,
    },
  },
  tenant: { select: { id: true, name: true, slug: true } },
  visitingTeam: { select: { id: true, name: true, logoUrl: true } },
  installments: { orderBy: { sequence: 'asc' as const } },
  documents: { orderBy: { uploadedAt: 'desc' as const } },
  auditLogs: { orderBy: { at: 'desc' as const }, take: 200 },
} satisfies Prisma.PlayerNegotiationInclude;

function dec(v: Prisma.Decimal | null | undefined): number | null {
  if (v == null) return null;
  return typeof v === 'number' ? v : v.toNumber();
}

function startOfTodayUtc(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function resolveInstallmentStatus(
  status: string,
  dueDate: Date,
): InstallmentStatus {
  if (status === 'paid' || status === 'cancelled') return status as InstallmentStatus;
  if (dueDate < startOfTodayUtc()) return 'overdue';
  return 'pending';
}

function serializeNegotiation(row: Prisma.PlayerNegotiationGetPayload<{ include: typeof includeFull }>) {
  return {
    ...row,
    negotiatedPercentage: dec(row.negotiatedPercentage),
    retainedPercentage: dec(row.retainedPercentage),
    totalValue: dec(row.totalValue),
    installments: row.installments.map((i) => ({
      ...i,
      amount: dec(i.amount)!,
      computedStatus: resolveInstallmentStatus(i.status, i.dueDate),
    })),
  };
}

@Injectable()
export class PlayerNegotiationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integration: PlayerNegotiationIntegrationService,
    private readonly financeiro: FinanceiroLancamentosService,
    private readonly s3: S3Service,
  ) {}

  private assertTenant(allowed: string[] | null, tenantId: string) {
    if (allowed !== null && !allowed.includes(tenantId)) {
      throw new BadRequestException('Sem acesso a este clube.');
    }
  }

  private parseDate(raw?: string | null): Date | null {
    if (!raw?.trim()) return null;
    const d = new Date(raw.includes('T') ? raw : `${raw.trim()}T12:00:00.000Z`);
    if (Number.isNaN(d.getTime())) throw new BadRequestException('Data inválida.');
    return d;
  }

  private assertType(raw: string) {
    if (!NEGOTIATION_TYPES.includes(raw as (typeof NEGOTIATION_TYPES)[number])) {
      throw new BadRequestException('Tipo de negociação inválido.');
    }
  }

  private assertStatus(raw: string) {
    if (!NEGOTIATION_STATUSES.includes(raw as NegotiationStatus)) {
      throw new BadRequestException('Status de negociação inválido.');
    }
  }

  async list(
    filters: {
      tenantId?: string;
      playerId?: string;
      status?: string;
      negotiationType?: string;
      counterparty?: string;
      from?: string;
      to?: string;
      activeOnly?: boolean;
    },
    allowed: string[] | null,
  ) {
    const where: Prisma.PlayerNegotiationWhereInput = {};
    if (filters.tenantId) {
      this.assertTenant(allowed, filters.tenantId);
      where.tenantId = filters.tenantId;
    } else if (allowed !== null) {
      where.tenantId = { in: allowed };
    }
    if (filters.playerId) where.playerId = filters.playerId;
    if (filters.status?.trim()) {
      this.assertStatus(filters.status.trim());
      where.status = filters.status.trim();
    } else if (filters.activeOnly) {
      where.status = { in: [...NEGOTIATION_ACTIVE_LIST_STATUSES] };
    }
    if (filters.negotiationType?.trim()) {
      this.assertType(filters.negotiationType.trim());
      where.negotiationType = filters.negotiationType.trim();
    }
    if (filters.counterparty?.trim()) {
      where.counterpartyName = { contains: filters.counterparty.trim(), mode: 'insensitive' };
    }
    const from = this.parseDate(filters.from);
    const to = this.parseDate(filters.to);
    if (from || to) {
      where.negotiatedAt = {};
      if (from) (where.negotiatedAt as Prisma.DateTimeNullableFilter).gte = from;
      if (to) (where.negotiatedAt as Prisma.DateTimeNullableFilter).lte = to;
    }

    const rows = await this.prisma.playerNegotiation.findMany({
      where,
      orderBy: [{ negotiatedAt: 'desc' }, { updatedAt: 'desc' }],
      include: includeFull,
      take: 500,
    });
    return rows.map(serializeNegotiation);
  }

  async listByPlayer(playerId: string, allowed: string[] | null) {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      select: { tenantId: true },
    });
    if (!player) throw new NotFoundException('Atleta não encontrado.');
    this.assertTenant(allowed, player.tenantId);
    return this.list({ playerId, tenantId: player.tenantId }, allowed);
  }

  async findOne(id: string, allowed: string[] | null) {
    const row = await this.prisma.playerNegotiation.findUnique({
      where: { id },
      include: includeFull,
    });
    if (!row) throw new NotFoundException('Negociação não encontrada.');
    this.assertTenant(allowed, row.tenantId);
    return serializeNegotiation(row);
  }

  async create(dto: CreatePlayerNegotiationDto, allowed: string[] | null, editor?: Editor) {
    this.assertTenant(allowed, dto.tenantId);
    this.assertType(dto.negotiationType);
    const status = dto.status?.trim() || 'in_progress';
    this.assertStatus(status);

    const player = await this.prisma.player.findFirst({
      where: { id: dto.playerId, tenantId: dto.tenantId },
      include: { tenant: { select: { name: true } } },
    });
    if (!player) throw new BadRequestException('Atleta inválido para este clube.');

    const row = await this.prisma.playerNegotiation.create({
      data: {
        tenantId: dto.tenantId,
        playerId: dto.playerId,
        negotiationType: dto.negotiationType,
        status,
        counterpartyName: cadastroUpperRequired(dto.counterpartyName),
        visitingTeamId: dto.visitingTeamId?.trim() || null,
        negotiatedPercentage: dto.negotiatedPercentage ?? null,
        retainedPercentage: dto.retainedPercentage ?? null,
        totalValue: dto.totalValue ?? null,
        currency: (dto.currency?.trim() || 'BRL').toUpperCase(),
        negotiatedAt: this.parseDate(dto.negotiatedAt) ?? new Date(),
        effectiveFrom: this.parseDate(dto.effectiveFrom),
        effectiveUntil: this.parseDate(dto.effectiveUntil),
        loanEndDate: this.parseDate(dto.loanEndDate),
        hasPurchaseOption: dto.hasPurchaseOption === true,
        purchaseOptionDeadline: this.parseDate(dto.purchaseOptionDeadline),
        purchaseOptionTerms: cadastroUpper(dto.purchaseOptionTerms),
        futureAcquisitionRights: dto.futureAcquisitionRights as Prisma.InputJsonValue,
        paymentTermsSummary: cadastroUpper(dto.paymentTermsSummary),
        clauses: cadastroUpper(dto.clauses),
        notes: cadastroUpper(dto.notes),
        responsibleUserId: dto.responsibleUserId?.trim() || null,
        responsibleName: cadastroUpper(dto.responsibleName),
        createdByUserId: editor?.sub ?? null,
        installments: dto.installments?.length
          ? {
              create: dto.installments.map((i) => ({
                sequence: i.sequence,
                amount: i.amount,
                dueDate: this.parseDate(i.dueDate)!,
                status: i.status?.trim() || 'pending',
              })),
            }
          : undefined,
      },
      include: includeFull,
    });

    await appendNegotiationAudit(this.prisma, row.id, {
      userId: editor?.sub,
      userName: editor?.name,
      action: 'created',
      details: { status, negotiationType: dto.negotiationType },
    });

    if (status === 'effective') {
      await this.applyEffectiveInternal(row.id, player.tenant?.name ?? 'Clube', editor);
    }

    return this.findOne(row.id, allowed);
  }

  async update(id: string, dto: UpdatePlayerNegotiationDto, allowed: string[] | null, editor?: Editor) {
    const existing = await this.prisma.playerNegotiation.findUnique({
      where: { id },
      include: { tenant: { select: { name: true } } },
    });
    if (!existing) throw new NotFoundException('Negociação não encontrada.');
    this.assertTenant(allowed, existing.tenantId);

    if (dto.negotiationType) this.assertType(dto.negotiationType);
    if (dto.status) this.assertStatus(dto.status);

    const prevStatus = existing.status;
    const nextStatus = dto.status?.trim() || prevStatus;

    await this.prisma.playerNegotiation.update({
      where: { id },
      data: {
        negotiationType: dto.negotiationType,
        status: dto.status !== undefined ? nextStatus : undefined,
        counterpartyName:
          dto.counterpartyName !== undefined
            ? cadastroUpperRequired(dto.counterpartyName)
            : undefined,
        visitingTeamId:
          dto.visitingTeamId !== undefined ? dto.visitingTeamId?.trim() || null : undefined,
        negotiatedPercentage:
          dto.negotiatedPercentage !== undefined ? dto.negotiatedPercentage : undefined,
        retainedPercentage:
          dto.retainedPercentage !== undefined ? dto.retainedPercentage : undefined,
        totalValue: dto.totalValue !== undefined ? dto.totalValue : undefined,
        currency: dto.currency !== undefined ? dto.currency.toUpperCase() : undefined,
        negotiatedAt:
          dto.negotiatedAt !== undefined ? this.parseDate(dto.negotiatedAt) : undefined,
        effectiveFrom:
          dto.effectiveFrom !== undefined ? this.parseDate(dto.effectiveFrom) : undefined,
        effectiveUntil:
          dto.effectiveUntil !== undefined ? this.parseDate(dto.effectiveUntil) : undefined,
        loanEndDate: dto.loanEndDate !== undefined ? this.parseDate(dto.loanEndDate) : undefined,
        hasPurchaseOption: dto.hasPurchaseOption,
        purchaseOptionDeadline:
          dto.purchaseOptionDeadline !== undefined
            ? this.parseDate(dto.purchaseOptionDeadline)
            : undefined,
        purchaseOptionTerms:
          dto.purchaseOptionTerms !== undefined
            ? cadastroUpper(dto.purchaseOptionTerms)
            : undefined,
        futureAcquisitionRights:
          dto.futureAcquisitionRights !== undefined
            ? (dto.futureAcquisitionRights as Prisma.InputJsonValue)
            : undefined,
        paymentTermsSummary:
          dto.paymentTermsSummary !== undefined
            ? cadastroUpper(dto.paymentTermsSummary)
            : undefined,
        clauses: dto.clauses !== undefined ? cadastroUpper(dto.clauses) : undefined,
        notes: dto.notes !== undefined ? cadastroUpper(dto.notes) : undefined,
        responsibleUserId:
          dto.responsibleUserId !== undefined ? dto.responsibleUserId?.trim() || null : undefined,
        responsibleName:
          dto.responsibleName !== undefined ? cadastroUpper(dto.responsibleName) : undefined,
      },
    });

    await appendNegotiationAudit(this.prisma, id, {
      userId: editor?.sub,
      userName: editor?.name,
      action: prevStatus !== nextStatus ? 'status_change' : 'updated',
      details: { fromStatus: prevStatus, toStatus: nextStatus },
    });

    if (nextStatus === 'effective' && prevStatus !== 'effective') {
      await this.applyEffectiveInternal(id, existing.tenant.name, editor);
    }

    return this.findOne(id, allowed);
  }

  async applyEffective(id: string, allowed: string[] | null, editor?: Editor) {
    const row = await this.prisma.playerNegotiation.findUnique({
      where: { id },
      include: { tenant: { select: { name: true } } },
    });
    if (!row) throw new NotFoundException('Negociação não encontrada.');
    this.assertTenant(allowed, row.tenantId);
    if (row.status === 'cancelled' || row.status === 'expired') {
      throw new BadRequestException('Negociação encerrada não pode ser efetivada.');
    }
    await this.prisma.playerNegotiation.update({
      where: { id },
      data: { status: 'effective' },
    });
    await appendNegotiationAudit(this.prisma, id, {
      userId: editor?.sub,
      userName: editor?.name,
      action: 'status_change',
      details: { toStatus: 'effective', manual: true },
    });
    await this.applyEffectiveInternal(id, row.tenant.name, editor);
    return this.findOne(id, allowed);
  }

  private async applyEffectiveInternal(
    negotiationId: string,
    tenantName: string,
    editor?: Editor,
  ) {
    const row = await this.prisma.playerNegotiation.findUnique({ where: { id: negotiationId } });
    if (!row) return;
    const sync = await this.integration.applyEffectiveSnapshots(row.playerId, tenantName, row);
    await appendNegotiationAudit(this.prisma, negotiationId, {
      userId: editor?.sub,
      userName: editor?.name,
      action: 'sync_player_snapshots',
      details: sync,
    });
  }

  async addInstallments(
    id: string,
    items: NegotiationInstallmentDto[],
    allowed: string[] | null,
    editor?: Editor,
  ) {
    await this.findOne(id, allowed);
    if (!items.length) throw new BadRequestException('Informe ao menos uma parcela.');
    for (const i of items) {
      await this.prisma.playerNegotiationInstallment.create({
        data: {
          negotiationId: id,
          sequence: i.sequence,
          amount: i.amount,
          dueDate: this.parseDate(i.dueDate)!,
          status: i.status?.trim() || 'pending',
        },
      });
    }
    await appendNegotiationAudit(this.prisma, id, {
      userId: editor?.sub,
      userName: editor?.name,
      action: 'installments_added',
      details: { count: items.length },
    });
    return this.findOne(id, allowed);
  }

  async updateInstallment(
    installmentId: string,
    patch: { status?: string; settledAt?: string | null },
    allowed: string[] | null,
    editor?: Editor,
  ) {
    const inst = await this.prisma.playerNegotiationInstallment.findUnique({
      where: { id: installmentId },
      include: { negotiation: { select: { tenantId: true } } },
    });
    if (!inst) throw new NotFoundException('Parcela não encontrada.');
    this.assertTenant(allowed, inst.negotiation.tenantId);

    if (patch.status && !INSTALLMENT_STATUSES.includes(patch.status as InstallmentStatus)) {
      throw new BadRequestException('Status de parcela inválido.');
    }

    let settledAt: Date | null | undefined = undefined;
    if (patch.settledAt !== undefined) {
      settledAt = patch.settledAt ? this.parseDate(patch.settledAt) : null;
    } else if (patch.status === 'paid') {
      settledAt = new Date();
    }

    await this.prisma.playerNegotiationInstallment.update({
      where: { id: installmentId },
      data: {
        status: patch.status,
        settledAt,
      },
    });

    if (inst.financeiroLancamentoId && patch.status === 'paid') {
      await this.prisma.financeiroLancamento.update({
        where: { id: inst.financeiroLancamentoId },
        data: { status: 'pago', settledAt: settledAt ?? new Date() },
      });
    }

    await appendNegotiationAudit(this.prisma, inst.negotiationId, {
      userId: editor?.sub,
      userName: editor?.name,
      action: 'installment_updated',
      details: { installmentId, ...patch },
    });

    return this.findOne(inst.negotiationId, allowed);
  }

  async createFinanceiroForInstallment(
    installmentId: string,
    dto: CreateInstallmentFinanceiroDto,
    allowed: string[] | null,
    editor?: Editor,
  ) {
    const inst = await this.prisma.playerNegotiationInstallment.findUnique({
      where: { id: installmentId },
      include: {
        negotiation: {
          include: {
            player: { select: { name: true } },
            tenant: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!inst) throw new NotFoundException('Parcela não encontrada.');
    this.assertTenant(allowed, inst.negotiation.tenantId);
    if (inst.financeiroLancamentoId) {
      throw new BadRequestException('Parcela já vinculada a um lançamento financeiro.');
    }

    const amount = dec(inst.amount)!;
    const desc = `Negociação atleta ${inst.negotiation.player.name} — parcela ${inst.sequence}`;
    const lanc = await this.financeiro.create({
      tenantId: inst.negotiation.tenantId,
      tipo: dto.tipo,
      descricao: desc,
      valor: amount,
      dueDate: inst.dueDate.toISOString(),
      contraparte: dto.contraparte ?? inst.negotiation.counterpartyName,
      supplierId: dto.supplierId,
      customerId: dto.customerId,
      categoria: 'NEGOCIACAO_ATLETA',
      referencia: `player-negotiation:${inst.negotiationId}:${inst.sequence}`,
    });

    await this.prisma.playerNegotiationInstallment.update({
      where: { id: installmentId },
      data: { financeiroLancamentoId: lanc.id },
    });

    await appendNegotiationAudit(this.prisma, inst.negotiationId, {
      userId: editor?.sub,
      userName: editor?.name,
      action: 'financeiro_linked',
      details: { installmentId, financeiroLancamentoId: lanc.id },
    });

    return this.findOne(inst.negotiationId, allowed);
  }

  async addDocument(
    id: string,
    dto: AddNegotiationDocumentDto,
    allowed: string[] | null,
    editor?: Editor,
  ) {
    await this.findOne(id, allowed);
    await this.prisma.playerNegotiationDocument.create({
      data: {
        negotiationId: id,
        name: cadastroUpperRequired(dto.name),
        fileUrl: dto.fileUrl.trim(),
        fileKey: dto.fileKey?.trim() || null,
        legalDocumentId: dto.legalDocumentId?.trim() || null,
        uploadedByUserId: editor?.sub ?? null,
      },
    });
    await appendNegotiationAudit(this.prisma, id, {
      userId: editor?.sub,
      userName: editor?.name,
      action: 'document_added',
      details: { name: dto.name },
    });
    return this.findOne(id, allowed);
  }

  async uploadDocumentFile(
    id: string,
    playerId: string,
    file: { buffer: Buffer; originalname: string; mimetype?: string },
    name: string,
    allowed: string[] | null,
    editor?: Editor,
  ) {
    const neg = await this.prisma.playerNegotiation.findUnique({ where: { id } });
    if (!neg || neg.playerId !== playerId) {
      throw new BadRequestException('Negociação inválida para o atleta.');
    }
    this.assertTenant(allowed, neg.tenantId);
    const uploaded = await this.s3.uploadPlayerRegistrationDocument(
      file.buffer,
      playerId,
      file.originalname || 'documento.pdf',
      file.mimetype,
    );
    return this.addDocument(
      id,
      { name: name.trim() || file.originalname, fileUrl: uploaded.url, fileKey: uploaded.key },
      allowed,
      editor,
    );
  }

  async summary(
    filters: {
      tenantId: string;
      from?: string;
      to?: string;
      negotiationType?: string;
      status?: string;
      counterparty?: string;
    },
    allowed: string[] | null,
  ) {
    this.assertTenant(allowed, filters.tenantId);
    const negotiations = await this.list(
      {
        tenantId: filters.tenantId,
        from: filters.from,
        to: filters.to,
        negotiationType: filters.negotiationType,
        status: filters.status,
        counterparty: filters.counterparty,
      },
      allowed,
    );

    let totalNegotiatedValue = 0;
    let totalInstallments = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let totalOverdue = 0;
    let upcomingCount = 0;
    const byType: Record<string, { count: number; value: number }> = {};
    const byStatus: Record<string, { count: number; value: number }> = {};
    const byClub: Record<string, { count: number; value: number }> = {};
    let pctNegotiatedSum = 0;
    let pctRetainedSum = 0;
    let pctCount = 0;

    const in30 = new Date();
    in30.setUTCDate(in30.getUTCDate() + 30);

    for (const n of negotiations) {
      const val = n.totalValue ?? 0;
      totalNegotiatedValue += val;
      byType[n.negotiationType] = byType[n.negotiationType] ?? { count: 0, value: 0 };
      byType[n.negotiationType].count += 1;
      byType[n.negotiationType].value += val;
      byStatus[n.status] = byStatus[n.status] ?? { count: 0, value: 0 };
      byStatus[n.status].count += 1;
      byStatus[n.status].value += val;
      const club = n.counterpartyName;
      byClub[club] = byClub[club] ?? { count: 0, value: 0 };
      byClub[club].count += 1;
      byClub[club].value += val;

      if (n.negotiatedPercentage != null) {
        pctNegotiatedSum += n.negotiatedPercentage;
        pctCount += 1;
      }
      if (n.retainedPercentage != null) pctRetainedSum += n.retainedPercentage;

      for (const i of n.installments) {
        totalInstallments += 1;
        const st = i.computedStatus;
        if (st === 'paid') totalPaid += i.amount;
        else if (st === 'overdue') totalOverdue += i.amount;
        else if (st === 'pending') {
          totalPending += i.amount;
          if (new Date(i.dueDate) <= in30) upcomingCount += 1;
        }
      }
    }

    return {
      negotiationCount: negotiations.length,
      totalNegotiatedValue,
      averageNegotiatedPercentage: pctCount ? pctNegotiatedSum / pctCount : null,
      averageRetainedPercentage: pctCount ? pctRetainedSum / pctCount : null,
      byType,
      byStatus,
      byClub,
      installments: {
        total: totalInstallments,
        paidAmount: totalPaid,
        pendingAmount: totalPending,
        overdueAmount: totalOverdue,
        upcomingDueCount: upcomingCount,
      },
      rows: negotiations,
    };
  }

  exportCsv(
    filters: Parameters<PlayerNegotiationsService['summary']>[0],
    allowed: string[] | null,
  ): Promise<string> {
    return this.summary(filters, allowed).then((s) => {
      const header =
        'Atleta;Tipo;Status;Contraparte;Valor;Moeda;Pct negociada;Pct retida;Data negociação';
      const lines = s.rows.map((n) =>
        [
          n.player.name,
          n.negotiationType,
          n.status,
          n.counterpartyName,
          n.totalValue ?? '',
          n.currency,
          n.negotiatedPercentage ?? '',
          n.retainedPercentage ?? '',
          n.negotiatedAt ? new Date(n.negotiatedAt).toISOString().slice(0, 10) : '',
        ].join(';'),
      );
      return `\uFEFF${header}\n${lines.join('\n')}`;
    });
  }
}
