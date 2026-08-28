import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildPersonalDisciplineHistory,
  type PersonalDisciplineHistoryDto,
} from './personal-discipline-history.util';

const PLAYER_CARD_TYPES = ['PLAYER_YELLOW_CARD', 'PLAYER_RED_CARD'] as const;
const STAFF_CARD_TYPES = ['STAFF_YELLOW_CARD', 'STAFF_RED_CARD'] as const;

@Injectable()
export class PersonalDisciplineHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  private resolveTenantFmfAliases(
    name: string,
    slug: string | null | undefined,
    tradeName: string | null | undefined,
  ): string[] {
    const aliases = new Set<string>();
    const push = (value: string | null | undefined) => {
      const v = value?.trim();
      if (v) aliases.add(v);
    };
    push(tradeName);
    push(name);
    if (slug?.trim()) {
      push(slug.replace(/-/g, ' '));
      push(slug);
    }
    return [...aliases];
  }

  private async loadCategoryLabelsMap(): Promise<Record<string, string>> {
    const rows = await this.prisma.fixtureCategory.findMany({
      select: { value: true, labelPT: true },
    });
    const map: Record<string, string> = {};
    for (const row of rows) {
      if (row.value) map[row.value] = row.labelPT?.trim() || row.value;
    }
    return map;
  }

  async getPlayerHistory(
    playerId: string,
    filters?: {
      category?: string | null;
      season?: number | null;
      competition?: string | null;
    },
  ): Promise<PersonalDisciplineHistoryDto> {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      select: { id: true, name: true, tenantId: true, category: true },
    });
    if (!player) throw new NotFoundException('Atleta não encontrado');

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: player.tenantId },
      select: { name: true, slug: true, tradeName: true },
    });
    if (!tenant) throw new NotFoundException('Clube não encontrado');

    const events = await this.prisma.matchOfficialEvent.findMany({
      where: {
        tenantId: player.tenantId,
        playerId,
        factType: { in: [...PLAYER_CARD_TYPES] },
        resolutionStatus: 'resolved',
      },
      select: {
        id: true,
        factType: true,
        sourceJerseyNumber: true,
        sourceRoleLabel: true,
        sourceClock: true,
        period: true,
        sourceSequence: true,
        minute: true,
        externalKey: true,
        fmfMatchReport: {
          select: {
            id: true,
            matchDate: true,
            homeTeam: true,
            awayTeam: true,
            competition: true,
            season: true,
            phase: true,
            round: true,
            category: true,
            sourceUrl: true,
          },
        },
      },
    });

    const categoryLabels = await this.loadCategoryLabelsMap();
    const clubName = tenant.tradeName?.trim() || tenant.name;
    const aliases = this.resolveTenantFmfAliases(tenant.name, tenant.slug, tenant.tradeName);

    return buildPersonalDisciplineHistory({
      personId: player.id,
      personName: player.name,
      personKind: 'player',
      events,
      clubName,
      aliases,
      categoryLabels,
      filters,
    });
  }

  async getStaffHistory(
    staffId: string,
    filters?: {
      category?: string | null;
      season?: number | null;
      competition?: string | null;
    },
  ): Promise<PersonalDisciplineHistoryDto> {
    const staff = await this.prisma.technicalStaff.findUnique({
      where: { id: staffId },
      select: { id: true, name: true, tenantId: true, role: true, categories: true },
    });
    if (!staff) throw new NotFoundException('Membro da comissão não encontrado');

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: staff.tenantId },
      select: { name: true, slug: true, tradeName: true },
    });
    if (!tenant) throw new NotFoundException('Clube não encontrado');

    const events = await this.prisma.matchOfficialEvent.findMany({
      where: {
        tenantId: staff.tenantId,
        technicalStaffId: staffId,
        factType: { in: [...STAFF_CARD_TYPES] },
        resolutionStatus: 'resolved',
      },
      select: {
        id: true,
        factType: true,
        sourceJerseyNumber: true,
        sourceRoleLabel: true,
        sourceClock: true,
        period: true,
        sourceSequence: true,
        minute: true,
        externalKey: true,
        fmfMatchReport: {
          select: {
            id: true,
            matchDate: true,
            homeTeam: true,
            awayTeam: true,
            competition: true,
            season: true,
            phase: true,
            round: true,
            category: true,
            sourceUrl: true,
          },
        },
      },
    });

    const categoryLabels = await this.loadCategoryLabelsMap();
    const clubName = tenant.tradeName?.trim() || tenant.name;
    const aliases = this.resolveTenantFmfAliases(tenant.name, tenant.slug, tenant.tradeName);

    return buildPersonalDisciplineHistory({
      personId: staff.id,
      personName: staff.name,
      personKind: 'staff',
      events,
      clubName,
      aliases,
      categoryLabels,
      filters,
    });
  }
}
