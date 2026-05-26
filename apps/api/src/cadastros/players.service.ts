import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import {
  cadastroEmail,
  cadastroJsonStringArray,
  cadastroUpper,
  cadastroUpperRequired,
} from '../common/cadastro-text';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { CreatePlayerDto } from './dto/create-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import {
  applyCadastroMetricsToLatestPhysiology,
  computeBestSharedMetricsFromSources,
} from './body-metrics.util';
import { syncLinkedIdentityByPlayerId } from '../rh/employee-player-link';

@Injectable()
export class PlayersService {
  private readonly logger = new Logger(PlayersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  async findAll(filters?: {
    tenantId?: string;
    category?: string;
    position?: string;
    search?: string;
    situation?: string;
    archived?: boolean;
    loaned?: boolean;
  }) {
    const where: Prisma.PlayerWhereInput = {};
    if (filters?.tenantId) where.tenantId = filters.tenantId;
    if (filters?.category) where.category = filters.category;
    if (filters?.position?.trim()) where.position = filters.position.trim();
    if (filters?.search?.trim()) {
      const term = filters.search.trim();
      const or: Prisma.PlayerWhereInput[] = [
        { name: { contains: term, mode: 'insensitive' } },
        { currentTeam: { contains: term, mode: 'insensitive' } },
        { position: { contains: term, mode: 'insensitive' } },
        {
          registrationProfile: {
            path: ['personal', 'cpf'],
            string_contains: term,
            mode: 'insensitive',
          },
        },
        {
          registrationProfile: {
            path: ['sports', 'cbf'],
            string_contains: term,
            mode: 'insensitive',
          },
        },
      ];

      const cpfDigits = term.replace(/\D/g, '');
      if (cpfDigits.length >= 3) {
        const ids = await this.findPlayerIdsByCpfDigits(cpfDigits, filters);
        if (ids.length) or.push({ id: { in: ids } });
      }

      where.OR = or;
    }
    let players = await this.prisma.player.findMany({
      where,
      orderBy: [{ tenant: { name: 'asc' } }, { category: 'asc' }, { name: 'asc' }],
      include: { tenant: { select: { id: true, name: true, slug: true, logoUrl: true } } },
    });

    if (filters?.archived) {
      players = players.filter((p) => this.isArchivedPlayer(p.registrationProfile));
    } else if (filters?.loaned) {
      players = players.filter((p) => this.isLoanedPlayer(p.registrationProfile));
    } else if (filters?.situation?.trim()) {
      const wanted = filters.situation.trim();
      players = players.filter((p) => this.getPlayerSituation(p.registrationProfile) === wanted);
    } else {
      players = players.filter(
        (p) =>
          !this.isArchivedPlayer(p.registrationProfile) && !this.isLoanedPlayer(p.registrationProfile),
      );
    }

    return players;
  }

  private getPlayerSituation(registrationProfile: unknown): string {
    const profile = this.parseRegistrationProfile(registrationProfile);
    const raw = profile.sports?.situation;
    if (!raw || raw === 'elenco') return 'ativo';
    if (raw === 'inativo') return 'desligado';
    return raw;
  }

  private isArchivedPlayer(registrationProfile: unknown): boolean {
    return this.getPlayerSituation(registrationProfile) === 'desligado';
  }

  private isLoanedPlayer(registrationProfile: unknown): boolean {
    return this.getPlayerSituation(registrationProfile) === 'emprestado';
  }

  private async findPlayerIdsByCpfDigits(
    digits: string,
    filters?: { tenantId?: string; category?: string; position?: string },
  ): Promise<string[]> {
    const pattern = `%${digits}%`;
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Player"
      WHERE regexp_replace(COALESCE("registrationProfile"->'personal'->>'cpf', ''), '[^0-9]', '', 'g') LIKE ${pattern}
      ${filters?.tenantId ? Prisma.sql`AND "tenantId" = ${filters.tenantId}` : Prisma.empty}
      ${filters?.category ? Prisma.sql`AND category = ${filters.category}` : Prisma.empty}
      ${filters?.position?.trim() ? Prisma.sql`AND position = ${filters.position.trim()}` : Prisma.empty}
    `;
    return rows.map((r) => r.id);
  }

  async findOne(id: string) {
    const player = await this.prisma.player.findUnique({
      where: { id },
      include: { tenant: { select: { id: true, name: true, slug: true, logoUrl: true } } },
    });
    if (!player) throw new NotFoundException('Jogador não encontrado');
    return player;
  }

  /** Viagens do hub de logística vinculadas ao atleta (quarto ou categoria). */
  async findTravelHistory(playerId: string) {
    const player = await this.findOne(playerId);
    const travels = await this.prisma.travelLogistics.findMany({
      where: {
        tenantId: player.tenantId,
        status: { notIn: ['rascunho', 'cancelado'] },
      },
      orderBy: [{ matchDate: 'desc' }, { createdAt: 'desc' }],
      include: { tenant: { select: { id: true, name: true, slug: true, logoUrl: true } } },
    });
    return travels.filter(
      (t) =>
        this.playerInAccommodationRooms(t.accommodationRooms, playerId) ||
        this.travelMatchesPlayerCategory(t.category, player.category),
    );
  }

  private playerInAccommodationRooms(rooms: unknown, playerId: string): boolean {
    if (!Array.isArray(rooms)) return false;
    for (const room of rooms) {
      if (!room || typeof room !== 'object') continue;
      const r = room as Record<string, unknown>;
      if (r.personType === 'player' && r.personId === playerId) return true;
      const occupants = r.occupants;
      if (!Array.isArray(occupants)) continue;
      for (const occ of occupants) {
        if (!occ || typeof occ !== 'object') continue;
        const o = occ as Record<string, unknown>;
        if (o.personType === 'player' && o.personId === playerId) return true;
      }
    }
    return false;
  }

  private travelMatchesPlayerCategory(
    travelCategory: string | null | undefined,
    playerCategory: string | null | undefined,
  ): boolean {
    if (!playerCategory) return false;
    if (!travelCategory) return true;
    return travelCategory === playerCategory;
  }

  /** Contratos do atleta — Jurídico (LegalDocument) + RH (Employment por CPF). */
  async findContractsOverview(playerId: string) {
    const player = await this.findOne(playerId);
    const profile = this.parseRegistrationProfile(player.registrationProfile);
    const tenantName = player.tenant?.name ?? 'Clube';

    const economicRights = this.resolveEconomicRights(profile, tenantName);

    const legalDocs = await this.prisma.legalDocument.findMany({
      where: { playerId },
      orderBy: { createdAt: 'desc' },
    });

    const cpf = profile.personal?.cpf?.replace(/\D/g, '') ?? '';
    const rhRows = cpf
      ? await this.findRhContractsForCpf(player.tenantId, cpf, tenantName)
      : [];

    const juridicoRows = legalDocs.map((doc) => {
      const start = doc.validFrom ?? doc.createdAt;
      const end = doc.validUntil;
      const meta = doc.metadata as Record<string, unknown> | null;
      return {
        id: `juridico-${doc.id}`,
        source: 'juridico' as const,
        displayId: this.displayContractId(doc.id),
        startDate: start ? start.toISOString() : null,
        endDate: end ? end.toISOString() : null,
        economicRightsClub: tenantName,
        status: this.legalStatusLabel(doc.status),
        contractType: this.legalTypeLabel(doc.type),
        destinationClub:
          typeof meta?.destinationClub === 'string'
            ? meta.destinationClub
            : typeof meta?.clubeDestino === 'string'
              ? meta.clubeDestino
              : null,
        executionPercent: this.executionPercent(start, end),
        juridicoDocumentId: doc.id,
      };
    });

    const contracts = [...juridicoRows, ...rhRows].sort((a, b) => {
      const da = a.startDate ? new Date(a.startDate).getTime() : 0;
      const db = b.startDate ? new Date(b.startDate).getTime() : 0;
      return db - da;
    });

    return { economicRights, contracts, tenantName };
  }

  private assertRegistrationIdentifiers(profile: Record<string, unknown> | undefined) {
    if (!profile || typeof profile !== 'object') {
      throw new BadRequestException('Preencha o CPF do atleta (11 dígitos).');
    }
    const personal = profile.personal as { cpf?: string } | undefined;
    const cpfDigits = (personal?.cpf ?? '').replace(/\D/g, '');
    if (cpfDigits.length < 11) {
      throw new BadRequestException('Preencha o CPF do atleta (11 dígitos).');
    }
  }

  private parseRegistrationProfile(raw: unknown): {
    personal?: { cpf?: string; clubArrivalDate?: string };
    sports?: { situation?: string };
    contracts?: { economicRights?: Array<{ id: string; clubName: string; percentage: number }> };
  } {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    return raw as {
      personal?: { cpf?: string };
      contracts?: { economicRights?: Array<{ id: string; clubName: string; percentage: number }> };
    };
  }

  private resolveEconomicRights(
    profile: ReturnType<PlayersService['parseRegistrationProfile']>,
    tenantName: string,
  ) {
    const rows = profile.contracts?.economicRights;
    if (Array.isArray(rows) && rows.length > 0) return rows;
    return [{ id: 'default', clubName: tenantName, percentage: 100 }];
  }

  private async findRhContractsForCpf(tenantId: string, cpf: string, tenantName: string) {
    const employees = await this.prisma.employee.findMany({
      where: { tenantId, type: 'athlete' },
      include: {
        employments: {
          include: { jobRole: { select: { name: true } } },
          orderBy: { startDate: 'desc' },
        },
      },
    });

    const matched = employees.filter((e) => (e.cpf?.replace(/\D/g, '') ?? '') === cpf);
    const rows: Array<{
      id: string;
      source: 'rh';
      displayId: string;
      startDate: string | null;
      endDate: string | null;
      economicRightsClub: string;
      status: string;
      contractType: string;
      destinationClub: string | null;
      executionPercent: number | null;
      rhEmploymentId: string;
    }> = [];

    for (const employee of matched) {
      for (const emp of employee.employments) {
        const athleteData = emp.athleteData as Record<string, unknown> | null;
        rows.push({
          id: `rh-${emp.id}`,
          source: 'rh',
          displayId: this.displayContractId(emp.id),
          startDate: emp.startDate.toISOString(),
          endDate: emp.endDate ? emp.endDate.toISOString() : null,
          economicRightsClub: tenantName,
          status: this.rhStatusLabel(emp.status),
          contractType: this.rhContractTypeLabel(emp.contractType),
          destinationClub:
            typeof athleteData?.clubeDestino === 'string' ? athleteData.clubeDestino : null,
          executionPercent: this.executionPercent(emp.startDate, emp.endDate),
          rhEmploymentId: emp.id,
        });
      }
    }
    return rows;
  }

  private displayContractId(id: string): string {
    let hash = 0;
    for (let i = 0; i < id.length; i += 1) {
      hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
    }
    return String((hash % 9000) + 100);
  }

  private executionPercent(
    startDate: Date | null | undefined,
    endDate: Date | null | undefined,
  ): number | null {
    if (!startDate || !endDate) return null;
    const start = startDate.getTime();
    const end = endDate.getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;
    const now = Date.now();
    const elapsed = Math.min(Math.max(now - start, 0), end - start);
    return Math.round((elapsed / (end - start)) * 100);
  }

  private legalTypeLabel(type: string): string {
    const map: Record<string, string> = {
      contrato_trabalho: 'Contrato de trabalho',
      contrato_imagem: 'Contrato de imagem',
      formacao: 'Contrato de formação',
      rescisao: 'Termo de rescisão',
      transferencia: 'Termo de transferência',
      aditivo: 'Aditivo contratual',
      procuração: 'Procuração',
      nda: 'NDA / Confidencialidade',
      outro: 'Outro',
    };
    return map[type] ?? type;
  }

  private legalStatusLabel(status: string): string {
    const map: Record<string, string> = {
      draft: 'Rascunho',
      pending_signature: 'Aguardando assinatura',
      signed: 'Ativo',
      expired: 'Expirado',
      cancelled: 'Cancelado',
    };
    return map[status] ?? status;
  }

  private rhContractTypeLabel(type: string): string {
    const map: Record<string, string> = {
      CLT: 'CLT',
      PJ: 'PJ',
      estagio: 'Estágio',
      atleta: 'Contrato de atleta',
    };
    return map[type] ?? type;
  }

  private rhStatusLabel(status: string): string {
    const map: Record<string, string> = {
      ativo: 'Ativo',
      afastado: 'Afastado',
      desligado: 'Encerrado',
    };
    return map[status] ?? status;
  }

  async uploadRegistrationDocument(
    playerId: string,
    file: { buffer: Buffer; originalname: string; mimetype?: string },
    name: string,
    documentType: string,
  ) {
    await this.findOne(playerId);
    if (!name?.trim()) throw new BadRequestException('Nome do documento é obrigatório');
    if (!documentType?.trim()) throw new BadRequestException('Tipo do documento é obrigatório');

    const lower = file.originalname?.toLowerCase() ?? '';
    const allowed =
      lower.endsWith('.pdf') ||
      lower.endsWith('.png') ||
      lower.endsWith('.jpg') ||
      lower.endsWith('.jpeg') ||
      lower.endsWith('.webp') ||
      file.mimetype === 'application/pdf' ||
      file.mimetype?.startsWith('image/');
    if (!allowed) {
      throw new BadRequestException('Envie PDF ou imagem (PNG, JPG, WEBP).');
    }

    const uploaded = await this.s3.uploadPlayerRegistrationDocument(
      file.buffer,
      playerId,
      file.originalname || 'documento.pdf',
      file.mimetype,
    );

    return {
      id: randomUUID(),
      name: name.trim(),
      documentType: documentType.trim(),
      fileKey: uploaded.key,
      fileUrl: uploaded.url,
      uploadedAt: new Date().toISOString(),
    };
  }

  async create(dto: CreatePlayerDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) throw new NotFoundException(`Empresa/clube "${dto.tenantId}" não encontrado`);

    const data = this.toCreateData(dto);
    return this.prisma.player.create({
      data,
      include: { tenant: { select: { id: true, name: true, slug: true, logoUrl: true } } },
    });
  }

  async update(id: string, dto: UpdatePlayerDto) {
    const current = await this.prisma.player.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Jogador não encontrado');

    if (dto.registrationProfile !== undefined) {
      this.assertRegistrationIdentifiers(dto.registrationProfile);
    }

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
      include: { tenant: { select: { id: true, name: true, slug: true, logoUrl: true } } },
    });

    const identityTouched =
      dto.name !== undefined ||
      dto.birthDate !== undefined ||
      dto.photoUrl !== undefined ||
      dto.contactEmail !== undefined ||
      dto.contactPhone !== undefined ||
      dto.registrationProfile !== undefined;
    if (identityTouched) {
      await syncLinkedIdentityByPlayerId(this.prisma, id);
    }

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
