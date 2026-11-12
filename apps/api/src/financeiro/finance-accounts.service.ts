import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { cadastroUpper, cadastroUpperRequired } from '../common/cadastro-text';

const ACCOUNT_TYPES = new Set(['BANK', 'CASH', 'CREDIT_CARD', 'OMIE_OPERATIONAL', 'OTHER']);

@Injectable()
export class FinanceAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  private maskRef(value?: string | null): string | null {
    if (!value?.trim()) return null;
    const v = value.trim();
    if (v.length <= 4) return '****';
    return `${'*'.repeat(Math.max(0, v.length - 4))}${v.slice(-4)}`;
  }

  async list(tenantId: string, activeOnly?: boolean) {
    const rows = await this.prisma.financeAccount.findMany({
      where: { tenantId, ...(activeOnly ? { active: true } : {}) },
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    });
    return rows.map((r) => ({
      ...r,
      accountRefMasked: this.maskRef(r.accountRef),
    }));
  }

  async summary(tenantId: string, accountId: string) {
    const account = await this.prisma.financeAccount.findFirst({
      where: { id: accountId, tenantId },
    });
    if (!account) throw new NotFoundException('Conta financeira não encontrada.');

    const [pendingPay, pendingRec] = await Promise.all([
      this.prisma.financeiroLancamento.aggregate({
        where: { tenantId, financeAccountId: accountId, tipo: 'pagar', status: 'pendente' },
        _sum: { valor: true },
        _count: true,
      }),
      this.prisma.financeiroLancamento.aggregate({
        where: { tenantId, financeAccountId: accountId, tipo: 'receber', status: 'pendente' },
        _sum: { valor: true },
        _count: true,
      }),
    ]);

    const recent = await this.prisma.financeiroLancamento.findMany({
      where: { tenantId, financeAccountId: accountId },
      orderBy: { updatedAt: 'desc' },
      take: 8,
      select: {
        id: true,
        tipo: true,
        status: true,
        valor: true,
        dueDate: true,
        descricao: true,
        recordOrigin: true,
        ownershipKind: true,
      },
    });

    return {
      account: {
        ...account,
        accountRefMasked: this.maskRef(account.accountRef),
      },
      pendingPayables: {
        count: pendingPay._count,
        total: Number(pendingPay._sum.valor ?? 0),
      },
      pendingReceivables: {
        count: pendingRec._count,
        total: Number(pendingRec._sum.valor ?? 0),
      },
      recentMovements: recent.map((r) => ({ ...r, valor: Number(r.valor) })),
    };
  }

  async create(
    tenantId: string,
    dto: {
      name: string;
      accountType: string;
      institution?: string;
      agency?: string;
      accountRef?: string;
      externalRef?: string;
      currency?: string;
      notes?: string;
    },
  ) {
    const type = dto.accountType.trim().toUpperCase();
    if (!ACCOUNT_TYPES.has(type)) {
      throw new BadRequestException('Tipo de conta financeira inválido.');
    }
    return this.prisma.financeAccount.create({
      data: {
        tenantId,
        name: cadastroUpperRequired(dto.name),
        accountType: type,
        institution: cadastroUpper(dto.institution),
        agency: dto.agency?.trim() || null,
        accountRef: dto.accountRef?.trim() || null,
        externalRef: dto.externalRef?.trim() || null,
        currency: (dto.currency?.trim().toUpperCase() || 'BRL').slice(0, 3),
        notes: cadastroUpper(dto.notes),
      },
    });
  }

  async update(
    tenantId: string,
    id: string,
    dto: Partial<{
      name: string;
      accountType: string;
      institution: string;
      agency: string;
      accountRef: string;
      externalRef: string;
      currency: string;
      active: boolean;
      notes: string;
    }>,
  ) {
    const existing = await this.prisma.financeAccount.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Conta financeira não encontrada.');
    const type = dto.accountType?.trim().toUpperCase();
    if (type && !ACCOUNT_TYPES.has(type)) {
      throw new BadRequestException('Tipo de conta financeira inválido.');
    }
    return this.prisma.financeAccount.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: cadastroUpperRequired(dto.name) } : {}),
        ...(type ? { accountType: type } : {}),
        ...(dto.institution !== undefined ? { institution: cadastroUpper(dto.institution) } : {}),
        ...(dto.agency !== undefined ? { agency: dto.agency.trim() || null } : {}),
        ...(dto.accountRef !== undefined ? { accountRef: dto.accountRef.trim() || null } : {}),
        ...(dto.externalRef !== undefined ? { externalRef: dto.externalRef.trim() || null } : {}),
        ...(dto.currency !== undefined
          ? { currency: dto.currency.trim().toUpperCase().slice(0, 3) }
          : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
        ...(dto.notes !== undefined ? { notes: cadastroUpper(dto.notes) } : {}),
      },
    });
  }
}
