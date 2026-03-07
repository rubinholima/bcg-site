import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlayerDto } from './dto/create-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';

@Injectable()
export class PlayersService {
  private readonly logger = new Logger(PlayersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters?: { tenantId?: string; category?: string; search?: string }) {
    const where: Record<string, unknown> = {};
    if (filters?.tenantId) where.tenantId = filters.tenantId;
    if (filters?.category) where.category = filters.category;
    if (filters?.search?.trim()) {
      where.OR = [
        { name: { contains: filters.search.trim(), mode: 'insensitive' as const } },
        { currentTeam: { contains: filters.search.trim(), mode: 'insensitive' as const } },
        { position: { contains: filters.search.trim(), mode: 'insensitive' as const } },
      ];
    }
    const players = await this.prisma.player.findMany({
      where,
      orderBy: [{ tenant: { name: 'asc' } }, { category: 'asc' }, { name: 'asc' }],
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
    return players;
  }

  async findOne(id: string) {
    const player = await this.prisma.player.findUnique({
      where: { id },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
    if (!player) throw new NotFoundException('Jogador não encontrado');
    return player;
  }

  async create(dto: CreatePlayerDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) throw new NotFoundException(`Empresa/clube "${dto.tenantId}" não encontrado`);

    const data = this.toCreateData(dto);
    return this.prisma.player.create({
      data,
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async update(id: string, dto: UpdatePlayerDto) {
    await this.findOne(id);
    const data = this.toUpdateData(dto);
    this.logger.log(
      `Player update ${id} contact/emergency: contactEmail=${(dto as { contactEmail?: string }).contactEmail ?? 'n/a'} contactPhone=${(dto as { contactPhone?: string }).contactPhone ?? 'n/a'} emergencyName=${(dto as { emergencyContactName?: string }).emergencyContactName ?? 'n/a'} emergencyEmail=${(dto as { emergencyContactEmail?: string }).emergencyContactEmail ?? 'n/a'} emergencyPhone=${(dto as { emergencyContactPhone?: string }).emergencyContactPhone ?? 'n/a'}`,
    );
    return this.prisma.player.update({
      where: { id },
      data,
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.player.delete({ where: { id } });
  }

  /** Sincroniza jogadores a partir dos dados da planilha Times por Categorias. */
  async syncFromSheet(tenantId: string, categories: Array<{ id: string; players: Array<Record<string, unknown>> }>) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException(`Clube "${tenantId}" não encontrado`);

    let created = 0;
    let updated = 0;

    for (const cat of categories) {
      const categoryId = (cat.id ?? '').trim() || 'principal';
      const players = Array.isArray(cat.players) ? cat.players : [];

      for (const p of players) {
        const name = (p.name as string)?.trim();
        if (!name) continue;

        const data: Prisma.PlayerUncheckedCreateInput = {
          tenantId,
          name,
          category: categoryId,
          photoUrl: (p.photoUrl as string)?.trim() || null,
          birthDate: (p.birthDate as string)?.trim() || null,
          nationality: (p.nationality as string)?.trim() || null,
          height: p.height != null ? Number(p.height) : null,
          weight: p.weight != null ? Number(p.weight) : null,
          preferredFoot: (p.preferredFoot as string)?.trim() || null,
          jerseyNumber: p.jerseyNumber != null ? Number(p.jerseyNumber) : null,
          position: (p.position as string)?.trim() || null,
          currentTeam: (p.currentTeam as string)?.trim() || null,
          previousTeams: p.previousTeams != null ? (p.previousTeams as object) : Prisma.JsonNull,
          seasonHistory: p.seasonHistory != null ? (p.seasonHistory as object) : Prisma.JsonNull,
          socialMedia: p.socialMedia != null ? (p.socialMedia as object) : Prisma.JsonNull,
          matchesPlayed: p.matchesPlayed != null ? Number(p.matchesPlayed) : null,
          goals: p.goals != null ? Number(p.goals) : null,
          assists: p.assists != null ? Number(p.assists) : null,
          yellowCards: p.yellowCards != null ? Number(p.yellowCards) : null,
          redCards: p.redCards != null ? Number(p.redCards) : null,
          marketValue: p.marketValue != null ? Number(p.marketValue) : null,
          highlights: p.highlights != null ? (p.highlights as string[]) : Prisma.JsonNull,
          bioPT: (p.bioPT as string)?.trim() || null,
          bioEN: (p.bioEN as string)?.trim() || null,
        };

        const existing = await this.prisma.player.findFirst({
          where: { tenantId, category: categoryId, name },
        });

        if (existing) {
          await this.prisma.player.update({
            where: { id: existing.id },
            data: {
              photoUrl: data.photoUrl,
              birthDate: data.birthDate,
              nationality: data.nationality,
              height: data.height,
              weight: data.weight,
              preferredFoot: data.preferredFoot,
              jerseyNumber: data.jerseyNumber,
              position: data.position,
              currentTeam: data.currentTeam,
              previousTeams: data.previousTeams,
              seasonHistory: data.seasonHistory,
              socialMedia: data.socialMedia,
              matchesPlayed: data.matchesPlayed,
              goals: data.goals,
              assists: data.assists,
              yellowCards: data.yellowCards,
              redCards: data.redCards,
              marketValue: data.marketValue,
              highlights: data.highlights,
              bioPT: data.bioPT,
              bioEN: data.bioEN,
            },
          });
          updated++;
        } else {
          await this.prisma.player.create({ data });
          created++;
        }
      }
    }

    return { created, updated };
  }

  /** Sincroniza TODOS os jogadores da planilha, usando clubSlug para determinar o clube. */
  async syncFromSheetAll(categories: Array<{ id: string; players: Array<Record<string, unknown>> }>) {
    const tenants = await this.prisma.tenant.findMany({ select: { id: true, slug: true } });
    const slugToTenantId = new Map<string, string>();
    for (const t of tenants) {
      if (t.slug?.trim()) {
        slugToTenantId.set(t.slug.trim().toLowerCase(), t.id);
      }
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const cat of categories) {
      const categoryId = (cat.id ?? '').trim() || 'principal';
      const players = Array.isArray(cat.players) ? cat.players : [];

      for (const p of players) {
        const name = (p.name as string)?.trim();
        if (!name) continue;

        const clubSlug = (p.clubSlug as string)?.trim()?.toLowerCase();
        if (!clubSlug) {
          skipped++;
          continue;
        }

        const tenantId = slugToTenantId.get(clubSlug);
        if (!tenantId) {
          skipped++;
          continue;
        }

        const data: Prisma.PlayerUncheckedCreateInput = {
          tenantId,
          name,
          category: categoryId,
          photoUrl: (p.photoUrl as string)?.trim() || null,
          birthDate: (p.birthDate as string)?.trim() || null,
          nationality: (p.nationality as string)?.trim() || null,
          height: p.height != null ? Number(p.height) : null,
          weight: p.weight != null ? Number(p.weight) : null,
          preferredFoot: (p.preferredFoot as string)?.trim() || null,
          jerseyNumber: p.jerseyNumber != null ? Number(p.jerseyNumber) : null,
          position: (p.position as string)?.trim() || null,
          currentTeam: (p.currentTeam as string)?.trim() || null,
          previousTeams: p.previousTeams != null ? (p.previousTeams as object) : Prisma.JsonNull,
          seasonHistory: p.seasonHistory != null ? (p.seasonHistory as object) : Prisma.JsonNull,
          socialMedia: p.socialMedia != null ? (p.socialMedia as object) : Prisma.JsonNull,
          matchesPlayed: p.matchesPlayed != null ? Number(p.matchesPlayed) : null,
          goals: p.goals != null ? Number(p.goals) : null,
          assists: p.assists != null ? Number(p.assists) : null,
          yellowCards: p.yellowCards != null ? Number(p.yellowCards) : null,
          redCards: p.redCards != null ? Number(p.redCards) : null,
          marketValue: p.marketValue != null ? Number(p.marketValue) : null,
          highlights: p.highlights != null ? (p.highlights as string[]) : Prisma.JsonNull,
          bioPT: (p.bioPT as string)?.trim() || null,
          bioEN: (p.bioEN as string)?.trim() || null,
        };

        const existing = await this.prisma.player.findFirst({
          where: { tenantId, category: categoryId, name },
        });

        if (existing) {
          await this.prisma.player.update({
            where: { id: existing.id },
            data: {
              photoUrl: data.photoUrl,
              birthDate: data.birthDate,
              nationality: data.nationality,
              height: data.height,
              weight: data.weight,
              preferredFoot: data.preferredFoot,
              jerseyNumber: data.jerseyNumber,
              position: data.position,
              currentTeam: data.currentTeam,
              previousTeams: data.previousTeams,
              seasonHistory: data.seasonHistory,
              socialMedia: data.socialMedia,
              matchesPlayed: data.matchesPlayed,
              goals: data.goals,
              assists: data.assists,
              yellowCards: data.yellowCards,
              redCards: data.redCards,
              marketValue: data.marketValue,
              highlights: data.highlights,
              bioPT: data.bioPT,
              bioEN: data.bioEN,
            },
          });
          updated++;
        } else {
          await this.prisma.player.create({ data });
          created++;
        }
      }
    }

    return { created, updated, skipped };
  }

  private toCreateData(dto: CreatePlayerDto): Prisma.PlayerUncheckedCreateInput {
    const d = dto as unknown as Record<string, unknown>;
    const j = (v: unknown) => (v != null ? (v as object) : Prisma.JsonNull);
    return {
      tenantId: dto.tenantId,
      name: dto.name.trim(),
      category: (d.category as string)?.trim() || null,
      photoUrl: (d.photoUrl as string)?.trim() || null,
      birthDate: (d.birthDate as string)?.trim() || null,
      nationality: (d.nationality as string)?.trim() || null,
      height: d.height != null ? (d.height as number) : null,
      weight: d.weight != null ? (d.weight as number) : null,
      preferredFoot: (d.preferredFoot as string)?.trim() || null,
      jerseyNumber: d.jerseyNumber != null ? (d.jerseyNumber as number) : null,
      position: (d.position as string)?.trim() || null,
      fieldPositionX: d.fieldPositionX != null ? (d.fieldPositionX as number) : null,
      fieldPositionY: d.fieldPositionY != null ? (d.fieldPositionY as number) : null,
      currentTeam: (d.currentTeam as string)?.trim() || null,
      previousTeams: j(d.previousTeams),
      seasonHistory: j(d.seasonHistory),
      socialMedia: j(d.socialMedia),
      matchesPlayed: d.matchesPlayed != null ? (d.matchesPlayed as number) : null,
      goals: d.goals != null ? (d.goals as number) : null,
      assists: d.assists != null ? (d.assists as number) : null,
      yellowCards: d.yellowCards != null ? (d.yellowCards as number) : null,
      redCards: d.redCards != null ? (d.redCards as number) : null,
      marketValue: d.marketValue != null ? (d.marketValue as number) : null,
      highlights: j(d.highlights),
      bioPT: (d.bioPT as string)?.trim() || null,
      bioEN: (d.bioEN as string)?.trim() || null,
      externalId: (d.externalId as string)?.trim() || null,
      contactEmail: (d.contactEmail as string)?.trim() || null,
      contactPhone: (d.contactPhone as string)?.trim() || null,
      emergencyContactName: (d.emergencyContactName as string)?.trim() || null,
      emergencyContactEmail: (d.emergencyContactEmail as string)?.trim() || null,
      emergencyContactPhone: (d.emergencyContactPhone as string)?.trim() || null,
      medicalHistory: j(d.medicalHistory),
      psychologicalAssessment: j(d.psychologicalAssessment),
      onlineConsultations: j(d.onlineConsultations),
      evaluations: j(d.evaluations),
      status: (d.status as string)?.trim() || null,
      statusDetails: (d.statusDetails as string)?.trim() || null,
      statusUntil: d.statusUntil ? new Date(d.statusUntil as string) : null,
      heatMapData: j(d.heatMapData),
      performanceAnalysis: (d.performanceAnalysis as string)?.trim() || null,
      images: j(d.images),
      publicFields: d.publicFields != null ? (d.publicFields as object) : Prisma.JsonNull,
    };
  }

  private toUpdateData(dto: UpdatePlayerDto): Prisma.PlayerUpdateInput {
    const d = dto as unknown as Record<string, unknown>;
    const jsonOrNull = (v: unknown) => (v != null ? (v as object) : Prisma.JsonNull);
    return {
      ...(d.category !== undefined && { category: (d.category as string)?.trim() || null }),
      ...(d.name !== undefined && { name: (d.name as string)?.trim() }),
      ...(d.photoUrl !== undefined && { photoUrl: (d.photoUrl as string)?.trim() || null }),
      ...(d.birthDate !== undefined && { birthDate: (d.birthDate as string)?.trim() || null }),
      ...(d.nationality !== undefined && { nationality: (d.nationality as string)?.trim() || null }),
      ...(d.height !== undefined && { height: d.height as number | null }),
      ...(d.weight !== undefined && { weight: d.weight as number | null }),
      ...(d.preferredFoot !== undefined && { preferredFoot: (d.preferredFoot as string)?.trim() || null }),
      ...(d.jerseyNumber !== undefined && { jerseyNumber: d.jerseyNumber as number | null }),
      ...(d.position !== undefined && { position: (d.position as string)?.trim() || null }),
      ...(d.fieldPositionX !== undefined && { fieldPositionX: d.fieldPositionX as number | null }),
      ...(d.fieldPositionY !== undefined && { fieldPositionY: d.fieldPositionY as number | null }),
      ...(d.currentTeam !== undefined && { currentTeam: (d.currentTeam as string)?.trim() || null }),
      ...(d.previousTeams !== undefined && { previousTeams: jsonOrNull(d.previousTeams) }),
      ...(d.seasonHistory !== undefined && { seasonHistory: jsonOrNull(d.seasonHistory) }),
      ...(d.socialMedia !== undefined && { socialMedia: jsonOrNull(d.socialMedia) }),
      ...(d.matchesPlayed !== undefined && { matchesPlayed: d.matchesPlayed as number | null }),
      ...(d.goals !== undefined && { goals: d.goals as number | null }),
      ...(d.assists !== undefined && { assists: d.assists as number | null }),
      ...(d.yellowCards !== undefined && { yellowCards: d.yellowCards as number | null }),
      ...(d.redCards !== undefined && { redCards: d.redCards as number | null }),
      ...(d.marketValue !== undefined && { marketValue: d.marketValue as number | null }),
      ...(d.highlights !== undefined && { highlights: jsonOrNull(d.highlights) }),
      ...(d.bioPT !== undefined && { bioPT: (d.bioPT as string)?.trim() || null }),
      ...(d.bioEN !== undefined && { bioEN: (d.bioEN as string)?.trim() || null }),
      ...(d.externalId !== undefined && { externalId: (d.externalId as string)?.trim() || null }),
      ...(d.contactEmail !== undefined && { contactEmail: (d.contactEmail as string)?.trim() || null }),
      ...(d.contactPhone !== undefined && { contactPhone: (d.contactPhone as string)?.trim() || null }),
      ...(d.emergencyContactName !== undefined && { emergencyContactName: (d.emergencyContactName as string)?.trim() || null }),
      ...(d.emergencyContactEmail !== undefined && { emergencyContactEmail: (d.emergencyContactEmail as string)?.trim() || null }),
      ...(d.emergencyContactPhone !== undefined && { emergencyContactPhone: (d.emergencyContactPhone as string)?.trim() || null }),
      ...(d.medicalHistory !== undefined && { medicalHistory: jsonOrNull(d.medicalHistory) }),
      ...(d.psychologicalAssessment !== undefined && { psychologicalAssessment: jsonOrNull(d.psychologicalAssessment) }),
      ...(d.onlineConsultations !== undefined && { onlineConsultations: jsonOrNull(d.onlineConsultations) }),
      ...(d.evaluations !== undefined && { evaluations: jsonOrNull(d.evaluations) }),
      ...(d.status !== undefined && { status: (d.status as string)?.trim() || null }),
      ...(d.statusDetails !== undefined && { statusDetails: (d.statusDetails as string)?.trim() || null }),
      ...(d.statusUntil !== undefined && { statusUntil: d.statusUntil ? new Date(d.statusUntil as string) : null }),
      ...(d.heatMapData !== undefined && { heatMapData: jsonOrNull(d.heatMapData) }),
      ...(d.performanceAnalysis !== undefined && { performanceAnalysis: (d.performanceAnalysis as string)?.trim() || null }),
      ...(d.images !== undefined && { images: jsonOrNull(d.images) }),
      ...(d.publicFields !== undefined && { publicFields: d.publicFields != null ? (d.publicFields as object) : Prisma.JsonNull }),
    };
  }
}
