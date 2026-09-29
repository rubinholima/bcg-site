import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  coachTrainingSessionInclude,
} from '../futebol-treinadores/futebol-treinadores.constants';
import {
  computeActualLoad,
  computeCanonicalTrainingMinutesForPlayer,
  entryHasAuthoritativeGps,
  type TrainingSessionForMinutes,
} from './prep-load-minutes.util';

@Injectable()
export class PrepLoadSyncService {
  constructor(private readonly prisma: PrismaService) {}

  async syncForTrainingDay(tenantId: string, category: string, sessionDate: string): Promise<string> {
    const cat = category.trim();
    if (!cat || !/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) {
      throw new Error('Categoria ou data inválida para sync de carga');
    }

    const sessions = await this.prisma.coachTrainingSession.findMany({
      where: {
        tenantId,
        category: cat,
        sessionDate,
        status: 'finalizado',
      },
      include: {
        activities: true,
        playerEntries: true,
      },
    });

    const loadSession =
      (await this.prisma.physiologyLoadSession.findFirst({
        where: { tenantId, category: cat, sessionDate, sessionType: 'treino' },
      })) ??
      (await this.prisma.physiologyLoadSession.create({
        data: {
          tenantId,
          category: cat,
          sessionDate,
          sessionType: 'treino',
          sessionLabel: `Treino ${sessionDate}`,
        },
      }));

    const playerIds = new Set<string>();
    for (const s of sessions) {
      for (const e of s.playerEntries) {
        if (e.available) playerIds.add(e.playerId);
      }
    }

    const forMinutes: TrainingSessionForMinutes[] = sessions.map((s) => ({
      id: s.id,
      sessionDomain: s.sessionDomain,
      agendaEntryId: s.agendaEntryId,
      blockGroupId: s.blockGroupId,
      blockSequence: s.blockSequence,
      startTime: s.startTime,
      endTime: s.endTime,
      activities: s.activities,
      playerEntries: s.playerEntries,
    }));

    for (const playerId of playerIds) {
      const { total } = computeCanonicalTrainingMinutesForPlayer(forMinutes, playerId);
      const existing = await this.prisma.physiologyLoadEntry.findUnique({
        where: { sessionId_playerId: { sessionId: loadSession.id, playerId } },
      });

      const gpsLocked = existing ? entryHasAuthoritativeGps(existing) : false;
      const trainingMinutes = gpsLocked && existing?.trainingMinutes != null ? existing.trainingMinutes : total;
      const rpe = existing?.rpe ?? null;
      const actualLoad = computeActualLoad(rpe, trainingMinutes);

      await this.prisma.physiologyLoadEntry.upsert({
        where: { sessionId_playerId: { sessionId: loadSession.id, playerId } },
        create: {
          sessionId: loadSession.id,
          playerId,
          present: true,
          trainingMinutes,
          rpe,
          actualLoad,
        },
        update: {
          present: true,
          ...(gpsLocked ? {} : { trainingMinutes }),
          actualLoad,
        },
      });
    }

    await this.prisma.coachTrainingSession.updateMany({
      where: { id: { in: sessions.map((s) => s.id) } },
      data: { physiologyLoadSessionId: loadSession.id },
    });

    return loadSession.id;
  }

  async getSessionsForDay(tenantId: string, category: string, sessionDate: string) {
    return this.prisma.coachTrainingSession.findMany({
      where: { tenantId, category, sessionDate, status: 'finalizado' },
      include: coachTrainingSessionInclude,
    });
  }
}
