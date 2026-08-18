import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import {
  cadastroEmail,
  cadastroJsonStringArray,
  cadastroUpper,
  cadastroUpperRequired,
} from '../common/cadastro-text';
import { normalizeFootballPositionCode } from '../common/football-positions.util';
import { normalizeHeightCm, normalizeWeightKg } from '../common/body-measures.util';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { CreatePlayerDto } from './dto/create-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import {
  applyCadastroMetricsToLatestPhysiology,
  computeBestSharedMetricsFromSources,
} from './body-metrics.util';
import { syncLinkedIdentityByPlayerId } from '../rh/employee-player-link';
import { FootballAgendaBirthdaysService } from '../futebol-agenda/football-agenda-birthdays.service';
import { FutebolAgendaService } from '../futebol-agenda/futebol-agenda.service';
import { validatePlayerContacts, parseRegistrationProfile } from '../assistencia-social/social-pedagogy.util';
import { SocialPedagogyCasesService } from '../assistencia-social/social-pedagogy-cases.service';
import {
  buildPlayerMatchAvailabilityInput,
  getPlayerMatchAvailability,
} from '../common/player-match-availability.util';
import {
  normalizeSportsSituation,
  isArchivedSportsSituation,
  isLoanedSportsSituation,
} from '../common/sports-situation.util';
import { normalizeRegistrationProfile } from '../common/registration-profile-normalize.util';

@Injectable()
export class PlayersService {
  private readonly logger = new Logger(PlayersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly agendaBirthdays: FootballAgendaBirthdaysService,
    private readonly agenda: FutebolAgendaService,
    private readonly socialPedagogyCases: SocialPedagogyCasesService,
  ) {}

  private assertTenantAccess(allowedTenantIds: string[] | null | undefined, tenantId: string): void {
    if (allowedTenantIds === null || allowedTenantIds === undefined) return;
    if (!allowedTenantIds.includes(tenantId)) {
      throw new ForbiddenException('Acesso negado a esta empresa.');
    }
  }

  private applyAllowedTenantsToWhere(
    where: Prisma.PlayerWhereInput,
    allowedTenantIds: string[] | null | undefined,
    requestedTenantId?: string,
  ): void {
    if (allowedTenantIds === null || allowedTenantIds === undefined) {
      if (requestedTenantId) where.tenantId = requestedTenantId;
      return;
    }
    if (requestedTenantId) {
      this.assertTenantAccess(allowedTenantIds, requestedTenantId);
      where.tenantId = requestedTenantId;
      return;
    }
    where.tenantId = { in: allowedTenantIds };
  }

