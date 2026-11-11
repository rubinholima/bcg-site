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
import { S3Service } from '../s3/s3.service';
import { FinanceiroLancamentosService } from '../financeiro/financeiro-lancamentos.service';
import { buildContractualDossierPrintHtml } from './athlete-contract-dossier-print';
import { AthleteContractPdfService } from './athlete-contract-pdf.service';
import {
  ATHLETE_CONTRACT_REPORT_PRESETS,
  applyExpirationPreset,
  categoryLooksFormation,
  categoryLooksProfessional,
  normalizeReportSort,
} from './athlete-contract-report.util';
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
    private readonly s3: S3Service,
    private readonly financeiro: FinanceiroLancamentosService,
    private readonly contractPdf: AthleteContractPdfService,
  ) {}

  static reportPresets() {
    return ATHLETE_CONTRACT_REPORT_PRESETS;
  }

  private documentCategories = new Set([
    'PERSONAL',
    'FEDERATIVE',
    'CONTRACTUAL',
    'PROFESSIONAL_RH',
    'FINANCIAL',
    'OTHER',
  ]);

  private financeLinkTypes = new Set([
    'federation_fee',
    'transfer_fee',
    'salary_reference',
    'allowance',
    'contractual_payment',
    'other',
  ]);

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

    const financeLinks =
      access.canViewFinancial
        ? await this.prisma.athleteContractFinanceLink.findMany({
            where: { OR: [{ playerId }, { contract: { playerId } }, { federativeProcess: { playerId } }] },
            orderBy: { updatedAt: 'desc' },
            take: 50,
          })
        : [];

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
    const docExpiring = attachments.filter(
      (a) => a.expirationDate && daysUntilEnd(a.expirationDate)! >= 0 && daysUntilEnd(a.expirationDate)! <= 30,
    );
    if (attachments.some((a) => a.expirationDate && daysUntilEnd(a.expirationDate)! < 0)) {
      pendingItems.push('documents_expired');
    } else if (docExpiring.length) {
      pendingItems.push('documents_expiring');
    }
    const proPending = professionalizations.find((p) =>
      ['PENDENTE', 'DOCUMENTOS_PENDENTES'].includes(p.status),
    );
    if (proPending) pendingItems.push('professionalization');
    const finPending = financeLinks.filter((f) => f.status === 'pendente' || f.status === 'pending');
    const finPaid = financeLinks.filter((f) => f.status === 'pago' || f.status === 'paid');
    if (finPending.length && access.canViewFinancial) pendingItems.push('financial');

    const mapFinanceLink = (f: (typeof financeLinks)[number]) => ({
      ...f,
      amount: f.amount != null ? Number(f.amount) : null,
    });

    const financialSummary = access.canViewFinancial
      ? {
          totalLinks: financeLinks.length,
          pendingCount: finPending.length,
          paidCount: finPaid.length,
          federationFees: financeLinks.filter((f) => f.linkType === 'federation_fee').length,
          transferFees: financeLinks.filter((f) => f.linkType === 'transfer_fee').length,
          allowances: financeLinks.filter((f) => f.linkType === 'allowance').length,
          salaryReferences: financeLinks.filter((f) => f.linkType === 'salary_reference').length,
          contractualPayments: financeLinks.filter((f) => f.linkType === 'contractual_payment').length,
        }
      : { restricted: true as const, pendingCount: finPending.length };

    const summary = {
      athleteSituation: evaluation?.status ?? '—',
      federativeSituation: federative?.status ?? '—',
      professionalSituation: proPending?.status ?? professionalizations[0]?.status ?? '—',
      primaryContractId: primary?.id ?? null,
      primaryContractType: primary?.contractType?.name ?? null,
      primaryStatus: primary ? computeContractStatusHint(primary.status, primary.endDate) : null,
      startDate: primary?.startDate?.toISOString().slice(0, 10) ?? null,
      endDate: primary?.endDate?.toISOString().slice(0, 10) ?? null,
      daysUntilExpiry: daysLeft,
      signatureStatus: primary?.signatureStatus ?? null,
      pendingItems,
      financialPendingCount: access.canViewFinancial ? finPending.length : null,
      documentPendingCount: docExpiring.length + attachments.filter((a) => !a.fileKey).length,
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
      attachments: attachments.map((a) => ({
        ...a,
        contractLabel: a.contractId ? contracts.find((c) => c.id === a.contractId)?.contractType?.name ?? a.contractId : null,
        federativeProcessId: a.federativeProcessId,
      })),
      financeLinks: access.canViewFinancial ? financeLinks.map(mapFinanceLink) : [],
      financialSummary,
      access: {
        canView: access.canView,
        canManage: access.canManage,
        canManageTypes: access.canManageTypes,
        canViewFinancial: access.canViewFinancial,
        canViewRhSalary: access.canViewRhSalary,
        canReport: access.canReport,
      },
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
    const parties = Array.isArray(body.parties) ? body.parties : [];
    const participations = Array.isArray(body.participations) ? body.participations : [];
    if (participations.length) {
      const validated = validateParticipationPercentages(
        participations as Array<{ participationType: string; percentage?: number }>,
      );
      if (!validated.ok) throw new BadRequestException(validated.message);
    }

    const contract = await this.prisma.athleteContract.create({
      data: {
        tenantId: player.tenantId,
        playerId,
        contractTypeId: typeof body.contractTypeId === 'string' ? body.contractTypeId : null,
        status: typeof body.status === 'string' ? body.status : 'ARCHIVED',
        startDate: body.startDate ? new Date(String(body.startDate)) : null,
        endDate: body.endDate ? new Date(String(body.endDate)) : null,
        terminationDate: body.terminationDate ? new Date(String(body.terminationDate)) : null,
        clubName: typeof body.clubName === 'string' ? body.clubName : player.tenant.name,
        originClubName: typeof body.originClubName === 'string' ? body.originClubName : null,
        destinationClubName: typeof body.destinationClubName === 'string' ? body.destinationClubName : null,
        notes: typeof body.notes === 'string' ? body.notes : null,
        createdSource: 'legacy_import',
        isLegacyImport: true,
        legacySourceLabel: typeof body.legacySourceLabel === 'string' ? body.legacySourceLabel : 'historical',
        legalDocumentId: typeof body.legalDocumentId === 'string' ? body.legalDocumentId : null,
        createdByUserId: actorSub(user),
        signatureStatus: 'manual',
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
                notes: typeof row.notes === 'string' ? row.notes : null,
              };
            }),
        },
      },
      include: { contractType: true, parties: true, participations: true },
    });

    if (typeof body.attachmentId === 'string') {
      await this.prisma.athleteContractAttachment.updateMany({
        where: { id: String(body.attachmentId), playerId },
        data: { contractId: contract.id },
      });
    }

    return contract;
  }

  async uploadHubDocument(
    playerId: string,
    user: CognitoJwtPayload,
    allowedTenantIds: string[] | null,
    file: { buffer: Buffer; originalname: string; mimetype?: string },
    fields: Record<string, string | undefined>,
  ) {
    const access = await this.accessFor(user);
    assertAthleteContractAccess(access, 'canManage');
    const player = await this.requirePlayer(playerId, allowedTenantIds);

    const category = (fields.category ?? '').trim().toUpperCase();
    if (!this.documentCategories.has(category)) {
      throw new BadRequestException('Categoria de documento inválida.');
    }

    let fileKey = '';
    let fileUrl: string | null = null;
    const legalDocumentId = fields.legalDocumentId?.trim();

    if (legalDocumentId) {
      const legal = await this.prisma.legalDocument.findFirst({
        where: { id: legalDocumentId, playerId },
      });
      if (!legal) throw new NotFoundException('Documento jurídico não encontrado.');
      fileKey = legal.fileKey;
      fileUrl = legal.fileUrl;
    } else {
      if (!file?.buffer?.length) throw new BadRequestException('Envie um arquivo (campo "file").');
      const up = await this.s3.uploadPlayerRegistrationDocument(
        file.buffer,
        playerId,
        file.originalname,
        file.mimetype,
      );
      fileKey = up.key;
      fileUrl = up.url;
    }

    const row = await this.prisma.athleteContractAttachment.create({
      data: {
        playerId,
        category,
        documentType: fields.documentType?.trim() || null,
        description: fields.description?.trim() || null,
        contractId: fields.contractId?.trim() || null,
        federativeProcessId: fields.federativeProcessId?.trim() || null,
        professionalizationCaseId: fields.professionalizationCaseId?.trim() || null,
        fileKey,
        fileUrl,
        legalDocumentId: legalDocumentId || null,
        issueDate: fields.issueDate ? new Date(fields.issueDate) : null,
        expirationDate: fields.expirationDate ? new Date(fields.expirationDate) : null,
        uploadedByUserId: actorSub(user),
        uploadedByEmail: actorEmail(user),
      },
    });

    return row;
  }

  async streamHubDocument(
    playerId: string,
    attachmentId: string,
    user: CognitoJwtPayload,
    allowedTenantIds: string[] | null,
  ) {
    const access = await this.accessFor(user);
    assertAthleteContractAccess(access, 'canView');
    await this.requirePlayer(playerId, allowedTenantIds);
    const att = await this.prisma.athleteContractAttachment.findFirst({
      where: { id: attachmentId, playerId },
    });
    if (!att) throw new NotFoundException('Documento não encontrado.');
    const buffer = await this.s3.getObjectBuffer(att.fileKey);
    const name = att.documentType || att.category || 'documento';
    return { buffer, filename: `${name}.pdf` };
  }

  async createFinanceLink(
    playerId: string,
    user: CognitoJwtPayload,
    allowedTenantIds: string[] | null,
    body: Record<string, unknown>,
  ) {
    const access = await this.accessFor(user);
    assertAthleteContractAccess(access, 'canManage');
    if (!access.canViewFinancial) {
      throw new BadRequestException('Sem permissão financeira para vincular lançamentos.');
    }
    const player = await this.requirePlayer(playerId, allowedTenantIds);
    const linkType = String(body.linkType ?? 'other');
    if (!this.financeLinkTypes.has(linkType)) {
      throw new BadRequestException('Tipo de vínculo financeiro inválido.');
    }
    if (!body.contractId && !body.federativeProcessId && !playerId) {
      throw new BadRequestException('Informe contrato, federação ou atleta.');
    }

    const link = await this.prisma.athleteContractFinanceLink.create({
      data: {
        playerId,
        contractId: typeof body.contractId === 'string' ? body.contractId : null,
        federativeProcessId: typeof body.federativeProcessId === 'string' ? body.federativeProcessId : null,
        linkType,
        referenceId: typeof body.referenceId === 'string' ? body.referenceId : null,
        financeiroLancamentoId:
          typeof body.financeiroLancamentoId === 'string' ? body.financeiroLancamentoId : null,
        omieReference: typeof body.omieReference === 'string' ? body.omieReference : null,
        description: typeof body.description === 'string' ? body.description : null,
        amount: body.amount != null ? new Prisma.Decimal(String(body.amount)) : null,
        currency: typeof body.currency === 'string' ? body.currency : 'BRL',
        status: typeof body.status === 'string' ? body.status : 'pendente',
      },
    });

    if (link.financeiroLancamentoId) {
      const lanc = await this.prisma.financeiroLancamento.findFirst({
        where: { id: link.financeiroLancamentoId, tenantId: player.tenantId },
      });
      if (!lanc) throw new NotFoundException('Lançamento financeiro não encontrado.');
    }

    if (
      body.createLancamento === true &&
      body.amount != null &&
      typeof body.lancamentoDescricao === 'string'
    ) {
      const created = await this.financeiro.create({
        tenantId: player.tenantId,
        tipo: 'pagar',
        descricao: body.lancamentoDescricao,
        valor: Number(body.amount),
        dueDate: body.dueDate ? String(body.dueDate) : new Date().toISOString().slice(0, 10),
        status: 'pendente',
        sourceModule: 'athlete_contracts',
        sourceType: linkType,
        sourceId: link.id,
        createdByUserId: actorSub(user),
      });
      return this.prisma.athleteContractFinanceLink.update({
        where: { id: link.id },
        data: {
          financeiroLancamentoId: created.id,
          referenceId: created.id,
        },
      });
    }

    return link;
  }

  async updateFinanceLink(
    playerId: string,
    linkId: string,
    user: CognitoJwtPayload,
    allowedTenantIds: string[] | null,
    body: Record<string, unknown>,
  ) {
    const access = await this.accessFor(user);
    assertAthleteContractAccess(access, 'canManage');
    if (!access.canViewFinancial) {
      throw new BadRequestException('Sem permissão financeira para editar vínculos.');
    }
    await this.requirePlayer(playerId, allowedTenantIds);
    const existing = await this.prisma.athleteContractFinanceLink.findFirst({
      where: { id: linkId, playerId },
    });
    if (!existing) throw new NotFoundException('Vínculo financeiro não encontrado.');
    const linkType =
      typeof body.linkType === 'string' ? body.linkType : existing.linkType;
    if (!this.financeLinkTypes.has(linkType)) {
      throw new BadRequestException('Tipo de vínculo financeiro inválido.');
    }
    return this.prisma.athleteContractFinanceLink.update({
      where: { id: linkId },
      data: {
        linkType,
        contractId:
          typeof body.contractId === 'string'
            ? body.contractId
            : body.contractId === null
              ? null
              : existing.contractId,
        federativeProcessId:
          typeof body.federativeProcessId === 'string'
            ? body.federativeProcessId
            : body.federativeProcessId === null
              ? null
              : existing.federativeProcessId,
        referenceId:
          typeof body.referenceId === 'string' ? body.referenceId : existing.referenceId,
        financeiroLancamentoId:
          typeof body.financeiroLancamentoId === 'string'
            ? body.financeiroLancamentoId
            : existing.financeiroLancamentoId,
        omieReference:
          typeof body.omieReference === 'string' ? body.omieReference : existing.omieReference,
        description:
          typeof body.description === 'string' ? body.description : existing.description,
        amount:
          body.amount != null ? new Prisma.Decimal(String(body.amount)) : existing.amount,
        currency: typeof body.currency === 'string' ? body.currency : existing.currency,
        status: typeof body.status === 'string' ? body.status : existing.status,
      },
    });
  }

  async deleteFinanceLink(
    playerId: string,
    linkId: string,
    user: CognitoJwtPayload,
    allowedTenantIds: string[] | null,
  ) {
    const access = await this.accessFor(user);
    assertAthleteContractAccess(access, 'canManage');
    if (!access.canViewFinancial) {
      throw new BadRequestException('Sem permissão financeira para remover vínculos.');
    }
    await this.requirePlayer(playerId, allowedTenantIds);
    const existing = await this.prisma.athleteContractFinanceLink.findFirst({
      where: { id: linkId, playerId },
    });
    if (!existing) throw new NotFoundException('Vínculo financeiro não encontrado.');
    await this.prisma.athleteContractFinanceLink.delete({ where: { id: linkId } });
    return { ok: true };
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

    const preset = typeof filters.preset === 'string' ? filters.preset : undefined;
  const windowDays =
    typeof filters.expirationWindowDays === 'number'
      ? filters.expirationWindowDays
      : Number(filters.expirationWindowDays);

    if (preset === 'no_active_contract') {
      const players = await this.prisma.player.findMany({
        where: {
          tenantId,
          ...(typeof filters.category === 'string' ? { category: filters.category } : {}),
          ...(typeof filters.playerId === 'string' ? { id: filters.playerId } : {}),
        },
        select: { id: true, name: true, category: true },
        take: 500,
      });
      const active = await this.prisma.athleteContract.findMany({
        where: { tenantId, status: { in: ['ACTIVE', 'EXPIRING', 'PENDING_SIGNATURE'] } },
        select: { playerId: true },
      });
      const activeSet = new Set(active.map((a) => a.playerId));
      const missing = players.filter((p) => !activeSet.has(p.id));
      const { sortBy, sortDir } = normalizeReportSort(
        typeof filters.sortBy === 'string' ? filters.sortBy : undefined,
        typeof filters.sortDir === 'string' ? filters.sortDir : undefined,
      );
      missing.sort((a, b) => {
        const cmp = a.name.localeCompare(b.name, 'pt-BR');
        return sortDir === 'desc' ? -cmp : cmp;
      });
      const offset = Math.max(Number(filters.offset) || 0, 0);
      const limit = Math.min(Number(filters.limit) || 200, 500);
      const slice = missing.slice(offset, offset + limit);
      return {
        total: missing.length,
        rows: slice.map((p) => ({
          id: `no-contract-${p.id}`,
          playerId: p.id,
          playerName: p.name,
          category: p.category,
          contractType: null,
          status: 'NO_ACTIVE_CONTRACT',
          signatureStatus: null,
          startDate: null,
          endDate: null,
          daysUntilExpiry: null,
          parties: [],
          isLegacyImport: false,
        })),
        presets: ATHLETE_CONTRACT_REPORT_PRESETS,
        sortBy,
        sortDir,
      };
    }

    const where: Prisma.AthleteContractWhereInput = { tenantId };
    if (typeof filters.playerId === 'string') where.playerId = filters.playerId;
    if (typeof filters.contractTypeId === 'string') where.contractTypeId = filters.contractTypeId;
    if (typeof filters.status === 'string') where.status = filters.status;
    if (typeof filters.signatureStatus === 'string') where.signatureStatus = filters.signatureStatus;
    if (typeof filters.responsibleUserId === 'string') where.responsibleUserId = filters.responsibleUserId;
    if (filters.startDateFrom || filters.startDateTo) {
      where.startDate = {};
      if (filters.startDateFrom) where.startDate.gte = new Date(String(filters.startDateFrom));
      if (filters.startDateTo) where.startDate.lte = new Date(String(filters.startDateTo));
    }
    if (filters.endDateFrom || filters.endDateTo) {
      where.endDate = {};
      if (filters.endDateFrom) where.endDate.gte = new Date(String(filters.endDateFrom));
      if (filters.endDateTo) where.endDate.lte = new Date(String(filters.endDateTo));
    }
    if (typeof filters.category === 'string') {
      where.player = { category: filters.category };
    }

    const takeAll = Math.min(Number(filters.limit) || 200, 500) + Math.max(Number(filters.offset) || 0, 0);
    const rows = await this.prisma.athleteContract.findMany({
      where,
      include: {
        contractType: true,
        player: { select: { id: true, name: true, category: true } },
        parties: true,
        financeLinks: access.canViewFinancial,
        federativeProcess: true,
      },
      orderBy: [{ endDate: 'asc' }, { createdAt: 'desc' }],
      take: Math.min(takeAll, 1000),
    });

    const fedMap = await this.prisma.athleteFederativeProcess.findMany({
      where: { tenantId },
      select: { playerId: true, status: true },
    });
    const fedByPlayer = new Map(fedMap.map((f) => [f.playerId, f.status]));

    let filtered = rows;
    if (Number.isFinite(windowDays) && windowDays > 0) {
      filtered = filtered.filter((r) => matchesExpirationWindow(r.endDate, windowDays));
    }
    if (preset) {
      if (preset === 'expired' || preset === 'awaiting_signature' || preset.startsWith('expiring_')) {
        filtered = filtered.filter((r) => applyExpirationPreset(preset, r.endDate, r.status));
      }
      if (preset === 'awaiting_federation') {
        filtered = filtered.filter((r) => {
          const st = r.federativeProcess?.status ?? fedByPlayer.get(r.playerId);
          return st && !['CONCLUIDO', 'REJEITADO', 'CANCELADO'].includes(st);
        });
      }
      if (preset === 'professional') {
        filtered = filtered.filter((r) => categoryLooksProfessional(r.player.category));
      }
      if (preset === 'formation') {
        filtered = filtered.filter((r) => categoryLooksFormation(r.player.category));
      }
      if (preset === 'agent_intermediary') {
        filtered = filtered.filter((r) =>
          r.parties.some((p) => ['agent', 'intermediary', 'agente'].includes(p.partyType.toLowerCase())),
        );
      }
      if (preset === 'partner_club') {
        filtered = filtered.filter(
          (r) =>
            Boolean(r.destinationClubName) ||
            r.parties.some((p) => p.partyType.toLowerCase().includes('partner')),
        );
      }
    }

    if (filters.federativeStatus && typeof filters.federativeStatus === 'string') {
      filtered = filtered.filter((r) => {
        const st = r.federativeProcess?.status ?? fedByPlayer.get(r.playerId);
        return st === filters.federativeStatus;
      });
    }
    if (filters.financialPending === true && access.canViewFinancial) {
      filtered = filtered.filter((r) =>
        (r.financeLinks ?? []).some((f) => f.status === 'pendente' || f.status === 'pending'),
      );
    }
    if (filters.professional === true) {
      filtered = filtered.filter((r) => categoryLooksProfessional(r.player.category));
    }
    if (filters.formation === true) {
      filtered = filtered.filter((r) => categoryLooksFormation(r.player.category));
    }
    if (typeof filters.clubName === 'string' && filters.clubName.trim()) {
      const q = filters.clubName.trim().toLowerCase();
      filtered = filtered.filter(
        (r) =>
          (r.clubName?.toLowerCase().includes(q) ?? false) ||
          (r.destinationClubName?.toLowerCase().includes(q) ?? false) ||
          (r.originClubName?.toLowerCase().includes(q) ?? false),
      );
    }
    if (typeof filters.agentName === 'string' && filters.agentName.trim()) {
      const q = filters.agentName.trim().toLowerCase();
      filtered = filtered.filter((r) =>
        r.parties.some(
          (p) =>
            ['agent', 'intermediary', 'agente', 'intermediario'].includes(
              p.partyType.toLowerCase(),
            ) && p.partyName.toLowerCase().includes(q),
        ),
      );
    }
    if (typeof filters.partnerClubName === 'string' && filters.partnerClubName.trim()) {
      const q = filters.partnerClubName.trim().toLowerCase();
      filtered = filtered.filter(
        (r) =>
          (r.destinationClubName?.toLowerCase().includes(q) ?? false) ||
          r.parties.some(
            (p) =>
              p.partyType.toLowerCase().includes('partner') &&
              p.partyName.toLowerCase().includes(q),
          ),
      );
    }
    if (filters.athleteSegment === 'professional') {
      filtered = filtered.filter((r) => categoryLooksProfessional(r.player.category));
    }
    if (filters.athleteSegment === 'formation') {
      filtered = filtered.filter((r) => categoryLooksFormation(r.player.category));
    }

    const { sortBy, sortDir } = normalizeReportSort(
      typeof filters.sortBy === 'string' ? filters.sortBy : undefined,
      typeof filters.sortDir === 'string' ? filters.sortDir : undefined,
    );
    const sorted = [...filtered].sort((a, b) => {
      const dir = sortDir === 'desc' ? -1 : 1;
      if (sortBy === 'playerName') return a.player.name.localeCompare(b.player.name, 'pt-BR') * dir;
      if (sortBy === 'category') {
        return String(a.player.category ?? '').localeCompare(String(b.player.category ?? '')) * dir;
      }
      if (sortBy === 'daysUntilExpiry') {
        return ((daysUntilEnd(a.endDate) ?? 9999) - (daysUntilEnd(b.endDate) ?? 9999)) * dir;
      }
      const av = a[sortBy as keyof typeof a];
      const bv = b[sortBy as keyof typeof b];
      if (av instanceof Date && bv instanceof Date) return (av.getTime() - bv.getTime()) * dir;
      return String(av ?? '').localeCompare(String(bv ?? '')) * dir;
    });

    const offset = Math.max(Number(filters.offset) || 0, 0);
    const limit = Math.min(Number(filters.limit) || 200, 500);
    const page = sorted.slice(offset, offset + limit);

    return {
      total: sorted.length,
      rows: page.map((r) => ({
        id: r.id,
        playerId: r.playerId,
        playerName: r.player.name,
        category: r.player.category,
        contractType: r.contractType?.name,
        status: computeContractStatusHint(r.status, r.endDate),
        federativeStatus: r.federativeProcess?.status ?? fedByPlayer.get(r.playerId) ?? null,
        signatureStatus: r.signatureStatus,
        startDate: r.startDate,
        endDate: r.endDate,
        daysUntilExpiry: daysUntilEnd(r.endDate),
        parties: r.parties,
        isLegacyImport: r.isLegacyImport,
        responsibleUserId: r.responsibleUserId,
        financialPending: access.canViewFinancial
          ? (r.financeLinks ?? []).some((f) => f.status === 'pendente' || f.status === 'pending')
          : null,
      })),
      presets: ATHLETE_CONTRACT_REPORT_PRESETS,
      sortBy,
      sortDir,
    };
  }

  async getContractualDossier(
    playerId: string,
    user: CognitoJwtPayload,
    allowedTenantIds: string[] | null,
  ) {
    const hub = await this.getContractHub(playerId, user, allowedTenantIds);
    const player = await this.requirePlayer(playerId, allowedTenantIds);
    return {
      generatedAt: new Date().toISOString(),
      playerId,
      playerName: player.name,
      category: player.category,
      summary: hub.summary,
      evaluation: hub.evaluation,
      federative: hub.federative,
      professionalization: hub.professionalizations[0] ?? null,
      activeContracts: hub.contracts.filter((c) =>
        ['ACTIVE', 'EXPIRING', 'PENDING_SIGNATURE'].includes(String(c.status)),
      ),
      historicalContracts: hub.contracts.filter(
        (c) =>
          ['ARCHIVED', 'EXPIRED', 'TERMINATED', 'CANCELLED'].includes(String(c.status)) ||
          c.isLegacyImport,
      ),
      attachments: hub.attachments,
      participations: hub.contracts.flatMap((c) => (c.participations as unknown[]) ?? []),
      parties: hub.contracts.flatMap((c) => (c.parties as unknown[]) ?? []),
      financialSummaryAllowed: hub.access.canViewFinancial,
      financialSummary: hub.access.canViewFinancial ? { links: hub.financeLinks } : null,
      salaryDataAllowed: hub.access.canViewRhSalary,
      pendingItems: hub.summary.pendingItems,
    };
  }

  async getContractualDossierPdf(
    playerId: string,
    user: CognitoJwtPayload,
    allowedTenantIds: string[] | null,
  ) {
    const dossier = await this.getContractualDossier(playerId, user, allowedTenantIds);
    const player = await this.requirePlayer(playerId, allowedTenantIds);
    const html = buildContractualDossierPrintHtml({
      generatedAt: dossier.generatedAt,
      tenantName: player.tenant.name,
      player: { name: player.name, category: player.category },
      summary: dossier.summary as Record<string, unknown>,
      evaluation: dossier.evaluation as Record<string, unknown> | null,
      federative: dossier.federative as Record<string, unknown> | null,
      professionalization: dossier.professionalization as Record<string, unknown> | null,
      contracts: [...dossier.activeContracts, ...dossier.historicalContracts] as Array<
        Record<string, unknown>
      >,
      attachments: dossier.attachments as Array<Record<string, unknown>>,
      parties: dossier.parties as Array<Record<string, unknown>>,
      participations: dossier.participations as Array<Record<string, unknown>>,
      pendingItems: dossier.pendingItems,
      financialSummary: dossier.financialSummary as Record<string, unknown> | null,
      showFinancial: dossier.financialSummaryAllowed,
      showSalary: dossier.salaryDataAllowed,
    });
    const pdf = await this.contractPdf.renderHtmlToPdf(html);
    return { pdf, filename: `dossie-contratual-${player.name.replace(/\s+/g, '-')}.pdf` };
  }

  async disableContractType(tenantId: string, typeId: string, user: CognitoJwtPayload, active: boolean) {
    const access = await this.accessFor(user);
    assertAthleteContractAccess(access, 'canManageTypes');
    const allowed = await this.tenantAccess.getAllowedTenantIds(user.sub, user.role ?? 'user');
    this.tenantAccess.assertCanAccessTenant(allowed, tenantId);
    const row = await this.prisma.athleteContractType.findFirst({ where: { id: typeId, tenantId } });
    if (!row) throw new NotFoundException('Tipo de contrato não encontrado.');
    return this.prisma.athleteContractType.update({ where: { id: typeId }, data: { active } });
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
