import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { computeMedicalOperationalState } from '../common/medical-player-operational.util';

@Injectable()
export class MedicalPlayerOperationalService {
  constructor(private readonly prisma: PrismaService) {}

  /** Recalcula a partir do atendimento médico mais recente (não cancelado). */
  async syncPlayerOperationalStatus(playerId: string): Promise<void> {
    const latest = await this.prisma.medicalEncounter.findFirst({
      where: { playerId, status: { not: 'cancelled' } },
      orderBy: { occurredAt: 'desc' },
      select: {
        restrictTraining: true,
        restrictMatch: true,
        rtpDecision: true,
        returnForecastAt: true,
        medicalRtpReleasedAt: true,
      },
    });

    if (!latest) {
      await this.prisma.player.update({
        where: { id: playerId },
        data: {
          medicalOperationalStatus: null,
          medicalOperationalSummary: null,
          medicalOperationalUntil: null,
          medicalOperationalUpdatedAt: new Date(),
        },
      });
      return;
    }

    const computed = computeMedicalOperationalState(latest);
    await this.prisma.player.update({
      where: { id: playerId },
      data: {
        medicalOperationalStatus: computed.status,
        medicalOperationalSummary: computed.summary,
        medicalOperationalUntil: computed.until,
        medicalOperationalUpdatedAt: new Date(),
      },
    });
  }
}
