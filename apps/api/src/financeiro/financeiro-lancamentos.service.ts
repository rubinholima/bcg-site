import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import type { FinanceiroLancamento, Prisma } from '@prisma/client';
import { cadastroUpper, cadastroUpperRequired } from '../common/cadastro-text';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFinanceiroLancamentoDto } from './dto/create-financeiro-lancamento.dto';
import { UpdateFinanceiroLancamentoDto } from './dto/update-financeiro-lancamento.dto';

function decimalToNumber(v: Prisma.Decimal | number): number {
  return typeof v === 'number' ? v : v.toNumber();
}

function serialize(l: FinanceiroLancamento) {
  return {
    ...l,
    valor: decimalToNumber(l.valor),
  };
}

function startOfTodayUtc(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

@Injectable()
export class FinanceiroLancamentosService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveCadastroLink(
    tenantId: string,
    tipo: 'pagar' | 'receber',
    input: { supplierId?: string; customerId?: string; contraparte?: string },
  ) {
    if (tipo === 'pagar' && input.supplierId) {
      const supplier = await this.prisma.supplier.findFirst({
        where: { id: input.supplierId, tenantId },
      });
      if (!supplier) throw new NotFoundException('Fornecedor não encontrado');
      return {
        supplierId: supplier.id,
        customerId: null as string | null,
        contraparte: supplier.name,
      };
    }
    if (tipo === 'receber' && input.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: input.customerId, tenantId },
      });
      if (!customer) throw new NotFoundException('Cliente não encontrado');
      return {
        supplierId: null as string | null,
        customerId: customer.id,
        contraparte: customer.name,
      };
    }
    if (tipo === 'pagar' && input.customerId) {
      throw new BadRequestException('Conta a pagar deve usar fornecedor cadastrado');
    }
    if (tipo === 'receber' && input.supplierId) {
      throw new BadRequestException('Conta a receber deve usar cliente cadastrado');
    }
    return {
      supplierId: null as string | null,
      customerId: null as string | null,
      contraparte: cadastroUpper(input.contraparte),
    };
  }

  private buildListWhere(
    tenantId: string,
    opts: {
      tipo?: string;
      status?: string;
      vencimentoDe?: string;
      vencimentoAte?: string;
      busca?: string;
    },
  ): Prisma.FinanceiroLancamentoWhereInput {
    const where: Prisma.FinanceiroLancamentoWhereInput = { tenantId };
    const tipo = opts.tipo?.trim();
    if (tipo === 'pagar' || tipo === 'receber') where.tipo = tipo;
    const status = opts.status?.trim();
    if (status === 'pendente' || status === 'pago' || status === 'cancelado') where.status = status;
    const de = opts.vencimentoDe?.trim();
    const ate = opts.vencimentoAte?.trim();
    if (de || ate) {
      where.dueDate = {};
      if (de) (where.dueDate as Prisma.DateTimeFilter).gte = new Date(`${de}T00:00:00.000Z`);
      if (ate) (where.dueDate as Prisma.DateTimeFilter).lte = new Date(`${ate}T23:59:59.999Z`);
    }
    const q = opts.busca?.trim();
    if (q) {
      where.OR = [
        { contraparte: { contains: q, mode: 'insensitive' } },
        { descricao: { contains: q, mode: 'insensitive' } },
        { referencia: { contains: q, mode: 'insensitive' } },
        { categoria: { contains: q, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  async resumo(
    tenantId: string,
    tipo?: string,
  ): Promise<{
    emAbertoValor: number;
    emAbertoCount: number;
    vencidosValor: number;
    vencidosCount: number;
    pagosNoMesValor: number;
    pagosNoMesCount: number;
  }> {
    const baseTipo: Prisma.FinanceiroLancamentoWhereInput =
      tipo === 'pagar' || tipo === 'receber' ? { tenantId, tipo } : { tenantId };
    const hoje = startOfTodayUtc();
    const now = new Date();
    const mesStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));

    const pendenteWhere = { ...baseTipo, status: 'pendente' as const };

    const [aggPendente, aggVencidos, quitadoMesWhere] = await Promise.all([
      this.prisma.financeiroLancamento.aggregate({
        where: pendenteWhere,
        _sum: { valor: true },
        _count: true,
      }),
      this.prisma.financeiroLancamento.aggregate({
        where: { ...pendenteWhere, dueDate: { lt: hoje } },
        _sum: { valor: true },
        _count: true,
      }),
      this.prisma.financeiroLancamento.aggregate({
        where: {
          ...baseTipo,
          status: 'pago',
          settledAt: { gte: mesStart },
        },
        _sum: { valor: true },
        _count: true,
      }),
    ]);

    return {
      emAbertoValor: Number(aggPendente._sum.valor ?? 0),
      emAbertoCount: aggPendente._count,
      vencidosValor: Number(aggVencidos._sum.valor ?? 0),
      vencidosCount: aggVencidos._count,
      pagosNoMesValor: Number(quitadoMesWhere._sum.valor ?? 0),
      pagosNoMesCount: quitadoMesWhere._count,
    };
  }

  async findAll(
    tenantId: string,
    opts: {
      tipo?: string;
      status?: string;
      vencimentoDe?: string;
      vencimentoAte?: string;
      busca?: string;
    },
  ) {
    const where = this.buildListWhere(tenantId, opts);
    const rows = await this.prisma.financeiroLancamento.findMany({
      where,
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });
    return rows.map(serialize);
  }

  async findOne(id: string) {
    const row = await this.prisma.financeiroLancamento.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Lançamento não encontrado');
    return serialize(row);
  }

  async create(dto: CreateFinanceiroLancamentoDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) throw new NotFoundException('Empresa não encontrada');

    const status = dto.status ?? 'pendente';
    let settledAt: Date | null = null;
    if (status === 'pago') {
      settledAt = dto.settledAt ? new Date(dto.settledAt) : new Date();
    }

    const cadastro = await this.resolveCadastroLink(dto.tenantId, dto.tipo, {
      supplierId: dto.supplierId,
      customerId: dto.customerId,
      contraparte: dto.contraparte,
    });

    const row = await this.prisma.financeiroLancamento.create({
      data: {
        tenantId: dto.tenantId,
        tipo: dto.tipo,
        status,
        contraparte: cadastro.contraparte,
        supplierId: cadastro.supplierId,
        customerId: cadastro.customerId,
        descricao: cadastroUpperRequired(dto.descricao),
        valor: dto.valor,
        dueDate: new Date(dto.dueDate),
        settledAt,
        categoria: cadastroUpper(dto.categoria),
        referencia: cadastroUpper(dto.referencia),
        notas: cadastroUpper(dto.notas),
      },
    });
    return serialize(row);
  }

  async update(id: string, dto: UpdateFinanceiroLancamentoDto) {
    const existing = await this.prisma.financeiroLancamento.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Lançamento não encontrado');

    const nextStatus = dto.status ?? existing.status;
    let settledAt: Date | null | undefined = undefined;
    if (dto.settledAt !== undefined) {
      settledAt = dto.settledAt === null ? null : new Date(dto.settledAt);
    }
    if (dto.status === 'pago' && settledAt === undefined && !existing.settledAt) {
      settledAt = new Date();
    }
    if (nextStatus !== 'pago' && dto.status !== undefined) {
      if (dto.settledAt === undefined) settledAt = null;
    }

    const tipo = (dto.tipo ?? existing.tipo) as 'pagar' | 'receber';
    const cadastro =
      dto.supplierId !== undefined || dto.customerId !== undefined || dto.contraparte !== undefined
        ? await this.resolveCadastroLink(existing.tenantId, tipo, {
            supplierId: dto.supplierId,
            customerId: dto.customerId,
            contraparte: dto.contraparte ?? existing.contraparte ?? undefined,
          })
        : null;

    const row = await this.prisma.financeiroLancamento.update({
      where: { id },
      data: {
        ...(dto.tipo !== undefined ? { tipo: dto.tipo } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(cadastro
          ? {
              contraparte: cadastro.contraparte,
              supplierId: cadastro.supplierId,
              customerId: cadastro.customerId,
            }
          : dto.contraparte !== undefined
            ? { contraparte: cadastroUpper(dto.contraparte) }
            : {}),
        ...(dto.descricao !== undefined ? { descricao: cadastroUpperRequired(dto.descricao) } : {}),
        ...(dto.valor !== undefined ? { valor: dto.valor } : {}),
        ...(dto.dueDate !== undefined ? { dueDate: new Date(dto.dueDate) } : {}),
        ...(settledAt !== undefined ? { settledAt } : {}),
        ...(dto.categoria !== undefined ? { categoria: cadastroUpper(dto.categoria) } : {}),
        ...(dto.referencia !== undefined ? { referencia: cadastroUpper(dto.referencia) } : {}),
        ...(dto.notas !== undefined ? { notas: cadastroUpper(dto.notas) } : {}),
      },
    });
    return serialize(row);
  }

  async remove(id: string) {
    const existing = await this.prisma.financeiroLancamento.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Lançamento não encontrado');
    await this.prisma.financeiroLancamento.delete({ where: { id } });
    return { ok: true };
  }
}
