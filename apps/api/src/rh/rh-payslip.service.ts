import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { RhAuditService } from './rh-audit.service';
import { RhNotificationService } from './rh-notification.service';
import type { RhActor } from './rh-request.util';
import { applyRhTenantFilter, assertRhTenantAccess } from './rh-scope.util';
import { hasRhCapability } from './rh-access.util';

const PAYSLIP_STATUSES = [
  'PENDENTE_DE_SEPARACAO',
  'SEPARADO',
  'EM_CONFERENCIA',
  'APROVADO',
  'DISPONIBILIZADO',
  'CIENCIA_PENDENTE',
  'CIENCIA_REALIZADA',
  'CORRECAO_NECESSARIA',
] as const;

@Injectable()
export class RhPayslipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly audit: RhAuditService,
    private readonly notifications: RhNotificationService,
  ) {}

  async listBatches(tenantId: string | undefined, allowed: string[] | null) {
    const where: Prisma.RhPayslipBatchWhereInput = {};
    applyRhTenantFilter(where, allowed, tenantId);
    return this.prisma.rhPayslipBatch.findMany({
      where,
      orderBy: { referenceMonth: 'desc' },
      include: { _count: { select: { individuals: true, pageAssignments: true } } },
    });
  }

  async uploadBatch(
    dto: { tenantId: string; referenceMonth: string; notes?: string; fileName: string; buffer: Buffer },
    allowed: string[] | null,
    actor: RhActor,
  ) {
    assertRhTenantAccess(allowed, dto.tenantId);
    const pdf = await PDFDocument.load(dto.buffer);
    const pageCount = pdf.getPageCount();
    const upload = await this.s3.uploadRhPayslipBulkPdf(dto.buffer, dto.tenantId, dto.fileName);
    const batch = await this.prisma.rhPayslipBatch.create({
      data: {
        tenantId: dto.tenantId,
        referenceMonth: new Date(dto.referenceMonth),
        bulkFileKey: upload.key,
        bulkFileName: dto.fileName,
        pageCount,
        status: 'PENDENTE_DE_SEPARACAO',
        uploadedByUserId: actor.userId,
        uploadedByName: actor.name,
        notes: dto.notes ?? null,
      },
    });
    await this.audit.log({
      tenantId: dto.tenantId,
      entityType: 'rh_payslip_batch',
      entityId: batch.id,
      action: 'uploaded',
      actorUserId: actor.userId,
      actorName: actor.name,
    });
    await this.notifications.notifyRhEvent({
      tenantId: dto.tenantId,
      title: 'Contracheques — novo lote',
      message: 'PDF de contracheques enviado. Separe as páginas por colaborador.',
      type: 'info',
    });
    return batch;
  }

  async assignPages(
    batchId: string,
    assignments: Array<{
      employeeId: string;
      employmentId?: string;
      pageFrom: number;
      pageTo: number;
    }>,
    allowed: string[] | null,
    actor: RhActor,
  ) {
    const batch = await this.prisma.rhPayslipBatch.findUnique({ where: { id: batchId } });
    if (!batch) throw new NotFoundException('Lote não encontrado.');
    assertRhTenantAccess(allowed, batch.tenantId);
    if (batch.pageCount) {
      for (const a of assignments) {
        if (a.pageFrom < 1 || a.pageTo > batch.pageCount || a.pageFrom > a.pageTo) {
          throw new BadRequestException('Intervalo de páginas inválido.');
        }
      }
    }
    const created = await this.prisma.$transaction(async (tx) => {
      const rows: Awaited<ReturnType<typeof tx.rhPayslipPageAssignment.create>>[] = [];
      for (const a of assignments) {
        rows.push(
          await tx.rhPayslipPageAssignment.create({
            data: {
              tenantId: batch.tenantId,
              batchId,
              employeeId: a.employeeId,
              employmentId: a.employmentId ?? null,
              pageFrom: a.pageFrom,
              pageTo: a.pageTo,
            },
          }),
        );
      }
      return rows;
    });
    await this.prisma.rhPayslipBatch.update({
      where: { id: batchId },
      data: { status: 'SEPARADO' },
    });
    await this.audit.log({
      tenantId: batch.tenantId,
      entityType: 'rh_payslip_batch',
      entityId: batchId,
      action: 'page_assignment',
      actorUserId: actor.userId,
      actorName: actor.name,
      metadata: { count: created.length },
    });
    return created;
  }

  async extractIndividuals(batchId: string, allowed: string[] | null, actor: RhActor) {
    const batch = await this.prisma.rhPayslipBatch.findUnique({
      where: { id: batchId },
      include: { pageAssignments: true },
    });
    if (!batch) throw new NotFoundException('Lote não encontrado.');
    assertRhTenantAccess(allowed, batch.tenantId);
    const bulkBytes = await this.s3.getObjectBuffer(batch.bulkFileKey);
    const source = await PDFDocument.load(bulkBytes);
    const results: Awaited<ReturnType<typeof this.prisma.rhPayslipIndividual.create>>[] = [];
    for (const assignment of batch.pageAssignments) {
      const dest = await PDFDocument.create();
      const pages = await dest.copyPages(
        source,
        Array.from({ length: assignment.pageTo - assignment.pageFrom + 1 }, (_, i) => assignment.pageFrom - 1 + i),
      );
      pages.forEach((p) => dest.addPage(p));
      const bytes = await dest.save();
      const upload = await this.s3.uploadRhPayslipIndividualPdf(
        Buffer.from(bytes),
        batch.tenantId,
        `${assignment.employeeId}-${batch.referenceMonth.toISOString().slice(0, 7)}.pdf`,
      );
      const individual = await this.prisma.rhPayslipIndividual.create({
        data: {
          tenantId: batch.tenantId,
          batchId,
          assignmentId: assignment.id,
          employeeId: assignment.employeeId,
          employmentId: assignment.employmentId,
          referenceMonth: batch.referenceMonth,
          extractedFileKey: upload.key,
          status: 'EM_CONFERENCIA',
        },
      });
      results.push(individual);
    }
    await this.audit.log({
      tenantId: batch.tenantId,
      entityType: 'rh_payslip_batch',
      entityId: batchId,
      action: 'extracted',
      actorUserId: actor.userId,
      actorName: actor.name,
    });
    return results;
  }

  async transitionIndividual(
    id: string,
  toStatus: string,
    allowed: string[] | null,
    actor: RhActor,
    moduleSlugs: string[],
  ) {
    if (!PAYSLIP_STATUSES.includes(toStatus as (typeof PAYSLIP_STATUSES)[number])) {
      throw new BadRequestException('Status inválido.');
    }
    const row = await this.prisma.rhPayslipIndividual.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Contracheque não encontrado.');
    assertRhTenantAccess(allowed, row.tenantId);
    if (toStatus === 'DISPONIBILIZADO' && row.status !== 'APROVADO') {
      throw new BadRequestException('Aprove antes de disponibilizar.');
    }
    const updated = await this.prisma.rhPayslipIndividual.update({
      where: { id },
      data: { status: toStatus },
    });
    if (toStatus === 'DISPONIBILIZADO') {
      await this.prisma.rhPayslipAcknowledgement.create({
        data: {
          tenantId: row.tenantId,
          payslipId: id,
          employeeId: row.employeeId,
          status: 'CIENCIA_PENDENTE',
        },
      });
    }
    await this.audit.log({
      tenantId: row.tenantId,
      entityType: 'rh_payslip_individual',
      entityId: id,
      action: `status_${toStatus}`,
      actorUserId: actor.userId,
      actorName: actor.name,
    });
    return updated;
  }

  async getIndividualForViewer(
    id: string,
    allowed: string[] | null,
    moduleSlugs: string[],
    platformRole?: string,
    selfEmployeeId?: string,
  ) {
    const row = await this.prisma.rhPayslipIndividual.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Contracheque não encontrado.');
    assertRhTenantAccess(allowed, row.tenantId);
    const canRh = hasRhCapability(moduleSlugs, 'rh_payslip_individual', platformRole);
    const selfOk = selfEmployeeId && selfEmployeeId === row.employeeId;
    if (!canRh && !selfOk) throw new ForbiddenException('Sem permissão para este contracheque.');
    if (row.status !== 'DISPONIBILIZADO' && row.status !== 'CIENCIA_PENDENTE' && row.status !== 'CIENCIA_REALIZADA') {
      if (!canRh) throw new ForbiddenException('Contracheque ainda não disponível.');
    }
    return {
      ...row,
      canDownload: Boolean(row.extractedFileKey) && (canRh || selfOk),
    };
  }

  async acknowledgePayslip(payslipId: string, employeeId: string, allowed: string[] | null, actor: RhActor) {
    const payslip = await this.prisma.rhPayslipIndividual.findUnique({ where: { id: payslipId } });
    if (!payslip) throw new NotFoundException('Contracheque não encontrado.');
    assertRhTenantAccess(allowed, payslip.tenantId);
    if (payslip.employeeId !== employeeId) throw new ForbiddenException('Contracheque de outro colaborador.');
    await this.prisma.rhPayslipAcknowledgement.updateMany({
      where: { payslipId, employeeId },
      data: { status: 'CIENCIA_REALIZADA', acknowledgedAt: new Date(), method: 'digital_interno' },
    });
    await this.prisma.rhPayslipIndividual.update({
      where: { id: payslipId },
      data: { status: 'CIENCIA_REALIZADA' },
    });
    await this.audit.log({
      tenantId: payslip.tenantId,
      entityType: 'rh_payslip_acknowledgement',
      entityId: payslipId,
      action: 'acknowledged',
      actorUserId: actor.userId,
      actorName: actor.name,
    });
    return { ok: true };
  }

  async listByEmployee(employeeId: string, allowed: string[] | null) {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException('Colaborador não encontrado.');
    assertRhTenantAccess(allowed, employee.tenantId);
    return this.prisma.rhPayslipIndividual.findMany({
      where: { employeeId },
      orderBy: { referenceMonth: 'desc' },
    });
  }
}
