import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PhysioPlayerAvailabilityService } from '../common/physio-player-availability.service';
import { CreatePhysioTransitionProgramEntryDto } from './dto/fisiologia-transition.dto';
import {
  computeDurationMinutes,
} from '../fisioterapia/physio-transition.constants';
import { getPlayerListDisplayName } from '../common/player-list-display-name.util';
import {
  buildTransitionMonthlyReport,
  isNewTransitionReferral,
  monthDateRange,
  type TransitionReportProgramInput,
} from './fisiologia-transition.util';

@Injectable()
export class FisiologiaTransitionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: PhysioPlayerAvailabilityService,
  ) {}

  private buildOriginSummary(session: {
    region?: { namePt: string } | null;
    regionId?: string;
    diagnosisLabel?: string | null;
    treatmentLabel?: string | null;
    sessionDiagnoses?: Array<{ diagnosisLabel: string | null; diagnosis?: { name: string } | null }>;
    sessionTreatments?: Array<{ treatmentLabel: string | null; treatment?: { name: string } | null }>;
  } | null): string {
    if (!session) return '—';
    const region = session.region?.namePt ?? session.regionId ?? '';
    const dx =
      session.sessionDiagnoses && session.sessionDiagnoses.length > 0
        ? session.sessionDiagnoses
            .map((d) => d.diagnosisLabel ?? d.diagnosis?.name)
            .filter(Boolean)
            .join(' + ')
        : session.diagnosisLabel ?? '';
    const tx =
      session.sessionTreatments && session.sessionTreatments.length > 0
        ? session.sessionTreatments
            .map((t) => t.treatmentLabel ?? t.treatment?.name)
            .filter(Boolean)
            .join(' + ')
        : session.treatmentLabel ?? '';
    return [region, dx ? `Dx: ${dx}` : null, tx ? `Tx: ${tx}` : null].filter(Boolean).join(' · ') || '—';
  }

  private programListWhere(
    params: { tenantId?: string; category?: string; status?: string },
    allowed: string[] | null,
  ) {
    const statusParam = params.status?.trim() || 'active';
    const where: {
      tenantId?: string | { in: string[] };
      status?: string | { in: string[] };
      player?: { category?: string };
    } = {};

    if (statusParam === 'history') {
      where.status = { in: ['completed', 'cancelled'] };
    } else if (statusParam !== 'all') {
      where.status = statusParam;
    }

    if (params.tenantId) {
      this.assertTenant(allowed, params.tenantId);
      where.tenantId = params.tenantId;
    } else if (allowed !== null) {
      where.tenantId = { in: allowed };
    }

    if (params.category?.trim()) {
      where.player = { category: params.category.trim() };
    }

    return where;
  }

  private assertTenant(allowed: string[] | null, tenantId: string) {
    if (allowed === null) return;
    if (!allowed.includes(tenantId)) {
      throw new NotFoundException('Programa não encontrado.');
    }
  }

  private normalizePhysioDateKey(value: string): string {
    const trimmed = value.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      throw new BadRequestException('Data inválida. Use AAAA-MM-DD.');
    }
    return trimmed;
  }

  private normalizeTime(value: string, field: string): string {
    const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) throw new BadRequestException(`${field} inválido.`);
    const h = Number(match[1]);
    const m = Number(match[2]);
    if (h > 23 || m > 59) throw new BadRequestException(`${field} inválido.`);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  async getOperationalSummary(
    params: { tenantId?: string; category?: string },
    allowed: string[] | null,
  ) {
    const where = this.programListWhere({ ...params, status: 'active' }, allowed);

    const programs = await this.prisma.physioTransitionProgram.findMany({
      where,
      include: {
        player: { select: { id: true, name: true, category: true } },
        originSession: {
          select: {
            id: true,
            endedAt: true,
            region: { select: { namePt: true } },
            diagnosisLabel: true,
          },
        },
        _count: { select: { entries: true } },
      },
      orderBy: [{ startedAt: 'desc' }],
    });

    const newItems = programs
      .filter((p) => isNewTransitionReferral(p._count.entries, p.status))
      .map((p) => ({
        programId: p.id,
        playerId: p.playerId,
        playerName: p.player ? getPlayerListDisplayName(p.player) : '—',
        category: p.player?.category ?? null,
        startedAt: p.startedAt,
        originSessionId: p.originSession?.id ?? null,
        originLabel:
          p.originSession?.region?.namePt ?? p.originSession?.diagnosisLabel ?? null,
      }));

    return {
      activeCount: programs.length,
      newCount: newItems.length,
      items: newItems,
    };
  }

  async listPrograms(
    params: {
      tenantId?: string;
      category?: string;
      status?: string;
    },
    allowed: string[] | null,
  ) {
    const where = this.programListWhere(params, allowed);
    const programs = await this.prisma.physioTransitionProgram.findMany({
      where,
      include: {
        player: {
          select: { id: true, name: true, category: true, photoUrl: true },
        },
        originSession: {
          select: {
            id: true,
            diagnosisLabel: true,
            treatmentLabel: true,
            endedAt: true,
            disposition: true,
            region: { select: { namePt: true } },
          },
        },
        entries: {
          orderBy: [{ sessionDate: 'desc' }, { createdAt: 'desc' }],
          take: 1,
        },
        _count: { select: { entries: true } },
      },
      orderBy: [{ startedAt: 'desc' }],
    });

    return programs.map((p) => ({
      id: p.id,
      tenantId: p.tenantId,
      playerId: p.playerId,
      status: p.status,
      startedAt: p.startedAt,
      completedAt: p.completedAt,
      isNewReferral: isNewTransitionReferral(p._count.entries, p.status),
      player: p.player
        ? { ...p.player, name: getPlayerListDisplayName(p.player) }
        : p.player,
      originSession: p.originSession,
      sessionCount: p._count.entries,
      latestEntry: p.entries[0] ?? null,
    }));
  }

  async listPlayerPrograms(playerId: string, allowed: string[] | null) {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      select: { id: true, tenantId: true, name: true, category: true },
    });
    if (!player) throw new NotFoundException('Jogador não encontrado.');
    this.assertTenant(allowed, player.tenantId);

    const programs = await this.prisma.physioTransitionProgram.findMany({
      where: { playerId },
      include: {
        originSession: {
          include: {
            region: true,
            sessionDiagnoses: { include: { diagnosis: true } },
            sessionTreatments: { include: { treatment: true } },
          },
        },
        entries: { orderBy: [{ sessionDate: 'desc' }, { createdAt: 'desc' }] },
      },
      orderBy: [{ startedAt: 'desc' }],
    });

    return programs.map((p) => ({
      id: p.id,
      status: p.status,
      startedAt: p.startedAt,
      completedAt: p.completedAt,
      originSessionId: p.originSessionId,
      originSummary: this.buildOriginSummary(p.originSession),
      originSession: {
        id: p.originSession.id,
        endedAt: p.originSession.endedAt,
        disposition: p.originSession.disposition,
      },
      sessionCount: p.entries.length,
      entries: p.entries.map((e) => ({
        id: e.id,
        sessionDate: e.sessionDate,
        workType: e.workType,
        workTypeLabel: e.workTypeLabel,
        startTime: e.startTime,
        endTime: e.endTime,
        durationMinutes: e.durationMinutes,
        objective: e.objective,
        activities: e.activities,
        evolutionNote: e.evolutionNote,
        stillFeelsPain: e.stillFeelsPain,
        evolutionScore: e.evolutionScore,
        needsNewSession: e.needsNewSession,
      })),
    }));
  }

  async buildMonthlyReport(input: {
    tenantId: string;
    month: string;
    category?: string;
    playerId?: string;
  }) {
    const range = monthDateRange(input.month);
    if (!range) throw new BadRequestException('Mês inválido. Use AAAA-MM.');

    const programs = await this.prisma.physioTransitionProgram.findMany({
      where: {
        tenantId: input.tenantId,
        ...(input.playerId ? { playerId: input.playerId } : {}),
        ...(input.category ? { player: { category: input.category } } : {}),
      },
      include: {
        player: { select: { id: true, name: true, category: true } },
        originSession: {
          include: {
            region: true,
            sessionDiagnoses: { include: { diagnosis: true } },
            sessionTreatments: { include: { treatment: true } },
          },
        },
        entries: { orderBy: [{ sessionDate: 'asc' }, { createdAt: 'asc' }] },
      },
    });

    const reportInput: TransitionReportProgramInput[] = programs.map((p) => ({
      id: p.id,
      playerId: p.playerId,
      playerName: p.player ? getPlayerListDisplayName(p.player) : '—',
      category: p.player?.category ?? null,
      status: p.status,
      startedAt: p.startedAt,
      completedAt: p.completedAt,
      originSummary: this.buildOriginSummary(p.originSession),
      entries: p.entries.map((e) => ({
        sessionDate: e.sessionDate,
        durationMinutes: e.durationMinutes,
        objective: e.objective,
        activities: e.activities,
        evolutionNote: e.evolutionNote,
        needsNewSession: e.needsNewSession,
      })),
    }));

    return buildTransitionMonthlyReport(reportInput, input.month);
  }

  async findProgram(id: string, allowed: string[] | null) {
    const program = await this.prisma.physioTransitionProgram.findUnique({
      where: { id },
      include: {
        player: {
          select: {
            id: true,
            name: true,
            category: true,
            photoUrl: true,
            status: true,
            statusDetails: true,
            tenantId: true,
          },
        },
        originSession: {
          include: {
            region: true,
            sessionRegions: { include: { region: true }, orderBy: { sortOrder: 'asc' } },
            sessionDiagnoses: { include: { diagnosis: true }, orderBy: { sortOrder: 'asc' } },
            sessionTreatments: { include: { treatment: true }, orderBy: { sortOrder: 'asc' } },
          },
        },
        entries: {
          orderBy: [{ sessionDate: 'desc' }, { createdAt: 'desc' }],
        },
      },
    });
    if (!program) throw new NotFoundException('Programa de transição não encontrado.');
    this.assertTenant(allowed, program.tenantId);
    return {
      ...program,
      player: program.player
        ? { ...program.player, name: getPlayerListDisplayName(program.player) }
        : program.player,
    };
  }

  async createProgramEntry(
    programId: string,
    dto: CreatePhysioTransitionProgramEntryDto,
    allowed: string[] | null,
    userId?: string,
  ) {
    const program = await this.findProgram(programId, allowed);
    if (program.status !== 'active') {
      throw new BadRequestException(
        program.status === 'completed'
          ? 'Programa de transição concluído — histórico imutável.'
          : 'Este programa de transição não aceita novas sessões.',
      );
    }

    const sessionDate = this.normalizePhysioDateKey(dto.sessionDate);
    const startTime = this.normalizeTime(dto.startTime, 'Hora de início');
    const endTime = this.normalizeTime(dto.endTime, 'Hora de fim');
    const durationMinutes = computeDurationMinutes(startTime, endTime);
    if (durationMinutes <= 0) {
      throw new BadRequestException('A hora de fim deve ser posterior à hora de início.');
    }
    if (dto.workType === 'outro' && !dto.workTypeLabel?.trim()) {
      throw new BadRequestException('Descreva o tipo de trabalho.');
    }

    const entry = await this.prisma.$transaction(async (tx) => {
      const created = await tx.physioTransitionEntry.create({
        data: {
          programId: program.id,
          sessionId: program.originSessionId,
          sessionDate,
          workType: dto.workType.trim(),
          workTypeLabel: dto.workTypeLabel?.trim() || null,
          startTime,
          endTime,
          durationMinutes,
          objective: dto.objective?.trim() || null,
          activities: dto.activities?.trim() || null,
          evolutionNote: dto.evolutionNote?.trim() || null,
          stillFeelsPain: dto.stillFeelsPain === true,
          evolutionScore: dto.evolutionScore ?? null,
          needsNewSession: dto.needsNewSession === true,
          staffId: dto.staffId?.trim() || null,
          staffName: dto.staffName?.trim() || null,
          createdByUserId: userId ?? null,
        },
      });

      if (!dto.needsNewSession) {
        await tx.physioTransitionProgram.update({
          where: { id: program.id },
          data: { status: 'completed', completedAt: new Date() },
        });
        await tx.physioSession.update({
          where: { id: program.originSessionId },
          data: { transitionCompletedAt: new Date() },
        });
      }

      return created;
    });

    await this.availability.syncPlayerPhysioAndTransitionStatus(program.playerId);
    return entry;
  }
}
