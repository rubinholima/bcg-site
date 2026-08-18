import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { parseRegistrationProfile, validatePlayerContacts } from './social-pedagogy.util';

@Injectable()
export class SocialPedagogyReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async rosterValidation(tenantId: string, category?: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, slug: true },
    });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');

    const players = await this.prisma.player.findMany({
      where: {
        tenantId,
        ...(category ? { category } : {}),
      },
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

    const playerIds = players.map((p) => p.id);
    const guardians = await this.prisma.playerGuardian.findMany({
      where: { playerId: { in: playerIds } },
    });
    const guardiansByPlayer = new Map<string, typeof guardians>();
    for (const g of guardians) {
      const list = guardiansByPlayer.get(g.playerId) ?? [];
      list.push(g);
      guardiansByPlayer.set(g.playerId, list);
    }

    const rows = players.map((player) => {
      const gs = guardiansByPlayer.get(player.id) ?? [];
      const validation = validatePlayerContacts(player, gs);
      const profile = parseRegistrationProfile(player.registrationProfile);
      return {
        playerId: player.id,
        name: player.name,
        jerseyNumber: player.jerseyNumber,
        category: player.category,
        schoolName: profile.extras?.schoolName ?? null,
        validation,
      };
    });

    return { tenant, category: category ?? null, rows };
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
