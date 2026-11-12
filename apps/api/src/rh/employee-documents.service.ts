import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { CreateEmployeeDocumentDto } from './dto/create-employee-document.dto';
import { assertRhTenantAccess } from './rh-scope.util';
import { RhAuditService } from './rh-audit.service';
import type { RhActor } from './rh-request.util';

const PRIVATE_DOC_TYPES = new Set([
  'contrato',
  'exame_admissional',
  'exame_demissional',
  'atestado',
  'holerite',
  'comprovante_bancario',
]);

@Injectable()
export class EmployeeDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly audit: RhAuditService,
  ) {}

  private async getEmployeeTenant(employeeId: string): Promise<string> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { tenantId: true },
    });
    if (!employee) throw new NotFoundException('Colaborador não encontrado');
    return employee.tenantId;
  }

  async findByEmployee(employeeId: string, allowedTenantIds: string[] | null = null) {
    const tenantId = await this.getEmployeeTenant(employeeId);
    assertRhTenantAccess(allowedTenantIds, tenantId);
    return this.prisma.employeeDocument.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, allowedTenantIds: string[] | null = null) {
    const doc = await this.prisma.employeeDocument.findUnique({
      where: { id },
      include: { employee: { select: { tenantId: true } } },
    });
    if (!doc) throw new NotFoundException('Documento não encontrado');
    assertRhTenantAccess(allowedTenantIds, doc.employee.tenantId);
    return doc;
  }

  async create(
    dto: CreateEmployeeDocumentDto,
    allowedTenantIds: string[] | null = null,
    actor?: RhActor,
  ) {
    const tenantId = await this.getEmployeeTenant(dto.employeeId);
    assertRhTenantAccess(allowedTenantIds, tenantId);
    const created = await this.prisma.employeeDocument.create({
      data: {
        employeeId: dto.employeeId,
        employmentId: dto.employmentId ?? null,
        documentType: dto.documentType,
        fileKey: dto.fileKey ?? null,
        fileUrl: dto.fileUrl ?? null,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        notes: dto.notes ?? null,
      },
    });

    if (actor && PRIVATE_DOC_TYPES.has(dto.documentType)) {
      await this.audit.log({
        tenantId,
        entityType: 'employee_document',
        entityId: created.id,
        action: 'create_private',
        actorUserId: actor.userId,
        actorName: actor.name,
      });
    }

    return created;
  }

  async remove(id: string, allowedTenantIds: string[] | null = null) {
    await this.findOne(id, allowedTenantIds);
    await this.prisma.employeeDocument.delete({ where: { id } });
  }

  async downloadStream(id: string, allowedTenantIds: string[] | null = null) {
    const doc = await this.findOne(id, allowedTenantIds);
    if (!doc.fileKey?.trim()) {
      throw new BadRequestException('Documento sem arquivo no servidor.');
    }
    return this.s3.getObject(doc.fileKey.trim());
  }

  isPrivateDocumentType(documentType: string): boolean {
    return PRIVATE_DOC_TYPES.has(documentType);
  }
}
