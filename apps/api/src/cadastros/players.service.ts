import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  cadastroEmail,
  cadastroJsonStringArray,
  cadastroUpper,
  cadastroUpperRequired,
} from '../common/cadastro-text';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlayerDto } from './dto/create-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import {
  applyCadastroMetricsToLatestPhysiology,
  computeBestSharedMetricsFromSources,
} from './body-metrics.util';

@Injectable()
export class PlayersService {
  private readonly logger = new Logger(PlayersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters?: { tenantId?: string; category?: string; position?: string; search?: string }) {
    const where: Record<string, unknown> = {};
    if (filters?.tenantId) where.tenantId = filters.tenantId;
    if (filters?.category) where.category = filters.category;
    if (filters?.position?.trim()) where.position = filters.position.trim();
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
    const current = await this.prisma.player.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Jogador não encontrado');

    const data = this.toUpdateData(dto) as Prisma.PlayerUpdateInput;

    if (dto.weight !== undefined) {
      data.weightManualAt = new Date();
    }
    if (dto.height !== undefined) {
      data.heightManualAt = new Date();
    }
    if (dto.bmi !== undefined) {
      data.bmiManualAt = new Date();
    }
    if (dto.bodyFatPercent !== undefined) {
      data.bodyFatPercentManualAt = new Date();
    }
    if (dto.leanMassKg !== undefined) {
      data.leanMassManualAt = new Date();
    }

    const cadastroBodyPatch =
      dto.physiology === undefined &&
      (dto.weight !== undefined ||
        dto.height !== undefined ||
        dto.bmi !== undefined ||
        dto.bodyFatPercent !== undefined ||
        dto.leanMassKg !== undefined);
    if (cadastroBodyPatch) {
      const merged = applyCadastroMetricsToLatestPhysiology(current.physiology, {
        weight: dto.weight as number | null | undefined,
        height: dto.height as number | null | undefined,
        bmi: dto.bmi as number | null | undefined,
        bodyFatPercent: dto.bodyFatPercent as number | null | undefined,
        leanMassKg: dto.leanMassKg as number | null | undefined,
      });
      data.physiology = merged as unknown as Prisma.InputJsonValue;
    }

    this.logger.log(
      `Player update ${id} contact/emergency: contactEmail=${(dto as { contactEmail?: string }).contactEmail ?? 'n/a'} contactPhone=${(dto as { contactPhone?: string }).contactPhone ?? 'n/a'} emergencyName=${(dto as { emergencyContactName?: string }).emergencyContactName ?? 'n/a'} emergencyEmail=${(dto as { emergencyContactEmail?: string }).emergencyContactEmail ?? 'n/a'} emergencyPhone=${(dto as { emergencyContactPhone?: string }).emergencyContactPhone ?? 'n/a'}`,
    );
    await this.prisma.player.update({
      where: { id },
      data,
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });

    await this.syncBodyMetricsFromSources(id);
    return this.findOne(id);
  }

  /**
   * Alinha peso, altura, IMC, % gordura e massa magra do cadastro com medições (fisiologia + nutrição).
   * Respeita *ManualAt quando o cadastro foi editado manualmente após a medição mais recente daquela métrica.
   */
  async syncBodyMetricsFromSources(playerId: string): Promise<void> {
    const player = await this.prisma.player.findUnique({ where: { id: playerId } });
    if (!player) return;

    const nutrition = await this.prisma.nutritionAssessment.findMany({
      where: { playerId },
      select: { assessedAt: true, weightKg: true, heightCm: true, bmi: true, bodyFatPercent: true },
    });

    const { bestWeight, bestHeight, bestBmi, bestBodyFat, bestLeanMass } = computeBestSharedMetricsFromSources(
      player.physiology,
      nutrition,
    );

    const weightManualMs = player.weightManualAt?.getTime() ?? 0;
    const heightManualMs = player.heightManualAt?.getTime() ?? 0;
    const bmiManualMs = player.bmiManualAt?.getTime() ?? 0;
    const bfManualMs = player.bodyFatPercentManualAt?.getTime() ?? 0;
    const leanManualMs = player.leanMassManualAt?.getTime() ?? 0;

    const patch: Prisma.PlayerUpdateInput = {};
    if (bestWeight && bestWeight.t > weightManualMs) {
      patch.weight = bestWeight.v;
      patch.weightManualAt = null;
    }
    if (bestHeight && bestHeight.t > heightManualMs) {
      patch.height = bestHeight.v;
      patch.heightManualAt = null;
    }
    if (bestBmi && bestBmi.t > bmiManualMs) {
      patch.bmi = bestBmi.v;
      patch.bmiManualAt = null;
    }
    if (bestBodyFat && bestBodyFat.t > bfManualMs) {
      patch.bodyFatPercent = bestBodyFat.v;
      patch.bodyFatPercentManualAt = null;
    }
    if (bestLeanMass && bestLeanMass.t > leanManualMs) {
      patch.leanMassKg = bestLeanMass.v;
      patch.leanMassManualAt = null;
    }

    if (Object.keys(patch).length === 0) return;
    await this.prisma.player.update({ where: { id: playerId }, data: patch });
  }

