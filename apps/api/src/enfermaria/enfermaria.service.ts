import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StockMovementsService } from '../compras/stock-movements.service';
import {
  NURSING_DEFAULT_DIAGNOSES,
  NURSING_DEFAULT_TREATMENTS,
} from './nursing-catalog.data';
import {
  CreateNursingDiagnosisDto,
  CreateNursingSessionDto,
  CreateNursingTreatmentDto,
  NursingSessionDiagnosisItemDto,
  NursingSessionTreatmentItemDto,
  UpdateNursingSessionDto,
} from './dto/enfermaria.dto';
import { getPlayerListDisplayName } from '../common/player-list-display-name.util';

const sessionInclude = {
  sessionDiagnoses: {
    orderBy: { sortOrder: 'asc' as const },
    include: { diagnosis: true },
  },
  sessionTreatments: {
    orderBy: { sortOrder: 'asc' as const },
    include: { treatment: true, product: { select: { id: true, name: true, sku: true, unit: true } } },
  },
  player: {
    select: {
      id: true,
      name: true,
      category: true,
      photoUrl: true,
      tenantId: true,
      jerseyNumber: true,
    },
  },
  tenant: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.NursingSessionInclude;

@Injectable()
export class EnfermariaService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stockMovements: StockMovementsService,
  ) {}

  async onModuleInit() {
    try {
      await this.ensureCatalog();
    } catch (e) {
      console.warn('[enfermaria] ensureCatalog falhou (migration pendente?)', e);
    }
  }

  async ensureCatalog() {
    for (const name of NURSING_DEFAULT_DIAGNOSES) {
      await this.prisma.nursingDiagnosis.upsert({
        where: { name },
        create: { name, isSystem: true, active: true },
        update: { active: true },
      });
    }
    const count = await this.prisma.nursingTreatment.count();
    if (count === 0) {
      for (const t of NURSING_DEFAULT_TREATMENTS) {
        await this.prisma.nursingTreatment.create({
          data: {
            name: t.name,
            kind: t.kind,
            defaultUnit: t.defaultUnit ?? null,
            isSystem: true,
            active: true,
          },
        });
      }
    }
  }

  private assertTenant(allowed: string[] | null, tenantId: string) {
    if (allowed !== null && !allowed.includes(tenantId)) {
      throw new BadRequestException('Sem acesso a este clube.');
    }
  }

  listDiagnoses() {
    return this.ensureCatalog().then(() =>
      this.prisma.nursingDiagnosis.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
      }),
    );
  }

  async createDiagnosis(dto: CreateNursingDiagnosisDto, userId?: string) {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Nome do diagnóstico é obrigatório.');
    try {
      return await this.prisma.nursingDiagnosis.create({
        data: { name, isSystem: false, active: true, createdByUserId: userId ?? null },
      });
    } catch {
      throw new BadRequestException('Diagnóstico já cadastrado.');
    }
  }

  listTreatments() {
    return this.ensureCatalog().then(() =>
      this.prisma.nursingTreatment.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
        include: {
          product: { select: { id: true, name: true, sku: true, unit: true, currentStock: true } },
        },
      }),
    );
  }

  async createTreatment(dto: CreateNursingTreatmentDto, userId?: string) {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Nome do tratamento é obrigatório.');
    if (dto.productId) {
      const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
      if (!product) throw new BadRequestException('Produto de estoque inválido.');
    }
    return this.prisma.nursingTreatment.create({
      data: {
        name,
        kind: dto.kind ?? 'medicamento',
        productId: dto.productId ?? null,
        defaultUnit: dto.defaultUnit?.trim() || null,
        isSystem: false,
        active: true,
        createdByUserId: userId ?? null,
      },
      include: {
        product: { select: { id: true, name: true, sku: true, unit: true, currentStock: true } },
      },
    });
  }

  async listProducts(tenantId: string, search?: string, allowed: string[] | null = null) {
    this.assertTenant(allowed, tenantId);
    const where: Prisma.ProductWhereInput = { tenantId };
    if (search?.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { sku: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }
    return this.prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
      take: 100,
      select: {
        id: true,
        name: true,
        sku: true,
        unit: true,
        currentStock: true,
        inventoryKind: true,
      },
    });
  }

  async listSessions(
    filters: { tenantId?: string; playerId?: string; status?: string; from?: string; to?: string },
    allowed: string[] | null,
  ) {
    const where: Prisma.NursingSessionWhereInput = {};
    if (filters.tenantId) {
      this.assertTenant(allowed, filters.tenantId);
      where.tenantId = filters.tenantId;
    } else if (allowed !== null) {
      where.tenantId = { in: allowed };
    }
    if (filters.playerId) where.playerId = filters.playerId;
    if (filters.status && filters.status !== 'all') where.status = filters.status;
    if (filters.from || filters.to) {
      where.attendedAt = {};
      if (filters.from) where.attendedAt.gte = new Date(`${filters.from}T00:00:00`);
      if (filters.to) where.attendedAt.lte = new Date(`${filters.to}T23:59:59`);
    }
    return this.prisma.nursingSession.findMany({
      where,
      orderBy: [{ status: 'asc' }, { attendedAt: 'desc' }],
      include: sessionInclude,
      take: 500,
    });
  }

  async findSession(id: string, allowed: string[] | null) {
    const row = await this.prisma.nursingSession.findUnique({
      where: { id },
      include: sessionInclude,
    });
    if (!row) throw new NotFoundException('Atendimento não encontrado.');
    this.assertTenant(allowed, row.tenantId);
    return row;
  }

  private async resolveDiagnosisItems(items: NursingSessionDiagnosisItemDto[]) {
    const resolved: Array<{ diagnosisId: string | null; diagnosisLabel: string }> = [];
    for (const item of items) {
      let label = item.diagnosisLabel?.trim() || null;
      let id = item.diagnosisId ?? null;
      if (id) {
        const d = await this.prisma.nursingDiagnosis.findUnique({ where: { id } });
        if (!d) throw new BadRequestException('Diagnóstico inválido.');
        label = d.name;
      } else if (label) {
        const existing = await this.prisma.nursingDiagnosis.findUnique({ where: { name: label } });
        if (existing) id = existing.id;
      }
      if (!label) continue;
      resolved.push({ diagnosisId: id, diagnosisLabel: label });
    }
    return resolved;
  }

  private async resolveTreatmentItems(items: NursingSessionTreatmentItemDto[]) {
    const resolved: Array<{
      treatmentId: string | null;
      treatmentLabel: string;
      productId: string | null;
      quantityUsed: number | null;
      deductStock: boolean;
      notes: string | null;
    }> = [];
    for (const item of items) {
      let label = item.treatmentLabel?.trim() || null;
      let treatmentId = item.treatmentId ?? null;
      let productId = item.productId ?? null;
      if (treatmentId) {
        const t = await this.prisma.nursingTreatment.findUnique({ where: { id: treatmentId } });
        if (!t) throw new BadRequestException('Tratamento inválido.');
        label = t.name;
        if (!productId && t.productId) productId = t.productId;
      }
      if (!label) continue;
      resolved.push({
        treatmentId,
        treatmentLabel: label,
        productId,
        quantityUsed: item.quantityUsed ?? null,
        deductStock: item.deductStock !== false,
        notes: item.notes?.trim() || null,
      });
    }
    return resolved;
  }

  private async applyStockDeductions(
    sessionId: string,
    tenantId: string,
    playerName: string,
    treatments: Array<{ id: string; productId: string | null; quantityUsed: number | null; deductStock: boolean; treatmentLabel: string }>,
  ) {
    for (const row of treatments) {
      if (!row.deductStock || !row.productId || !row.quantityUsed || row.quantityUsed <= 0) continue;
      const product = await this.prisma.product.findUnique({ where: { id: row.productId } });
      if (!product || product.tenantId !== tenantId) {
        throw new BadRequestException(`Produto inválido para baixa: ${row.treatmentLabel}`);
      }
      const qty = -Math.ceil(row.quantityUsed);
      const movement = await this.stockMovements.create({
        productId: row.productId,
        quantity: qty,
        type: 'adjustment',
        referenceType: 'nursing_session',
        referenceId: sessionId,
        notes: `Enfermaria — ${playerName} — ${row.treatmentLabel}`,
      });
      await this.prisma.nursingSessionTreatment.update({
        where: { id: row.id },
        data: { stockMovementId: movement.id },
      });
    }
  }

  async createSession(dto: CreateNursingSessionDto, allowed: string[] | null, userId?: string) {
    this.assertTenant(allowed, dto.tenantId);
    const player = await this.prisma.player.findUnique({ where: { id: dto.playerId } });
    if (!player || player.tenantId !== dto.tenantId) {
      throw new BadRequestException('Atleta inválido para este clube.');
    }
    const attendedAt = dto.attendedAt ? new Date(dto.attendedAt) : new Date();
    const diagnoses = await this.resolveDiagnosisItems(dto.diagnoses ?? []);
    const treatments = await this.resolveTreatmentItems(dto.treatments ?? []);

    let nurseName = dto.nurseName?.trim() || null;
    if (dto.nurseStaffId) {
      const nurse = await this.prisma.medicalStaff.findUnique({ where: { id: dto.nurseStaffId } });
      if (nurse) nurseName = nurse.name;
    }

    const session = await this.prisma.nursingSession.create({
      data: {
        tenantId: dto.tenantId,
        playerId: dto.playerId,
        category: dto.category ?? player.category,
        attendedAt,
        symptoms: dto.symptoms?.trim() || null,
        nurseStaffId: dto.nurseStaffId ?? null,
        nurseName,
        estimatedDays: dto.estimatedDays ?? null,
        estimatedEndDate: dto.estimatedEndDate ? new Date(dto.estimatedEndDate) : null,
        treatmentNotes: dto.treatmentNotes?.trim() || null,
        attachments: dto.attachments ? (dto.attachments as unknown as Prisma.InputJsonValue) : undefined,
        createdByUserId: userId ?? null,
        sessionDiagnoses: {
          create: diagnoses.map((d, i) => ({
            diagnosisId: d.diagnosisId,
            diagnosisLabel: d.diagnosisLabel,
            sortOrder: i,
          })),
        },
        sessionTreatments: {
          create: treatments.map((t, i) => ({
            treatmentId: t.treatmentId,
            treatmentLabel: t.treatmentLabel,
            productId: t.productId,
            quantityUsed: t.quantityUsed,
            deductStock: t.deductStock,
            notes: t.notes,
            sortOrder: i,
          })),
        },
      },
      include: sessionInclude,
    });

    await this.applyStockDeductions(
      session.id,
      dto.tenantId,
      getPlayerListDisplayName(player),
      session.sessionTreatments.map((t) => ({
        id: t.id,
        productId: t.productId,
        quantityUsed: t.quantityUsed,
        deductStock: t.deductStock,
        treatmentLabel: t.treatmentLabel ?? 'Medicamento',
      })),
    );

    return this.findSession(session.id, allowed);
  }

  async updateSession(id: string, dto: UpdateNursingSessionDto, allowed: string[] | null) {
    const existing = await this.findSession(id, allowed);
    const attendedAt = dto.attendedAt ? new Date(dto.attendedAt) : existing.attendedAt;

    let nurseName = dto.nurseName?.trim() ?? existing.nurseName;
    const nurseStaffId = dto.nurseStaffId ?? existing.nurseStaffId;
    if (dto.nurseStaffId) {
      const nurse = await this.prisma.medicalStaff.findUnique({ where: { id: dto.nurseStaffId } });
      if (nurse) nurseName = nurse.name;
    }

    await this.prisma.nursingSessionDiagnosis.deleteMany({ where: { sessionId: id } });
    await this.prisma.nursingSessionTreatment.deleteMany({ where: { sessionId: id } });

    const diagnoses = await this.resolveDiagnosisItems(dto.diagnoses ?? []);
    const treatments = await this.resolveTreatmentItems(dto.treatments ?? []);

    const player = await this.prisma.player.findUnique({ where: { id: dto.playerId ?? existing.playerId } });

    await this.prisma.nursingSession.update({
      where: { id },
      data: {
        category: dto.category ?? existing.category,
        attendedAt,
        symptoms: dto.symptoms?.trim() ?? existing.symptoms,
        nurseStaffId,
        nurseName,
        estimatedDays: dto.estimatedDays ?? existing.estimatedDays,
        estimatedEndDate: dto.estimatedEndDate
          ? new Date(dto.estimatedEndDate)
          : existing.estimatedEndDate,
        treatmentNotes: dto.treatmentNotes?.trim() ?? existing.treatmentNotes,
        attachments: dto.attachments
          ? (dto.attachments as unknown as Prisma.InputJsonValue)
          : existing.attachments ?? undefined,
        status: dto.status ?? existing.status,
        endedAt: dto.status === 'completed' ? new Date() : existing.endedAt,
        sessionDiagnoses: {
          create: diagnoses.map((d, i) => ({
            diagnosisId: d.diagnosisId,
            diagnosisLabel: d.diagnosisLabel,
            sortOrder: i,
          })),
        },
        sessionTreatments: {
          create: treatments.map((t, i) => ({
            treatmentId: t.treatmentId,
            treatmentLabel: t.treatmentLabel,
            productId: t.productId,
            quantityUsed: t.quantityUsed,
            deductStock: t.deductStock,
            notes: t.notes,
            sortOrder: i,
          })),
        },
      },
    });

    const updated = await this.findSession(id, allowed);
    if (player) {
      await this.applyStockDeductions(
        id,
        existing.tenantId,
        getPlayerListDisplayName(player),
        updated.sessionTreatments
          .filter((t) => !t.stockMovementId)
          .map((t) => ({
            id: t.id,
            productId: t.productId,
            quantityUsed: t.quantityUsed,
            deductStock: t.deductStock,
            treatmentLabel: t.treatmentLabel ?? 'Medicamento',
          })),
      );
    }
    return this.findSession(id, allowed);
  }

  async completeSession(id: string, allowed: string[] | null) {
    await this.findSession(id, allowed);
    return this.prisma.nursingSession.update({
      where: { id },
      data: { status: 'completed', endedAt: new Date() },
      include: sessionInclude,
    });
  }

  async deleteSession(id: string, allowed: string[] | null) {
    await this.findSession(id, allowed);
    await this.prisma.nursingSession.delete({ where: { id } });
    return { ok: true };
  }
}
