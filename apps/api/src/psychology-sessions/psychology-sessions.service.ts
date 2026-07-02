import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FutebolAgendaService } from '../futebol-agenda/futebol-agenda.service';
import {
  isArchivedSportsSituation,
  isLoanedSportsSituation,
} from '../common/sports-situation.util';
import { getPlayerListDisplayName } from '../common/player-list-display-name.util';
import {
  CreatePsychologySessionDto,
  PsychologyAttendanceRowDto,
  UpdatePsychologySessionDto,
} from './dto/psychology-session.dto';

type AttendanceRow = PsychologyAttendanceRowDto & { playerName?: string };

@Injectable()
export class PsychologySessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly futebolAgenda: FutebolAgendaService,
  ) {}

  async list(
    params?: {
      tenantId?: string;
      from?: string;
      to?: string;
      sessionType?: string;
      category?: string;
    },
    allowedTenantIds: string[] | null = null,
  ) {
    const where: Record<string, unknown> = {};
    if (params?.tenantId) {
      where.tenantId = params.tenantId;
    } else if (allowedTenantIds?.length) {
      where.tenantId = { in: allowedTenantIds };
    }
    if (params?.sessionType) where.sessionType = params.sessionType;
    if (params?.category) where.category = params.category;
    if (params?.from || params?.to) {
      where.date = {};
      if (params.from) (where.date as Record<string, string>).gte = params.from;
      if (params.to) (where.date as Record<string, string>).lte = params.to;
    }
    return this.prisma.psychologySession.findMany({
      where,
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async findOne(id: string, allowedTenantIds: string[] | null = null) {
    const row = await this.prisma.psychologySession.findUnique({
      where: { id },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
    if (!row) throw new NotFoundException('Sessão não encontrada');
    if (allowedTenantIds?.length && !allowedTenantIds.includes(row.tenantId)) {
      throw new ForbiddenException('Acesso negado a esta empresa.');
    }
    return row;
  }

  async create(dto: CreatePsychologySessionDto) {
    await this.assertTenant(dto.tenantId);
    const names = await this.resolveStaffNames(dto);
    let attendance = dto.attendance;
    if (dto.sessionType === 'grupo' && dto.category && (!attendance || attendance.length === 0)) {
      attendance = await this.buildCategoryAttendance(dto.tenantId, dto.category);
    }
    const row = await this.prisma.psychologySession.create({
      data: {
        tenantId: dto.tenantId,
        sessionType: dto.sessionType,
        date: dto.date,
        time: dto.time ?? null,
        endTime: dto.endTime ?? null,
        category: dto.category ?? null,
        playerId: dto.playerId ?? null,
        psychologistId: dto.psychologistId ?? null,
        estagiarioId: dto.estagiarioId ?? null,
        psychologistName: names.psychologistName ?? null,
        estagiarioName: names.estagiarioName ?? null,
        location: dto.location ?? null,
        status: dto.status ?? 'scheduled',
        notes: dto.notes ?? null,
        periodStart: dto.periodStart ?? null,
        periodEnd: dto.periodEnd ?? null,
        categoriesLabel: dto.categoriesLabel ?? null,
        activities: dto.activities ?? null,
        individualDemands: dto.individualDemands ?? null,
        weeklyDevelopment: dto.weeklyDevelopment ?? null,
        identifiedDemands: dto.identifiedDemands ?? null,
        nextWeekPlanning: dto.nextWeekPlanning ?? null,
        finalSummary: dto.finalSummary ?? null,
        generalNotes: dto.generalNotes ?? null,
        groupSummary: dto.groupSummary ?? null,
        attendance: attendance as object | undefined,
        durationSeconds: dto.durationSeconds ?? null,
      },
    });

    let footballAgendaEntryId: string | null = null;
    if (dto.syncAgenda !== false && dto.sessionType !== 'relatorio_semanal') {
      footballAgendaEntryId = await this.syncFootballAgenda(row);
    }

    const updated = await this.prisma.psychologySession.update({
      where: { id: row.id },
      data: { footballAgendaEntryId },
    });

    if (updated.status === 'completed') {
      await this.syncPlayerRecords(updated);
    }

    return updated;
  }

  async update(id: string, dto: UpdatePsychologySessionDto) {
    const existing = await this.findOne(id);
    const names = await this.resolveStaffNames({
      ...dto,
      psychologistId: dto.psychologistId ?? existing.psychologistId ?? undefined,
      estagiarioId: dto.estagiarioId ?? existing.estagiarioId ?? undefined,
      psychologistName: dto.psychologistName ?? existing.psychologistName ?? undefined,
      estagiarioName: dto.estagiarioName ?? existing.estagiarioName ?? undefined,
    });

    const row = await this.prisma.psychologySession.update({
      where: { id },
      data: {
        tenantId: dto.tenantId ?? existing.tenantId,
        sessionType: dto.sessionType ?? existing.sessionType,
        date: dto.date ?? existing.date,
        time: dto.time !== undefined ? dto.time : existing.time,
        endTime: dto.endTime !== undefined ? dto.endTime : existing.endTime,
        category: dto.category !== undefined ? dto.category : existing.category,
        playerId: dto.playerId !== undefined ? dto.playerId : existing.playerId,
        psychologistId:
          dto.psychologistId !== undefined ? dto.psychologistId : existing.psychologistId,
        estagiarioId:
          dto.estagiarioId !== undefined ? dto.estagiarioId : existing.estagiarioId,
        psychologistName: names.psychologistName ?? existing.psychologistName,
        estagiarioName: names.estagiarioName ?? existing.estagiarioName,
        location: dto.location !== undefined ? dto.location : existing.location,
        status: dto.status ?? existing.status,
        notes: dto.notes !== undefined ? dto.notes : existing.notes,
        periodStart: dto.periodStart !== undefined ? dto.periodStart : existing.periodStart,
        periodEnd: dto.periodEnd !== undefined ? dto.periodEnd : existing.periodEnd,
        categoriesLabel:
          dto.categoriesLabel !== undefined ? dto.categoriesLabel : existing.categoriesLabel,
        activities: dto.activities !== undefined ? dto.activities : existing.activities,
        individualDemands:
          dto.individualDemands !== undefined ? dto.individualDemands : existing.individualDemands,
        weeklyDevelopment:
          dto.weeklyDevelopment !== undefined
            ? dto.weeklyDevelopment
            : existing.weeklyDevelopment,
        identifiedDemands:
          dto.identifiedDemands !== undefined
            ? dto.identifiedDemands
            : existing.identifiedDemands,
        nextWeekPlanning:
          dto.nextWeekPlanning !== undefined ? dto.nextWeekPlanning : existing.nextWeekPlanning,
        finalSummary: dto.finalSummary !== undefined ? dto.finalSummary : existing.finalSummary,
        generalNotes: dto.generalNotes !== undefined ? dto.generalNotes : existing.generalNotes,
        groupSummary: dto.groupSummary !== undefined ? dto.groupSummary : existing.groupSummary,
        attendance:
          dto.attendance !== undefined
            ? (dto.attendance as object)
            : (existing.attendance as object | undefined),
        durationSeconds:
          dto.durationSeconds !== undefined ? dto.durationSeconds : existing.durationSeconds,
      },
    });

    if (row.status === 'completed') {
      await this.syncPlayerRecords(row);
    }

    return row;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.psychologySession.delete({ where: { id } });
    return { ok: true };
  }

  async categoryRoster(tenantId: string, category: string) {
    await this.assertTenant(tenantId);
    const players = await this.findActivePlayersByCategory(tenantId, category);
    return players
      .map((p) => ({
        playerId: p.id,
        playerName: getPlayerListDisplayName(p),
        present: false,
      }))
      .sort((a, b) =>
        (a.playerName ?? '').localeCompare(b.playerName ?? '', 'pt-BR', { sensitivity: 'base' }),
      );
  }

  private sportsSituationFromProfile(registrationProfile: unknown): string | undefined {
    if (!registrationProfile || typeof registrationProfile !== 'object' || Array.isArray(registrationProfile)) {
      return undefined;
    }
    const sports = (registrationProfile as Record<string, unknown>).sports;
    if (!sports || typeof sports !== 'object' || Array.isArray(sports)) return undefined;
    const situation = (sports as Record<string, unknown>).situation;
    return typeof situation === 'string' ? situation : undefined;
  }

  /** Mesma regra da lista principal de jogadores: sem desligados nem emprestados. */
  private isActiveRosterPlayer(registrationProfile: unknown): boolean {
    const situation = this.sportsSituationFromProfile(registrationProfile);
    return !isArchivedSportsSituation(situation) && !isLoanedSportsSituation(situation);
  }

  private async findActivePlayersByCategory(tenantId: string, category: string) {
    const players = await this.prisma.player.findMany({
      where: { tenantId, category },
      select: { id: true, name: true, registrationProfile: true },
      orderBy: { name: 'asc' },
    });
    return players.filter((p) => this.isActiveRosterPlayer(p.registrationProfile));
  }

  private async assertTenant(tenantId: string) {
    const t = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!t) throw new BadRequestException('Clube não encontrado');
  }

  private async resolveStaffNames(dto: {
    psychologistId?: string;
    estagiarioId?: string;
    psychologistName?: string;
    estagiarioName?: string;
  }) {
    let psychologistName = dto.psychologistName?.trim();
    let estagiarioName = dto.estagiarioName?.trim();
    if (dto.psychologistId) {
      const p = await this.prisma.psychologist.findUnique({
        where: { id: dto.psychologistId },
        select: { name: true },
      });
      if (p) psychologistName = p.name;
    }
    if (dto.estagiarioId) {
      const e = await this.prisma.psychologist.findUnique({
        where: { id: dto.estagiarioId },
        select: { name: true },
      });
      if (e) estagiarioName = e.name;
    }
    return { psychologistName, estagiarioName };
  }

  private async buildCategoryAttendance(tenantId: string, category: string): Promise<AttendanceRow[]> {
    const players = await this.findActivePlayersByCategory(tenantId, category);
    return players.map((p) => ({
      playerId: p.id,
      playerName: getPlayerListDisplayName(p),
      present: false,
    }));
  }

  private sessionTitle(row: {
    sessionType: string;
    category: string | null;
    categoriesLabel: string | null;
    psychologistName: string | null;
  }) {
    if (row.sessionType === 'grupo') {
      const cat = row.category ?? row.categoriesLabel ?? 'grupo';
      return `Psicologia em grupo — ${cat}`;
    }
    if (row.sessionType === 'presencial') {
      return `Atendimento psicológico presencial`;
    }
    return `Relatório semanal — Psicologia`;
  }

  private toStartAt(date: string, time?: string | null) {
    const t = time?.trim() || '09:00';
    const iso = `${date}T${t.length === 5 ? `${t}:00` : t}`;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) throw new BadRequestException('Data/hora inválida');
    return d.toISOString();
  }

  private async syncFootballAgenda(row: {
    id: string;
    tenantId: string;
    sessionType: string;
    date: string;
    time: string | null;
    endTime: string | null;
    category: string | null;
    location: string | null;
    notes: string | null;
    psychologistName: string | null;
    attendance: unknown;
  }) {
    try {
      const attendance = Array.isArray(row.attendance)
        ? (row.attendance as AttendanceRow[])
        : [];
      const playerIds = attendance.map((a) => a.playerId).filter(Boolean);
      const startAt = this.toStartAt(row.date, row.time);
      let endAt: string | null = null;
      if (row.endTime) {
        endAt = this.toStartAt(row.date, row.endTime);
      }
      const entry = await this.futebolAgenda.createEntry({
        tenantId: row.tenantId,
        category: row.category ?? undefined,
        type: 'compromisso',
        title: this.sessionTitle({
          sessionType: row.sessionType,
          category: row.category,
          categoriesLabel: null,
          psychologistName: row.psychologistName,
        }),
        startAt,
        endAt: endAt ?? undefined,
        location: row.location ?? undefined,
        description: [
          row.psychologistName ? `Profissional: ${row.psychologistName}` : null,
          row.notes,
        ]
          .filter(Boolean)
          .join('\n'),
        playerIds: playerIds.length ? playerIds : undefined,
        allowConflict: true,
      });
      return entry.id;
    } catch {
      return null;
    }
  }

  private async syncPlayerRecords(row: {
    id: string;
    sessionType: string;
    date: string;
    time: string | null;
    category: string | null;
    playerId: string | null;
    psychologistName: string | null;
    estagiarioName: string | null;
    groupSummary: string | null;
    notes: string | null;
    finalSummary: string | null;
    attendance: unknown;
  }) {
    const evaluator = row.estagiarioName ?? row.psychologistName ?? undefined;
    const base = {
      date: row.date,
      time: row.time ?? undefined,
      evaluator,
      supervisor: row.psychologistName ?? undefined,
      estagiario: row.estagiarioName ?? undefined,
      sessionId: row.id,
    };

    if (row.sessionType === 'relatorio_semanal') {
      return;
    }

    if (row.sessionType === 'presencial' && row.playerId) {
      await this.appendPsychEntry(row.playerId, {
        ...base,
        kind: 'atendimento_presencial',
        category: row.category ?? undefined,
        observacaoGeral: row.notes ?? row.groupSummary ?? undefined,
      });
      return;
    }

    if (row.sessionType === 'grupo') {
      const attendance = Array.isArray(row.attendance)
        ? (row.attendance as AttendanceRow[])
        : [];
      for (const item of attendance) {
        if (!item.playerId) continue;
        await this.appendPsychEntry(item.playerId, {
          ...base,
          kind: 'atendimento_grupo',
          category: row.category ?? undefined,
          present: item.present !== false,
          groupSummary: row.groupSummary ?? undefined,
          individualNotes: item.individualNotes ?? undefined,
          observacaoGeral: item.individualNotes ?? row.groupSummary ?? undefined,
        });
      }
    }
  }

  private async appendPsychEntry(playerId: string, entry: Record<string, unknown>) {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      select: { psychologicalAssessment: true },
    });
    if (!player) return;
    const list = Array.isArray(player.psychologicalAssessment)
      ? [...(player.psychologicalAssessment as Record<string, unknown>[])]
      : [];
    const sessionId = entry.sessionId as string;
    const kind = entry.kind as string;
    const filtered = list.filter(
      (x) => !(x.sessionId === sessionId && x.kind === kind),
    );
    filtered.push(entry);
    await this.prisma.player.update({
      where: { id: playerId },
      data: { psychologicalAssessment: filtered as object },
    });
  }
}
