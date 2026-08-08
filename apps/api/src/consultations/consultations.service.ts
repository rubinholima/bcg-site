import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleCalendarService } from './google-calendar.service';
import { getPlayerListDisplayName } from '../common/player-list-display-name.util';

export interface ConsultationItem {
  playerId: string;
  playerName: string;
  playerPhotoUrl?: string;
  tenantName?: string;
  tenantLogoUrl?: string;
  category?: string;
  date?: string;
  time?: string;
  type?: string;
  link?: string;
  notes?: string;
  status?: string;
  psychologist?: string;
  psychologistPhotoUrl?: string;
  durationSeconds?: number;
}

@Injectable()
export class ConsultationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly googleCalendar: GoogleCalendarService,
  ) {}

  private consultationPerformerName(
    psychologistName?: string | null,
    estagiarioName?: string | null,
    legacyPsychologist?: string,
  ): string | undefined {
    const performer =
      estagiarioName?.trim() || psychologistName?.trim() || legacyPsychologist?.trim();
    return performer || undefined;
  }

  private tenantScopeWhere(allowedTenantIds: string[] | null | undefined): { tenantId?: { in: string[] } } {
    if (allowedTenantIds === null || allowedTenantIds === undefined) return {};
    return { tenantId: { in: allowedTenantIds } };
  }

  async listAllConsultations(
    allowedTenantIds: string[] | null = null,
  ): Promise<Array<ConsultationItem & { id: string; tenantId: string }>> {
    const tenantFilter = this.tenantScopeWhere(allowedTenantIds);
    const [players, psychList, sessions] = await Promise.all([
      this.prisma.player.findMany({
        where: tenantFilter,
        include: { tenant: { select: { name: true, logoUrl: true } } },
      }),
      this.prisma.psychologist.findMany({ select: { name: true, photoUrl: true } }),
      this.prisma.psychologySession.findMany({
        where: tenantFilter,
        include: { tenant: { select: { name: true, logoUrl: true } } },
      }),
    ]);
    const psychPhotoByName = new Map(
      psychList.map((x) => [x.name.toLowerCase().trim(), x.photoUrl] as const)
    );

    const result: Array<ConsultationItem & { id: string; tenantId: string }> = [];

    for (const p of players) {
      const raw = p.onlineConsultations;
      const list = Array.isArray(raw) ? (raw as Array<Record<string, unknown>>) : [];
      if (list.length === 0) continue;
      for (let i = 0; i < list.length; i++) {
        const c = list[i];
        const date = (c.date as string) ?? '';
        const status = (c.status as string) ?? 'scheduled';
        const psychName = this.consultationPerformerName(undefined, undefined, c.psychologist as string);
        result.push({
          id: `${p.id}-${i}`,
          playerId: p.id,
          tenantId: p.tenantId,
          playerName: getPlayerListDisplayName(p),
          playerPhotoUrl: (p.photoUrl as string) ?? undefined,
          tenantName: p.tenant?.name,
          tenantLogoUrl: p.tenant?.logoUrl ?? undefined,
          category: (p.category as string) ?? undefined,
          date,
          time: (c.time as string) ?? undefined,
          type: (c.type as string) ?? 'meet',
          link: (c.link as string) ?? undefined,
          notes: (c.notes as string) ?? undefined,
          status,
          psychologist: psychName ?? undefined,
          psychologistPhotoUrl: psychName ? psychPhotoByName.get(psychName.toLowerCase()) ?? undefined : undefined,
          durationSeconds: typeof c.durationSeconds === 'number' ? c.durationSeconds : undefined,
        });
      }
    }

    for (const s of sessions) {
      if (s.sessionType === 'relatorio_semanal') continue;
      const attendance = Array.isArray(s.attendance)
        ? (s.attendance as Array<{ playerName?: string }>)
        : [];
      const psychName = this.consultationPerformerName(s.psychologistName, s.estagiarioName);
      result.push({
        id: `session-${s.id}`,
        playerId: s.playerId ?? '',
        tenantId: s.tenantId,
        playerName:
          s.sessionType === 'grupo'
            ? `${s.category ?? s.categoriesLabel ?? 'Grupo'} (${attendance.length} atletas)`
            : s.playerId
              ? (() => {
                  const p = players.find((pl) => pl.id === s.playerId);
                  return p ? getPlayerListDisplayName(p) : 'Atleta';
                })()
              : 'Presencial',
        tenantName: s.tenant?.name,
        tenantLogoUrl: s.tenant?.logoUrl ?? undefined,
        category: s.category ?? undefined,
        date: s.date,
        time: s.time ?? undefined,
        type: s.sessionType,
        link: undefined,
        notes: s.notes ?? s.groupSummary ?? undefined,
        status: s.status,
        psychologist: psychName ?? undefined,
        psychologistPhotoUrl: psychName
          ? psychPhotoByName.get(psychName.toLowerCase()) ?? undefined
          : undefined,
        durationSeconds: s.durationSeconds ?? undefined,
      });
    }

    result.sort((a, b) => {
      const da = a.date ? new Date(a.date + (a.time ? `T${a.time}` : 'T00:00')).getTime() : 0;
      const db = b.date ? new Date(b.date + (b.time ? `T${b.time}` : 'T00:00')).getTime() : 0;
      return da - db;
    });

    return result;
  }

  isGoogleMeetAvailable(): boolean {
    return this.googleCalendar.isAvailable();
  }

  async createMeetLink(params: {
    summary: string;
    description?: string;
    startDate: string;
    startTime?: string;
    endTime?: string;
    attendeeEmails?: string[];
  }) {
    return this.googleCalendar.createMeetEvent(params);
  }

  /** Remove uma consulta pelo id (formato playerId-index) */
  async removeConsultation(
    consultationId: string,
    allowedTenantIds: string[] | null = null,
  ): Promise<boolean> {
    if (consultationId.startsWith('session-')) {
      const sessionId = consultationId.slice('session-'.length);
      try {
        const session = await this.prisma.psychologySession.findUnique({
          where: { id: sessionId },
          select: { tenantId: true },
        });
        if (!session) return false;
        if (allowedTenantIds !== null && !allowedTenantIds.includes(session.tenantId)) {
          throw new ForbiddenException('Acesso negado a esta empresa.');
        }
        await this.prisma.psychologySession.delete({ where: { id: sessionId } });
        return true;
      } catch (err) {
        if (err instanceof ForbiddenException) throw err;
        return false;
      }
    }
    const match = consultationId.match(/^(.+)-(\d+)$/);
    if (!match) return false;
    const [, playerId, indexStr] = match;
    const index = parseInt(indexStr, 10);
    if (!playerId || isNaN(index) || index < 0) return false;

    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      select: { onlineConsultations: true, tenantId: true },
    });
    if (!player) return false;
    if (allowedTenantIds !== null && !allowedTenantIds.includes(player.tenantId)) {
      throw new ForbiddenException('Acesso negado a esta empresa.');
    }

    const list = Array.isArray(player.onlineConsultations)
      ? (player.onlineConsultations as Record<string, unknown>[])
      : [];
    if (index >= list.length) return false;

    const next = list.filter((_, i) => i !== index);
    await this.prisma.player.update({
      where: { id: playerId },
      data: { onlineConsultations: next as object },
    });
    return true;
  }

  /**
   * Atualiza uma consulta pelo id (formato playerId-index).
   * Permite alterar data, horário, status (ex.: cancelar), psicólogo, notas.
   */
  async updateConsultation(
    consultationId: string,
    patch: {
      date?: string;
      time?: string;
      status?: string;
      psychologist?: string;
      notes?: string;
      durationSeconds?: number;
    },
    allowedTenantIds: string[] | null = null,
  ): Promise<boolean> {
    if (consultationId.startsWith('session-')) {
      const sessionId = consultationId.slice('session-'.length);
      try {
        const existing = await this.prisma.psychologySession.findUnique({
          where: { id: sessionId },
          select: { tenantId: true },
        });
        if (!existing) return false;
        if (allowedTenantIds !== null && !allowedTenantIds.includes(existing.tenantId)) {
          throw new ForbiddenException('Acesso negado a esta empresa.');
        }
        const row = await this.prisma.psychologySession.update({
          where: { id: sessionId },
          data: {
            ...(patch.date !== undefined && { date: patch.date }),
            ...(patch.time !== undefined && { time: patch.time }),
            ...(patch.status !== undefined && { status: patch.status }),
            ...(patch.psychologist !== undefined && { psychologistName: patch.psychologist }),
            ...(patch.notes !== undefined && { notes: patch.notes }),
            ...(patch.durationSeconds !== undefined && { durationSeconds: patch.durationSeconds }),
          },
        });
        if (row.status === 'completed') {
          // attendance sync handled by psychology-sessions service on full update;
          // lightweight status patch for calendar actions
        }
        return true;
      } catch (err) {
        if (err instanceof ForbiddenException) throw err;
        return false;
      }
    }
    const match = consultationId.match(/^(.+)-(\d+)$/);
    if (!match) return false;
    const [, playerId, indexStr] = match;
    const index = parseInt(indexStr, 10);
    if (!playerId || isNaN(index) || index < 0) return false;

    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      select: { onlineConsultations: true, name: true, registrationProfile: true, tenantId: true },
    });
    if (!player) return false;
    if (allowedTenantIds !== null && !allowedTenantIds.includes(player.tenantId)) {
      throw new ForbiddenException('Acesso negado a esta empresa.');
    }

    const list = Array.isArray(player.onlineConsultations)
      ? (player.onlineConsultations as Record<string, unknown>[])
      : [];
    if (index >= list.length) return false;

    const item = { ...list[index] } as Record<string, unknown>;
    if (patch.date !== undefined) item.date = patch.date;
    if (patch.time !== undefined) item.time = patch.time;
    if (patch.status !== undefined) item.status = patch.status;
    if (patch.psychologist !== undefined) item.psychologist = patch.psychologist;
    if (patch.notes !== undefined) item.notes = patch.notes;
    if (patch.durationSeconds !== undefined) item.durationSeconds = patch.durationSeconds;

    const next = [...list];
    next[index] = item;

    await this.prisma.player.update({
      where: { id: playerId },
      data: { onlineConsultations: next as object },
    });

    // Se sessão foi concluída com duração, registra no attendanceLog do psicólogo
    if (
      patch.status === 'completed' &&
      typeof patch.durationSeconds === 'number' &&
      patch.durationSeconds >= 0
    ) {
      const psychName = (item.psychologist as string)?.trim();
      if (psychName) {
        const psych = await this.prisma.psychologist.findFirst({
          where: { name: { equals: psychName, mode: 'insensitive' } },
          select: { id: true, attendanceLog: true },
        });
        if (psych) {
          const log = Array.isArray(psych.attendanceLog) ? [...(psych.attendanceLog as object[])] : [];
          const date = (item.date as string) ?? new Date().toISOString().slice(0, 10);
          const time = (item.time as string) ?? new Date().toTimeString().slice(0, 5);
            log.push({
            date,
            startTime: time,
            playerId,
            playerName: player ? getPlayerListDisplayName(player) : '',
            durationSeconds: patch.durationSeconds,
            notes: (item.notes as string) ?? undefined,
          });
          await this.prisma.psychologist.update({
            where: { id: psych.id },
            data: { attendanceLog: log as object },
          });
        }
      }
    }

    return true;
  }
}
