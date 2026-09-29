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
import { TryoutSupervisionValidateDto } from './dto/tryout-supervision.dto';
import { TryoutRenewPeriodDto, TryoutEarlyApprovalDto } from './dto/tryout-renewal.dto';
import { CreateTryoutCoachEvaluationDto } from './dto/tryout-coach-evaluation.dto';
import { UpdateTryoutRegistrationDto } from './dto/tryout-registration.dto';
import { TryoutArrivalDto } from './dto/tryout-arrival.dto';
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
  ) {}

  async enterTryoutWorkflow(prospectId: string, referralSource?: string | null) {
    const prospect = await this.prisma.scoutingProspect.findUnique({ where: { id: prospectId } });
    if (!prospect) return;
    const now = new Date();
    const end = defaultTryoutPeriodEnd(now);
    await this.prisma.scoutingProspect.update({
      where: { id: prospectId },
      data: {
        stage: prospect.stage === 'identificado' || prospect.stage === 'em_observacao' ? 'tryout' : prospect.stage,
        tryoutWorkflowStage: 'aguardando_supervisao',
        tryoutPeriodStartedAt: prospect.tryoutPeriodStartedAt ?? now,
        tryoutPeriodEndsAt: prospect.tryoutPeriodEndsAt ?? end,
        arrivalReferralSource:
          referralSource?.trim() ||
          prospect.arrivalReferralSource ||
          this.mapLegacySource(prospect.source),
        flowPath: 'tryout',
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

  async setArrival(prospectId: string, dto: TryoutArrivalDto) {
    const prospect = await this.findProspectOrThrow(prospectId);
    if (!TRYOUT_REFERRAL_SOURCES.includes(dto.arrivalReferralSource as (typeof TRYOUT_REFERRAL_SOURCES)[number])) {
      throw new BadRequestException('Origem de chegada inválida.');
    }
    await this.enterTryoutWorkflow(prospectId, dto.arrivalReferralSource);
    return this.prisma.scoutingProspect.update({
      where: { id: prospectId },
      data: {
        arrivalReferralSource: dto.arrivalReferralSource,
        sourceDetails: dto.sourceDetails?.trim() || prospect.sourceDetails,
        source: prospect.source ?? 'outro',
      },
    });
  }

  async validateSupervision(prospectId: string, dto: TryoutSupervisionValidateDto, actorName: string) {
    const prospect = await this.findProspectOrThrow(prospectId);
    this.assertInTryout(prospect);
    if (!prospect.name?.trim()) throw new BadRequestException('Nome obrigatório.');
    if (!prospect.birthDate?.trim()) throw new BadRequestException('Data de nascimento obrigatória.');
    if (!prospect.guardianName?.trim() || !prospect.guardianPhone?.trim()) {
      throw new BadRequestException('Responsável e celular são obrigatórios para validação.');
    }
    if (!prospect.targetCategory?.trim()) {
      throw new BadRequestException('Informe a categoria alvo.');
    }

    return this.prisma.scoutingProspect.update({
      where: { id: prospectId },
      data: {
        supervisionDocsValidatedAt: new Date(),
        supervisionDocsValidatedBy: actorName,
        supervisionDocsNotes: dto.notes?.trim() || null,
        tryoutWorkflowStage: 'aguardando_fisio',
      },
    });
  }

  async renewPeriod(prospectId: string, dto: TryoutRenewPeriodDto, actorName: string) {
    const prospect = await this.findProspectOrThrow(prospectId);
    this.assertInTryout(prospect);
    const now = new Date();
    const prevEnd = prospect.tryoutPeriodEndsAt ?? now;
    const newEnd = addDays(prevEnd > now ? prevEnd : now, 7);
    const history = parseRenewalHistory(prospect.tryoutRenewalHistory);
    const entry: TryoutRenewalHistoryEntry = {
      periodStart: (prospect.tryoutPeriodStartedAt ?? now).toISOString(),
      periodEnd: prevEnd.toISOString(),
      renewedAt: now.toISOString(),
      renewedBy: actorName,
      notes: dto.notes?.trim(),
    };
    history.push(entry);

    return this.prisma.scoutingProspect.update({
      where: { id: prospectId },
      data: {
        tryoutPeriodEndsAt: newEnd,
        tryoutRenewalCount: { increment: 1 },
        tryoutRenewalHistory: history as Prisma.InputJsonValue,
      },
    });
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

    if (outcome === 'reprovado') {
      await this.prisma.scoutingProspect.update({
        where: { id: prospectId },
        data: {
          tryoutWorkflowStage: 'reprovado',
          tryoutRejectedAt: new Date(),
          tryoutRejectedReason: 'Liberação fisioterapêutica reprovada.',
          stage: 'recusado',
        },
      });
      return;
    }

    if (outcome === 'aprovado') {
      await this.prisma.scoutingProspect.update({
        where: { id: prospectId },
        data: { tryoutWorkflowStage: 'liberado_campo' },
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
    userId?: string,
  ) {
    const prospect = await this.findProspectOrThrow(prospectId);
    this.assertInTryout(prospect);
    if (!dto.descriptiveObservation?.trim()) {
      throw new BadRequestException('Observação descritiva é obrigatória.');
    }

    const physio = await this.physioTryout.getOperationalStatusForProspect(prospectId);
    if (!physio.canStartFieldEvaluation) {
      throw new BadRequestException('Liberação fisioterapêutica aprovada é obrigatória.');
    }
    if (prospect.ctScheduleStatus !== 'concluido' && prospect.tryoutWorkflowStage !== 'aguardando_treinador') {
      throw new BadRequestException('Conclua a avaliação em campo antes da avaliação do treinador.');
    }

    const row = await this.prisma.tryoutCoachEvaluation.create({
      data: {
        tenantId: prospect.tenantId,
        prospectId,
        staffId: dto.staffId?.trim() || null,
        staffName: dto.staffName?.trim() || null,
        technicalRating: dto.technicalRating,
        physicalRating: dto.physicalRating,
        tacticalRating: dto.tacticalRating,
        cognitiveRating: dto.cognitiveRating,
        descriptiveObservation: dto.descriptiveObservation.trim(),
        outcome: dto.outcome,
        createdByUserId: userId ?? null,
      },
    });

    if (dto.outcome === 'reprovado') {
      await this.prisma.scoutingProspect.update({
        where: { id: prospectId },
        data: {
          tryoutWorkflowStage: 'reprovado',
          tryoutRejectedAt: new Date(),
          tryoutRejectedBy: dto.staffName?.trim() || 'Treinador',
          tryoutRejectedReason: dto.descriptiveObservation.trim(),
          stage: 'recusado',
        },
      });
      return row;
    }

    await this.prisma.scoutingProspect.update({
      where: { id: prospectId },
      data: {
        tryoutWorkflowStage: 'aguardando_gerencia',
        managerDecision: 'pendente',
        managerDecisionAt: null,
        managerDecisionBy: null,
        managerDecisionNotes: null,
      },
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
      periodStart: prospect.tryoutPeriodStartedAt?.toISOString() ?? null,
      periodEnd: prospect.tryoutPeriodEndsAt?.toISOString() ?? null,
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
  }

  async recordTryoutManagerDecision(
    prospectId: string,
    dto: ManagerDecisionDto,
    actor: { name?: string; email?: string; role?: string },
  ) {
    this.assertGerenteDecisor(actor.role);
    const prospect = await this.findProspectOrThrow(prospectId);
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

    return this.prisma.scoutingProspect.update({
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
  }

  async updateRegistration(prospectId: string, dto: UpdateTryoutRegistrationDto) {
    const prospect = await this.findProspectOrThrow(prospectId);
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
      managerDecision?: string | null;
      ctScheduleStatus?: string | null;
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
    return {
      ...row,
      tryoutEffectiveStage: stage,
      physioClearanceStatus: physio.status,
      canStartCtFieldEvaluation: physio.canStartFieldEvaluation,
      latestCoachEvaluation: coach,
      tryoutBlockReason: blockReason,
      tryoutEvaluationDurationDays: durationDays,
    };
  }

  async getHub(tenantId: string, stageFilter?: string) {
    const where: Prisma.ScoutingProspectWhereInput = {
      tenantId,
      stage: { notIn: ['arquivado'] },
      OR: [
        { tryoutWorkflowStage: { not: null } },
        { stage: 'tryout' },
        { evaluationOutcome: 'para_teste' },
        { flowPath: 'tryout' },
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

    const enriched = await Promise.all(rows.map((p) => this.enrichProspectTryout(p)));
    const byStage: Record<string, number> = {};
    for (const s of TRYOUT_WORKFLOW_STAGES) byStage[s] = 0;
    for (const p of enriched) {
      const key = p.tryoutEffectiveStage ?? 'aguardando_supervisao';
      byStage[key] = (byStage[key] ?? 0) + 1;
    }
    return { items: enriched, byStage, total: enriched.length };
  }

  async getReporting(
    tenantId: string,
    filters: {
      from?: string;
      to?: string;
      targetCategory?: string;
      referralSource?: string;
      stage?: string;
    },
  ) {
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

  async getDossier(prospectId: string) {
    const prospect = await this.findProspectOrThrow(prospectId);
    const [physioRows, coach] = await Promise.all([
      this.physioTryout.findByProspect(prospectId, null),
      this.getLatestCoachEvaluation(prospectId),
    ]);
    return {
      prospect,
      physioClearances: physioRows,
      coachEvaluation: coach,
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

  private assertGerenteDecisor(role: string | undefined): void {
    const r = role?.trim().toLowerCase() ?? '';
    if (r === 'gerente' || r === 'gestor' || r === 'super_admin' || r === 'company_admin') {
      return;
    }
    throw new ForbiddenException('Decisão exclusiva do gerente de futebol.');
  }
}
