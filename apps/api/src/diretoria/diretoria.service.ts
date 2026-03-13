import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Clubes de futebol — exibe jogadores, sócios, comissão, etc. */
function isFootballClub(kindName: string | null | undefined): boolean {
  if (!kindName) return false;
  const k = kindName.toLowerCase();
  if (k.includes('construtora') || k.includes('real estate') || k.includes('construção')) return false;
  return k.includes('futebol') || k.includes('clube') || k.includes('football');
}

/** Empresas não-futebol (construtora, imobiliária, etc.) — exibe dados financeiros e compras */
function isEmpresaNaoFutebol(kindName: string | null | undefined): boolean {
  return !isFootballClub(kindName);
}

export interface TenantProfileStats {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  kindName: string;
  kindId: string;
  isFootballClub: boolean;
  logoUrl: string | null;
  city: string | null;
  country: string | null;
  createdAt: string;
  // Futebol (só clubes)
  playersCount: number;
  sociosCount: number;
  sociosActiveCount: number;
  psychologistsCount: number;
  technicalStaffCount: number;
  marketingPostsScheduled: number;
  // Empresas (todos) — RH, compras
  employeesCount: number;
  productsCount: number;
  suppliersCount: number;
  purchaseOrdersCount: number;
  purchaseRequisitionsCount: number;
  // Financeiro (ordens de compra)
  totalGastoMes: number;
  pagamentosARealizar: number;
}

export interface DiretoriaDashboardDto {
  summary: {
    totalTenants: number;
    clubsCount: number;
    empresasCount: number;
    totalPlayers: number;
    totalSocios: number;
    totalSociosActive: number;
    totalPsychologists: number;
    totalEmployees: number;
    totalGastoMes: number;
    totalPagamentosARealizar: number;
    newTenantsThisMonth: number;
    newPlayersThisMonth: number;
    newSociosThisMonth: number;
  };
  clubs: TenantProfileStats[];
  empresas: TenantProfileStats[];
  chartClubs: { name: string; jogadores: number; socios: number }[];
  chartEmpresas: { name: string; gastoMes: number; pagamentosPendentes: number }[];
  chartGrowth: { month: string; novosJogadores: number; novosSocios: number; gastoMes: number }[];
}

