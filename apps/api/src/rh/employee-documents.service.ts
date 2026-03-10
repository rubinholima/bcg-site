import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDocumentDto } from './dto/create-employee-document.dto';

@Injectable()
export class EmployeeDocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmployee(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException('Colaborador não encontrado');
    return this.prisma.employeeDocument.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateEmployeeDocumentDto) {
    const employee = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
    if (!employee) throw new NotFoundException('Colaborador não encontrado');
    return this.prisma.employeeDocument.create({
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
  }

  async remove(id: string) {
    const doc = await this.prisma.employeeDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Documento não encontrado');
    await this.prisma.employeeDocument.delete({ where: { id } });
  }
}
