import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { cadastroUpper, cadastroUpperRequired } from '../common/cadastro-text';

@Injectable()
export class FinancePaymentMethodsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, activeOnly?: boolean) {
    return this.prisma.financePaymentMethod.findMany({
      where: { tenantId, ...(activeOnly ? { active: true } : {}) },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async create(
    tenantId: string,
    dto: { name: string; semanticKey?: string; sortOrder?: number; notes?: string },
  ) {
    return this.prisma.financePaymentMethod.create({
      data: {
        tenantId,
        name: cadastroUpperRequired(dto.name),
        semanticKey: dto.semanticKey?.trim().toUpperCase() || null,
        sortOrder: dto.sortOrder ?? 0,
        notes: cadastroUpper(dto.notes),
      },
    });
  }

  async update(
    tenantId: string,
    id: string,
    dto: Partial<{ name: string; semanticKey: string; sortOrder: number; active: boolean; notes: string }>,
  ) {
    const row = await this.prisma.financePaymentMethod.findFirst({ where: { id, tenantId } });
    if (!row) throw new NotFoundException('Forma de pagamento não encontrada.');
    return this.prisma.financePaymentMethod.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: cadastroUpperRequired(dto.name) } : {}),
        ...(dto.semanticKey !== undefined ? { semanticKey: dto.semanticKey.trim().toUpperCase() || null } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
        ...(dto.notes !== undefined ? { notes: cadastroUpper(dto.notes) } : {}),
      },
    });
  }
}