@Injectable()
export class DiretoriaService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(): Promise<DiretoriaDashboardDto> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const tenants = await this.prisma.tenant.findMany({
      where: { slug: { not: 'bcg' } },
      include: { kind: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });

    const tenantIds = tenants.map((t) => t.id);
    const clubs = tenants.filter((t) => isFootballClub(t.kind?.name));
    const empresas = tenants.filter((t) => isEmpresaNaoFutebol(t.kind?.name));
    const clubIds = clubs.map((t) => t.id);

    const [
      playersByTenant,
      sociosByTenant,
      sociosActiveByTenant,
      psychologistsByTenant,
      technicalStaffByTenant,
      employeesByTenant,
      marketingByTenant,
      productsByTenant,
      suppliersByTenant,
      purchaseOrders,
      purchaseRequisitions,
      newTenantsThisMonth,
      newPlayersThisMonth,
      newSociosThisMonth,
    ] = await Promise.all([
      this.prisma.player.groupBy({
        by: ['tenantId'],
        where: { tenantId: { in: clubIds } },
        _count: { id: true },
      }),
      this.prisma.socioMember.groupBy({
        by: ['tenantId'],
        where: { tenantId: { in: clubIds } },
        _count: { id: true },
      }),
      this.prisma.socioMember.groupBy({
        by: ['tenantId'],
        where: { tenantId: { in: clubIds }, status: 'active' },
        _count: { id: true },
      }),
      this.prisma.psychologist.groupBy({
        by: ['tenantId'],
        where: { tenantId: { in: tenantIds } },
        _count: { id: true },
      }),
      this.prisma.technicalStaff.groupBy({
        by: ['tenantId'],
        where: { tenantId: { in: clubIds } },
        _count: { id: true },
      }),
      this.prisma.employee.groupBy({
        by: ['tenantId'],
        where: { tenantId: { in: tenantIds } },
        _count: { id: true },
      }),
      this.prisma.marketingPost.groupBy({
        by: ['tenantId'],
        where: {
          tenantId: { in: clubIds },
          status: 'scheduled',
          scheduledAt: { gte: startOfMonth },
        },
        _count: { id: true },
      }),
      this.prisma.product.groupBy({
        by: ['tenantId'],
        where: { tenantId: { in: tenantIds } },
        _count: { id: true },
      }),
      this.prisma.supplier.groupBy({
        by: ['tenantId'],
        where: { tenantId: { in: tenantIds } },
        _count: { id: true },
      }),
      this.prisma.purchaseOrder.findMany({
        where: {
          tenantId: { in: tenantIds },
          status: { not: 'cancelled' },
        },
        select: { tenantId: true, totalAmount: true, status: true, orderedAt: true },
      }),
      this.prisma.purchaseRequisition.groupBy({
        by: ['tenantId'],
        where: { tenantId: { in: tenantIds } },
        _count: { id: true },
      }),
      this.prisma.tenant.count({ where: { createdAt: { gte: startOfMonth }, slug: { not: 'bcg' } } }),
      this.prisma.player.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.socioMember.count({ where: { joinedAt: { gte: startOfMonth } } }),
    ]);

    const toMap = <T extends { tenantId: string; _count: { id: number } }>(arr: T[]) =>
      Object.fromEntries(arr.map((x) => [x.tenantId, x._count.id]));
    const toMapNullable = (arr: { tenantId: string | null; _count: { id: number } }[]) =>
      Object.fromEntries(arr.filter((x) => x.tenantId != null).map((x) => [x.tenantId!, x._count.id]));

    const playersMap = toMap(playersByTenant);
    const sociosMap = toMap(sociosByTenant);
    const sociosActiveMap = toMap(sociosActiveByTenant);
    const psychologistsMap = toMapNullable(psychologistsByTenant);
    const technicalStaffMap = toMap(technicalStaffByTenant);
    const employeesMap = toMap(employeesByTenant);
    const productsMap = toMap(productsByTenant);
    const suppliersMap = toMap(suppliersByTenant);
    const requisitionsMap = toMap(purchaseRequisitions);

    const marketingByTenantId: Record<string, number> = {};
    for (const m of marketingByTenant) {
      if (m.tenantId) marketingByTenantId[m.tenantId] = m._count.id;
    }

    const ordersByTenant = purchaseOrders.reduce<Record<string, { count: number; gastoMes: number; pendente: number }>>((acc, o) => {
      const id = o.tenantId;
      if (!acc[id]) acc[id] = { count: 0, gastoMes: 0, pendente: 0 };
      acc[id].count += 1;
      const amount = o.totalAmount ?? 0;
      const inMonth = o.orderedAt >= startOfMonth && o.orderedAt <= endOfMonth;
      if (inMonth) acc[id].gastoMes += amount;
      if (o.status === 'sent' || o.status === 'approved') acc[id].pendente += amount;
      return acc;
    }, {});

    const buildProfile = (t: (typeof tenants)[0]): TenantProfileStats => {
      const ord = ordersByTenant[t.id] ?? { count: 0, gastoMes: 0, pendente: 0 };
      const isClub = isFootballClub(t.kind?.name);
      return {
        tenantId: t.id,
        tenantName: t.name,
        tenantSlug: t.slug,
        kindName: t.kind?.name ?? '—',
        kindId: t.kindId,
        isFootballClub: isClub,
        logoUrl: t.logoUrl,
        city: t.city,
        country: t.country,
        createdAt: t.createdAt.toISOString(),
        playersCount: isClub ? (playersMap[t.id] ?? 0) : 0,
        sociosCount: isClub ? (sociosMap[t.id] ?? 0) : 0,
        sociosActiveCount: isClub ? (sociosActiveMap[t.id] ?? 0) : 0,
        psychologistsCount: psychologistsMap[t.id] ?? 0,
        technicalStaffCount: isClub ? (technicalStaffMap[t.id] ?? 0) : 0,
        marketingPostsScheduled: isClub ? (marketingByTenantId[t.id] ?? 0) : 0,
        employeesCount: employeesMap[t.id] ?? 0,
        productsCount: productsMap[t.id] ?? 0,
        suppliersCount: suppliersMap[t.id] ?? 0,
        purchaseOrdersCount: ord.count,
        purchaseRequisitionsCount: requisitionsMap[t.id] ?? 0,
        totalGastoMes: ord.gastoMes,
        pagamentosARealizar: ord.pendente,
      };
    };

    const clubProfiles = clubs.map(buildProfile);
    const empresaProfiles = empresas.map(buildProfile);

    const chartClubs = clubs.slice(0, 10).map((t) => ({
      name: t.name.length > 12 ? t.name.slice(0, 10) + '…' : t.name,
      jogadores: playersMap[t.id] ?? 0,
      socios: sociosActiveMap[t.id] ?? 0,
    }));

    const chartEmpresas = empresas.slice(0, 10).map((t) => {
      const ord = ordersByTenant[t.id] ?? { gastoMes: 0, pendente: 0 };
      return {
        name: t.name.length > 12 ? t.name.slice(0, 10) + '…' : t.name,
        gastoMes: ord.gastoMes,
        pagamentosPendentes: ord.pendente,
      };
    });

    const chartGrowth = await this.getGrowthChartData(now);

    const totalGastoMes = Object.values(ordersByTenant).reduce((a, b) => a + b.gastoMes, 0);
    const totalPagamentosARealizar = Object.values(ordersByTenant).reduce((a, b) => a + b.pendente, 0);
    const totalPlayers = Object.values(playersMap).reduce((a, b) => a + b, 0);
    const totalSocios = Object.values(sociosMap).reduce((a, b) => a + b, 0);
    const totalSociosActive = Object.values(sociosActiveMap).reduce((a, b) => a + b, 0);
    const totalPsychologists = Object.values(psychologistsMap).reduce((a, b) => a + b, 0);
    const totalEmployees = Object.values(employeesMap).reduce((a, b) => a + b, 0);

    return {
      summary: {
        totalTenants: tenants.length,
        clubsCount: clubs.length,
        empresasCount: empresas.length,
        totalPlayers,
        totalSocios,
        totalSociosActive,
        totalPsychologists,
        totalEmployees,
        totalGastoMes,
        totalPagamentosARealizar,
        newTenantsThisMonth,
        newPlayersThisMonth,
        newSociosThisMonth,
      },
      clubs: clubProfiles,
      empresas: empresaProfiles,
      chartClubs,
      chartEmpresas,
      chartGrowth,
    };
  }

  private async getGrowthChartData(now: Date): Promise<{ month: string; novosJogadores: number; novosSocios: number; gastoMes: number }[]> {
    const months: { month: string; start: Date; end: Date }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      months.push({
        month: start.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        start,
        end,
      });
    }

    const result = await Promise.all(
      months.map(async (m) => {
        const [players, socios, orders] = await Promise.all([
          this.prisma.player.count({ where: { createdAt: { gte: m.start, lte: m.end } } }),
          this.prisma.socioMember.count({ where: { joinedAt: { gte: m.start, lte: m.end } } }),
          this.prisma.purchaseOrder.findMany({
            where: {
              orderedAt: { gte: m.start, lte: m.end },
              status: { not: 'cancelled' },
            },
            select: { totalAmount: true },
          }),
        ]);
        const gastoMes = orders.reduce((s, o) => s + (o.totalAmount ?? 0), 0);
        return { month: m.month, novosJogadores: players, novosSocios: socios, gastoMes };
      }),
    );

    return result;
  }
}
