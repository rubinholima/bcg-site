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

@Injectable()
export class FisiologiaTransitionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: PhysioPlayerAvailabilityService,
  ) {}

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

  async listPrograms(
    params: {
      tenantId?: string;
      category?: string;
      status?: string;
    },
    allowed: string[] | null,
  ) {
    const status = params.status?.trim() || 'active';
    const where: {
      tenantId?: string | { in: string[] };
      status: string;
      player?: { category?: string };
    } = { status };

    if (params.tenantId) {
      this.assertTenant(allowed, params.tenantId);
      where.tenantId = params.tenantId;
    } else if (allowed !== null) {
      where.tenantId = { in: allowed };
    }

    if (params.category?.trim()) {
      where.player = { category: params.category.trim() };
    }

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
      player: p.player
        ? { ...p.player, name: getPlayerListDisplayName(p.player) }
        : p.player,
      originSession: p.originSession,
      sessionCount: p._count.entries,
      latestEntry: p.entries[0] ?? null,
    }));
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
      throw new BadRequestException('Este programa de transição já foi encerrado.');
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
