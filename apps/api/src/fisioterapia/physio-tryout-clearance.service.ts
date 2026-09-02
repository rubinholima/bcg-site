import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../common/mail.service';
import { CAPTACAO_MANAGER_EMAIL } from '../captacao/captacao.constants';
import {
  CreatePhysioTryoutClearanceDto,
  UpdatePhysioTryoutClearanceDto,
} from './dto/physio-tryout-clearance.dto';
import {
  canStartCtFieldEvaluation,
  resolvePhysioClearanceOperationalStatus,
} from './physio-periodic-protocols.util';

export type PhysioClearanceOperationalStatus = {
  status: 'pendente' | 'aprovado' | 'reprovado';
  canStartFieldEvaluation: boolean;
  clearanceId?: string;
  evaluatedAt?: string;
  outcome?: string;
};

@Injectable()
export class PhysioTryoutClearanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async getLatestForProspect(prospectId: string) {
    return this.prisma.physioTryoutClearance.findFirst({
      where: { prospectId },
      orderBy: { evaluatedAt: 'desc' },
    });
  }

  async getOperationalStatusForProspect(prospectId: string): Promise<PhysioClearanceOperationalStatus> {
    const latest = await this.getLatestForProspect(prospectId);
    const status = resolvePhysioClearanceOperationalStatus(latest);
    return {
      status,
      canStartFieldEvaluation: canStartCtFieldEvaluation(status),
      clearanceId: latest?.id,
      evaluatedAt: latest?.evaluatedAt?.toISOString(),
      outcome: latest?.outcome ?? undefined,
    };
  }

  async assertCanStartCtFieldEvaluation(prospectId: string) {
    const op = await this.getOperationalStatusForProspect(prospectId);
    if (!op.canStartFieldEvaluation) {
      throw new BadRequestException(
        op.status === 'reprovado'
          ? 'Liberação fisioterapêutica reprovada — o atleta não pode iniciar avaliação em campo.'
          : 'Liberação fisioterapêutica pendente — registre e aprove a avaliação da Fisioterapia antes de iniciar em campo.',
      );
    }
  }

  async findByProspect(prospectId: string, allowed: string[] | null) {
    const rows = await this.prisma.physioTryoutClearance.findMany({
      where: { prospectId },
      orderBy: { evaluatedAt: 'desc' },
      include: {
        prospect: { select: { id: true, name: true, targetCategory: true, stage: true } },
        player: { select: { id: true, name: true } },
      },
    });
    if (rows.length && allowed !== null) {
      this.assertTenant(allowed, rows[0].tenantId);
    }
    return rows;
  }

  async findByPlayer(playerId: string, allowed: string[] | null) {
    const prospect = await this.prisma.scoutingProspect.findFirst({
      where: { playerId },
      select: { id: true },
    });
    if (!prospect) return [];
    return this.findByProspect(prospect.id, allowed);
  }

  async findOne(id: string, allowed: string[] | null) {
    const row = await this.prisma.physioTryoutClearance.findUnique({
      where: { id },
      include: {
        prospect: { select: { id: true, name: true, targetCategory: true, stage: true } },
        player: { select: { id: true, name: true } },
      },
    });
    if (!row) throw new NotFoundException('Liberação try-out não encontrada.');
    this.assertTenant(allowed, row.tenantId);
    return row;
  }

  async create(
    dto: CreatePhysioTryoutClearanceDto,
    allowed: string[] | null,
    userId?: string,
  ) {
    this.assertTenant(allowed, dto.tenantId);
    const prospect = await this.prisma.scoutingProspect.findUnique({
      where: { id: dto.prospectId },
    });
    if (!prospect || prospect.tenantId !== dto.tenantId) {
      throw new BadRequestException('Prospect não encontrado neste clube.');
    }

    const evaluatedAt = dto.evaluatedAt?.trim() ? new Date(dto.evaluatedAt) : new Date();
    const row = await this.prisma.physioTryoutClearance.create({
      data: {
        tenantId: dto.tenantId,
        prospectId: dto.prospectId,
        playerId: prospect.playerId,
        prospectName: prospect.name,
        targetCategory: prospect.targetCategory,
        staffId: dto.staffId?.trim() || null,
        staffName: dto.staffName?.trim() || null,
        injuryHistory: dto.injuryHistory?.trim() || null,
        bilateralTests: dto.bilateralTests as Prisma.InputJsonValue,
        manualStrengthTest: dto.manualStrengthTest?.trim() || null,
        observations: dto.observations?.trim() || null,
        outcome: dto.outcome,
        evaluatedAt,
        createdByUserId: userId ?? null,
      },
      include: {
        prospect: { select: { id: true, name: true, targetCategory: true } },
      },
    });

    const emailResult = await this.notifyClearanceCompleted(row);
    if (emailResult.error) {
      await this.prisma.physioTryoutClearance.update({
        where: { id: row.id },
        data: { emailNotifyError: emailResult.error },
      });
    }

    return {
      ...row,
      emailNotification: emailResult,
      operationalStatus: resolvePhysioClearanceOperationalStatus(row),
    };
  }

  async update(id: string, dto: UpdatePhysioTryoutClearanceDto, allowed: string[] | null) {
    const existing = await this.findOne(id, allowed);
    const evaluatedAt =
      dto.evaluatedAt != null ? new Date(dto.evaluatedAt) : undefined;
    const row = await this.prisma.physioTryoutClearance.update({
      where: { id },
      data: {
        ...(dto.staffId !== undefined && { staffId: dto.staffId?.trim() || null }),
        ...(dto.staffName !== undefined && { staffName: dto.staffName?.trim() || null }),
        ...(dto.injuryHistory !== undefined && {
          injuryHistory: dto.injuryHistory?.trim() || null,
        }),
        ...(dto.bilateralTests !== undefined && {
          bilateralTests: dto.bilateralTests as Prisma.InputJsonValue,
        }),
        ...(dto.manualStrengthTest !== undefined && {
          manualStrengthTest: dto.manualStrengthTest?.trim() || null,
        }),
        ...(dto.observations !== undefined && {
          observations: dto.observations?.trim() || null,
        }),
        ...(dto.outcome !== undefined && { outcome: dto.outcome }),
        ...(evaluatedAt != null && { evaluatedAt }),
      },
      include: {
        prospect: { select: { id: true, name: true, targetCategory: true } },
      },
    });

    let emailResult: { sent: boolean; error?: string } | null = null;
    if (dto.outcome && dto.outcome !== existing.outcome) {
      emailResult = await this.notifyClearanceCompleted(row);
      if (emailResult.error) {
        await this.prisma.physioTryoutClearance.update({
          where: { id: row.id },
          data: { emailNotifyError: emailResult.error },
        });
      }
    }

    return {
      ...row,
      emailNotification: emailResult,
      operationalStatus: resolvePhysioClearanceOperationalStatus(row),
    };
  }

  async linkPlayerOnPromote(prospectId: string, playerId: string) {
    await this.prisma.physioTryoutClearance.updateMany({
      where: { prospectId, playerId: null },
      data: { playerId },
    });
  }

  async listTryoutProspects(tenantId: string, allowed: string[] | null) {
    this.assertTenant(allowed, tenantId);
    return this.prisma.scoutingProspect.findMany({
      where: {
        tenantId,
        stage: { notIn: ['recusado', 'arquivado', 'cadastrado'] },
        OR: [{ stage: 'tryout' }, { ctScheduleStatus: { not: null } }],
      },
      orderBy: [{ updatedAt: 'desc' }],
      select: {
        id: true,
        name: true,
        targetCategory: true,
        stage: true,
        ctScheduleStatus: true,
        playerId: true,
      },
      take: 200,
    });
  }

  private assertTenant(allowed: string[] | null, tenantId: string) {
    if (allowed !== null && !allowed.includes(tenantId)) {
      throw new BadRequestException('Sem permissão para este clube.');
    }
  }

  private async notifyClearanceCompleted(row: {
    id: string;
    tenantId: string;
    prospectName: string | null;
    targetCategory: string | null;
    outcome: string;
    staffName: string | null;
    evaluatedAt: Date;
  }): Promise<{ sent: boolean; error?: string; supervisorSent?: boolean; managerSent?: boolean }> {
    const settings = await this.prisma.purchaseSetting.findUnique({
      where: { tenantId: row.tenantId },
    });
    const supervisorEmail = CAPTACAO_MANAGER_EMAIL?.trim() || '';
    const managerEmail = settings?.diretoriaNotifyEmail?.trim() || '';

    const subject = `Fisioterapia — liberação try-out ${row.outcome === 'aprovado' ? 'APROVADA' : 'REPROVADA'}: ${row.prospectName ?? 'Atleta'}`;
    const text = [
      'Liberação fisioterapêutica de try-out registrada.',
      '',
      `Atleta: ${row.prospectName ?? '—'}`,
      row.targetCategory ? `Categoria: ${row.targetCategory}` : null,
      `Resultado: ${row.outcome === 'aprovado' ? 'APROVADO' : 'REPROVADO'}`,
      row.staffName ? `Avaliador: ${row.staffName}` : null,
      `Data: ${row.evaluatedAt.toLocaleString('pt-BR')}`,
      '',
      'Boston City Group — Fisioterapia',
    ]
      .filter(Boolean)
      .join('\n');

    let supervisorSent = false;
    let managerSent = false;
    const errors: string[] = [];

    if (supervisorEmail) {
      const r = await this.mail.sendMail({ to: supervisorEmail, subject, text });
      supervisorSent = r.sent;
      if (!r.sent && r.error) errors.push(`Supervisão: ${r.error}`);
      if (r.sent) {
        await this.prisma.physioTryoutClearance.update({
          where: { id: row.id },
          data: { supervisorNotifiedAt: new Date() },
        });
      }
    } else {
      errors.push('Supervisão: destinatário não configurado (CAPTACAO_MANAGER_EMAIL)');
    }

    if (managerEmail) {
      const r = await this.mail.sendMail({ to: managerEmail, subject, text });
      managerSent = r.sent;
      if (!r.sent && r.error) errors.push(`Gerência: ${r.error}`);
      if (r.sent) {
        await this.prisma.physioTryoutClearance.update({
          where: { id: row.id },
          data: { managerNotifiedAt: new Date() },
        });
      }
    } else {
      errors.push('Gerência: diretoriaNotifyEmail não configurado para o clube');
    }

    if (!supervisorEmail && !managerEmail) {
      return { sent: false, error: errors.join(' · '), supervisorSent, managerSent };
    }

    return {
      sent: supervisorSent || managerSent,
      error: errors.length ? errors.join(' · ') : undefined,
      supervisorSent,
      managerSent,
    };
  }
}
