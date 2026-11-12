import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { cadastroUpper } from '../common/cadastro-text';

function maskPix(key?: string | null): string | null {
  if (!key?.trim()) return null;
  const v = key.trim();
  if (v.length <= 6) return '******';
  return `${v.slice(0, 3)}***${v.slice(-3)}`;
}

function maskAccount(acc?: string | null): string | null {
  if (!acc?.trim()) return null;
  const v = acc.trim();
  if (v.length <= 4) return '****';
  return `****${v.slice(-4)}`;
}

@Injectable()
export class SupplierPaymentDestinationsService {
  constructor(private readonly prisma: PrismaService) {}

  serialize(row: Record<string, unknown>, revealBank: boolean) {
    if (revealBank) return row;
    return {
      ...row,
      pixKey: maskPix(row.pixKey as string | null),
      bankAccount: maskAccount(row.bankAccount as string | null),
      holderTaxId: row.holderTaxId ? '***' : null,
    };
  }

  async listBySupplier(tenantId: string, supplierId: string, revealBank: boolean) {
    const supplier = await this.prisma.supplier.findFirst({ where: { id: supplierId, tenantId } });
    if (!supplier) throw new NotFoundException('Fornecedor não encontrado.');
    const rows = await this.prisma.supplierPaymentDestination.findMany({
      where: { tenantId, supplierId },
      orderBy: [{ active: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map((r) => this.serialize(r as unknown as Record<string, unknown>, revealBank));
  }

  async create(
    tenantId: string,
    supplierId: string,
    dto: {
      label?: string;
      destType: string;
      bankName?: string;
      bankAgency?: string;
      bankAccount?: string;
      bankAccountType?: string;
      pixKeyType?: string;
      pixKey?: string;
      holderName?: string;
      holderTaxId?: string;
      notes?: string;
    },
  ) {
    const supplier = await this.prisma.supplier.findFirst({ where: { id: supplierId, tenantId } });
    if (!supplier) throw new NotFoundException('Fornecedor não encontrado.');
    const destType = dto.destType.trim().toUpperCase();
    return this.prisma.supplierPaymentDestination.create({
      data: {
        tenantId,
        supplierId,
        label: cadastroUpper(dto.label),
        destType,
        bankName: cadastroUpper(dto.bankName),
        bankAgency: dto.bankAgency?.trim() || null,
        bankAccount: dto.bankAccount?.trim() || null,
        bankAccountType: dto.bankAccountType?.trim() || null,
        pixKeyType: dto.pixKeyType?.trim() || null,
        pixKey: dto.pixKey?.trim() || null,
        holderName: cadastroUpper(dto.holderName),
        holderTaxId: dto.holderTaxId?.trim() || null,
        notes: cadastroUpper(dto.notes),
      },
    });
  }
}
