import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { ModulesService } from '../modules/modules.service';
import { TenantAccessService } from '../auth/tenant-access.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  assertAthleteContractAccess,
  actorEmail,
  actorSub,
  resolveAthleteContractAccess,
} from './athlete-contract-access.util';
import {
  computeContractStatusHint,
  daysUntilEnd,
  matchesExpirationWindow,
  resolveAlertDays,
} from './athlete-contract-expiration.util';
import { validateParticipationPercentages } from './athlete-contract-participation.util';

@Injectable()
export class AthleteContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantAccess: TenantAccessService,
    private readonly modules: ModulesService,
  ) {}

  private async accessFor(user: CognitoJwtPayload) {
    const role = user.role ?? 'user';
    const slugs = await this.modules.getSlugsForActor(user.sub, role);
    return resolveAthleteContractAccess(role, slugs);
  }

  private async requirePlayer(
    playerId: string,
    allowedTenantIds: string[] | null,
  ) {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      include: { tenant: { select: { id: true, name: true } } },
    });
    if (!player) throw new NotFoundException('Atleta não encontrado.');
    this.tenantAccess.assertCanAccessTenant(allowedTenantIds, player.tenantId);
    return player;
  }

  async listContractTypes(tenantId: string, user: CognitoJwtPayload) {
    const access = await this.accessFor(user);
    assertAthleteContractAccess(access, 'canView');
    const allowed = await this.tenantAccess.getAllowedTenantIds(
      user.sub,
      user.role ?? 'user',
    );
    this.tenantAccess.assertCanAccessTenant(allowed, tenantId);
    return this.prisma.athleteContractType.findMany({
      where: { tenantId },
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    });
  }

  async upsertContractType(
    tenantId: string,
    user: CognitoJwtPayload,
    body: {
      id?: string;
      code: string;
      name: string;
      description?: string;
      active?: boolean;
      category?: string;
      config?: Record<string, unknown>;
    },
  ) {
    const access = await this.accessFor(user);
    assertAthleteContractAccess(access, 'canManageTypes');
    const allowed = await this.tenantAccess.getAllowedTenantIds(
      user.sub,
      user.role ?? 'user',
    );
    this.tenantAccess.assertCanAccessTenant(allowed, tenantId);
    const code = body.code?.trim();
    if (!code) throw new BadRequestException('Código do tipo é obrigatório.');
    const data = {
      code,
      name: body.name?.trim() || code,
      description: body.description?.trim() || null,
      active: body.active !== false,
      category: body.category?.trim() || null,
      config: (body.config ?? {}) as Prisma.InputJsonValue,
    };
    if (body.id) {
      return this.prisma.athleteContractType.update({
        where: { id: body.id },
        data,
      });
    }
    return this.prisma.athleteContractType.create({
      data: { tenantId, ...data },
    });
  }

  async getContractHub(
    playerId: string,
    user: CognitoJwtPayload,
    allowedTenantIds: string[] | null,
  ) {
    const access = await this.accessFor(user);
    assertAthleteContractAccess(access, 'canView');
    const player = await this.requirePlayer(playerId, allowedTenantIds);

    const [
      evaluation,
      federative,
      contracts,
      professionalizations,
      attachments,
    ] = await Promise.all([
      this.prisma.athleteEvaluation.findFirst({
        where: { playerId },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.athleteFederativeProcess.findFirst({
        where: { playerId },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.athleteContract.findMany({
        where: { playerId },
        include: {
          contractType: true,
          parties: true,
          participations: true,
          signatures: true,
          financeLinks: access.canViewFinancial,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.athleteProfessionalizationCase.findMany({
        where: { playerId },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.athleteContractAttachment.findMany({
        where: { playerId },
        orderBy: { uploadedAt: 'desc' },
      }),
    ]);

    const primary = contracts.find((c) =>
      ['ACTIVE', 'EXPIRING', 'PENDING_SIGNATURE'].includes(c.status),
    ) ?? contracts[0];

    const daysLeft = primary?.endDate ? daysUntilEnd(primary.endDate) : null;
    const pendingItems: string[] = [];
    if (evaluation?.status === 'EM_AVALIACAO') pendingItems.push('evaluation');
    if (federative && !['CONCLUIDO', 'REJEITADO', 'CANCELADO'].includes(federative.status)) {
      pendingItems.push('federation');
    }
    if (contracts.some((c) => c.status === 'PENDING_SIGNATURE')) {
      pendingItems.push('signature');
    }
    if (attachments.some((a) => a.expirationDate && daysUntilEnd(a.expirationDate)! < 0)) {
      pendingItems.push('documents_expired');
    }

    const summary = {
      athleteSituation: evaluation?.status ?? '—',
      federativeSituation: federative?.status ?? '—',
      primaryContractId: primary?.id ?? null,
      primaryContractType: primary?.contractType?.name ?? null,
      primaryStatus: primary ? computeContractStatusHint(primary.status, primary.endDate) : null,
      startDate: primary?.startDate?.toISOString().slice(0, 10) ?? null,
      endDate: primary?.endDate?.toISOString().slice(0, 10) ?? null,
      daysUntilExpiry: daysLeft,
      signatureStatus: primary?.signatureStatus ?? null,
      pendingItems,
      responsibleUserId:
        primary?.responsibleUserId ??
        federative?.responsibleUserId ??
        evaluation?.responsibleUserId ??
        null,
    };

    const sanitizedContracts = contracts.map((c) => ({
      ...c,
      financialTerms: access.canViewFinancial ? c.financialTerms : null,
      financeLinks: access.canViewFinancial ? c.financeLinks : [],
    }));

    return {
      tenantId: player.tenantId,
      tenantName: player.tenant.name,
      summary,
      evaluation,
      federative,
      contracts: sanitizedContracts,
      professionalizations: professionalizations.map((p) => ({
        ...p,
        salarySnapshot: access.canViewRhSalary ? p.salarySnapshot : null,
      })),
      attachments,
      access,
    };
  }

  async createContract(
    playerId: string,
    user: CognitoJwtPayload,
    allowedTenantIds: string[] | null,
    body: Record<string, unknown>,
  ) {
    const access = await this.accessFor(user);
    assertAthleteContractAccess(access, 'canManage');
    const player = await this.requirePlayer(playerId, allowedTenantIds);
    const participations = Array.isArray(body.participations) ? body.participations : [];
    const validated = validateParticipationPercentages(
      participations as Array<{ participationType: string; percentage?: number }>,
    );
    if (!validated.ok) throw new BadRequestException(validated.message);

    const parties = Array.isArray(body.parties) ? body.parties : [];
    const contract = await this.prisma.athleteContract.create({
      data: {
        tenantId: player.tenantId,
        playerId,
        contractTypeId: typeof body.contractTypeId === 'string' ? body.contractTypeId : null,
        status: typeof body.status === 'string' ? body.status : 'DRAFT',
        startDate: body.startDate ? new Date(String(body.startDate)) : null,
        endDate: body.endDate ? new Date(String(body.endDate)) : null,
        terminationDate: body.terminationDate ? new Date(String(body.terminationDate)) : null,
        clubName: typeof body.clubName === 'string' ? body.clubName : player.tenant.name,
        originClubName: typeof body.originClubName === 'string' ? body.originClubName : null,
        destinationClubName: typeof body.destinationClubName === 'string' ? body.destinationClubName : null,
        responsibleUserId: actorSub(user),
        responsibleDepartment: typeof body.responsibleDepartment === 'string' ? body.responsibleDepartment : null,
        notes: typeof body.notes === 'string' ? body.notes : null,
        financialTerms: access.canViewFinancial ? (body.financialTerms as Prisma.InputJsonValue) : undefined,
        signatureStatus: typeof body.signatureStatus === 'string' ? body.signatureStatus : 'PENDING',
        createdSource: 'native',
        isLegacyImport: false,
        legalDocumentId: typeof body.legalDocumentId === 'string' ? body.legalDocumentId : null,
        employmentContractId: typeof body.employmentContractId === 'string' ? body.employmentContractId : null,
        federativeProcessId: typeof body.federativeProcessId === 'string' ? body.federativeProcessId : null,
        createdByUserId: actorSub(user),
        parties: {
          create: parties
            .filter((p) => p && typeof p === 'object')
            .map((p) => {
              const row = p as Record<string, unknown>;
              return {
                partyType: String(row.partyType ?? 'other'),
                partyName: String(row.partyName ?? ''),
                roleLabel: typeof row.roleLabel === 'string' ? row.roleLabel : null,
                percentage: row.percentage != null ? new Prisma.Decimal(String(row.percentage)) : null,
                amount: row.amount != null ? new Prisma.Decimal(String(row.amount)) : null,
                notes: typeof row.notes === 'string' ? row.notes : null,
              };
            })
            .filter((p) => p.partyName.trim()),
        },
        participations: {
          create: participations
            .filter((p) => p && typeof p === 'object')
            .map((p) => {
              const row = p as Record<string, unknown>;
              return {
                participationType: String(row.participationType ?? 'other'),
                partyName: typeof row.partyName === 'string' ? row.partyName : null,
                percentage: row.percentage != null ? new Prisma.Decimal(String(row.percentage)) : null,
                amount: row.amount != null ? new Prisma.Decimal(String(row.amount)) : null,
                notes: typeof row.notes === 'string' ? row.notes : null,
              };
            }),
        },
        signatures: {
          create: {
            provider: typeof body.signatureProvider === 'string' ? body.signatureProvider : 'manual',
            overallStatus: 'PENDING',
          },
        },
      },
      include: { contractType: true, parties: true, participations: true, signatures: true },
    });

    await this.prisma.athleteContractAuditLog.create({
      data: {
        contractId: contract.id,
        actorUserId: actorSub(user),
        actorEmail: actorEmail(user),
        changeType: 'create',
        after: { status: contract.status },
      },
    });

    return contract;
  }

  async createLegacyContract(
    playerId: string,
    user: CognitoJwtPayload,
    allowedTenantIds: string[] | null,
    body: Record<string, unknown>,
  ) {
    const access = await this.accessFor(user);
    assertAthleteContractAccess(access, 'canManageLegacy');
    const player = await this.requirePlayer(playerId, allowedTenantIds);
    return this.prisma.athleteContract.create({
      data: {
        tenantId: player.tenantId,
        playerId,
        contractTypeId: typeof body.contractTypeId === 'string' ? body.contractTypeId : null,
        status: typeof body.status === 'string' ? body.status : 'ARCHIVED',
        startDate: body.startDate ? new Date(String(body.startDate)) : null,
        endDate: body.endDate ? new Date(String(body.endDate)) : null,
        clubName: typeof body.clubName === 'string' ? body.clubName : null,
        notes: typeof body.notes === 'string' ? body.notes : null,
        createdSource: 'legacy_import',
        isLegacyImport: true,
        legacySourceLabel: typeof body.legacySourceLabel === 'string' ? body.legacySourceLabel : 'historical',
        legalDocumentId: typeof body.legalDocumentId === 'string' ? body.legalDocumentId : null,
        createdByUserId: actorSub(user),
        signatureStatus: 'manual',
      },
    });
  }

  async upsertEvaluation(
    playerId: string,
    user: CognitoJwtPayload,
    allowedTenantIds: string[] | null,
    body: Record<string, unknown>,
  ) {
    const access = await this.accessFor(user);
    assertAthleteContractAccess(access, 'canManage');
    const player = await this.requirePlayer(playerId, allowedTenantIds);
    const status = String(body.status ?? 'EM_AVALIACAO');
    const existing = await this.prisma.athleteEvaluation.findFirst({
      where: { playerId, status: { in: ['EM_AVALIACAO', 'APROVADO', 'REPROVADO'] } },
      orderBy: { updatedAt: 'desc' },
    });
    const payload = {
      status,
      evaluationStartedAt: body.evaluationStartedAt
        ? new Date(String(body.evaluationStartedAt))
        : existing?.evaluationStartedAt ?? new Date(),
      evaluationEndedAt:
        status !== 'EM_AVALIACAO'
          ? body.evaluationEndedAt
            ? new Date(String(body.evaluationEndedAt))
            : new Date()
          : null,
      decision: typeof body.decision === 'string' ? body.decision : status,
      decisionAt: status !== 'EM_AVALIACAO' ? new Date() : null,
      responsibleUserId: actorSub(user),
      responsibleEmail: actorEmail(user),
      notes: typeof body.notes === 'string' ? body.notes : null,
    };
    if (existing) {
      return this.prisma.athleteEvaluation.update({ where: { id: existing.id }, data: payload });
    }
    return this.prisma.athleteEvaluation.create({
      data: { tenantId: player.tenantId, playerId, ...payload },
    });
  }

  async upsertFederative(
    playerId: string,
    user: CognitoJwtPayload,
    allowedTenantIds: string[] | null,
    body: Record<string, unknown>,
  ) {
    const access = await this.accessFor(user);
    assertAthleteContractAccess(access, 'canManage');
    const player = await this.requirePlayer(playerId, allowedTenantIds);
    const existing = await this.prisma.athleteFederativeProcess.findFirst({
      where: { playerId },
      orderBy: { updatedAt: 'desc' },
    });
    const payload = {
      status: String(body.status ?? existing?.status ?? 'PENDENTE'),
      documentsCheckedAt: body.documentsCheckedAt
        ? new Date(String(body.documentsCheckedAt))
        : existing?.documentsCheckedAt,
      registrationStatus:
        typeof body.registrationStatus === 'string' ? body.registrationStatus : existing?.registrationStatus,
      federationFeeAmount:
        body.federationFeeAmount != null
          ? new Prisma.Decimal(String(body.federationFeeAmount))
          : existing?.federationFeeAmount,
      transferFeeAmount:
        body.transferFeeAmount != null
          ? new Prisma.Decimal(String(body.transferFeeAmount))
          : existing?.transferFeeAmount,
      externalProcessNotes:
        typeof body.externalProcessNotes === 'string' ? body.externalProcessNotes : existing?.externalProcessNotes,
      completedAt:
        String(body.status) === 'CONCLUIDO'
          ? body.completedAt
            ? new Date(String(body.completedAt))
            : new Date()
          : null,
      responsibleUserId: actorSub(user),
      responsibleEmail: actorEmail(user),
      notes: typeof body.notes === 'string' ? body.notes : existing?.notes,
    };
    if (existing) {
      return this.prisma.athleteFederativeProcess.update({ where: { id: existing.id }, data: payload });
    }
    return this.prisma.athleteFederativeProcess.create({
      data: { tenantId: player.tenantId, playerId, ...payload },
    });
  }

  async startProfessionalization(
    playerId: string,
    user: CognitoJwtPayload,
    allowedTenantIds: string[] | null,
    body: Record<string, unknown>,
  ) {
    const access = await this.accessFor(user);
    assertAthleteContractAccess(access, 'canManage');
    const player = await this.requirePlayer(playerId, allowedTenantIds);
    return this.prisma.athleteProfessionalizationCase.create({
      data: {
        tenantId: player.tenantId,
        playerId,
        status: typeof body.status === 'string' ? body.status : 'PENDENTE',
        effectiveDate: body.effectiveDate ? new Date(String(body.effectiveDate)) : null,
        employmentId: typeof body.employmentId === 'string' ? body.employmentId : null,
        employmentContractId: typeof body.employmentContractId === 'string' ? body.employmentContractId : null,
        salarySnapshot: access.canViewRhSalary ? (body.salarySnapshot as Prisma.InputJsonValue) : undefined,
        requiredDocuments: body.requiredDocuments as Prisma.InputJsonValue,
        responsibleUserId: actorSub(user),
        responsibleEmail: actorEmail(user),
        notes: typeof body.notes === 'string' ? body.notes : null,
      },
    });
  }

  async mapAthleteContractsToOverviewRows(playerId: string) {
    const rows = await this.prisma.athleteContract.findMany({
      where: { playerId },
      include: { contractType: true },
      orderBy: { startDate: 'desc' },
    });
    return rows.map((c) => ({
      id: `athlete-${c.id}`,
      source: 'athlete' as const,
      displayId: c.id.slice(0, 8).toUpperCase(),
      startDate: c.startDate ? c.startDate.toISOString() : null,
      endDate: c.endDate ? c.endDate.toISOString() : null,
      economicRightsClub: c.clubName,
      status: c.status,
      contractType: c.contractType?.name ?? c.createdSource,
      destinationClub: c.destinationClubName,
      executionPercent: null,
      athleteContractId: c.id,
      isLegacyImport: c.isLegacyImport,
    }));
  }

  async runContractReport(
    tenantId: string,
    user: CognitoJwtPayload,
    filters: Record<string, unknown>,
  ) {
    const access = await this.accessFor(user);
    assertAthleteContractAccess(access, 'canReport');
    const allowed = await this.tenantAccess.getAllowedTenantIds(user.sub, user.role ?? 'user');
    this.tenantAccess.assertCanAccessTenant(allowed, tenantId);

    const where: Prisma.AthleteContractWhereInput = { tenantId };
    if (typeof filters.playerId === 'string') where.playerId = filters.playerId;
    if (typeof filters.contractTypeId === 'string') where.contractTypeId = filters.contractTypeId;
    if (typeof filters.status === 'string') where.status = filters.status;
    if (typeof filters.signatureStatus === 'string') where.signatureStatus = filters.signatureStatus;
    const windowDays =
      typeof filters.expirationWindowDays === 'number'
        ? filters.expirationWindowDays
        : Number(filters.expirationWindowDays);

    const rows = await this.prisma.athleteContract.findMany({
      where,
      include: {
        contractType: true,
        player: { select: { id: true, name: true, category: true } },
        parties: true,
      },
      orderBy: [{ endDate: 'asc' }, { createdAt: 'desc' }],
      take: Math.min(Number(filters.limit) || 200, 500),
      skip: Math.max(Number(filters.offset) || 0, 0),
    });

    let filtered = rows;
    if (Number.isFinite(windowDays) && windowDays > 0) {
      filtered = rows.filter((r) => matchesExpirationWindow(r.endDate, windowDays));
    }
    if (filters.preset === 'expired') {
      filtered = filtered.filter((r) => daysUntilEnd(r.endDate) != null && (daysUntilEnd(r.endDate) as number) < 0);
    }
    if (filters.preset === 'awaiting_signature') {
      filtered = filtered.filter((r) => r.status === 'PENDING_SIGNATURE');
    }

    return {
      total: filtered.length,
      rows: filtered.map((r) => ({
        id: r.id,
        playerId: r.playerId,
        playerName: r.player.name,
        category: r.player.category,
        contractType: r.contractType?.name,
        status: computeContractStatusHint(r.status, r.endDate),
        signatureStatus: r.signatureStatus,
        startDate: r.startDate,
        endDate: r.endDate,
        daysUntilExpiry: daysUntilEnd(r.endDate),
        parties: r.parties,
        isLegacyImport: r.isLegacyImport,
      })),
    };
  }

  async getContractualDossier(
    playerId: string,
    user: CognitoJwtPayload,
    allowedTenantIds: string[] | null,
  ) {
    const hub = await this.getContractHub(playerId, user, allowedTenantIds);
    return {
      generatedAt: new Date().toISOString(),
      playerId,
      summary: hub.summary,
      evaluation: hub.evaluation,
      federative: hub.federative,
      activeContracts: hub.contracts.filter((c) =>
        ['ACTIVE', 'EXPIRING', 'PENDING_SIGNATURE'].includes(c.status),
      ),
      historicalContracts: hub.contracts.filter((c) =>
        ['ARCHIVED', 'EXPIRED', 'TERMINATED', 'CANCELLED'].includes(c.status) || c.isLegacyImport,
      ),
      attachments: hub.attachments,
      participations: hub.contracts.flatMap((c) => c.participations ?? []),
      parties: hub.contracts.flatMap((c) => c.parties ?? []),
      financialSummaryAllowed: hub.access.canViewFinancial,
      pendingItems: hub.summary.pendingItems,
    };
  }

  async tenantExpirationAlerts(tenantId: string, user: CognitoJwtPayload) {
    const access = await this.accessFor(user);
    assertAthleteContractAccess(access, 'canView');
    const contracts = await this.prisma.athleteContract.findMany({
      where: { tenantId, status: { in: ['ACTIVE', 'EXPIRING', 'PENDING_SIGNATURE'] } },
      include: { contractType: true, player: { select: { name: true } } },
    });
    const alerts: Array<{ kind: string; contractId: string; playerName: string; days: number }> = [];
    for (const c of contracts) {
      const days = daysUntilEnd(c.endDate);
      const alertDays = resolveAlertDays(c.contractType?.config);
      if (days == null) continue;
      if (days < 0) {
        alerts.push({ kind: 'expired', contractId: c.id, playerName: c.player.name, days });
        continue;
      }
      if (alertDays.includes(days)) {
        alerts.push({ kind: 'expiring', contractId: c.id, playerName: c.player.name, days });
      }
    }
    return alerts;
  }
}
