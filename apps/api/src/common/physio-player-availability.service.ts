import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  resolvePhysioTransitionAvailability,
  shouldClearFisioTransitionStatus,
} from './physio-player-availability.util';

type PhysioSessionForStatus = {
  estimatedEndDate: Date | null;
  region: { namePt: string } | null;
  regionId: string;
  side: string | null;
  sessionRegions?: Array<{
    region: { namePt: string } | null;
    regionId: string;
    side: string | null;
  }>;
  sessionDiagnoses?: Array<{
    diagnosisLabel: string | null;
    diagnosis: { name: string } | null;
  }>;
  sessionTreatments?: Array<{
    treatmentLabel: string | null;
    treatment: { name: string } | null;
  }>;
  diagnosisLabel: string | null;
  treatmentLabel: string | null;
};

@Injectable()
export class PhysioPlayerAvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  buildPhysioStatusDetails(session: PhysioSessionForStatus): string {
    const regionParts =
      session.sessionRegions && session.sessionRegions.length > 0
        ? session.sessionRegions.map((r) => {
            const regionName = r.region?.namePt ?? r.regionId;
            const side =
              r.side === 'E' ? ' esquerdo' : r.side === 'D' ? ' direito' : '';
            return `${regionName}${side}`;
          })
        : [
            (() => {
              const regionName = session.region?.namePt ?? session.regionId;
              const side =
                session.side === 'E' ? ' esquerdo' : session.side === 'D' ? ' direito' : '';
              return `${regionName}${side}`;
            })(),
          ];

    const dxParts =
      session.sessionDiagnoses && session.sessionDiagnoses.length > 0
        ? session.sessionDiagnoses
            .map((d) => d.diagnosisLabel ?? d.diagnosis?.name)
            .filter(Boolean)
        : session.diagnosisLabel
          ? [session.diagnosisLabel]
          : [];

    const txParts =
      session.sessionTreatments && session.sessionTreatments.length > 0
        ? session.sessionTreatments
            .map((t) => t.treatmentLabel ?? t.treatment?.name)
            .filter(Boolean)
        : session.treatmentLabel
          ? [session.treatmentLabel]
          : [];

    const parts = [
      `${regionParts.join(' + ')}`,
      dxParts.length ? `Dx: ${dxParts.join(' + ')}` : null,
      txParts.length ? `Tx: ${txParts.join(' + ')}` : null,
      session.estimatedEndDate
        ? `Previsão: ${session.estimatedEndDate.toISOString().slice(0, 10)}`
        : null,
    ].filter(Boolean);
    return parts.join(' · ');
  }

  async syncPlayerPhysioAndTransitionStatus(playerId: string): Promise<void> {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      select: { status: true, statusDetails: true },
    });
    if (!player) return;

    const activeSessions = await this.prisma.physioSession.findMany({
      where: { playerId, status: 'active' },
      include: {
        region: true,
        sessionRegions: { include: { region: true } },
        sessionDiagnoses: { include: { diagnosis: true } },
        sessionTreatments: { include: { treatment: true } },
      },
      orderBy: { startedAt: 'desc' },
    });

    const activeProgram = await this.prisma.physioTransitionProgram.findFirst({
      where: { playerId, status: 'active' },
      include: {
        originSession: {
          include: {
            region: true,
            sessionDiagnoses: { include: { diagnosis: true } },
          },
        },
        entries: { orderBy: [{ sessionDate: 'desc' }, { createdAt: 'desc' }], take: 1 },
      },
    });

    const physioDetailsBase = activeSessions
      .map((s) => this.buildPhysioStatusDetails(s))
      .join(' | ');
    const physioLatestEnd = activeSessions
      .map((s) => s.estimatedEndDate)
      .filter((d): d is Date => !!d)
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

    let transitionSummary = 'Programa ativo';
    if (activeProgram) {
      const origin = activeProgram.originSession;
      const originLabel = origin
        ? this.buildPhysioStatusDetails({
            ...origin,
            sessionRegions: [],
            sessionTreatments: [],
          })
        : 'Origem fisio';
      const latest = activeProgram.entries[0];
      transitionSummary = latest
        ? `${originLabel} · última sessão ${latest.sessionDate}`
        : originLabel;
    }

    const resolution = resolvePhysioTransitionAvailability({
      playerStatus: player.status ?? 'available',
      playerStatusDetails: player.statusDetails,
      activePhysioSessions: activeSessions.map((s) => ({ disposition: s.disposition })),
      hasActiveTransitionProgram: !!activeProgram,
      physioDetailsBase,
      physioLatestEnd,
      transitionSummary,
    });

    if (resolution.kind === 'no_change') return;

    if (resolution.kind === 'clear_fisio_transition') {
      if (shouldClearFisioTransitionStatus(player.status ?? 'available', player.statusDetails)) {
        await this.prisma.player.update({
          where: { id: playerId },
          data: {
            status: 'available',
            statusDetails: null,
            statusUntil: null,
          },
        });
      }
      return;
    }

    await this.prisma.player.update({
      where: { id: playerId },
      data: {
        status: resolution.status,
        statusDetails: resolution.statusDetails,
        statusUntil: resolution.statusUntil,
      },
    });
  }
}
