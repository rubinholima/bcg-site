import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../common/mail.service';
import { PhysioTryoutClearanceService } from '../fisioterapia/physio-tryout-clearance.service';
import { resolveCaptacaoManagerEmail } from '../captacao/captacao-notify.util';
import {
  TRYOUT_REFERRAL_SOURCES,
  TRYOUT_WORKFLOW_STAGES,
  type TryoutWorkflowStage,
  isProspectInTryoutWorkflow,
} from './tryout-workflow.constants';
import {
  addDays,
  computeEvaluationDurationDays,
  defaultTryoutPeriodEnd,
  inferTryoutWorkflowStage,
  parseRenewalHistory,
  resolveTryoutBlockReason,
  type TryoutRenewalHistoryEntry,
} from './tryout-workflow.util';
import { TenantAccessService } from '../auth/tenant-access.service';
import { S3Service } from '../s3/s3.service';
import { TryoutSupervisionValidateDto } from './dto/tryout-supervision.dto';
import { TryoutRenewPeriodDto, TryoutEarlyApprovalDto } from './dto/tryout-renewal.dto';
import { CreateTryoutCoachEvaluationDto } from './dto/tryout-coach-evaluation.dto';
import { UpdateTryoutRegistrationDto } from './dto/tryout-registration.dto';
import { TryoutArrivalDto } from './dto/tryout-arrival.dto';
import {
  TryoutActivateLegacyDto,
  TryoutDirectEntryDto,
  TryoutDuplicateSearchDto,
} from './dto/tryout-direct-entry.dto';
import { TryoutResponsibleCoachDto } from './dto/tryout-responsible-coach.dto';
import { TryoutWorkflowEventsService } from './tryout-workflow-events.service';
import { TryoutProspectDocumentsService } from './tryout-prospect-documents.service';
import {
  COACHING_STAFF_ROLES,
  isLegacyTryoutReviewRecord,
  isTryoutAwaitingArrival,
} from './tryout-workflow.constants';
import {
  DuplicateMatch,
  normalizeDocument,
  normalizePersonKey,
  normalizePhone,
  scoreDuplicateStrength,
} from './tryout-duplicate.util';
import { isDefinitivePhysioTryoutFailure } from '../fisioterapia/physio-periodic-protocols.util';
import {
  buildTryoutManagerDossierText,
  resolveTryoutFisiologiaEmail,
  resolveTryoutSupervisionEmail,
} from './tryout-workflow.notify.util';
import { ManagerDecisionDto } from '../captacao/dto/manager-decision.dto';
import {
  CAPTACAO_MANAGER_DECISIONS,
  type CaptacaoManagerDecision,
} from '../captacao/captacao.constants';

