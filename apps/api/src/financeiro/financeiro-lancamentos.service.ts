import { Injectable, NotFoundException } from '@nestjs/common';
import type { FinanceiroLancamento, Prisma } from '@prisma/client';
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

    const row = await this.prisma.financeiroLancamento.create({
      data: {
        tenantId: dto.tenantId,
        tipo: dto.tipo,
        status,
        contraparte: dto.contraparte?.trim() ? dto.contraparte.trim() : null,
        descricao: dto.descricao.trim(),
        valor: dto.valor,
        dueDate: new Date(dto.dueDate),
        settledAt,
        categoria: dto.categoria?.trim() ? dto.categoria.trim() : null,
        referencia: dto.referencia?.trim() ? dto.referencia.trim() : null,
        notas: dto.notas?.trim() ? dto.notas.trim() : null,
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

    const row = await this.prisma.financeiroLancamento.update({
      where: { id },
      data: {
        ...(dto.tipo !== undefined ? { tipo: dto.tipo } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.contraparte !== undefined
          ? { contraparte: dto.contraparte?.trim() ? dto.contraparte.trim() : null }
          : {}),
        ...(dto.descricao !== undefined ? { descricao: dto.descricao.trim() } : {}),
        ...(dto.valor !== undefined ? { valor: dto.valor } : {}),
        ...(dto.dueDate !== undefined ? { dueDate: new Date(dto.dueDate) } : {}),
        ...(settledAt !== undefined ? { settledAt } : {}),
        ...(dto.categoria !== undefined
          ? { categoria: dto.categoria?.trim() ? dto.categoria.trim() : null }
          : {}),
        ...(dto.referencia !== undefined
          ? { referencia: dto.referencia?.trim() ? dto.referencia.trim() : null }
          : {}),
        ...(dto.notas !== undefined ? { notas: dto.notas?.trim() ? dto.notas.trim() : null } : {}),
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