  async findAll(
    filters?: {
      tenantId?: string;
      category?: string;
      position?: string;
      search?: string;
      situation?: string;
      availability?: string;
      archived?: boolean;
      loaned?: boolean;
    },
    allowedTenantIds: string[] | null = null,
  ) {
    const where: Prisma.PlayerWhereInput = {};
    this.applyAllowedTenantsToWhere(where, allowedTenantIds, filters?.tenantId);
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
            path: ['personal', 'nickname'],
            string_contains: term,
            mode: 'insensitive',
          },
        },
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

    const availability = filters?.availability?.trim().toLowerCase();
    if (availability === 'apto' || availability === 'nao_apto') {
      const wantApto = availability === 'apto';
      players = players.filter((p) => {
        const avail = getPlayerMatchAvailability(buildPlayerMatchAvailabilityInput(p));
        return avail.apto === wantApto;
      });
    }

    return players;
  }

  private getPlayerSituation(registrationProfile: unknown): string {
    const profile = this.parseRegistrationProfile(registrationProfile);
    return normalizeSportsSituation(profile.sports?.situation);
  }

  private isArchivedPlayer(registrationProfile: unknown): boolean {
    const profile = this.parseRegistrationProfile(registrationProfile);
    return isArchivedSportsSituation(profile.sports?.situation);
  }

  private isLoanedPlayer(registrationProfile: unknown): boolean {
    const profile = this.parseRegistrationProfile(registrationProfile);
    return isLoanedSportsSituation(profile.sports?.situation);
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

  async findOne(id: string, allowedTenantIds: string[] | null = null) {
    const player = await this.prisma.player.findUnique({
      where: { id },
      include: { tenant: { select: { id: true, name: true, slug: true, logoUrl: true } } },
    });
    if (!player) throw new NotFoundException('Jogador não encontrado');
    this.assertTenantAccess(allowedTenantIds, player.tenantId);
    return player;
  }

  /** Viagens do hub de logística vinculadas ao atleta (quarto ou categoria). */
  async findTravelHistory(playerId: string, allowedTenantIds: string[] | null = null) {
    const player = await this.findOne(playerId, allowedTenantIds);
    const baseWhere = {
      tenantId: player.tenantId,
      status: { notIn: ['rascunho', 'cancelado'] as string[] },
    };
    const include = {
      tenant: { select: { id: true, name: true, slug: true, logoUrl: true } },
    };

    const linked = await this.prisma.travelLogistics.findMany({
      where: {
        ...baseWhere,
        participants: { some: { playerId } },
      },
      orderBy: [{ matchDate: 'desc' }, { createdAt: 'desc' }],
      include,
    });
    const linkedIds = new Set(linked.map((t) => t.id));

    // Viagens antigas sem convocação (TravelParticipant): só se o atleta estiver nos quartos
    const legacyCandidates = await this.prisma.travelLogistics.findMany({
      where: {
        ...baseWhere,
        id: linkedIds.size > 0 ? { notIn: [...linkedIds] } : undefined,
        participants: { none: {} },
      },
      orderBy: [{ matchDate: 'desc' }, { createdAt: 'desc' }],
      include,
    });
    const legacy = legacyCandidates.filter((t) =>
      this.playerInAccommodationRooms(t.accommodationRooms, playerId),
    );

    return [...linked, ...legacy].sort((a, b) => {
      const da = new Date(a.matchDate).getTime();
      const db = new Date(b.matchDate).getTime();
      return db - da;
    });
  }

  /** Treinos registrados em Futebol → Treinadores com avaliação do atleta. */
  async findTrainingHistory(playerId: string, allowedTenantIds: string[] | null = null) {
    await this.findOne(playerId, allowedTenantIds);
    const entries = await this.prisma.coachTrainingPlayerEntry.findMany({
      where: { playerId },
      orderBy: [{ session: { sessionDate: 'desc' } }, { session: { createdAt: 'desc' } }],
      take: 50,
      include: {
        session: {
          include: {
            attachments: true,
            staff: { select: { id: true, name: true, role: true } },
            agendaEntry: { select: { id: true, title: true, location: true } },
            planTemplate: { select: { id: true, title: true, fileUrl: true } },
          },
        },
      },
    });

    return entries.map((e) => ({
      sessionId: e.session.id,
      sessionDate: e.session.sessionDate,
      startTime: e.session.startTime,
      endTime: e.session.endTime,
      category: e.session.category,
      status: e.session.status,
      objectives: e.session.objectives,
      staffName: e.session.staff?.name ?? null,
      agendaTitle: e.session.agendaEntry?.title ?? null,
      planTemplateTitle: e.session.planTemplate?.title ?? null,
      attachments: e.session.attachments,
      available: e.available,
      unavailableReason: e.unavailableReason,
      rating: e.rating,
      notes: e.notes,
    }));
  }

  async findNutritionHistory(playerId: string, allowedTenantIds: string[] | null = null) {
    const player = await this.findOne(playerId, allowedTenantIds);
    const [anamneses, assessments, supplements] = await Promise.all([
      this.prisma.nutritionAnamnesis.findMany({
        where: { playerId },
        orderBy: [{ assessedAt: 'desc' }],
        take: 20,
      }),
      this.prisma.nutritionAssessment.findMany({
        where: { playerId },
        orderBy: [{ assessedAt: 'desc' }],
        take: 10,
      }),
      this.prisma.supplementGuide.findMany({
        where: {
          tenantId: player.tenantId,
          OR: [{ playerId }, { playerId: null, categoryId: null }],
        },
        orderBy: [{ name: 'asc' }],
        include: {
          category: { select: { id: true, name: true, code: true } },
        },
      }),
    ]);

    const categoryGuides = player.category
      ? await this.prisma.supplementGuide.findMany({
          where: {
            tenantId: player.tenantId,
            playerId: null,
            category: { code: player.category },
          },
          include: { category: { select: { id: true, name: true, code: true } } },
        })
      : [];

    const guideIds = new Set<string>();
    const mergedSupplements = [...supplements, ...categoryGuides].filter((g) => {
      if (guideIds.has(g.id)) return false;
      guideIds.add(g.id);
      return true;
    });

    return {
      anamneses,
      assessments,
      supplements: mergedSupplements,
    };
  }

  async findNutritionContext(playerId: string, allowedTenantIds: string[] | null = null) {
    const player = await this.findOne(playerId, allowedTenantIds);

    const physioSessions = await this.prisma.physioSession.findMany({
      where: { playerId },
      orderBy: [{ startedAt: 'desc' }],
      take: 5,
      select: {
        id: true,
        startedAt: true,
        status: true,
        diagnosisLabel: true,
        symptoms: true,
        evolutionNotes: true,
      },
    });

    const psychEntries = Array.isArray(player.psychologicalAssessment)
      ? (player.psychologicalAssessment as Array<{ kind?: string; data?: Record<string, unknown> }>)
      : [];
    const psychFoodNotes = psychEntries
      .map((entry) => {
        const val = entry?.data?.preocupacaoAlimentacao;
        return typeof val === 'string' && val.trim() ? val.trim() : null;
      })
      .filter(Boolean) as string[];

    let medicalAllergies: string[] = [];
    const med = player.medicalHistory as
      | { profile?: { allergies?: string }; records?: Array<{ title?: string; notes?: string }> }
      | null
      | undefined;
    if (med?.profile?.allergies?.trim()) {
      medicalAllergies.push(med.profile.allergies.trim());
    }
    if (Array.isArray(med?.records)) {
      for (const rec of med.records) {
        const text = `${rec.title ?? ''} ${rec.notes ?? ''}`.toLowerCase();
        if (text.includes('alerg') || text.includes('intoler')) {
          medicalAllergies.push([rec.title, rec.notes].filter(Boolean).join(' — '));
        }
      }
    }

    const history = await this.findNutritionHistory(playerId, allowedTenantIds);

    return {
      player: {
        id: player.id,
        name: player.name,
        category: player.category,
        weight: player.weight,
        height: player.height,
        bmi: player.bmi,
        bodyFatPercent: player.bodyFatPercent,
      },
      ...history,
      healthLinks: {
        physioSessions,
        psychFoodNotes,
        medicalAllergies,
      },
    };
  }

  async findSocialPedagogyContext(playerId: string, allowedTenantIds: string[] | null = null) {
    const player = await this.findOne(playerId, allowedTenantIds);
    const profile = parseRegistrationProfile(player.registrationProfile);

    const [guardians, enrollments, cases, documents, openCasesCount] = await Promise.all([
      this.prisma.playerGuardian.findMany({
        where: { playerId },
        orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
      }),
      this.prisma.playerSchoolEnrollment.findMany({
        where: { playerId },
        orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
      }),
      this.prisma.socialPedagogyCase.findMany({
        where: { playerId },
        orderBy: [{ updatedAt: 'desc' }],
        take: 10,
        include: { documents: true },
      }),
      this.prisma.socialPedagogyDocument.findMany({
        where: { playerId },
        orderBy: [{ receivedAt: 'desc' }],
        take: 20,
      }),
      this.prisma.socialPedagogyCase.count({
        where: { playerId, status: { not: 'concluido' } },
      }),
    ]);

    const contactValidation = validatePlayerContacts(player, guardians);

    return {
      player: {
        id: player.id,
        name: player.name,
        category: player.category,
        contactPhone: player.contactPhone,
        contactEmail: player.contactEmail,
        emergencyContactName: player.emergencyContactName,
        emergencyContactPhone: player.emergencyContactPhone,
        emergencyContactEmail: player.emergencyContactEmail,
      },
      profileSchool: {
        schoolName: profile.extras?.schoolName ?? null,
        schoolGrade: profile.extras?.schoolGrade ?? null,
        educationLevel: profile.extras?.educationLevel ?? null,
      },
      contactValidation,
      guardians,
      enrollments,
      cases,
      documents,
      openCasesCount,
    };
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

  async findAgendaTimeline(
    playerId: string,
    from?: string,
    to?: string,
    allowedTenantIds: string[] | null = null,
  ) {
    await this.findOne(playerId, allowedTenantIds);
    return this.agenda.findPlayerAgenda(playerId, from, to);
  }

  /** Contratos do atleta — Jurídico (LegalDocument) + RH (Employment por CPF). */
  async findContractsOverview(playerId: string, allowedTenantIds: string[] | null = null) {
    const player = await this.findOne(playerId, allowedTenantIds);
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

    const beatscodeRows = this.beatscodeContractRows(profile, tenantName);

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
        fileUrl: doc.fileUrl ?? doc.signedFileUrl ?? null,
      };
    });

    const contracts = [...beatscodeRows, ...juridicoRows, ...rhRows].sort((a, b) => {
      const da = a.startDate ? new Date(a.startDate).getTime() : 0;
      const db = b.startDate ? new Date(b.startDate).getTime() : 0;
      return db - da;
    });

    return { economicRights, contracts, tenantName };
  }

  /** Stream PDF jurídico do atleta (pasta S3 legal/* — privada). */
  async streamLegalDocumentFile(
    playerId: string,
    documentId: string,
    allowedTenantIds: string[] | null = null,
  ): Promise<{ buffer: Buffer; filename: string }> {
    await this.findOne(playerId, allowedTenantIds);
    const doc = await this.prisma.legalDocument.findFirst({
      where: { id: documentId, playerId },
      include: { player: { select: { name: true } } },
    });
    if (!doc) throw new NotFoundException('Documento não encontrado');
    const key = doc.signedFileKey ?? doc.fileKey;
    if (!key?.trim()) throw new NotFoundException('Arquivo do documento não disponível');
    const buffer = await this.s3.getObjectBuffer(key);
    const playerName = doc.player?.name?.trim();
    const isSigned = !!doc.signedFileKey;
    const filename =
      isSigned && playerName
        ? `${playerName} - ${doc.name} - Assinado.pdf`
        : doc.name.endsWith('.pdf')
          ? doc.name
          : `${doc.name}.pdf`;
    return { buffer, filename };
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
    sports?: { situation?: string; cbf?: string };
    contracts?: {
      economicRights?: Array<{ id: string; clubName: string; percentage: number }>;
      beatscode?: Array<{
        externalId: string;
        beatscodeId: number;
        menuCategory: string;
        contractTypeName: string | null;
        number: string | null;
        initialDate: string | null;
        finalDate: string | null;
        terminationDate: string | null;
        status: string;
        statusLabel: string;
        observation: string | null;
        contractEndReasonName: string | null;
        files?: Array<{
          attachmentId: number;
          fileUrl: string;
          legalDocumentId?: string;
        }>;
      }>;
    };
  } {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    return raw as {
      personal?: { cpf?: string };
      sports?: { situation?: string; cbf?: string };
      contracts?: {
        economicRights?: Array<{ id: string; clubName: string; percentage: number }>;
        beatscode?: Array<{
          externalId: string;
          beatscodeId: number;
          menuCategory: string;
          contractTypeName: string | null;
          number: string | null;
          initialDate: string | null;
          finalDate: string | null;
          terminationDate: string | null;
          status: string;
          statusLabel: string;
          observation: string | null;
          contractEndReasonName: string | null;
        }>;
      };
    };
  }

  private beatscodeContractRows(
    profile: ReturnType<PlayersService['parseRegistrationProfile']>,
    tenantName: string,
  ) {
    const rows = profile.contracts?.beatscode;
    if (!Array.isArray(rows) || rows.length === 0) return [];

    return rows.map((c) => {
      const start = c.initialDate ? new Date(`${c.initialDate}T12:00:00`) : null;
      const end = c.finalDate ? new Date(`${c.finalDate}T12:00:00`) : null;
      return {
        id: c.externalId ?? `beatscode-contract-${c.beatscodeId}`,
        source: 'beatscode' as const,
        displayId: c.number ?? String(c.beatscodeId),
        startDate: start && !Number.isNaN(start.getTime()) ? start.toISOString() : null,
        endDate: end && !Number.isNaN(end.getTime()) ? end.toISOString() : null,
        economicRightsClub: tenantName,
        status: c.statusLabel ?? c.status,
        contractType: c.contractTypeName ?? 'Contrato',
        destinationClub: null,
        executionPercent: this.executionPercent(start, end),
        beatscodeContractId: c.beatscodeId,
        menuCategory: c.menuCategory,
        terminationDate: c.terminationDate,
        observation: c.observation,
        endReason: c.contractEndReasonName,
        fileUrl: c.files?.[0]?.fileUrl ?? null,
        juridicoDocumentId: c.files?.[0]?.legalDocumentId ?? null,
      };
    });
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
    allowedTenantIds: string[] | null = null,
  ) {
    await this.findOne(playerId, allowedTenantIds);
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

    const doc = {
      id: randomUUID(),
      name: name.trim(),
      documentType: documentType.trim(),
      documentCategory:
        documentType.trim() === 'exame_fisio' ||
        documentType.trim() === 'laudo' ||
        documentType.trim() === 'exame'
          ? ('medico' as const)
          : ('outro' as const),
      fileKey: uploaded.key,
      fileUrl: uploaded.url,
      uploadedAt: new Date().toISOString(),
      source: 'manual' as const,
    };

    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      select: { registrationProfile: true },
    });
    const profile =
      player?.registrationProfile && typeof player.registrationProfile === 'object'
        ? (player.registrationProfile as Record<string, unknown>)
        : {};
    const prevDocs = Array.isArray(profile.documents) ? profile.documents : [];
    await this.prisma.player.update({
      where: { id: playerId },
      data: {
        registrationProfile: {
          ...profile,
          documents: [doc, ...prevDocs],
        } as Prisma.InputJsonValue,
      },
    });

    return doc;
  }

  async create(dto: CreatePlayerDto, allowedTenantIds: string[] | null = null) {
    this.assertTenantAccess(allowedTenantIds, dto.tenantId);
    const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) throw new NotFoundException(`Empresa/clube "${dto.tenantId}" não encontrado`);

    const data = this.toCreateData(dto);
    const player = await this.prisma.player.create({
      data,
      include: { tenant: { select: { id: true, name: true, slug: true, logoUrl: true } } },
    });
    if (player.birthDate) {
      await this.agendaBirthdays.syncPlayerBirthdays(player.id).catch(() => undefined);
    }
    await this.socialPedagogyCases
      .tryCreateAptoPlayerCase(player.id)
      .catch(() => undefined);
    return player;
  }

  async update(id: string, dto: UpdatePlayerDto, allowedTenantIds: string[] | null = null) {
    const current = await this.prisma.player.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Jogador não encontrado');
    this.assertTenantAccess(allowedTenantIds, current.tenantId);

    const previousAvailabilityInput = buildPlayerMatchAvailabilityInput(current);

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

    if (
      dto.birthDate !== undefined ||
      dto.category !== undefined ||
      dto.name !== undefined
    ) {
      await this.agendaBirthdays.syncPlayerBirthdays(id).catch(() => undefined);
    }

    await this.syncBodyMetricsFromSources(id);
    await this.socialPedagogyCases
      .tryCreateAptoPlayerCase(id, previousAvailabilityInput)
      .catch(() => undefined);
    return this.findOne(id, allowedTenantIds);
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
  async getDeleteImpact(id: string, allowedTenantIds: string[] | null = null) {
    const player = await this.findOne(id, allowedTenantIds);

    const [
      legalDocuments,
      nutritionAssessments,
      nutritionAnamneses,
      assignedAssets,
      supplementGuides,
      playerGuardians,
      schoolEnrollments,
      socialPedagogyCases,
      socialPedagogyDocuments,
    ] = await Promise.all([
      this.prisma.legalDocument.count({ where: { playerId: id } }),
      this.prisma.nutritionAssessment.count({ where: { playerId: id } }),
      this.prisma.nutritionAnamnesis.count({ where: { playerId: id } }),
      this.prisma.asset.count({ where: { assignedPlayerId: id } }),
      this.prisma.supplementGuide.count({ where: { playerId: id } }),
      this.prisma.playerGuardian.count({ where: { playerId: id } }),
      this.prisma.playerSchoolEnrollment.count({ where: { playerId: id } }),
      this.prisma.socialPedagogyCase.count({ where: { playerId: id } }),
      this.prisma.socialPedagogyDocument.count({ where: { playerId: id } }),
    ]);

    const medicalHistoryEntries = Array.isArray(player.medicalHistory) ? player.medicalHistory.length : 0;
    const psychologicalAssessments = Array.isArray(player.psychologicalAssessment) ? player.psychologicalAssessment.length : 0;
    const onlineConsultations = Array.isArray(player.onlineConsultations) ? player.onlineConsultations.length : 0;
    const evaluations = Array.isArray(player.evaluations) ? player.evaluations.length : 0;

    const total =
      legalDocuments +
      nutritionAssessments +
      nutritionAnamneses +
      assignedAssets +
      supplementGuides +
      playerGuardians +
      schoolEnrollments +
      socialPedagogyCases +
      socialPedagogyDocuments +
      medicalHistoryEntries +
      psychologicalAssessments +
      onlineConsultations +
      evaluations;

    return {
      legalDocuments,
      nutritionAssessments,
      nutritionAnamneses,
      assignedAssets,
      supplementGuides,
      playerGuardians,
      schoolEnrollments,
      socialPedagogyCases,
      socialPedagogyDocuments,
      medicalHistoryEntries,
      psychologicalAssessments,
      onlineConsultations,
      evaluations,
      total,
      hasIntegrations: total > 0,
    };
  }

  async remove(id: string, allowedTenantIds: string[] | null = null) {
    await this.findOne(id, allowedTenantIds);
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
          position: this.normalizePlayerPosition((p.position as string) ?? undefined),
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
          position: this.normalizePlayerPosition((p.position as string) ?? undefined),
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

  private normalizePlayerPosition(value: string | null | undefined): string | null {
    if (value == null || !String(value).trim()) return null;
    const canonical = normalizeFootballPositionCode(String(value));
    if (canonical) return canonical;
    return cadastroUpper(String(value));
  }

  private cbfRegistrationFromProfile(value: unknown): string | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const sports = (value as { sports?: unknown }).sports;
    if (!sports || typeof sports !== 'object' || Array.isArray(sports)) return null;
    const raw = (sports as { cbf?: unknown }).cbf;
    const normalized =
      typeof raw === 'string' || typeof raw === 'number'
        ? String(raw).replace(/\D/g, '')
        : '';
    return normalized || null;
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
      height: d.height != null ? normalizeHeightCm(d.height) : null,
      weight: d.weight != null ? normalizeWeightKg(d.weight) : null,
      bmi: d.bmi != null ? (d.bmi as number) : null,
      bodyFatPercent: d.bodyFatPercent != null ? (d.bodyFatPercent as number) : null,
      leanMassKg: d.leanMassKg != null ? (d.leanMassKg as number) : null,
      preferredFoot: (d.preferredFoot as string)?.trim() || null,
      jerseyNumber: d.jerseyNumber != null ? (d.jerseyNumber as number) : null,
      position: this.normalizePlayerPosition(d.position as string | undefined),
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
      cbfRegistration: this.cbfRegistrationFromProfile(d.registrationProfile),
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
      registrationProfile: j(normalizeRegistrationProfile(d.registrationProfile)),
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
      ...(d.height !== undefined && { height: normalizeHeightCm(d.height) }),
      ...(d.weight !== undefined && { weight: normalizeWeightKg(d.weight) }),
      ...(d.bmi !== undefined && { bmi: d.bmi as number | null }),
      ...(d.bodyFatPercent !== undefined && { bodyFatPercent: d.bodyFatPercent as number | null }),
      ...(d.leanMassKg !== undefined && { leanMassKg: d.leanMassKg as number | null }),
      ...(d.preferredFoot !== undefined && { preferredFoot: (d.preferredFoot as string)?.trim() || null }),
      ...(d.jerseyNumber !== undefined && { jerseyNumber: d.jerseyNumber as number | null }),
      ...(d.position !== undefined && { position: this.normalizePlayerPosition(d.position as string | undefined) }),
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
        registrationProfile: jsonOrNull(normalizeRegistrationProfile(d.registrationProfile)),
        cbfRegistration: this.cbfRegistrationFromProfile(d.registrationProfile),
      }),
    };
  }
}