@Injectable()
export class TryoutWorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly physioTryout: PhysioTryoutClearanceService,
    private readonly tenantAccess: TenantAccessService,
    private readonly workflowEvents: TryoutWorkflowEventsService,
    private readonly prospectDocuments: TryoutProspectDocumentsService,
    private readonly s3: S3Service,
  ) {}

  async getDocumentBuffer(storageKey: string): Promise<Buffer> {
    return this.s3.getObjectBuffer(storageKey);
  }

  /** Captação / encaminhamento — não inicia ciclo semanal nem ativa workflow até chegada. */
  async enterTryoutWorkflow(prospectId: string, referralSource?: string | null) {
    const prospect = await this.prisma.scoutingProspect.findUnique({ where: { id: prospectId } });
    if (!prospect) return;
    await this.prisma.scoutingProspect.update({
      where: { id: prospectId },
      data: {
        stage:
          prospect.stage === 'identificado' || prospect.stage === 'em_observacao'
            ? 'tryout'
            : prospect.stage,
        flowPath: 'tryout',
        arrivalReferralSource:
          referralSource?.trim() ||
          prospect.arrivalReferralSource ||
          this.mapLegacySource(prospect.source),
      },
    });
  }

  private mapLegacySource(source?: string | null): string | null {
    if (!source) return null;
    if (source === 'indicacao') return 'indicacao_parceira';
    if (TRYOUT_REFERRAL_SOURCES.includes(source as (typeof TRYOUT_REFERRAL_SOURCES)[number])) {
      return source;
    }
    return 'captacao';
  }

  async setArrival(
    prospectId: string,
    dto: TryoutArrivalDto,
    allowed: string[] | null,
    actorUserId?: string,
  ) {
    const prospect = await this.findProspectForAccess(prospectId, allowed);
    if (!TRYOUT_REFERRAL_SOURCES.includes(dto.arrivalReferralSource as (typeof TRYOUT_REFERRAL_SOURCES)[number])) {
      throw new BadRequestException('Origem de chegada inválida.');
    }
    const arrivalAt = this.parseDateInput(dto.arrivalAt, 'Data de chegada inválida.');
    const prevStage = prospect.tryoutWorkflowStage;
    const updated = await this.prisma.scoutingProspect.update({
      where: { id: prospectId },
      data: {
        arrivalAt,
        tryoutWorkflowActivatedAt: prospect.tryoutWorkflowActivatedAt ?? arrivalAt,
        tryoutWorkflowStage: prospect.tryoutWorkflowStage ?? 'aguardando_supervisao',
        arrivalReferralSource: dto.arrivalReferralSource,
        sourceDetails: dto.sourceDetails?.trim() || prospect.sourceDetails,
        source: prospect.source ?? 'outro',
        ...(dto.targetCategory?.trim() && { targetCategory: dto.targetCategory.trim() }),
        stage: prospect.stage === 'identificado' ? 'tryout' : prospect.stage,
        flowPath: 'tryout',
      },
    });
    await this.workflowEvents.append({
      tenantId: prospect.tenantId,
      prospectId,
      eventType: 'arrival',
      previousStage: prevStage,
      newStage: updated.tryoutWorkflowStage,
      actorUserId,
      metadata: { arrivalAt: arrivalAt.toISOString(), source: dto.arrivalReferralSource },
    });
    return updated;
  }

  async validateSupervision(
    prospectId: string,
    dto: TryoutSupervisionValidateDto,
    actorName: string,
    allowed: string[] | null,
    actorUserId?: string,
  ) {
    const prospect = await this.findProspectForAccess(prospectId, allowed);
    this.assertInTryout(prospect);
    if (!prospect.arrivalAt) {
      throw new BadRequestException('Registre a chegada antes de validar documentação.');
    }
    if (!prospect.name?.trim()) throw new BadRequestException('Nome obrigatório.');
    if (!prospect.birthDate?.trim()) throw new BadRequestException('Data de nascimento obrigatória.');
    if (!prospect.guardianName?.trim() || !prospect.guardianPhone?.trim()) {
      throw new BadRequestException('Responsável e celular são obrigatórios para validação.');
    }
    if (!prospect.targetCategory?.trim()) {
      throw new BadRequestException('Informe a categoria alvo.');
    }
    const docs = await this.prospectDocuments.getBlockingStatus(prospectId, prospect.birthDate);
    if (!docs.satisfied) {
      throw new BadRequestException(
        `Documentos obrigatórios pendentes: ${docs.missing.join(', ')}.`,
      );
    }

    const prevStage = prospect.tryoutWorkflowStage;
    const updated = await this.prisma.scoutingProspect.update({
      where: { id: prospectId },
      data: {
        supervisionDocsValidatedAt: new Date(),
        supervisionDocsValidatedBy: actorName,
        supervisionDocsNotes: dto.notes?.trim() || null,
        tryoutWorkflowStage: 'aguardando_fisio',
      },
    });
    await this.workflowEvents.append({
      tenantId: prospect.tenantId,
      prospectId,
      eventType: 'documentation_validated',
      previousStage: prevStage,
      newStage: 'aguardando_fisio',
      actorUserId,
    });
    return updated;
  }

  async renewPeriod(_prospectId: string, _dto: TryoutRenewPeriodDto, _actorName: string) {
    throw new BadRequestException(
      'Renovação avulsa desativada. Use a avaliação semanal com decisão "Mais uma semana".',
    );
  }

  async earlyApproval(prospectId: string, dto: TryoutEarlyApprovalDto, actorName: string) {
    const prospect = await this.findProspectOrThrow(prospectId);
    this.assertInTryout(prospect);
    const now = new Date();
    const history = parseRenewalHistory(prospect.tryoutRenewalHistory);
    history.push({
      periodStart: (prospect.tryoutPeriodStartedAt ?? now).toISOString(),
      periodEnd: (prospect.tryoutPeriodEndsAt ?? now).toISOString(),
      renewedAt: now.toISOString(),
      renewedBy: actorName,
      earlyApproval: true,
      notes: dto.notes?.trim(),
    });

    return this.prisma.scoutingProspect.update({
      where: { id: prospectId },
      data: {
        tryoutEarlyApprovedAt: now,
        tryoutPeriodEndsAt: now,
        tryoutRenewalHistory: history as Prisma.InputJsonValue,
      },
    });
  }

  async afterPhysioClearance(prospectId: string, outcome: string) {
    const prospect = await this.findProspectOrThrow(prospectId);
    if (!isProspectInTryoutWorkflow(prospect)) return;

    const prevStage = prospect.tryoutWorkflowStage;
    if (isDefinitivePhysioTryoutFailure(outcome)) {
      await this.prisma.scoutingProspect.update({
        where: { id: prospectId },
        data: {
          tryoutWorkflowStage: 'reprovado',
          tryoutRejectedAt: new Date(),
          tryoutRejectedReason: 'Try-out encerrado — liberação fisioterapêutica não concedida.',
          stage: 'recusado',
        },
      });
      await this.workflowEvents.append({
        tenantId: prospect.tenantId,
        prospectId,
        eventType: 'physio_clearance',
        previousStage: prevStage,
        newStage: 'reprovado',
        metadata: { outcome, operationalOnly: true },
      });
      return;
    }

    if (outcome === 'nao_liberado_temporario') {
      await this.prisma.scoutingProspect.update({
        where: { id: prospectId },
        data: { tryoutWorkflowStage: 'aguardando_fisio' },
      });
      await this.workflowEvents.append({
        tenantId: prospect.tenantId,
        prospectId,
        eventType: 'physio_reassessment',
        previousStage: prevStage,
        newStage: 'aguardando_fisio',
        metadata: { outcome, operationalOnly: true },
      });
      return;
    }

    if (outcome === 'aprovado') {
      await this.prisma.scoutingProspect.update({
        where: { id: prospectId },
        data: { tryoutWorkflowStage: 'liberado_campo' },
      });
      await this.workflowEvents.append({
        tenantId: prospect.tenantId,
        prospectId,
        eventType: 'physio_clearance',
        previousStage: prevStage,
        newStage: 'liberado_campo',
        metadata: { outcome, operationalOnly: true },
      });
    }
  }

  async onCtScheduleChange(prospectId: string, status: string | undefined) {
    if (!status) return;
    const prospect = await this.findProspectOrThrow(prospectId);
    if (!isProspectInTryoutWorkflow(prospect)) return;

    if (status === 'em_avaliacao') {
      await this.prisma.scoutingProspect.update({
        where: { id: prospectId },
        data: { tryoutWorkflowStage: 'em_avaliacao_campo' },
      });
    } else if (status === 'concluido') {
      await this.prisma.scoutingProspect.update({
        where: { id: prospectId },
        data: { tryoutWorkflowStage: 'aguardando_treinador' },
      });
    }
  }

  async createCoachEvaluation(
    prospectId: string,
    dto: CreateTryoutCoachEvaluationDto,
    allowed: string[] | null,
    userId?: string,
  ) {
    const prospect = await this.findProspectForAccess(prospectId, allowed);
    this.assertInTryout(prospect);
    if (!dto.descriptiveObservation?.trim()) {
      throw new BadRequestException('Observação descritiva é obrigatória.');
    }
    if (!dto.justification?.trim()) {
      throw new BadRequestException('Justificativa obrigatória para a decisão semanal.');
    }
    if (!dto.staffId?.trim()) {
      throw new BadRequestException('Informe o treinador responsável (staffId).');
    }
    const staffId = dto.staffId.trim();
    await this.assertValidCoachStaff(prospect.tenantId, staffId);

    const physio = await this.physioTryout.getOperationalStatusForProspect(prospectId);
    if (!physio.canStartFieldEvaluation) {
      throw new BadRequestException('Liberação fisioterapêutica aprovada é obrigatória.');
    }
    if (
      prospect.tryoutWorkflowStage !== 'em_avaliacao_campo' &&
      prospect.tryoutWorkflowStage !== 'aguardando_treinador'
    ) {
      throw new BadRequestException('Avaliação semanal só durante o período em campo.');
    }
    const cycleNumber = prospect.tryoutCycleNumber > 0 ? prospect.tryoutCycleNumber : 1;
    const existingCycle = await this.prisma.tryoutCoachEvaluation.findFirst({
      where: { prospectId, cycleNumber },
    });
    if (existingCycle) {
      throw new BadRequestException('Já existe avaliação registrada para esta semana.');
    }

    const cycleStartedAt = prospect.tryoutPeriodStartedAt ?? new Date();
    const cycleEndedAt = prospect.tryoutPeriodEndsAt ?? defaultTryoutPeriodEnd(cycleStartedAt);
    const prevStage = prospect.tryoutWorkflowStage;
    const staff = await this.prisma.technicalStaff.findFirst({
      where: { id: staffId, tenantId: prospect.tenantId },
      select: { name: true },
    });

    return this.prisma.$transaction(async (tx) => {
      const row = await tx.tryoutCoachEvaluation.create({
        data: {
          tenantId: prospect.tenantId,
          prospectId,
          staffId,
          staffName: staff?.name ?? dto.staffName?.trim() ?? null,
          technicalRating: dto.technicalRating,
          physicalRating: dto.physicalRating,
          tacticalRating: dto.tacticalRating,
          cognitiveRating: dto.cognitiveRating,
          descriptiveObservation: dto.descriptiveObservation.trim(),
          outcome: dto.outcome,
          justification: dto.justification.trim(),
          cycleNumber,
          cycleStartedAt,
          cycleEndedAt,
          createdByUserId: userId ?? null,
        },
      });

      if (dto.outcome === 'reprovado') {
        await tx.scoutingProspect.update({
          where: { id: prospectId },
          data: {
            tryoutWorkflowStage: 'reprovado',
            tryoutRejectedAt: new Date(),
            tryoutRejectedBy: staff?.name ?? dto.staffName?.trim() ?? 'Treinador',
            tryoutRejectedReason: dto.justification.trim(),
            stage: 'recusado',
          },
        });
        await this.workflowEvents.append({
          tenantId: prospect.tenantId,
          prospectId,
          eventType: 'coach_rejection',
          previousStage: prevStage,
          newStage: 'reprovado',
          actorUserId: userId,
          staffId,
          metadata: { cycleNumber, operationalOnly: true },
          tx,
        });
        return row;
      }

      if (dto.outcome === 'mais_uma_semana') {
        const now = new Date();
        const nextCycle = cycleNumber + 1;
        const nextEnd = defaultTryoutPeriodEnd(now);
        await tx.scoutingProspect.update({
          where: { id: prospectId },
          data: {
            tryoutCycleNumber: nextCycle,
            tryoutPeriodStartedAt: now,
            tryoutPeriodEndsAt: nextEnd,
            tryoutRenewalCount: { increment: 1 },
            tryoutWorkflowStage: 'em_avaliacao_campo',
          },
        });
        await this.workflowEvents.append({
          tenantId: prospect.tenantId,
          prospectId,
          eventType: 'one_more_week',
          previousStage: prevStage,
          newStage: 'em_avaliacao_campo',
          actorUserId: userId,
          staffId,
          metadata: { cycleNumber, nextCycle, operationalOnly: true },
          tx,
        });
        return row;
      }

      await tx.scoutingProspect.update({
        where: { id: prospectId },
        data: {
          tryoutWorkflowStage: 'aguardando_gerencia',
          managerDecision: 'pendente',
          managerDecisionAt: null,
          managerDecisionBy: null,
          managerDecisionNotes: null,
        },
      });
      await this.workflowEvents.append({
        tenantId: prospect.tenantId,
        prospectId,
        eventType: 'coach_approval',
        previousStage: prevStage,
        newStage: 'aguardando_gerencia',
        actorUserId: userId,
        staffId,
        metadata: { cycleNumber, operationalOnly: true },
        tx,
      });

      const latestPhysio = await this.physioTryout.getLatestForProspect(prospectId);
      const { subject, text } = buildTryoutManagerDossierText({
        prospectId,
        tenantId: prospect.tenantId,
        name: prospect.name,
        targetCategory: prospect.targetCategory,
        arrivalReferralSource: prospect.arrivalReferralSource,
        sourceDetails: prospect.sourceDetails,
        physioOutcome: latestPhysio?.outcome ?? null,
        physioStaff: latestPhysio?.staffName ?? null,
        periodStart: cycleStartedAt.toISOString(),
        periodEnd: cycleEndedAt.toISOString(),
        renewalCount: prospect.tryoutRenewalCount,
        coachTechnical: dto.technicalRating,
        coachPhysical: dto.physicalRating,
        coachTactical: dto.tacticalRating,
        coachCognitive: dto.cognitiveRating,
        coachObservation: dto.descriptiveObservation.trim(),
        coachOutcome: dto.outcome,
      });
      const gerencia = resolveCaptacaoManagerEmail();
      await this.mail.sendMail({ to: gerencia, subject, text });

      return row;
    });
  }

  async startFieldEvaluation(
    prospectId: string,
    allowed: string[] | null,
    actorUserId?: string,
  ) {
    const prospect = await this.findProspectForAccess(prospectId, allowed);
    this.assertInTryout(prospect);
    if (!prospect.arrivalAt) {
      throw new BadRequestException('Registre a chegada antes de iniciar avaliação em campo.');
    }
    const docs = await this.prospectDocuments.getBlockingStatus(prospectId, prospect.birthDate);
    if (!docs.satisfied) {
      throw new BadRequestException('Documentos obrigatórios pendentes.');
    }
    if (!prospect.supervisionDocsValidatedAt) {
      throw new BadRequestException('Supervisão deve validar a documentação.');
    }
    await this.physioTryout.assertCanStartCtFieldEvaluation(prospectId);
    if (prospect.tryoutWorkflowStage === 'em_avaliacao_campo' && prospect.tryoutPeriodStartedAt) {
      throw new BadRequestException('Avaliação em campo já iniciada.');
    }

    const now = new Date();
    const end = defaultTryoutPeriodEnd(now);
    const prevStage = prospect.tryoutWorkflowStage;
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.scoutingProspect.update({
        where: { id: prospectId },
        data: {
          tryoutWorkflowStage: 'em_avaliacao_campo',
          tryoutCycleNumber: 1,
          tryoutPeriodStartedAt: now,
          tryoutPeriodEndsAt: end,
          ctScheduleStatus: 'em_avaliacao',
          ctEvaluationStartedAt: now,
        },
      });
      await this.workflowEvents.append({
        tenantId: prospect.tenantId,
        prospectId,
        eventType: 'field_evaluation_start',
        previousStage: prevStage,
        newStage: 'em_avaliacao_campo',
        actorUserId,
        metadata: { cycleNumber: 1, periodEnd: end.toISOString() },
        tx,
      });
      return row;
    });
    return updated;
  }

  async searchDuplicates(dto: TryoutDuplicateSearchDto, allowed: string[] | null) {
    this.tenantAccess.assertCanAccessTenant(allowed, dto.tenantId);
    return this.findDuplicateMatches(dto);
  }

  async createDirectEntry(
    dto: TryoutDirectEntryDto,
    allowed: string[] | null,
    actorUserId?: string,
  ) {
    this.tenantAccess.assertCanAccessTenant(allowed, dto.tenantId);
    if (dto.reuseProspectId?.trim()) {
      const existing = await this.findProspectForAccess(dto.reuseProspectId.trim(), allowed);
      if (existing.tenantId !== dto.tenantId) {
        throw new BadRequestException('Prospect de outro clube.');
      }
      return this.setArrival(
        existing.id,
        {
          arrivalReferralSource: dto.arrivalReferralSource,
          arrivalAt: dto.arrivalAt,
          sourceDetails: dto.sourceDetails,
          targetCategory: dto.targetCategory,
        },
        allowed,
        actorUserId,
      );
    }

    const duplicates = await this.findDuplicateMatches({
      tenantId: dto.tenantId,
      documentNumber: dto.documentNumber,
      name: dto.name,
      birthDate: dto.birthDate,
      athletePhone: dto.athletePhone,
      athleteEmail: dto.athleteEmail,
      guardianPhone: dto.guardianPhone,
    });
    const strong = duplicates.filter((d) => scoreDuplicateStrength(d.reasons) === 'strong');
    if (strong.length > 0 && !dto.confirmNewDespiteDuplicates) {
      throw new BadRequestException({
        message:
          'Possível duplicidade encontrada — confirme reutilização ou criação excepcional.',
        duplicates: strong,
      });
    }

    const arrivalAt = this.parseDateInput(dto.arrivalAt, 'Data de chegada inválida.');
    const coachStaffId = await this.resolveDefaultCoachStaffId(dto.tenantId, dto.targetCategory);

    const created = await this.prisma.$transaction(async (tx) => {
      const prospect = await tx.scoutingProspect.create({
        data: {
          tenantId: dto.tenantId,
          name: dto.name.trim(),
          birthDate: dto.birthDate.trim(),
          nationality: dto.nationality?.trim() || null,
          position: dto.position?.trim() || null,
          secondaryPositions: dto.secondaryPositions?.length
            ? (dto.secondaryPositions as Prisma.InputJsonValue)
            : undefined,
          athletePhone: dto.athletePhone?.trim() || null,
          athleteEmail: dto.athleteEmail?.trim() || null,
          documentNumber:
            normalizeDocument(dto.documentNumber) ?? (dto.documentNumber?.trim() || null),
          guardianName: dto.guardianName?.trim() || null,
          guardianPhone: dto.guardianPhone?.trim() || null,
          guardianEmail: dto.guardianEmail?.trim() || null,
          targetCategory: dto.targetCategory.trim(),
          notes: dto.notes?.trim() || null,
          stage: 'tryout',
          flowPath: 'tryout',
          evaluationOutcome: 'para_teste',
          arrivalReferralSource: dto.arrivalReferralSource,
          sourceDetails: dto.sourceDetails?.trim() || null,
          source: 'outro',
          arrivalAt,
          tryoutWorkflowActivatedAt: arrivalAt,
          tryoutWorkflowStage: 'aguardando_supervisao',
          responsibleCoachStaffId: coachStaffId,
          duplicateCreationConfirmedAt: dto.confirmNewDespiteDuplicates ? new Date() : null,
        },
      });
      await this.workflowEvents.append({
        tenantId: dto.tenantId,
        prospectId: prospect.id,
        eventType: 'direct_creation',
        newStage: 'aguardando_supervisao',
        actorUserId,
        metadata: {
          source: dto.arrivalReferralSource,
          duplicateConfirmed: Boolean(dto.confirmNewDespiteDuplicates),
        },
        tx,
      });
      if (dto.confirmNewDespiteDuplicates && strong.length) {
        await this.workflowEvents.append({
          tenantId: dto.tenantId,
          prospectId: prospect.id,
          eventType: 'duplicate_decision',
          actorUserId,
          metadata: { decision: 'create_new', matches: strong.map((m) => m.id) },
          tx,
        });
      }
      return prospect;
    });

    return created;
  }

  async activateLegacyWorkflow(
    prospectId: string,
    dto: TryoutActivateLegacyDto,
    allowed: string[] | null,
    actorUserId?: string,
  ) {
    const prospect = await this.findProspectForAccess(prospectId, allowed);
    if (!isLegacyTryoutReviewRecord(prospect)) {
      throw new BadRequestException('Registro não está na fila de revisão anterior.');
    }
    const arrivalAt = this.parseDateInput(dto.arrivalAt, 'Data de chegada inválida.');
    const updated = await this.prisma.scoutingProspect.update({
      where: { id: prospectId },
      data: {
        arrivalAt,
        tryoutWorkflowActivatedAt: arrivalAt,
        tryoutWorkflowStage: 'aguardando_supervisao',
        arrivalReferralSource: dto.arrivalReferralSource,
        sourceDetails: dto.sourceDetails?.trim() || prospect.sourceDetails,
      },
    });
    await this.workflowEvents.append({
      tenantId: prospect.tenantId,
      prospectId,
      eventType: 'legacy_activation',
      newStage: 'aguardando_supervisao',
      actorUserId,
      metadata: { arrivalAt: arrivalAt.toISOString() },
    });
    return updated;
  }

  async setResponsibleCoach(
    prospectId: string,
    dto: TryoutResponsibleCoachDto,
    allowed: string[] | null,
    actorUserId?: string,
  ) {
    const prospect = await this.findProspectForAccess(prospectId, allowed);
    this.assertInTryout(prospect);
    await this.assertValidCoachStaff(prospect.tenantId, dto.staffId.trim());
    const staff = await this.prisma.technicalStaff.findFirst({
      where: { id: dto.staffId.trim(), tenantId: prospect.tenantId },
      select: { id: true, name: true },
    });
    const history = Array.isArray(prospect.responsibleCoachHistory)
      ? [...(prospect.responsibleCoachHistory as object[])]
      : [];
    history.push({
      at: new Date().toISOString(),
      fromStaffId: prospect.responsibleCoachStaffId,
      toStaffId: dto.staffId.trim(),
      actorUserId,
      reason: dto.reason?.trim() || null,
    });

    const updated = await this.prisma.scoutingProspect.update({
      where: { id: prospectId },
      data: {
        responsibleCoachStaffId: dto.staffId.trim(),
        responsibleCoachHistory: history as Prisma.InputJsonValue,
      },
    });
    await this.workflowEvents.append({
      tenantId: prospect.tenantId,
      prospectId,
      eventType: 'coach_change',
      actorUserId,
      staffId: dto.staffId.trim(),
      metadata: { staffName: staff?.name, reason: dto.reason?.trim() || null },
    });
    return updated;
  }

  async recordTryoutManagerDecision(
    prospectId: string,
    dto: ManagerDecisionDto,
    actor: { name?: string; email?: string; role?: string },
    allowed: string[] | null,
    actorUserId?: string,
  ) {
    this.assertGerenteDecisor(actor.role);
    const prospect = await this.findProspectForAccess(prospectId, allowed);
    if (prospect.tryoutWorkflowStage !== 'aguardando_gerencia') {
      throw new BadRequestException('Prospect não está aguardando decisão da gerência (Try Out).');
    }

    const coach = await this.getLatestCoachEvaluation(prospectId);
    if (!coach || coach.outcome !== 'aprovado') {
      throw new BadRequestException('É necessária avaliação do treinador aprovada.');
    }

    const decision = dto.decision as CaptacaoManagerDecision;
    if (!CAPTACAO_MANAGER_DECISIONS.includes(decision) || decision === 'pendente') {
      throw new BadRequestException('Decisão inválida.');
    }

    const actorName = actor.name?.trim() || actor.email?.trim() || 'Gerente';
    const stage =
      decision === 'aprovado'
        ? 'prioridade'
        : decision === 'reprovado'
          ? 'recusado'
          : prospect.stage;

    const tryoutStage: TryoutWorkflowStage =
      decision === 'aprovado'
        ? 'aprovado_documentacao'
        : decision === 'reprovado'
          ? 'reprovado'
          : 'aguardando_gerencia';

    const updated = await this.prisma.scoutingProspect.update({
      where: { id: prospectId },
      data: {
        managerDecision: decision,
        managerDecisionAt: new Date(),
        managerDecisionBy: actorName,
        managerDecisionNotes: dto.notes?.trim() || null,
        presentationDate:
          decision === 'aprovado' ? dto.presentationDate?.trim() || prospect.presentationDate : prospect.presentationDate,
        stage,
        tryoutWorkflowStage: tryoutStage,
        tryoutRejectedAt: decision === 'reprovado' ? new Date() : null,
        tryoutRejectedBy: decision === 'reprovado' ? actorName : null,
        tryoutRejectedReason:
          decision === 'reprovado' ? dto.notes?.trim() || 'Reprovado pela gerência.' : null,
        tryoutRegDocumentation: decision === 'aprovado' ? 'pendente' : prospect.tryoutRegDocumentation,
        tryoutRegCbf: decision === 'aprovado' ? 'pendente' : prospect.tryoutRegCbf,
        tryoutRegBid: decision === 'aprovado' ? 'pendente' : prospect.tryoutRegBid,
      },
    });
    await this.workflowEvents.append({
      tenantId: prospect.tenantId,
      prospectId,
      eventType: 'management_decision',
      previousStage: prospect.tryoutWorkflowStage,
      newStage: tryoutStage,
      actorUserId,
      metadata: { decision, operationalOnly: true },
    });
    return updated;
  }

  async updateRegistration(
    prospectId: string,
    dto: UpdateTryoutRegistrationDto,
    allowed: string[] | null,
  ) {
    const prospect = await this.findProspectForAccess(prospectId, allowed);
    if (prospect.tryoutWorkflowStage !== 'aprovado_documentacao') {
      throw new BadRequestException('Registro só após aprovação da gerência.');
    }

    const updated = await this.prisma.scoutingProspect.update({
      where: { id: prospectId },
      data: {
        ...(dto.tryoutRegDocumentation !== undefined && {
          tryoutRegDocumentation: dto.tryoutRegDocumentation,
        }),
        ...(dto.tryoutRegCbf !== undefined && { tryoutRegCbf: dto.tryoutRegCbf }),
        ...(dto.tryoutRegFederation !== undefined && {
          tryoutRegFederation: dto.tryoutRegFederation,
        }),
        ...(dto.tryoutRegBid !== undefined && { tryoutRegBid: dto.tryoutRegBid }),
        ...(dto.notes !== undefined && { supervisionDocsNotes: dto.notes?.trim() || null }),
      },
    });

    if (this.isRegistrationComplete(updated)) {
      return this.prisma.scoutingProspect.update({
        where: { id: prospectId },
        data: { tryoutWorkflowStage: 'concluido' },
      });
    }
    return updated;
  }

  isRegistrationComplete(prospect: {
    tryoutRegDocumentation?: string | null;
    tryoutRegCbf?: string | null;
    tryoutRegFederation?: string | null;
    tryoutRegBid?: string | null;
  }): boolean {
    const doc = prospect.tryoutRegDocumentation === 'concluido';
    const cbf = prospect.tryoutRegCbf === 'concluido';
    const bid = prospect.tryoutRegBid === 'concluido';
    const fed =
      prospect.tryoutRegFederation === 'concluido' || prospect.tryoutRegFederation === 'na';
    return doc && cbf && bid && fed;
  }

  assertCanPromoteToSquad(prospect: {
    tryoutWorkflowStage?: string | null;
    tryoutRegDocumentation?: string | null;
    tryoutRegCbf?: string | null;
    tryoutRegFederation?: string | null;
    tryoutRegBid?: string | null;
    managerDecision?: string | null;
  }) {
    if (prospect.managerDecision !== 'aprovado') {
      throw new BadRequestException('Gerência deve aprovar o Try Out antes do cadastro no elenco.');
    }
    if (!this.isRegistrationComplete(prospect)) {
      throw new BadRequestException(
        'Conclua documentação, CBF, federação (se aplicável) e BID antes de integrar ao elenco.',
      );
    }
    if (
      prospect.tryoutWorkflowStage !== 'concluido' &&
      prospect.tryoutWorkflowStage !== 'aprovado_documentacao'
    ) {
      throw new BadRequestException('Try Out ainda não liberado para elenco.');
    }
  }

  async enrichProspectTryout<T extends { id: string }>(row: T) {
    const [physio, coach] = await Promise.all([
      this.physioTryout.getOperationalStatusForProspect(row.id),
      this.getLatestCoachEvaluation(row.id),
    ]);
    const prospect = row as T & {
      tryoutWorkflowStage?: string | null;
      supervisionDocsValidatedAt?: Date | null;
      tryoutPeriodStartedAt?: Date | null;
      tryoutPeriodEndsAt?: Date | null;
      tryoutRenewalCount?: number;
      tryoutCycleNumber?: number;
      managerDecision?: string | null;
      ctScheduleStatus?: string | null;
      birthDate?: string | null;
      arrivalAt?: Date | null;
      flowPath?: string | null;
      tryoutWorkflowActivatedAt?: Date | null;
    };
    const stage =
      inferTryoutWorkflowStage(prospect) ?? prospect.tryoutWorkflowStage ?? null;
    const blockReason = resolveTryoutBlockReason({
      prospect,
      physioStatus: physio.status,
      coachOutcome: coach?.outcome ?? null,
      managerDecision: prospect.managerDecision ?? null,
    });
    const durationDays = computeEvaluationDurationDays(
      prospect.tryoutPeriodStartedAt,
      prospect.tryoutPeriodEndsAt,
    );
    const docs = await this.prospectDocuments.getBlockingStatus(row.id, prospect.birthDate);
    const progressBanner = this.resolveProgressBanner({
      prospect,
      physioStatus: physio.status,
      docsSatisfied: docs.satisfied,
      stage: stage ?? null,
    });
    return {
      ...row,
      tryoutEffectiveStage: stage,
      physioClearanceStatus: physio.status,
      canStartCtFieldEvaluation: physio.canStartFieldEvaluation,
      physioReassessmentPending: physio.reassessmentPending,
      latestCoachEvaluation: coach,
      tryoutBlockReason: blockReason ?? progressBanner,
      tryoutProgressBanner: progressBanner,
      tryoutEvaluationDurationDays: durationDays,
      tryoutCycleNumber: prospect.tryoutCycleNumber ?? 0,
      arrivalAt: prospect.arrivalAt,
      isLegacyReview: isLegacyTryoutReviewRecord(prospect),
      awaitingArrival: isTryoutAwaitingArrival(prospect),
      documentsBlockingMissing: docs.missing,
    };
  }

  async getHub(tenantId: string, allowed: string[] | null, stageFilter?: string) {
    this.tenantAccess.assertCanAccessTenant(allowed, tenantId);
    const where: Prisma.ScoutingProspectWhereInput = {
      tenantId,
      stage: { notIn: ['arquivado'] },
      OR: [
        { tryoutWorkflowStage: { not: null } },
        { tryoutWorkflowActivatedAt: { not: null } },
        { flowPath: 'tryout' },
        { evaluationOutcome: 'para_teste' },
      ],
    };
    if (stageFilter?.trim() && TRYOUT_WORKFLOW_STAGES.includes(stageFilter as TryoutWorkflowStage)) {
      where.tryoutWorkflowStage = stageFilter.trim();
    }

    const rows = await this.prisma.scoutingProspect.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 300,
      include: {
        scout: { select: { id: true, name: true } },
      },
    });

    const legacyReview: typeof rows = [];
    const awaitingArrival: typeof rows = [];
    const activeRows: typeof rows = [];
    for (const p of rows) {
      if (isLegacyTryoutReviewRecord(p)) {
        legacyReview.push(p);
        continue;
      }
      if (isTryoutAwaitingArrival(p)) {
        awaitingArrival.push(p);
        continue;
      }
      activeRows.push(p);
    }

    const enriched = await Promise.all(activeRows.map((p) => this.enrichProspectTryout(p)));
    const legacyEnriched = await Promise.all(legacyReview.map((p) => this.enrichProspectTryout(p)));
    const awaitingEnriched = await Promise.all(awaitingArrival.map((p) => this.enrichProspectTryout(p)));
    const byStage: Record<string, number> = {};
    for (const s of TRYOUT_WORKFLOW_STAGES) byStage[s] = 0;
    for (const p of enriched) {
      const key = p.tryoutEffectiveStage ?? 'aguardando_supervisao';
      byStage[key] = (byStage[key] ?? 0) + 1;
    }
    return {
      items: enriched,
      legacyReview: legacyEnriched,
      awaitingArrival: awaitingEnriched,
      byStage,
      total: enriched.length,
    };
  }

  async getReporting(
    tenantId: string,
    allowed: string[] | null,
    filters: {
      from?: string;
      to?: string;
      targetCategory?: string;
      referralSource?: string;
      stage?: string;
    },
  ) {
    this.tenantAccess.assertCanAccessTenant(allowed, tenantId);
    const where: Prisma.ScoutingProspectWhereInput = {
      tenantId,
      tryoutPeriodStartedAt: { not: null },
    };
    if (filters.from?.trim()) {
      where.tryoutPeriodStartedAt = {
        ...(where.tryoutPeriodStartedAt as object),
        gte: new Date(filters.from),
      };
    }
    if (filters.to?.trim()) {
      where.tryoutPeriodStartedAt = {
        ...(where.tryoutPeriodStartedAt as object),
        lte: new Date(filters.to),
      };
    }
    if (filters.targetCategory?.trim()) {
      where.targetCategory = filters.targetCategory.trim();
    }
    if (filters.referralSource?.trim()) {
      where.arrivalReferralSource = filters.referralSource.trim();
    }
    if (filters.stage?.trim()) {
      where.tryoutWorkflowStage = filters.stage.trim();
    }

    const rows = await this.prisma.scoutingProspect.findMany({
      where,
      select: {
        id: true,
        tryoutWorkflowStage: true,
        tryoutPeriodStartedAt: true,
        tryoutPeriodEndsAt: true,
        tryoutRenewalCount: true,
        tryoutRejectedAt: true,
        managerDecision: true,
        stage: true,
        arrivalReferralSource: true,
        targetCategory: true,
      },
    });

    let approved = 0;
    let rejected = 0;
    let underEvaluation = 0;
    let totalDuration = 0;
    let durationCount = 0;
    let totalRenewals = 0;
    const bySource: Record<string, number> = {};
    const byStage: Record<string, number> = {};

    for (const r of rows) {
      const src = r.arrivalReferralSource ?? 'outro';
      bySource[src] = (bySource[src] ?? 0) + 1;
      const st = r.tryoutWorkflowStage ?? 'aguardando_supervisao';
      byStage[st] = (byStage[st] ?? 0) + 1;
      if (r.managerDecision === 'aprovado' || r.tryoutWorkflowStage === 'concluido') approved++;
      if (r.tryoutWorkflowStage === 'reprovado' || r.stage === 'recusado') rejected++;
      if (
        st !== 'reprovado' &&
        st !== 'concluido' &&
        r.managerDecision !== 'reprovado'
      ) {
        underEvaluation++;
      }
      totalRenewals += r.tryoutRenewalCount ?? 0;
      const d = computeEvaluationDurationDays(r.tryoutPeriodStartedAt, r.tryoutPeriodEndsAt);
      if (d != null) {
        totalDuration += d;
        durationCount++;
      }
    }

    return {
      total: rows.length,
      approved,
      rejected,
      underEvaluation,
      averageEvaluationDurationDays:
        durationCount > 0 ? Math.round((totalDuration / durationCount) * 10) / 10 : null,
      totalWeeklyRenewals: totalRenewals,
      byReferralSource: bySource,
      byWorkflowStage: byStage,
    };
  }

  async listCoachesForTryout(tenantId: string, allowed: string[] | null, category?: string) {
    this.tenantAccess.assertCanAccessTenant(allowed, tenantId);
    const cat = category?.trim().toLowerCase() || null;
    const rows = await this.prisma.technicalStaff.findMany({
      where: {
        tenantId,
        role: { in: [...COACHING_STAFF_ROLES] },
      },
      select: { id: true, name: true, role: true, categories: true },
      orderBy: { name: 'asc' },
      take: 200,
    });
    return rows
      .map((r) => {
        const categories = Array.isArray(r.categories) ? (r.categories as string[]) : [];
        const matchesCategory =
          !cat ||
          categories.length === 0 ||
          categories.some((c) => c.toLowerCase() === cat);
        return {
          id: r.id,
          name: r.name,
          role: r.role,
          categories,
          matchesCategory,
        };
      })
      .sort((a, b) => {
        if (a.matchesCategory !== b.matchesCategory) return a.matchesCategory ? -1 : 1;
        return a.name.localeCompare(b.name, 'pt-BR');
      });
  }

  async getDossier(prospectId: string, allowed: string[] | null) {
    const prospect = await this.findProspectForAccess(prospectId, allowed);
    const [physioOp, coach, documents, events, weeklyEvaluations, documentBlocking] =
      await Promise.all([
      this.physioTryout.getOperationalStatusForProspect(prospectId),
      this.getLatestCoachEvaluation(prospectId),
      this.prospectDocuments.listActive(prospectId),
      this.workflowEvents.listForProspect(prospectId, 50),
      this.prisma.tryoutCoachEvaluation.findMany({
        where: { prospectId },
        orderBy: { cycleNumber: 'asc' },
      }),
      this.prospectDocuments.getBlockingStatus(prospectId, prospect.birthDate),
    ]);
    return {
      prospect,
      physioOperational: physioOp,
      coachEvaluation: coach,
      weeklyEvaluations,
      documents: documents.map((d) => this.prospectDocuments.toPublicRow(d)),
      documentBlocking,
      workflowEvents: events,
      renewalHistory: parseRenewalHistory(prospect.tryoutRenewalHistory),
    };
  }

  async notifyFisiologiaOnPhysioComplete(prospectName: string, outcome: string, targetCategory?: string | null) {
    const to = resolveTryoutFisiologiaEmail();
    const subject = `Try Out — liberação fisio ${outcome}: ${prospectName}`;
    const text = [
      'Liberação fisioterapêutica de Try Out registrada.',
      '',
      `Atleta: ${prospectName}`,
      targetCategory ? `Categoria: ${targetCategory}` : null,
      `Resultado: ${outcome}`,
      '',
      'Boston City Group — Fisiologia / Preparador',
    ]
      .filter(Boolean)
      .join('\n');
    return this.mail.sendMail({ to, subject, text });
  }

  resolveSupervisionEmail() {
    return resolveTryoutSupervisionEmail();
  }

  private async getLatestCoachEvaluation(prospectId: string) {
    return this.prisma.tryoutCoachEvaluation.findFirst({
      where: { prospectId },
      orderBy: { evaluatedAt: 'desc' },
    });
  }

  private assertInTryout(prospect: { tryoutWorkflowStage?: string | null; stage?: string; evaluationOutcome?: string | null }) {
    if (!isProspectInTryoutWorkflow(prospect)) {
      throw new BadRequestException('Prospect não está no fluxo de Try Out.');
    }
  }

  private async findProspectOrThrow(id: string) {
    const p = await this.prisma.scoutingProspect.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Prospect não encontrado.');
    return p;
  }

  private async findProspectForAccess(id: string, allowed: string[] | null) {
    const p = await this.findProspectOrThrow(id);
    this.tenantAccess.assertCanAccessTenant(allowed, p.tenantId);
    return p;
  }

  private parseDateInput(raw: string, message: string): Date {
    const d = new Date(raw.length <= 10 ? `${raw.trim()}T12:00:00` : raw.trim());
    if (Number.isNaN(d.getTime())) throw new BadRequestException(message);
    return d;
  }

  private async assertValidCoachStaff(tenantId: string, staffId: string) {
    const staff = await this.prisma.technicalStaff.findFirst({
      where: { id: staffId, tenantId },
      select: { id: true, role: true },
    });
    if (!staff) throw new BadRequestException('Treinador/comissão não encontrado neste clube.');
    if (!COACHING_STAFF_ROLES.includes(staff.role as (typeof COACHING_STAFF_ROLES)[number])) {
      throw new BadRequestException('Staff informado não possui função de treinador técnico.');
    }
  }

  private async resolveDefaultCoachStaffId(tenantId: string, category: string) {
    const coaches = await this.prisma.technicalStaff.findMany({
      where: {
        tenantId,
        role: { in: [...COACHING_STAFF_ROLES] },
      },
      select: { id: true, categories: true },
      take: 50,
    });
    const cat = category.trim().toLowerCase();
    const match = coaches.find((c) => {
      if (!c.categories || !Array.isArray(c.categories)) return false;
      return (c.categories as string[]).some((x) => x.toLowerCase() === cat);
    });
    return match?.id ?? coaches[0]?.id ?? null;
  }

  private async findDuplicateMatches(input: TryoutDuplicateSearchDto): Promise<DuplicateMatch[]> {
    const matches = new Map<string, DuplicateMatch>();
    const add = (key: string, entry: DuplicateMatch) => {
      const prev = matches.get(key);
      if (!prev) {
        matches.set(key, entry);
        return;
      }
      prev.reasons = [...new Set([...prev.reasons, ...entry.reasons])];
    };

    if (input.prospectId?.trim()) {
      const p = await this.prisma.scoutingProspect.findFirst({
        where: { id: input.prospectId.trim(), tenantId: input.tenantId },
      });
      if (p) {
        add(`prospect:${p.id}`, {
          kind: 'prospect',
          id: p.id,
          name: p.name,
          reasons: ['prospect_id'],
          birthDate: p.birthDate,
          targetCategory: p.targetCategory,
        });
      }
    }

    const doc = normalizeDocument(input.documentNumber);
    if (doc) {
      const prospects = await this.prisma.scoutingProspect.findMany({
        where: { tenantId: input.tenantId, documentNumber: doc },
        take: 10,
      });
      for (const p of prospects) {
        add(`prospect:${p.id}`, {
          kind: 'prospect',
          id: p.id,
          name: p.name,
          reasons: ['document'],
          birthDate: p.birthDate,
          targetCategory: p.targetCategory,
        });
      }
    }

    const nameKey = input.name?.trim() ? normalizePersonKey(input.name) : null;
    const birth = input.birthDate?.trim() || null;
    if (nameKey && birth) {
      const prospects = await this.prisma.scoutingProspect.findMany({
        where: { tenantId: input.tenantId, birthDate: birth },
        take: 40,
      });
      for (const p of prospects) {
        if (normalizePersonKey(p.name) === nameKey) {
          add(`prospect:${p.id}`, {
            kind: 'prospect',
            id: p.id,
            name: p.name,
            reasons: ['name_birth'],
            birthDate: p.birthDate,
            targetCategory: p.targetCategory,
          });
        }
      }
    }

    const phone = normalizePhone(input.athletePhone) ?? normalizePhone(input.guardianPhone);
    if (phone) {
      const prospects = await this.prisma.scoutingProspect.findMany({
        where: {
          tenantId: input.tenantId,
          OR: [{ athletePhone: { contains: phone.slice(-8) } }, { guardianPhone: { contains: phone.slice(-8) } }],
        },
        take: 20,
      });
      for (const p of prospects) {
        add(`prospect:${p.id}`, {
          kind: 'prospect',
          id: p.id,
          name: p.name,
          reasons: ['phone'],
          birthDate: p.birthDate,
          targetCategory: p.targetCategory,
        });
      }
    }

    if (input.athleteEmail?.trim()) {
      const email = input.athleteEmail.trim().toLowerCase();
      const prospects = await this.prisma.scoutingProspect.findMany({
        where: { tenantId: input.tenantId, athleteEmail: { equals: email, mode: 'insensitive' } },
        take: 10,
      });
      for (const p of prospects) {
        add(`prospect:${p.id}`, {
          kind: 'prospect',
          id: p.id,
          name: p.name,
          reasons: ['email'],
          birthDate: p.birthDate,
          targetCategory: p.targetCategory,
        });
      }
    }

    return [...matches.values()];
  }

  private resolveProgressBanner(input: {
    prospect: {
      arrivalAt?: Date | null;
      supervisionDocsValidatedAt?: Date | null;
      tryoutWorkflowStage?: string | null;
      tryoutCycleNumber?: number;
    };
    physioStatus: string;
    docsSatisfied: boolean;
    stage: string | null;
  }): string | null {
    if (!input.prospect.arrivalAt) return 'Aguardando registro de chegada.';
    if (!input.docsSatisfied) return 'Aguardando documentos.';
    if (!input.prospect.supervisionDocsValidatedAt) return 'Aguardando validação da supervisão.';
    if (input.physioStatus === 'pendente') return 'Aguardando liberação da fisioterapia.';
    if (input.physioStatus === 'temporario_nao_liberado') {
      return 'Não liberado — aguardando reavaliação.';
    }
    if (input.stage === 'liberado_campo') return 'Liberado — iniciar avaliação em campo.';
    if (input.stage === 'em_avaliacao_campo') {
      const n = input.prospect.tryoutCycleNumber ?? 1;
      return `Em avaliação — semana ${n}`;
    }
    if (input.stage === 'aguardando_treinador') return 'Avaliação do treinador pendente.';
    if (input.stage === 'aguardando_gerencia') return 'Aguardando decisão da gerência.';
    return null;
  }

  private assertGerenteDecisor(role: string | undefined): void {
    const r = role?.trim().toLowerCase() ?? '';
    if (r === 'gerente' || r === 'gestor' || r === 'super_admin' || r === 'company_admin') {
      return;
    }
    throw new ForbiddenException('Decisão exclusiva do gerente de futebol.');
  }
}
