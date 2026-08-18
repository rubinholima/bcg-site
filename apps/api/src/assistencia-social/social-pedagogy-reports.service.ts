import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  isArchivedSportsSituation,
  isLoanedSportsSituation,
  normalizeSportsSituation,
} from '../common/sports-situation.util';
import { parseRegistrationProfile, validatePlayerContacts } from './social-pedagogy.util';

function normalizeCategory(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function isActiveRosterPlayer(registrationProfile: unknown): boolean {
  const profile = parseRegistrationProfile(registrationProfile) as {
    sports?: { situation?: string };
  };
  const situation = normalizeSportsSituation(profile.sports?.situation);
  return !isArchivedSportsSituation(situation) && !isLoanedSportsSituation(situation);
}

@Injectable()
export class SocialPedagogyReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async rosterValidation(tenantId: string, category?: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, slug: true },
    });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');

    const categoryNorm = category?.trim() ? normalizeCategory(category) : '';

    const players = await this.prisma.player.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        jerseyNumber: true,
        category: true,
        contactPhone: true,
        contactEmail: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        emergencyContactEmail: true,
        registrationProfile: true,
      },
      orderBy: [{ jerseyNumber: 'asc' }, { name: 'asc' }],
    });

    const activePlayers = players.filter((p) => isActiveRosterPlayer(p.registrationProfile));
    const filteredPlayers = categoryNorm
      ? activePlayers.filter((p) => normalizeCategory(p.category) === categoryNorm)
      : activePlayers;

    const playerIds = filteredPlayers.map((p) => p.id);

    const [guardians, enrollments] = await Promise.all([
      playerIds.length
        ? this.prisma.playerGuardian.findMany({ where: { playerId: { in: playerIds } } })
        : Promise.resolve([]),
      playerIds.length
        ? this.prisma.playerSchoolEnrollment.findMany({
            where: { playerId: { in: playerIds }, status: 'ativo' },
            orderBy: [{ updatedAt: 'desc' }],
          })
        : Promise.resolve([]),
    ]);

    const guardiansByPlayer = new Map<string, typeof guardians>();
    for (const g of guardians) {
      const list = guardiansByPlayer.get(g.playerId) ?? [];
      list.push(g);
      guardiansByPlayer.set(g.playerId, list);
    }

    const schoolByPlayer = new Map<string, string>();
    for (const e of enrollments) {
      if (!schoolByPlayer.has(e.playerId) && e.schoolName?.trim()) {
        schoolByPlayer.set(e.playerId, e.schoolName.trim());
      }
    }

    const rows = filteredPlayers.map((player) => {
      const gs = guardiansByPlayer.get(player.id) ?? [];
      const validation = validatePlayerContacts(player, gs);
      const profile = parseRegistrationProfile(player.registrationProfile);
      const schoolName =
        schoolByPlayer.get(player.id) ?? profile.extras?.schoolName?.trim() ?? null;
      return {
        playerId: player.id,
        name: player.name,
        jerseyNumber: player.jerseyNumber,
        category: player.category,
        schoolName,
        validation,
      };
    });

    return { tenant, category: category?.trim() || null, rows };
  }

  async notificationReport(caseId: string) {
    const c = await this.prisma.socialPedagogyCase.findUnique({
      where: { id: caseId },
      include: {
        tenant: { select: { id: true, name: true, slug: true, logoUrl: true } },
        player: {
          select: {
            id: true,
            name: true,
            jerseyNumber: true,
            category: true,
            emergencyContactName: true,
            registrationProfile: true,
          },
        },
        documents: true,
      },
    });
    if (!c) throw new NotFoundException('Caso não encontrado');

    const enrollment = await this.prisma.playerSchoolEnrollment.findFirst({
      where: { playerId: c.playerId, status: 'ativo' },
      orderBy: [{ updatedAt: 'desc' }],
    });
    const profile = parseRegistrationProfile(c.player.registrationProfile);
    const guardians = await this.prisma.playerGuardian.findMany({ where: { playerId: c.playerId } });
    const primaryGuardian =
      guardians.find((g) => g.isPrimary) ??
      (c.player.emergencyContactName
        ? { name: c.player.emergencyContactName, phone: null, email: null }
        : guardians[0] ?? null);

    return {
      case: c,
      school: enrollment ?? {
        schoolName: profile.extras?.schoolName ?? null,
        grade: profile.extras?.schoolGrade ?? null,
        period: profile.extras?.schoolPeriod?.[0] ?? null,
        coordinatorName: null,
        coordinatorEmail: null,
        coordinatorPhone: null,
      },
      guardian: primaryGuardian,
    };
  }
}
