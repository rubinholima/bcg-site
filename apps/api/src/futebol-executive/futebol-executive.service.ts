import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ModulesService } from '../modules/modules.service';
import { TenantAccessService } from '../auth/tenant-access.service';
import { PhysioTryoutClearanceService } from '../fisioterapia/physio-tryout-clearance.service';
import {
  buildPlayerMatchAvailabilityInput,
  getPlayerMatchAvailability,
} from '../common/player-match-availability.util';
import {
  normalizeSportsSituation,
  isArchivedSportsSituation,
} from '../common/sports-situation.util';
import {
  canAccessExecutiveDashboard,
  hasAnyModule,
  hasModule,
} from './futebol-executive-access.util';
import type {
  ExecutiveActionItem,
  ExecutiveAgendaItem,
  ExecutiveDashboardDto,
  ExecutiveKpi,
  ExecutiveSeverity,
} from './futebol-executive.types';

type Ctx = {
  role: string;
  modules: Set<string>;
  tenantId?: string;
  category?: string;
  periodDays: number;
  allowedTenants: string[] | null;
};

@Injectable()
export class FutebolExecutiveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly modulesService: ModulesService,
    private readonly tenantAccess: TenantAccessService,
    private readonly physioTryout: PhysioTryoutClearanceService,
  ) {}

  async getDashboard(
    userSub: string,
    role: string,
    filters: { tenantId?: string; category?: string; periodDays?: number },
  ): Promise<ExecutiveDashboardDto> {
    const slugs = await this.modulesService.getSlugsForActor(userSub, role);
    const modules = new Set(slugs);
    if (!canAccessExecutiveDashboard(role, slugs)) {
      throw new ForbiddenException('Sem permissão para o dashboard executivo de futebol.');
    }

    const allowedTenants = await this.tenantAccess.getAllowedTenantIds(userSub, role);
    if (filters.tenantId?.trim()) {
      if (allowedTenants !== null && !allowedTenants.includes(filters.tenantId.trim())) {
        throw new ForbiddenException('Sem permissão para este clube.');
      }
    }
    const ctx: Ctx = {
      role,
      modules,
      tenantId: filters.tenantId?.trim() || undefined,
      category: filters.category?.trim() || undefined,
      periodDays: Math.min(Math.max(filters.periodDays ?? 14, 7), 30),
      allowedTenants: filters.tenantId?.trim()
        ? [filters.tenantId.trim()]
        : allowedTenants,
    };

    const [
      decisions,
      alerts,
      squad,
      captacao,
      health,
      performance,
      contracts,
      logistics,
      agenda,
      finance,
    ] = await Promise.all([
      this.buildDecisions(ctx),
      this.buildAlerts(ctx),
      this.buildSquad(ctx),
      this.buildCaptacao(ctx),
      this.buildHealth(ctx),
      this.buildPerformance(ctx),
      this.buildContracts(ctx),
      this.buildLogistics(ctx),
      this.buildAgenda(ctx),
      this.buildFinance(ctx),
    ]);

    const kpis = this.buildKpis(ctx, {
      squad,
      decisions,
      alerts,
      captacao,
      agenda,
      health,
    });

    return {
      generatedAt: new Date().toISOString(),
      filters: {
        tenantId: ctx.tenantId,
        category: ctx.category,
        periodDays: ctx.periodDays,
      },
      modules: slugs,
      kpis,
      decisions,
      alerts,
      squad,
      captacao,
      health,
      performance,
      contracts,
      logistics,
      agenda,
      finance,
      quickActions: this.buildQuickActions(modules),
    };
  }

  private playerWhere(ctx: Ctx): Prisma.PlayerWhereInput {
    const where: Prisma.PlayerWhereInput = {};
    if (ctx.tenantId) where.tenantId = ctx.tenantId;
    else if (ctx.allowedTenants !== null) where.tenantId = { in: ctx.allowedTenants };
    if (ctx.category) where.category = ctx.category;
    return where;
  }

  private prospectWhere(ctx: Ctx): Prisma.ScoutingProspectWhereInput {
    const where: Prisma.ScoutingProspectWhereInput = {};
    if (ctx.tenantId) where.tenantId = ctx.tenantId;
    else if (ctx.allowedTenants !== null) where.tenantId = { in: ctx.allowedTenants };
    return where;
  }

  private sortActions(items: ExecutiveActionItem[]): ExecutiveActionItem[] {
    const order: Record<ExecutiveSeverity, number> = { critical: 0, attention: 1, info: 2 };
    return [...items].sort((a, b) => {
      const s = order[a.severity] - order[b.severity];
      if (s !== 0) return s;
      const da = a.dueAt ? new Date(a.dueAt).getTime() : Infinity;
      const db = b.dueAt ? new Date(b.dueAt).getTime() : Infinity;
      return da - db;
    });
  }

  private async buildDecisions(ctx: Ctx): Promise<ExecutiveActionItem[]> {
    const items: ExecutiveActionItem[] = [];
    const tenantFilter = ctx.tenantId ? { tenantId: ctx.tenantId } : ctx.allowedTenants
      ? { tenantId: { in: ctx.allowedTenants } }
      : {};

    if (hasAnyModule(ctx.modules, ['adm_financeiro', 'diretoria'])) {
      const statuses =
        hasModule(ctx.modules, 'diretoria') && !hasModule(ctx.modules, 'adm_financeiro')
          ? ['aguardando_diretoria']
          : hasModule(ctx.modules, 'adm_financeiro')
            ? ['aguardando_financeiro', 'aguardando_diretoria']
            : ['aguardando_diretoria'];
      const reqs = await this.prisma.purchaseRequisition.findMany({
        where: { ...tenantFilter, status: { in: statuses } },
        orderBy: { updatedAt: 'asc' },
        take: 20,
        select: {
          id: true,
          status: true,
          departmentName: true,
          justification: true,
          requestedByName: true,
          approvedTotal: true,
          totalEstimated: true,
          updatedAt: true,
          tenant: { select: { name: true } },
        },
      });
      for (const r of reqs) {
        const isDir = r.status === 'aguardando_diretoria';
        items.push({
          id: `purchase-${r.id}`,
          type: 'compra_aprovacao',
          title: this.purchaseTitle(r),
          subtitle: [r.tenant?.name, r.requestedByName].filter(Boolean).join(' · '),
          severity: isDir ? 'critical' : 'attention',
          status: r.status,
          createdAt: r.updatedAt.toISOString(),
          actionUrl: isDir
            ? '/dashboard/diretoria/aprovacoes-compras'
            : '/dashboard/adm/financeiro/aprovacoes',
          moduleRequired: isDir ? 'diretoria' : 'adm_financeiro',
        });
      }
    }

    if (hasModule(ctx.modules, 'futebol_captacao')) {
      const prospects = await this.prisma.scoutingProspect.findMany({
        where: {
          ...this.prospectWhere(ctx),
          stage: 'aprovado',
          supervisorApprovedAt: null,
          evaluationOutcome: 'aprovado',
        },
        orderBy: { updatedAt: 'asc' },
        take: 15,
        select: { id: true, name: true, targetCategory: true, updatedAt: true },
      });
      for (const p of prospects) {
        items.push({
          id: `prospect-approve-${p.id}`,
          type: 'captacao_supervisor',
          title: `Aprovar prospect: ${p.name}`,
          subtitle: p.targetCategory ?? undefined,
          severity: 'attention',
          createdAt: p.updatedAt.toISOString(),
          actionUrl: `/dashboard/futebol/captacao/prospects/${p.id}`,
          moduleRequired: 'futebol_captacao',
        });
      }
    }

    if (hasModule(ctx.modules, 'adm_rh')) {
      const invites = await this.prisma.registrationInvite.findMany({
        where: { ...tenantFilter, reviewStatus: 'pending' },
        orderBy: { submittedAt: 'asc' },
        take: 15,
        select: {
          id: true,
          subjectType: true,
          submittedAt: true,
          player: { select: { name: true } },
          employee: { select: { name: true } },
        },
      });
      for (const inv of invites) {
        const subjectName = inv.player?.name ?? inv.employee?.name ?? '—';
        items.push({
          id: `rh-invite-${inv.id}`,
          type: 'rh_cadastro',
          title: `Cadastro pendente: ${subjectName}`,
          subtitle: inv.subjectType === 'player' ? 'Atleta' : 'Colaborador',
          severity: 'attention',
          createdAt: inv.submittedAt?.toISOString(),
          actionUrl: '/dashboard/adm/rh',
          moduleRequired: 'adm_rh',
        });
      }
    }

    if (hasModule(ctx.modules, 'juridico')) {
      const docs = await this.prisma.legalDocument.findMany({
        where: { ...this.legalDocWhere(ctx), status: 'pending_signature' },
        orderBy: { updatedAt: 'asc' },
        take: 10,
        select: {
          id: true,
          playerId: true,
          name: true,
          type: true,
          updatedAt: true,
          player: { select: { name: true } },
        },
      });
      for (const d of docs) {
        items.push({
          id: `legal-${d.id}`,
          type: 'contrato_assinatura',
          title: `Assinatura pendente: ${d.player?.name ?? d.name ?? 'Contrato'}`,
          subtitle: d.type ?? undefined,
          severity: 'attention',
          createdAt: d.updatedAt.toISOString(),
          actionUrl: d.playerId ? `/dashboard/juridico/${d.playerId}` : '/dashboard/juridico',
          moduleRequired: 'juridico',
        });
      }
    }

    return this.sortActions(items).slice(0, 30);
  }

  private async buildAlerts(ctx: Ctx): Promise<ExecutiveActionItem[]> {
    const items: ExecutiveActionItem[] = [];
    const now = new Date();
    const in60 = new Date(now);
    in60.setDate(in60.getDate() + 60);
    const tenantFilter = ctx.tenantId ? { tenantId: ctx.tenantId } : ctx.allowedTenants
      ? { tenantId: { in: ctx.allowedTenants } }
      : {};

    if (hasAnyModule(ctx.modules, ['juridico', 'diretoria', 'tipos'])) {
      const expiring = await this.prisma.legalDocument.findMany({
        where: {
          ...this.legalDocWhere(ctx),
          validUntil: { gte: now, lte: in60 },
          status: { not: 'cancelled' },
        },
        take: 10,
        select: {
          id: true,
          playerId: true,
          validUntil: true,
          player: { select: { name: true } },
        },
      });
      for (const d of expiring) {
        items.push({
          id: `alert-contract-${d.id}`,
          type: 'contrato_vencendo',
          title: `Contrato vencendo: ${d.player?.name ?? 'Atleta'}`,
          subtitle: d.validUntil?.toISOString().slice(0, 10),
          severity: 'attention',
          dueAt: d.validUntil?.toISOString(),
          actionUrl: d.playerId ? `/dashboard/juridico/${d.playerId}` : '/dashboard/juridico',
          moduleRequired: 'juridico',
        });
      }
    }

    if (hasAnyModule(ctx.modules, ['tipos', 'relatorios_futebol', 'futebol_logistica'])) {
      const players = await this.prisma.player.findMany({
        where: { ...this.playerWhere(ctx), status: 'suspended' },
        take: 15,
        select: { id: true, name: true, category: true, statusUntil: true },
      });
      for (const p of players) {
        items.push({
          id: `alert-suspended-${p.id}`,
          type: 'atleta_suspenso',
          title: p.name,
          subtitle: p.category ?? undefined,
          severity: 'critical',
          dueAt: p.statusUntil?.toISOString(),
          actionUrl: `/dashboard/cadastros/jogadores/${p.id}/edit`,
          moduleRequired: 'tipos',
        });
      }

      const openings = await this.prisma.playerDisciplineOpening.findMany({
        where: {
          suspensionRoundsLeft: { gt: 0 },
          player: this.playerWhere(ctx),
        },
        take: 10,
        include: { player: { select: { id: true, name: true, category: true, status: true } } },
      });
      for (const o of openings) {
        if (o.player.status === 'suspended') continue;
        items.push({
          id: `alert-discipline-${o.id}`,
          type: 'suspensao_proxima',
          title: o.player.name,
          subtitle: `${o.suspensionRoundsLeft} rodada(s)`,
          severity: 'attention',
          actionUrl: `/dashboard/cadastros/jogadores/${o.player.id}/edit`,
          moduleRequired: 'relatorios_futebol',
        });
      }
    }

    if (hasModule(ctx.modules, 'futebol_captacao')) {
      const prospects = await this.prisma.scoutingProspect.findMany({
        where: {
          ...this.prospectWhere(ctx),
          stage: { notIn: ['recusado', 'arquivado', 'cadastrado'] },
          OR: [
            { ctScheduleStatus: 'nao_agendado', evaluationOutcome: { in: ['aprovado', 'para_teste'] } },
            { ctScheduleStatus: 'agendado', ctScheduledAt: { lt: now } },
            { ctScheduleStatus: 'compareceu' },
          ],
        },
        take: 20,
        select: {
          id: true,
          name: true,
          ctScheduleStatus: true,
          ctScheduledAt: true,
          targetCategory: true,
        },
      });
      for (const p of prospects) {
        const op = await this.physioTryout.getOperationalStatusForProspect(p.id);
        if (p.ctScheduleStatus === 'compareceu' && !op.canStartFieldEvaluation) {
          items.push({
            id: `alert-fisio-${p.id}`,
            type: 'fisio_clearance',
            title: p.name,
            subtitle:
              op.status === 'reprovado'
                ? 'Liberação fisio reprovada'
                : 'Liberação fisio pendente',
            severity: op.status === 'reprovado' ? 'critical' : 'attention',
            actionUrl: `/dashboard/futebol/captacao/prospects/${p.id}`,
            moduleRequired: 'futebol_captacao',
          });
        } else if (p.ctScheduleStatus === 'nao_agendado') {
          items.push({
            id: `alert-ct-schedule-${p.id}`,
            type: 'ct_sem_agendamento',
            title: p.name,
            subtitle: 'Aguardando agendamento CT',
            severity: 'attention',
            actionUrl: `/dashboard/futebol/captacao/prospects/${p.id}`,
            moduleRequired: 'futebol_captacao',
          });
        } else if (
          p.ctScheduleStatus === 'agendado' &&
          p.ctScheduledAt &&
          p.ctScheduledAt < now
        ) {
          items.push({
            id: `alert-ct-overdue-${p.id}`,
            type: 'ct_atrasado',
            title: p.name,
            subtitle: 'Agendamento CT vencido',
            severity: 'critical',
            dueAt: p.ctScheduledAt.toISOString(),
            actionUrl: `/dashboard/futebol/captacao/prospects/${p.id}`,
            moduleRequired: 'futebol_captacao',
          });
        }
      }
    }

    if (hasAnyModule(ctx.modules, ['saude', 'medico', 'futebol_logistica'])) {
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      const departures = await this.prisma.playerMedicalDeparture.findMany({
        where: {
          ...tenantFilter,
          status: { in: ['programada', 'em_atendimento'] },
          returnedAt: null,
        },
        take: 10,
        select: {
          id: true,
          playerId: true,
          status: true,
          departedAt: true,
          player: { select: { name: true } },
        },
      });
      for (const d of departures) {
        const overdue = d.departedAt < startOfToday;
        items.push({
          id: `alert-departure-${d.id}`,
          type: 'saida_ct',
          title: d.player?.name ?? 'Atleta',
          subtitle: overdue ? 'Retorno em atraso' : 'Fora do CT',
          severity: overdue ? 'critical' : 'attention',
          dueAt: d.departedAt.toISOString(),
          actionUrl: `/dashboard/medico/saidas/${d.id}`,
          moduleRequired: 'saude',
        });
      }
    }

    if (hasModule(ctx.modules, 'relatorios_futebol')) {
      const fmfWhere: Prisma.FmfMatchReportWhereInput = ctx.tenantId
        ? { tenantId: ctx.tenantId }
        : ctx.allowedTenants
          ? { tenantId: { in: ctx.allowedTenants } }
          : {};
      const reports = await this.prisma.fmfMatchReport.findMany({
        where: fmfWhere,
        select: { unresolvedPlayers: true },
      });
      let pendCount = 0;
      for (const r of reports) {
        if (Array.isArray(r.unresolvedPlayers)) pendCount += r.unresolvedPlayers.length;
      }
      if (pendCount > 0) {
        items.push({
          id: 'alert-fmf-pendencies',
          type: 'fmf_pendencia',
          title: `${pendCount} pendência(s) cadastro FMF`,
          severity: pendCount > 5 ? 'critical' : 'attention',
          actionUrl: '/dashboard/relatorios/futebol/pendencias-cadastro',
          moduleRequired: 'relatorios_futebol',
        });
      }
    }

    if (hasModule(ctx.modules, 'futebol_logistica')) {
      const horizon = new Date(now);
      horizon.setDate(horizon.getDate() + ctx.periodDays);
      const trips = await this.prisma.travelLogistics.findMany({
        where: {
          ...tenantFilter,
          matchDate: { gte: now, lte: horizon },
          status: { in: ['rascunho', 'planejamento'] },
        },
        take: 8,
        select: { id: true, opponentName: true, matchDate: true, status: true },
      });
      for (const t of trips) {
        items.push({
          id: `alert-logistics-${t.id}`,
          type: 'logistica_incompleta',
          title: t.opponentName ?? 'Viagem',
          subtitle: `Status: ${t.status}`,
          severity: 'attention',
          dueAt: t.matchDate.toISOString(),
          actionUrl: `/dashboard/futebol/logistica/${t.id}/edit`,
          moduleRequired: 'futebol_logistica',
        });
      }
    }

    return this.sortActions(items).slice(0, 40);
  }

  private async buildSquad(ctx: Ctx) {
    if (!hasAnyModule(ctx.modules, ['tipos', 'futebol_logistica', 'futebol_captacao'])) {
      return null;
    }
    const players = await this.prisma.player.findMany({
      where: this.playerWhere(ctx),
      select: {
        id: true,
        category: true,
        status: true,
        registrationProfile: true,
      },
    });

    const byCategory: Record<string, number> = {};
    const bySituation: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let suspended = 0;

    for (const p of players) {
      const profile = p.registrationProfile as Record<string, unknown> | null;
      const sports = profile?.sports as Record<string, unknown> | undefined;
      const sit = normalizeSportsSituation(
        typeof sports?.situation === 'string' ? sports.situation : null,
      );
      if (isArchivedSportsSituation(sit)) continue;

      const cat = p.category ?? '—';
      byCategory[cat] = (byCategory[cat] ?? 0) + 1;
      bySituation[sit] = (bySituation[sit] ?? 0) + 1;
      const st = p.status ?? 'available';
      byStatus[st] = (byStatus[st] ?? 0) + 1;
      if (st === 'suspended') suspended++;
    }

    const nearSuspension = await this.prisma.playerDisciplineOpening.count({
      where: {
        suspensionRoundsLeft: { gt: 0 },
        player: { ...this.playerWhere(ctx), status: { not: 'suspended' } },
      },
    });

    const activeTotal = players.filter((p) => {
      const profile = p.registrationProfile as Record<string, unknown> | null;
      const sports = profile?.sports as Record<string, unknown> | undefined;
      const sit = normalizeSportsSituation(
        typeof sports?.situation === 'string' ? sports.situation : null,
      );
      return !isArchivedSportsSituation(sit);
    }).length;

    return {
      total: activeTotal,
      byCategory,
      bySituation,
      byStatus,
      suspended,
      nearSuspension,
    };
  }

  private async buildCaptacao(ctx: Ctx) {
    if (!hasModule(ctx.modules, 'futebol_captacao')) return null;

    const base = this.prospectWhere(ctx);
    const active = await this.prisma.scoutingProspect.count({
      where: { ...base, stage: { notIn: ['recusado', 'arquivado', 'cadastrado'] } },
    });

    const ctRows = await this.prisma.scoutingProspect.groupBy({
      by: ['ctScheduleStatus'],
      where: {
        ...base,
        stage: { notIn: ['recusado', 'arquivado'] },
        ctScheduleStatus: { not: null },
      },
      _count: true,
    });
    const byCtStatus = Object.fromEntries(
      ctRows.map((r) => [r.ctScheduleStatus ?? 'nao_agendado', r._count]),
    );

    const supervisorApprovalPending = await this.prisma.scoutingProspect.count({
      where: {
        ...base,
        stage: 'aprovado',
        supervisorApprovedAt: null,
        evaluationOutcome: 'aprovado',
      },
    });

    const awaitingSchedule = await this.prisma.scoutingProspect.count({
      where: {
        ...base,
        stage: { notIn: ['recusado', 'arquivado', 'cadastrado'] },
        ctScheduleStatus: 'nao_agendado',
        evaluationOutcome: { in: ['aprovado', 'para_teste'] },
      },
    });

    const queue = await this.prisma.scoutingProspect.findMany({
      where: {
        ...base,
        stage: { notIn: ['recusado', 'arquivado'] },
        ctScheduleStatus: { in: ['compareceu', 'em_avaliacao', 'agendado'] },
      },
      take: 8,
      select: { id: true, name: true, ctScheduleStatus: true, targetCategory: true },
    });

    let physioPending = 0;
    let physioRejected = 0;
    const items: ExecutiveActionItem[] = [];
    for (const p of queue) {
      const op = await this.physioTryout.getOperationalStatusForProspect(p.id);
      if (op.status === 'pendente') physioPending++;
      if (op.status === 'reprovado') physioRejected++;
      if (op.status !== 'aprovado' && p.ctScheduleStatus === 'compareceu') {
        items.push({
          id: `cap-fisio-${p.id}`,
          type: 'captacao_fisio',
          title: p.name,
          subtitle: op.status === 'reprovado' ? 'Fisio reprovada' : 'Fisio pendente',
          severity: op.status === 'reprovado' ? 'critical' : 'attention',
          actionUrl: `/dashboard/futebol/captacao/prospects/${p.id}`,
          moduleRequired: 'futebol_captacao',
        });
      }
    }

    return {
      active,
      byCtStatus,
      physioPending,
      physioRejected,
      supervisorApprovalPending,
      awaitingSchedule,
      items,
    };
  }

  private async buildHealth(ctx: Ctx) {
    const canSaude = hasModule(ctx.modules, 'saude');
    const canOperational =
      canSaude ||
      hasAnyModule(ctx.modules, [
        'futebol_captacao',
        'futebol_preparacao_fisica',
        'futebol_logistica',
        'medico',
      ]);
    if (!canOperational) return null;

    const tenantFilter = ctx.tenantId ? { tenantId: ctx.tenantId } : ctx.allowedTenants
      ? { tenantId: { in: ctx.allowedTenants } }
      : {};

    const unavailable = await this.prisma.player.count({
      where: {
        ...this.playerWhere(ctx),
        status: { in: ['injured', 'suspended', 'absent', 'not_in_squad'] },
      },
    });

    const activePhysio = await this.prisma.physioSession.count({
      where: { ...tenantFilter, status: 'active', ...(ctx.category ? { category: ctx.category } : {}) },
    });

    const inTransition = await this.prisma.physioTransitionProgram.count({
      where: {
        ...tenantFilter,
        status: 'active',
        ...(ctx.category ? { player: { category: ctx.category } } : {}),
      },
    });

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const medicalDeparturesOpen = await this.prisma.playerMedicalDeparture.count({
      where: {
        ...tenantFilter,
        status: { in: ['programada', 'em_atendimento'] },
      },
    });

    const medicalDeparturesOverdue = await this.prisma.playerMedicalDeparture.count({
      where: {
        ...tenantFilter,
        status: { in: ['programada', 'em_atendimento'] },
        returnedAt: null,
        departedAt: { lt: startOfToday },
      },
    });

    let periodicEvaluationsAttention = 0;
    if (canSaude) {
      periodicEvaluationsAttention = await this.prisma.physioPlayerEvaluation.count({
        where: {
          ...tenantFilter,
          outcome: 'reprovado',
          evaluatedAt: { gte: new Date(now.getTime() - 90 * 86400000) },
        },
      });
    }

    let tryoutClearancePending = 0;
    let tryoutClearanceRejected = 0;
    if (hasAnyModule(ctx.modules, ['futebol_captacao', 'saude'])) {
      const tryoutProspects = await this.prisma.scoutingProspect.findMany({
        where: {
          ...this.prospectWhere(ctx),
          stage: { in: ['tryout', 'aprovado', 'negociacao', 'prioridade'] },
        },
        select: { id: true },
        take: 100,
      });
      for (const p of tryoutProspects) {
        const op = await this.physioTryout.getOperationalStatusForProspect(p.id);
        if (op.status === 'pendente') tryoutClearancePending++;
        if (op.status === 'reprovado') tryoutClearanceRejected++;
      }
    }

    return {
      unavailable,
      activePhysio,
      inTransition,
      medicalDeparturesOpen,
      medicalDeparturesOverdue,
      periodicEvaluationsAttention,
      tryoutClearancePending,
      tryoutClearanceRejected,
    };
  }

  private async buildPerformance(ctx: Ctx) {
    if (
      !hasAnyModule(ctx.modules, [
        'futebol_treinadores',
        'futebol_fisiologia',
        'futebol_preparacao_fisica',
        'tipos',
      ])
    ) {
      return null;
    }

    const players = await this.prisma.player.findMany({
      where: this.playerWhere(ctx),
      select: {
        id: true,
        status: true,
        statusDetails: true,
        statusUntil: true,
        yellowCards: true,
        redCards: true,
        cbfRegistration: true,
        registrationProfile: true,
      },
    });

    let available = 0;
    let unavailable = 0;
    for (const p of players) {
      const profile = p.registrationProfile as Record<string, unknown> | null;
      const sports = profile?.sports as Record<string, unknown> | undefined;
      const sit = normalizeSportsSituation(
        typeof sports?.situation === 'string' ? sports.situation : null,
      );
      if (isArchivedSportsSituation(sit)) continue;

      const av = getPlayerMatchAvailability(buildPlayerMatchAvailabilityInput(p));
      if (av.apto) available++;
      else unavailable++;
    }

    const tenantFilter = ctx.tenantId ? { tenantId: ctx.tenantId } : ctx.allowedTenants
      ? { tenantId: { in: ctx.allowedTenants } }
      : {};

    const pendingCoachEvaluations = hasModule(ctx.modules, 'futebol_treinadores')
      ? await this.prisma.coachPlayerEvaluation.count({
          where: {
            ...tenantFilter,
            status: 'pendente',
            ...(ctx.category ? { category: ctx.category } : {}),
          },
        })
      : 0;

    const activeTransitions = hasModule(ctx.modules, 'futebol_fisiologia')
      ? await this.prisma.physioTransitionProgram.count({
          where: { ...tenantFilter, status: 'active' },
        })
      : 0;

    return {
      available,
      unavailable,
      pendingCoachEvaluations,
      activeTransitions,
    };
  }

  private async buildContracts(ctx: Ctx) {
    if (!hasAnyModule(ctx.modules, ['juridico', 'adm_rh', 'diretoria'])) return null;

    const tenantFilter = ctx.tenantId ? { tenantId: ctx.tenantId } : ctx.allowedTenants
      ? { tenantId: { in: ctx.allowedTenants } }
      : {};
    const now = new Date();
    const in60 = new Date(now);
    in60.setDate(in60.getDate() + 60);

    const expiringSoon = hasModule(ctx.modules, 'juridico')
      ? await this.prisma.legalDocument.count({
          where: {
            ...this.legalDocWhere(ctx),
            validUntil: { gte: now, lte: in60 },
            status: { notIn: ['cancelled'] },
          },
        })
      : 0;

    const expired = hasModule(ctx.modules, 'juridico')
      ? await this.prisma.legalDocument.count({
          where: {
            ...this.legalDocWhere(ctx),
            validUntil: { lt: now },
            status: { notIn: ['cancelled', 'signed'] },
          },
        })
      : 0;

    const pendingSignature = hasModule(ctx.modules, 'juridico')
      ? await this.prisma.legalDocument.count({
          where: { ...this.legalDocWhere(ctx), status: 'pending_signature' },
        })
      : 0;

    const registrationPending = hasModule(ctx.modules, 'adm_rh')
      ? await this.prisma.registrationInvite.count({
          where: { ...tenantFilter, reviewStatus: 'pending' },
        })
      : 0;

    return {
      expiringSoon,
      expired,
      pendingSignature,
      registrationPending,
    };
  }

  private async buildLogistics(ctx: Ctx) {
    if (!hasModule(ctx.modules, 'futebol_logistica')) return null;

    const tenantFilter = ctx.tenantId ? { tenantId: ctx.tenantId } : ctx.allowedTenants
      ? { tenantId: { in: ctx.allowedTenants } }
      : {};
    const now = new Date();
    const horizon = new Date(now);
    horizon.setDate(horizon.getDate() + ctx.periodDays);

    const trips = await this.prisma.travelLogistics.findMany({
      where: {
        ...tenantFilter,
        matchDate: { gte: now, lte: horizon },
        status: { not: 'cancelado' },
        ...(ctx.category ? { category: ctx.category } : {}),
      },
      orderBy: { matchDate: 'asc' },
      take: 12,
      select: {
        id: true,
        opponentName: true,
        matchDate: true,
        status: true,
        championshipName: true,
        _count: { select: { participants: true } },
      },
    });

    let incompleteConvocation = 0;
    const items: ExecutiveActionItem[] = [];
    for (const t of trips) {
      if (t.status === 'rascunho' || t.status === 'planejamento') {
        incompleteConvocation++;
        items.push({
          id: `log-${t.id}`,
          type: 'logistica',
          title: t.opponentName ?? 'Viagem',
          subtitle: [t.championshipName, t.matchDate.toISOString().slice(0, 10)].filter(Boolean).join(' · '),
          severity: t.status === 'rascunho' ? 'attention' : 'info',
          dueAt: t.matchDate.toISOString(),
          actionUrl: `/dashboard/futebol/logistica/${t.id}/edit`,
          moduleRequired: 'futebol_logistica',
        });
      }
    }

    return {
      upcoming: trips.length,
      incompleteConvocation,
      items,
    };
  }

  private async buildAgenda(ctx: Ctx): Promise<ExecutiveAgendaItem[]> {
    if (!hasAnyModule(ctx.modules, ['futebol_logistica', 'futebol_captacao'])) return [];

    const items: ExecutiveAgendaItem[] = [];
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + ctx.periodDays);

    if (hasModule(ctx.modules, 'futebol_logistica')) {
      const tenantFilter = ctx.tenantId ? { tenantId: ctx.tenantId } : ctx.allowedTenants
        ? { tenantId: { in: ctx.allowedTenants } }
        : {};
      const entries = await this.prisma.footballAgendaEntry.findMany({
        where: {
          ...tenantFilter,
          startAt: { gte: now, lte: end },
          ...(ctx.category ? { category: ctx.category } : {}),
        },
        orderBy: { startAt: 'asc' },
        take: 20,
        select: {
          id: true,
          type: true,
          title: true,
          startAt: true,
          endAt: true,
          category: true,
        },
      });
      for (const e of entries) {
        items.push({
          id: e.id,
          type: e.type,
          title: e.title,
          startAt: e.startAt.toISOString(),
          endAt: e.endAt?.toISOString(),
          category: e.category ?? undefined,
          actionUrl: '/dashboard/futebol/agenda',
        });
      }
    }

    if (hasModule(ctx.modules, 'futebol_captacao')) {
      const ct = await this.prisma.scoutingProspect.findMany({
        where: {
          ...this.prospectWhere(ctx),
          ctScheduledAt: { gte: now, lte: end },
          ctScheduleStatus: 'agendado',
        },
        take: 10,
        select: {
          id: true,
          name: true,
          ctScheduledAt: true,
          targetCategory: true,
        },
      });
      for (const p of ct) {
        if (!p.ctScheduledAt) continue;
        items.push({
          id: `ct-${p.id}`,
          type: 'avaliacao_ct',
          title: `CT: ${p.name}`,
          startAt: p.ctScheduledAt.toISOString(),
          category: p.targetCategory ?? undefined,
          actionUrl: `/dashboard/futebol/captacao/prospects/${p.id}`,
        });
      }
    }

    return items
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      .slice(0, 25);
  }

  private async buildFinance(ctx: Ctx) {
    if (!hasAnyModule(ctx.modules, ['adm_financeiro', 'diretoria'])) return null;

    const tenantFilter = ctx.tenantId ? { tenantId: ctx.tenantId } : ctx.allowedTenants
      ? { tenantId: { in: ctx.allowedTenants } }
      : {};

    const pendingFinanceiroApprovals = hasModule(ctx.modules, 'adm_financeiro')
      ? await this.prisma.purchaseRequisition.count({
          where: { ...tenantFilter, status: 'aguardando_financeiro' },
        })
      : 0;

    const pendingDiretoriaApprovals = hasModule(ctx.modules, 'diretoria')
      ? await this.prisma.purchaseRequisition.count({
          where: { ...tenantFilter, status: 'aguardando_diretoria' },
        })
      : 0;

    let lancamentosPendentes: number | undefined;
    let lancamentosVencidos: number | undefined;
    if (hasModule(ctx.modules, 'adm_financeiro')) {
      const today = new Date();
      lancamentosPendentes = await this.prisma.financeiroLancamento.count({
        where: { ...tenantFilter, status: 'pendente', tipo: 'pagar' },
      });
      lancamentosVencidos = await this.prisma.financeiroLancamento.count({
        where: {
          ...tenantFilter,
          status: 'pendente',
          tipo: 'pagar',
          dueDate: { lt: today },
        },
      });
    }

    return {
      pendingFinanceiroApprovals,
      pendingDiretoriaApprovals,
      lancamentosPendentes,
      lancamentosVencidos,
    };
  }

  private buildKpis(
    ctx: Ctx,
    data: {
      squad: Awaited<ReturnType<FutebolExecutiveService['buildSquad']>>;
      decisions: ExecutiveActionItem[];
      alerts: ExecutiveActionItem[];
      captacao: Awaited<ReturnType<FutebolExecutiveService['buildCaptacao']>>;
      agenda: ExecutiveAgendaItem[];
      health: Awaited<ReturnType<FutebolExecutiveService['buildHealth']>>;
    },
  ): ExecutiveKpi[] {
    const kpis: ExecutiveKpi[] = [];

    if (data.squad) {
      kpis.push({
        id: 'athletes',
        label: 'Atletas',
        value: data.squad.total,
        breakdown: data.squad.byCategory,
        href: '/dashboard/cadastros/jogadores',
      });

      const disponivel =
        (data.squad.byStatus.available ?? 0) + (data.squad.byStatus.on_bench ?? 0);
      const indisponivel = Math.max(0, data.squad.total - disponivel);
      kpis.push({
        id: 'availability',
        label: 'Disponibilidade',
        value: disponivel,
        breakdown: { indisponivel, total: data.squad.total },
        href: '/dashboard/cadastros/jogadores',
      });
    }

    kpis.push({
      id: 'decisions',
      label: 'Decisões',
      value: data.decisions.length,
      href: '#decisoes',
    });

    const criticalAlerts = data.alerts.filter((a) => a.severity === 'critical').length;
    const attentionAlerts = data.alerts.filter((a) => a.severity === 'attention').length;
    kpis.push({
      id: 'alerts',
      label: 'Alertas',
      value: criticalAlerts,
      breakdown: { atencao: attentionAlerts, total: data.alerts.length },
      href: '#alertas',
    });

    if (data.captacao) {
      kpis.push({
        id: 'captacao-action',
        label: 'Captação',
        value: data.captacao.awaitingSchedule + data.captacao.supervisorApprovalPending,
        breakdown: {
          sem_agendamento: data.captacao.awaitingSchedule,
          aprovacao_supervisor: data.captacao.supervisorApprovalPending,
        },
        href: '/dashboard/futebol/captacao',
      });
    }

    kpis.push({
      id: 'agenda',
      label: 'Próximos',
      value: data.agenda.length,
      href: '#agenda',
    });

    return kpis;
  }

  private legalDocWhere(ctx: Ctx): Prisma.LegalDocumentWhereInput {
    return { player: this.playerWhere(ctx) };
  }

  private purchaseTitle(r: {
    departmentName?: string | null;
    justification?: string | null;
  }): string {
    if (r.departmentName?.trim()) return r.departmentName.trim();
    const j = r.justification?.trim();
    if (j) return j.length > 72 ? `${j.slice(0, 69)}…` : j;
    return 'Requisição de compra';
  }

  private buildQuickActions(modules: Set<string>) {
    const all = [
      { label: 'Relatórios dinâmicos', href: '/dashboard/relatorios/futebol/dinamicos', moduleSlug: 'relatorios_futebol' },
      { label: 'Cartões e suspensão', href: '/dashboard/relatorios/futebol/cartoes-suspensao', moduleSlug: 'relatorios_futebol' },
      { label: 'Captação', href: '/dashboard/futebol/captacao', moduleSlug: 'futebol_captacao' },
      { label: 'Avaliação CT', href: '/dashboard/futebol/captacao', moduleSlug: 'futebol_captacao' },
      { label: 'Logística', href: '/dashboard/futebol/logistica', moduleSlug: 'futebol_logistica' },
      { label: 'Agenda', href: '/dashboard/futebol/agenda', moduleSlug: 'futebol_logistica' },
      { label: 'Contratos', href: '/dashboard/juridico', moduleSlug: 'juridico' },
      { label: 'Aprovações compras', href: '/dashboard/diretoria/aprovacoes-compras', moduleSlug: 'diretoria' },
      { label: 'Aprovações financeiro', href: '/dashboard/adm/financeiro/aprovacoes', moduleSlug: 'adm_financeiro' },
      { label: 'Elenco', href: '/dashboard/cadastros/jogadores', moduleSlug: 'tipos' },
      { label: 'Fisioterapia', href: '/dashboard/saude/fisioterapia', moduleSlug: 'saude' },
      { label: 'Avaliação treinador', href: '/dashboard/futebol/treinadores/avaliacao-jogador', moduleSlug: 'futebol_treinadores' },
    ];
    return all.filter((a) => modules.has(a.moduleSlug));
  }
}
