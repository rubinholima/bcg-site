import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantAccessService } from '../auth/tenant-access.service';
import {
  ANALYSIS_SESSION_KINDS,
  type AnalysisSessionKind,
} from './performance-analysis.constants';

@Injectable()
export class PerformanceAnalysisAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  assertTenant(allowedTenantIds: string[] | null, tenantId: string): void {
    this.tenantAccess.assertCanAccessTenant(allowedTenantIds, tenantId);
  }

  async loadSession(sessionId: string, allowedTenantIds: string[] | null) {
    const session = await this.prisma.analysisSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Sessão de análise não encontrada.');
    this.assertTenant(allowedTenantIds, session.tenantId);
    return session;
  }

  validateSessionKind(kind: string): AnalysisSessionKind {
    const normalized = kind.trim().toUpperCase();
    if (!(ANALYSIS_SESSION_KINDS as readonly string[]).includes(normalized)) {
      throw new BadRequestException('Tipo de sessão inválido.');
    }
    return normalized as AnalysisSessionKind;
  }

  async validateSessionSources(input: {
    tenantId: string;
    fmfMatchReportId?: string | null;
    travelLogisticsId?: string | null;
    trainingSessionId?: string | null;
    opponentProfileId?: string | null;
  }): Promise<void> {
    const ids = [
      input.fmfMatchReportId?.trim() || null,
      input.travelLogisticsId?.trim() || null,
      input.trainingSessionId?.trim() || null,
      input.opponentProfileId?.trim() || null,
    ].filter(Boolean);
    if (ids.length > 1) {
      throw new BadRequestException(
        'Informe apenas uma fonte canônica (jogo, viagem, treino ou perfil adversário).',
      );
    }
    if (input.fmfMatchReportId?.trim()) {
      const row = await this.prisma.fmfMatchReport.findFirst({
        where: { id: input.fmfMatchReportId.trim(), tenantId: input.tenantId },
        select: { id: true },
      });
      if (!row) throw new BadRequestException('Partida FMF inválida para esta empresa.');
    }
    if (input.travelLogisticsId?.trim()) {
      const row = await this.prisma.travelLogistics.findFirst({
        where: { id: input.travelLogisticsId.trim(), tenantId: input.tenantId },
        select: { id: true },
      });
      if (!row) throw new BadRequestException('Viagem inválida para esta empresa.');
    }
    if (input.trainingSessionId?.trim()) {
      const row = await this.prisma.coachTrainingSession.findFirst({
        where: { id: input.trainingSessionId.trim(), tenantId: input.tenantId },
        select: { id: true },
      });
      if (!row) throw new BadRequestException('Treino inválido para esta empresa.');
    }
    if (input.opponentProfileId?.trim()) {
      const row = await this.prisma.analysisOpponentProfile.findFirst({
        where: { id: input.opponentProfileId.trim(), tenantId: input.tenantId },
        select: { id: true },
      });
      if (!row) throw new BadRequestException('Perfil de adversário inválido para esta empresa.');
    }
  }

  async loadOpponentProfile(profileId: string, allowedTenantIds: string[] | null) {
    const row = await this.prisma.analysisOpponentProfile.findUnique({ where: { id: profileId } });
    if (!row) throw new NotFoundException('Perfil de adversário não encontrado.');
    this.assertTenant(allowedTenantIds, row.tenantId);
    return row;
  }

  async loadPreMatchVersion(versionId: string, allowedTenantIds: string[] | null) {
    const row = await this.prisma.analysisPreMatchVersion.findUnique({
      where: { id: versionId },
      include: { preparation: true },
    });
    if (!row) throw new NotFoundException('Versão de pré-jogo não encontrada.');
    this.assertTenant(allowedTenantIds, row.preparation.tenantId);
    return row;
  }

  async assertClipInTenant(clipId: string, tenantId: string) {
    const clip = await this.prisma.analysisClip.findFirst({
      where: { id: clipId, tenantId },
    });
    if (!clip) throw new BadRequestException('Clip inválido.');
    return clip;
  }

  async assertPlayerInTenant(playerId: string, tenantId: string): Promise<void> {
    const player = await this.prisma.player.findFirst({
      where: { id: playerId, tenantId },
      select: { id: true },
    });
    if (!player) {
      throw new ForbiddenException('Atleta inválido para esta sessão.');
    }
  }

  async assertTagInTenant(tagDefinitionId: string, tenantId: string) {
    const tag = await this.prisma.analysisTagDefinition.findFirst({
      where: { id: tagDefinitionId, tenantId, active: true },
    });
    if (!tag) throw new BadRequestException('Tag de análise inválida.');
    return tag;
  }

  async assertVideoSourceInSession(videoSourceId: string, sessionId: string, tenantId: string) {
    const src = await this.prisma.analysisVideoSource.findFirst({
      where: { id: videoSourceId, analysisSessionId: sessionId, tenantId },
    });
    if (!src) throw new BadRequestException('Fonte de vídeo inválida.');
    return src;
  }
}