  /** Verifica integrações antes de excluir — para exibir aviso na UI. */
  async getDeleteImpact(id: string) {
    const player = await this.prisma.player.findUnique({ where: { id } });
    if (!player) throw new NotFoundException('Jogador não encontrado');

    const [legalDocuments, nutritionAssessments, assignedAssets, supplementGuides] = await Promise.all([
      this.prisma.legalDocument.count({ where: { playerId: id } }),
      this.prisma.nutritionAssessment.count({ where: { playerId: id } }),
      this.prisma.asset.count({ where: { assignedPlayerId: id } }),
      this.prisma.supplementGuide.count({ where: { playerId: id } }),
    ]);

    const medicalHistoryEntries = Array.isArray(player.medicalHistory) ? player.medicalHistory.length : 0;
    const psychologicalAssessments = Array.isArray(player.psychologicalAssessment) ? player.psychologicalAssessment.length : 0;
    const onlineConsultations = Array.isArray(player.onlineConsultations) ? player.onlineConsultations.length : 0;
    const evaluations = Array.isArray(player.evaluations) ? player.evaluations.length : 0;

    const total =
      legalDocuments +
      nutritionAssessments +
      assignedAssets +
      supplementGuides +
      medicalHistoryEntries +
      psychologicalAssessments +
      onlineConsultations +
      evaluations;

    return {
      legalDocuments,
      nutritionAssessments,
      assignedAssets,
      supplementGuides,
      medicalHistoryEntries,
      psychologicalAssessments,
      onlineConsultations,
      evaluations,
      total,
      hasIntegrations: total > 0,
    };
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
        const nameRaw = (p.name as string)?.trim();
        if (!nameRaw) continue;
        const name = cadastroUpperRequired(nameRaw);

        const data: Prisma.PlayerUncheckedCreateInput = {
          tenantId,
          name,
          category: categoryId,
          photoUrl: (p.photoUrl as string)?.trim() || null,
          birthDate: (p.birthDate as string)?.trim() || null,
          nationality: cadastroUpper((p.nationality as string) ?? undefined),
          height: p.height != null ? Number(p.height) : null,
          weight: p.weight != null ? Number(p.weight) : null,
          preferredFoot: (p.preferredFoot as string)?.trim() || null,
          jerseyNumber: p.jerseyNumber != null ? Number(p.jerseyNumber) : null,
          position: cadastroUpper((p.position as string) ?? undefined),
          currentTeam: cadastroUpper((p.currentTeam as string) ?? undefined),
          previousTeams: Array.isArray(p.previousTeams) && p.previousTeams.every((x) => typeof x === 'string')
            ? cadastroJsonStringArray(p.previousTeams)
            : p.previousTeams != null
              ? (p.previousTeams as object)
              : Prisma.JsonNull,
          seasonHistory: p.seasonHistory != null ? (p.seasonHistory as object) : Prisma.JsonNull,
          socialMedia: p.socialMedia != null ? (p.socialMedia as object) : Prisma.JsonNull,
          matchesPlayed: p.matchesPlayed != null ? Number(p.matchesPlayed) : null,
          goals: p.goals != null ? Number(p.goals) : null,
          assists: p.assists != null ? Number(p.assists) : null,
          yellowCards: p.yellowCards != null ? Number(p.yellowCards) : null,
          redCards: p.redCards != null ? Number(p.redCards) : null,
          marketValue: p.marketValue != null ? Number(p.marketValue) : null,
          highlights: p.highlights != null ? (p.highlights as string[]) : Prisma.JsonNull,
          bioPT: cadastroUpper((p.bioPT as string) ?? undefined),
          bioEN: cadastroUpper((p.bioEN as string) ?? undefined),
        };

        const existing = await this.prisma.player.findFirst({
          where: {
            tenantId,
            category: categoryId,
            name: { equals: name, mode: 'insensitive' },
          },
        });

        if (existing) {
          await this.prisma.player.update({
            where: { id: existing.id },
            data: {
              name: data.name,
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

  /** Normaliza slug para comparação (remove BOM, unifica hífens, trim). */
  private normalizeSlug(s: string | undefined): string {
    if (!s || typeof s !== 'string') return '';
    return s
      .replace(/^\uFEFF/, '')
      .replace(/[\u2013\u2014\u2212\uFE58]/g, '-')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .trim()
      .toLowerCase();
  }

  /** Sincroniza TODOS os jogadores da planilha, usando clubSlug para determinar o clube. */
  async syncFromSheetAll(categories: Array<{ id: string; players: Array<Record<string, unknown>> }>) {
    const tenants = await this.prisma.tenant.findMany({ select: { id: true, slug: true } });
    const slugToTenantId = new Map<string, string>();
    for (const t of tenants) {
      if (t.slug?.trim()) {
        const norm = this.normalizeSlug(t.slug);
        if (norm) slugToTenantId.set(norm, t.id);
      }
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const cat of categories) {
      const categoryId = (cat.id ?? '').trim() || 'principal';
      const players = Array.isArray(cat.players) ? cat.players : [];

      for (const p of players) {
        const nameRaw = (p.name as string)?.trim();
        if (!nameRaw) continue;
        const name = cadastroUpperRequired(nameRaw);

        const clubSlug = this.normalizeSlug(p.clubSlug as string);
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
          nationality: cadastroUpper((p.nationality as string) ?? undefined),
          height: p.height != null ? Number(p.height) : null,
          weight: p.weight != null ? Number(p.weight) : null,
          preferredFoot: (p.preferredFoot as string)?.trim() || null,
          jerseyNumber: p.jerseyNumber != null ? Number(p.jerseyNumber) : null,
          position: cadastroUpper((p.position as string) ?? undefined),
          currentTeam: cadastroUpper((p.currentTeam as string) ?? undefined),
          previousTeams: Array.isArray(p.previousTeams) && p.previousTeams.every((x) => typeof x === 'string')
            ? cadastroJsonStringArray(p.previousTeams)
            : p.previousTeams != null
              ? (p.previousTeams as object)
              : Prisma.JsonNull,
          seasonHistory: p.seasonHistory != null ? (p.seasonHistory as object) : Prisma.JsonNull,
          socialMedia: p.socialMedia != null ? (p.socialMedia as object) : Prisma.JsonNull,
          matchesPlayed: p.matchesPlayed != null ? Number(p.matchesPlayed) : null,
          goals: p.goals != null ? Number(p.goals) : null,
          assists: p.assists != null ? Number(p.assists) : null,
          yellowCards: p.yellowCards != null ? Number(p.yellowCards) : null,
          redCards: p.redCards != null ? Number(p.redCards) : null,
          marketValue: p.marketValue != null ? Number(p.marketValue) : null,
          highlights: p.highlights != null ? (p.highlights as string[]) : Prisma.JsonNull,
          bioPT: cadastroUpper((p.bioPT as string) ?? undefined),
          bioEN: cadastroUpper((p.bioEN as string) ?? undefined),
        };

        const existing = await this.prisma.player.findFirst({
          where: {
            tenantId,
            category: categoryId,
            name: { equals: name, mode: 'insensitive' },
          },
        });

        if (existing) {
          await this.prisma.player.update({
            where: { id: existing.id },
            data: {
              name: data.name,
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
    const prev = d.previousTeams;
    const previousTeams =
      Array.isArray(prev) && prev.every((x) => typeof x === 'string')
        ? cadastroJsonStringArray(prev)
        : j(d.previousTeams);
    return {
      tenantId: dto.tenantId,
      name: cadastroUpperRequired(dto.name),
      category: (d.category as string)?.trim() || null,
      photoUrl: (d.photoUrl as string)?.trim() || null,
      birthDate: (d.birthDate as string)?.trim() || null,
      nationality: cadastroUpper((d.nationality as string) ?? undefined),
      height: d.height != null ? (d.height as number) : null,
      weight: d.weight != null ? (d.weight as number) : null,
      bmi: d.bmi != null ? (d.bmi as number) : null,
      bodyFatPercent: d.bodyFatPercent != null ? (d.bodyFatPercent as number) : null,
      leanMassKg: d.leanMassKg != null ? (d.leanMassKg as number) : null,
      preferredFoot: (d.preferredFoot as string)?.trim() || null,
      jerseyNumber: d.jerseyNumber != null ? (d.jerseyNumber as number) : null,
      position: cadastroUpper((d.position as string) ?? undefined),
      fieldPositionX: d.fieldPositionX != null ? (d.fieldPositionX as number) : null,
      fieldPositionY: d.fieldPositionY != null ? (d.fieldPositionY as number) : null,
      currentTeam: cadastroUpper((d.currentTeam as string) ?? undefined),
      previousTeams,
      seasonHistory: j(d.seasonHistory),
      socialMedia: j(d.socialMedia),
      matchesPlayed: d.matchesPlayed != null ? (d.matchesPlayed as number) : null,
      goals: d.goals != null ? (d.goals as number) : null,
      assists: d.assists != null ? (d.assists as number) : null,
      yellowCards: d.yellowCards != null ? (d.yellowCards as number) : null,
      redCards: d.redCards != null ? (d.redCards as number) : null,
      marketValue: d.marketValue != null ? (d.marketValue as number) : null,
      highlights: j(d.highlights),
      bioPT: cadastroUpper((d.bioPT as string) ?? undefined),
      bioEN: cadastroUpper((d.bioEN as string) ?? undefined),
      externalId: (d.externalId as string)?.trim() || null,
      contactEmail: cadastroEmail((d.contactEmail as string) ?? undefined),
      contactPhone: cadastroUpper((d.contactPhone as string) ?? undefined),
      emergencyContactName: cadastroUpper((d.emergencyContactName as string) ?? undefined),
      emergencyContactEmail: cadastroEmail((d.emergencyContactEmail as string) ?? undefined),
      emergencyContactPhone: cadastroUpper((d.emergencyContactPhone as string) ?? undefined),
      medicalHistory: j(d.medicalHistory),
      physiology: j(d.physiology),
      psychologicalAssessment: j(d.psychologicalAssessment),
      onlineConsultations: j(d.onlineConsultations),
      evaluations: j(d.evaluations),
      status: (d.status as string)?.trim() || null,
      statusDetails: cadastroUpper((d.statusDetails as string) ?? undefined),
      statusUntil: d.statusUntil ? new Date(d.statusUntil as string) : null,
      heatMapData: j(d.heatMapData),
      performanceAnalysis: cadastroUpper((d.performanceAnalysis as string) ?? undefined),
      analysisMetrics: j(d.analysisMetrics),
      images: j(d.images),
      publicFields: d.publicFields != null ? (d.publicFields as object) : Prisma.JsonNull,
      registrationProfile: j(d.registrationProfile),
    };
  }

  private toUpdateData(dto: UpdatePlayerDto): Prisma.PlayerUpdateInput {
    const d = dto as unknown as Record<string, unknown>;
    const jsonOrNull = (v: unknown) => (v != null ? (v as object) : Prisma.JsonNull);
    return {
      ...(d.category !== undefined && { category: (d.category as string)?.trim() || null }),
      ...(d.name !== undefined && { name: cadastroUpperRequired(d.name as string) }),
      ...(d.photoUrl !== undefined && { photoUrl: (d.photoUrl as string)?.trim() || null }),
      ...(d.birthDate !== undefined && { birthDate: (d.birthDate as string)?.trim() || null }),
      ...(d.nationality !== undefined && { nationality: cadastroUpper((d.nationality as string) ?? undefined) }),
      ...(d.height !== undefined && { height: d.height as number | null }),
      ...(d.weight !== undefined && { weight: d.weight as number | null }),
      ...(d.bmi !== undefined && { bmi: d.bmi as number | null }),
      ...(d.bodyFatPercent !== undefined && { bodyFatPercent: d.bodyFatPercent as number | null }),
      ...(d.leanMassKg !== undefined && { leanMassKg: d.leanMassKg as number | null }),
      ...(d.preferredFoot !== undefined && { preferredFoot: (d.preferredFoot as string)?.trim() || null }),
      ...(d.jerseyNumber !== undefined && { jerseyNumber: d.jerseyNumber as number | null }),
      ...(d.position !== undefined && { position: cadastroUpper((d.position as string) ?? undefined) }),
      ...(d.fieldPositionX !== undefined && { fieldPositionX: d.fieldPositionX as number | null }),
      ...(d.fieldPositionY !== undefined && { fieldPositionY: d.fieldPositionY as number | null }),
      ...(d.currentTeam !== undefined && { currentTeam: cadastroUpper((d.currentTeam as string) ?? undefined) }),
      ...(d.previousTeams !== undefined && {
        previousTeams:
          Array.isArray(d.previousTeams) && (d.previousTeams as unknown[]).every((x) => typeof x === 'string')
            ? cadastroJsonStringArray(d.previousTeams)
            : (jsonOrNull(d.previousTeams) as Prisma.InputJsonValue),
      }),
      ...(d.seasonHistory !== undefined && { seasonHistory: jsonOrNull(d.seasonHistory) }),
      ...(d.socialMedia !== undefined && { socialMedia: jsonOrNull(d.socialMedia) }),
      ...(d.matchesPlayed !== undefined && { matchesPlayed: d.matchesPlayed as number | null }),
      ...(d.goals !== undefined && { goals: d.goals as number | null }),
      ...(d.assists !== undefined && { assists: d.assists as number | null }),
      ...(d.yellowCards !== undefined && { yellowCards: d.yellowCards as number | null }),
      ...(d.redCards !== undefined && { redCards: d.redCards as number | null }),
      ...(d.marketValue !== undefined && { marketValue: d.marketValue as number | null }),
      ...(d.highlights !== undefined && { highlights: jsonOrNull(d.highlights) }),
      ...(d.bioPT !== undefined && { bioPT: cadastroUpper((d.bioPT as string) ?? undefined) }),
      ...(d.bioEN !== undefined && { bioEN: cadastroUpper((d.bioEN as string) ?? undefined) }),
      ...(d.externalId !== undefined && { externalId: (d.externalId as string)?.trim() || null }),
      ...(d.contactEmail !== undefined && { contactEmail: cadastroEmail((d.contactEmail as string) ?? undefined) }),
      ...(d.contactPhone !== undefined && { contactPhone: cadastroUpper((d.contactPhone as string) ?? undefined) }),
      ...(d.emergencyContactName !== undefined && {
        emergencyContactName: cadastroUpper((d.emergencyContactName as string) ?? undefined),
      }),
      ...(d.emergencyContactEmail !== undefined && {
        emergencyContactEmail: cadastroEmail((d.emergencyContactEmail as string) ?? undefined),
      }),
      ...(d.emergencyContactPhone !== undefined && {
        emergencyContactPhone: cadastroUpper((d.emergencyContactPhone as string) ?? undefined),
      }),
      ...(d.medicalHistory !== undefined && { medicalHistory: jsonOrNull(d.medicalHistory) }),
      ...(d.physiology !== undefined && { physiology: jsonOrNull(d.physiology) }),
      ...(d.psychologicalAssessment !== undefined && {
        psychologicalAssessment: jsonOrNull(d.psychologicalAssessment),
      }),
      ...(d.onlineConsultations !== undefined && { onlineConsultations: jsonOrNull(d.onlineConsultations) }),
      ...(d.evaluations !== undefined && { evaluations: jsonOrNull(d.evaluations) }),
      ...(d.status !== undefined && { status: (d.status as string)?.trim() || null }),
      ...(d.statusDetails !== undefined && { statusDetails: cadastroUpper((d.statusDetails as string) ?? undefined) }),
      ...(d.statusUntil !== undefined && { statusUntil: d.statusUntil ? new Date(d.statusUntil as string) : null }),
      ...(d.heatMapData !== undefined && { heatMapData: jsonOrNull(d.heatMapData) }),
      ...(d.performanceAnalysis !== undefined && {
        performanceAnalysis: cadastroUpper((d.performanceAnalysis as string) ?? undefined),
      }),
      ...(d.analysisMetrics !== undefined && { analysisMetrics: jsonOrNull(d.analysisMetrics) }),
      ...(d.images !== undefined && { images: jsonOrNull(d.images) }),
      ...(d.publicFields !== undefined && {
        publicFields: d.publicFields != null ? (d.publicFields as object) : Prisma.JsonNull,
      }),
      ...(d.registrationProfile !== undefined && {
        registrationProfile: jsonOrNull(d.registrationProfile),
      }),
    };
  }
}
