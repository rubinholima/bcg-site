import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { NegotiationType } from './player-negotiation.constants';

type NegotiationRow = {
  id: string;
  negotiationType: string;
  counterpartyName: string;
  negotiatedPercentage: Prisma.Decimal | null;
  retainedPercentage: Prisma.Decimal | null;
  effectiveFrom: Date | null;
  effectiveUntil: Date | null;
  loanEndDate: Date | null;
  notes: string | null;
};

@Injectable()
export class PlayerNegotiationIntegrationService {
  constructor(private readonly prisma: PrismaService) {}

  async applyEffectiveSnapshots(
    playerId: string,
    tenantName: string,
    negotiation: NegotiationRow,
  ): Promise<{ loanApplied: boolean; economicRightsApplied: boolean }> {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      select: { registrationProfile: true },
    });
    if (!player) return { loanApplied: false, economicRightsApplied: false };

    const profile =
      player.registrationProfile && typeof player.registrationProfile === 'object'
        ? ({ ...(player.registrationProfile as Record<string, unknown>) } as Record<string, unknown>)
        : {};

    let loanApplied = false;
    let economicRightsApplied = false;
    const type = negotiation.negotiationType as NegotiationType;

    if (type === 'loan' || type === 'mixed') {
      const sports =
        profile.sports && typeof profile.sports === 'object'
          ? { ...(profile.sports as Record<string, unknown>) }
          : {};
      sports.situation = 'emprestado';
      profile.sports = sports;

      const endIso = negotiation.loanEndDate?.toISOString().slice(0, 10) ?? undefined;
      const startIso = negotiation.effectiveFrom?.toISOString().slice(0, 10) ?? undefined;
      profile.loan = {
        ...(profile.loan && typeof profile.loan === 'object' ? profile.loan : {}),
        destinationClub: negotiation.counterpartyName,
        startDate: startIso,
        endDate: endIso,
        notes: negotiation.notes ?? undefined,
      };
      loanApplied = true;
    }

    if (type === 'partial_rights' || type === 'mixed' || type === 'transfer_permanent') {
      const pctNegotiated = negotiation.negotiatedPercentage
        ? Number(negotiation.negotiatedPercentage)
        : null;
      const pctRetained = negotiation.retainedPercentage
        ? Number(negotiation.retainedPercentage)
        : null;

      const contracts =
        profile.contracts && typeof profile.contracts === 'object'
          ? { ...(profile.contracts as Record<string, unknown>) }
          : {};

      const prev = Array.isArray(contracts.economicRights)
        ? (contracts.economicRights as Array<{ id: string; clubName: string; percentage: number }>)
        : [];

      const next = [...prev.filter((r) => r.clubName !== negotiation.counterpartyName)];

      if (pctRetained != null && pctRetained > 0) {
        next.push({
          id: randomUUID(),
          clubName: tenantName.toUpperCase(),
          percentage: pctRetained,
        });
      }
      if (pctNegotiated != null && pctNegotiated > 0) {
        next.push({
          id: randomUUID(),
          clubName: negotiation.counterpartyName.toUpperCase(),
          percentage: pctNegotiated,
        });
      }

      contracts.economicRights = next;
      profile.contracts = contracts;
      economicRightsApplied = next.length > 0;
    }

    await this.prisma.player.update({
      where: { id: playerId },
      data: { registrationProfile: profile as Prisma.InputJsonValue },
    });

    return { loanApplied, economicRightsApplied };
  }
}
