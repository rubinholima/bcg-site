import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { applyRhTenantFilter, assertRhTenantAccess } from './rh-scope.util';
import { deriveTimeBankBalanceHours } from './time-bank.util';
import type { RhActor } from './rh-request.util';

@Injectable()
export class TimeRhService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  async listWorkRegimes(tenantId: string | undefined, allowed: string[] | null) {
    const where: Prisma.RhWorkRegimeWhereInput = {};
    applyRhTenantFilter(where, allowed, tenantId);
    return this.prisma.rhWorkRegime.findMany({ where, orderBy: { name: 'asc' } });
  }

  async upsertWorkRegime(
    dto: {
      id?: string;
      tenantId: string;
      code: string;
      name: string;
      description?: string;
      config?: object;
      active?: boolean;
    },
    allowed: string[] | null,
  ) {
    assertRhTenantAccess(allowed, dto.tenantId);
    if (dto.id) {
      const existing = await this.prisma.rhWorkRegime.findUnique({ where: { id: dto.id } });
      if (!existing) throw new NotFoundException('Jornada não encontrada.');
      assertRhTenantAccess(allowed, existing.tenantId);
      return this.prisma.rhWorkRegime.update({
        where: { id: dto.id },
        data: {
          code: dto.code.trim(),
          name: dto.name.trim(),
          description: dto.description ?? null,
          config: (dto.config ?? existing.config) as Prisma.InputJsonValue,
          active: dto.active ?? existing.active,
        },
      });
    }
    return this.prisma.rhWorkRegime.create({
      data: {
        tenantId: dto.tenantId,
        code: dto.code.trim(),
        name: dto.name.trim(),
        description: dto.description ?? null,
        config: dto.config ?? {},
        active: dto.active ?? true,
      },
    });
  }

  async assignWorkRegime(
    dto: {
      employmentId: string;
      workRegimeId: string;
      effectiveFrom: string;
      effectiveTo?: string | null;
    },
    allowed: string[] | null,
  ) {
    const employment = await this.prisma.employment.findUnique({ where: { id: dto.employmentId } });
    if (!employment) throw new NotFoundException('Vínculo não encontrado.');
    assertRhTenantAccess(allowed, employment.tenantId);
    return this.prisma.rhEmploymentWorkRegime.create({
      data: {
        tenantId: employment.tenantId,
        employmentId: dto.employmentId,
        workRegimeId: dto.workRegimeId,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
      },
    });
  }

  async listOccurrences(filters: { tenantId?: string; employmentId?: string }, allowed: string[] | null) {
    const where: Prisma.RhTimeOccurrenceWhereInput = {};
    applyRhTenantFilter(where, allowed, filters.tenantId);
    if (filters.employmentId) where.employmentId = filters.employmentId;
    return this.prisma.rhTimeOccurrence.findMany({
      where,
      orderBy: { occurrenceDate: 'desc' },
      take: 200,
    });
  }

  async createOccurrence(
    dto: {
      employmentId: string;
      occurrenceType: string;
      occurrenceDate: string;
      hours?: number;
      days?: number;
      reason?: string;
      notes?: string;
      treatment?: string;
    },
    allowed: string[] | null,
    actor: RhActor,
  ) {
    const employment = await this.prisma.employment.findUnique({ where: { id: dto.employmentId } });
    if (!employment) throw new NotFoundException('Vínculo não encontrado.');
    assertRhTenantAccess(allowed, employment.tenantId);
    if (dto.treatment?.includes('BANCO') && dto.hours) {
      const existing = await this.prisma.rhTimeOccurrence.findFirst({
        where: {
          employmentId: dto.employmentId,
          occurrenceDate: new Date(dto.occurrenceDate),
          occurrenceType: dto.occurrenceType,
          processedAt: { not: null },
        },
      });
      if (existing) throw new BadRequestException('Ocorrência já processada.');
    }
    const occurrence = await this.prisma.rhTimeOccurrence.create({
      data: {
        tenantId: employment.tenantId,
        employmentId: dto.employmentId,
        occurrenceType: dto.occurrenceType.trim(),
        occurrenceDate: new Date(dto.occurrenceDate),
        hours: dto.hours != null ? new Prisma.Decimal(dto.hours) : null,
        days: dto.days != null ? new Prisma.Decimal(dto.days) : null,
        reason: dto.reason ?? null,
        notes: dto.notes ?? null,
        treatment: dto.treatment ?? null,
        createdByUserId: actor.userId,
        createdByName: actor.name,
      },
    });
    if (dto.treatment === 'ABATER_BANCO_HORAS' && dto.hours) {
      const movement = await this.prisma.rhTimeBankMovement.create({
        data: {
          tenantId: employment.tenantId,
          employmentId: dto.employmentId,
          movementType: 'DEBIT',
          movementDate: new Date(dto.occurrenceDate),
          hours: new Prisma.Decimal(dto.hours),
          origin: dto.occurrenceType,
          reason: dto.reason ?? 'Débito por ausência',
          timeOccurrenceId: occurrence.id,
          createdByUserId: actor.userId,
          createdByName: actor.name,
          approvedAt: new Date(),
        },
      });
      await this.prisma.rhTimeOccurrence.update({
        where: { id: occurrence.id },
        data: { processedAt: new Date(), timeBankMovementId: movement.id },
      });
    }
  return occurrence;
  }

  async getTimeBankBalance(employmentId: string, allowed: string[] | null) {
    const employment = await this.prisma.employment.findUnique({ where: { id: employmentId } });
    if (!employment) throw new NotFoundException('Vínculo não encontrado.');
    assertRhTenantAccess(allowed, employment.tenantId);
    const movements = await this.prisma.rhTimeBankMovement.findMany({
      where: { employmentId },
      orderBy: { movementDate: 'asc' },
    });
    return {
      employmentId,
      balanceHours: deriveTimeBankBalanceHours(movements),
      movements,
    };
  }

  async uploadTimeClockBatch(
    dto: {
      tenantId: string;
      referenceMonth: string;
      fileName: string;
      notes?: string;
      buffer: Buffer;
    },
    allowed: string[] | null,
    actor: RhActor,
  ) {
    assertRhTenantAccess(allowed, dto.tenantId);
    const upload = await this.s3.uploadRhTimeClockPdf(dto.buffer, dto.tenantId, dto.fileName);
    return this.prisma.rhTimeClockBatch.create({
      data: {
        tenantId: dto.tenantId,
        referenceMonth: new Date(dto.referenceMonth),
        fileKey: upload.key,
        fileName: dto.fileName,
        uploadedByUserId: actor.userId,
        uploadedByName: actor.name,
        notes: dto.notes ?? null,
      },
    });
  }

  async updateOccurrence(
    id: string,
    dto: Partial<{
      occurrenceType: string;
      occurrenceDate: string;
      hours: number;
      days: number;
      reason: string;
      notes: string;
      treatment: string;
    }>,
    allowed: string[] | null,
  ) {
    const row = await this.prisma.rhTimeOccurrence.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Ocorrência não encontrada.');
    assertRhTenantAccess(allowed, row.tenantId);
    return this.prisma.rhTimeOccurrence.update({
      where: { id },
      data: {
        occurrenceType: dto.occurrenceType?.trim() ?? row.occurrenceType,
        occurrenceDate: dto.occurrenceDate ? new Date(dto.occurrenceDate) : row.occurrenceDate,
        hours: dto.hours != null ? new Prisma.Decimal(dto.hours) : row.hours,
        days: dto.days != null ? new Prisma.Decimal(dto.days) : row.days,
        reason: dto.reason !== undefined ? dto.reason : row.reason,
        notes: dto.notes !== undefined ? dto.notes : row.notes,
        treatment: dto.treatment !== undefined ? dto.treatment : row.treatment,
      },
    });
  }

  async deleteOccurrence(id: string, allowed: string[] | null) {
    const row = await this.prisma.rhTimeOccurrence.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Ocorrência não encontrada.');
    assertRhTenantAccess(allowed, row.tenantId);
    await this.prisma.rhTimeOccurrence.delete({ where: { id } });
    return { ok: true };
  }

  async createTimeBankMovement(
    dto: {
      employmentId: string;
      movementType: 'CREDIT' | 'DEBIT';
      movementDate: string;
      hours: number;
      reason?: string;
      origin?: string;
    },
    allowed: string[] | null,
    actor: RhActor,
  ) {
    const employment = await this.prisma.employment.findUnique({ where: { id: dto.employmentId } });
    if (!employment) throw new NotFoundException('Vínculo não encontrado.');
    assertRhTenantAccess(allowed, employment.tenantId);
    return this.prisma.rhTimeBankMovement.create({
      data: {
        tenantId: employment.tenantId,
        employmentId: dto.employmentId,
        movementType: dto.movementType,
        movementDate: new Date(dto.movementDate),
        hours: new Prisma.Decimal(dto.hours),
        origin: dto.origin ?? 'ajuste_manual',
        reason: dto.reason ?? null,
        createdByUserId: actor.userId,
        createdByName: actor.name,
        approvedAt: new Date(),
      },
    });
  }

  async linkClockBatchEmployees(
    batchId: string,
    links: Array<{ employmentId?: string; employeeId?: string; notes?: string }>,
    allowed: string[] | null,
  ) {
    const batch = await this.prisma.rhTimeClockBatch.findUnique({ where: { id: batchId } });
    if (!batch) throw new NotFoundException('Lote não encontrado.');
    assertRhTenantAccess(allowed, batch.tenantId);
    await this.prisma.$transaction(async (tx) => {
      await tx.rhTimeClockBatchEmployee.deleteMany({ where: { batchId } });
      for (const link of links) {
        await tx.rhTimeClockBatchEmployee.create({
          data: {
            tenantId: batch.tenantId,
            batchId,
            employmentId: link.employmentId ?? null,
            employeeId: link.employeeId ?? null,
            notes: link.notes ?? null,
          },
        });
      }
    });
    return this.prisma.rhTimeClockBatch.findUnique({
      where: { id: batchId },
      include: { employees: true },
    });
  }

  async listTimeClockBatches(tenantId: string | undefined, allowed: string[] | null) {
    const where: Prisma.RhTimeClockBatchWhereInput = {};
    applyRhTenantFilter(where, allowed, tenantId);
    return this.prisma.rhTimeClockBatch.findMany({
      where,
      orderBy: { referenceMonth: 'desc' },
      include: { employees: true },
    });
  }
}
