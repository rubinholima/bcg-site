import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { PortfolioItemDto } from './dto/portfolio-item.dto';
import type { FixtureDto } from './dto/fixture.dto';
import {
  SofaScoreService,
  type NormalizedFixture,
} from './sofascore.service';
import {
  PagesService,
  type PageResponseDto,
} from '../pages/pages.service';
import { S3Service } from '../s3/s3.service';
import { MediaMetaService } from '../media/media-meta.service';
import {
  buildVisitingTeamLogoUrlByMergeKey,
  normalizeTeamNameKeyForMerge,
} from './visiting-team-logo-merge.util';

export function isClubKind(kindName: string | null): boolean {
  if (!kindName) return false;
  const k = kindName.toLowerCase();
  return k.includes('futebol') || k.includes('clube') || k.includes('football');
}

/** DTO mínimo para carrossel de logos (clubes/empresas) */
export interface PublicTenantCarouselItem {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  city: string | null;
  country: string | null;
}

/** Override por externalId no módulo Próximos Jogos (dataSource=sofascore). */
type FixtureOverrides = Record<
  string,
  {
    hidden?: boolean;
    featured?: boolean;
    watchUrl?: string;
    ticketUrl?: string;
    venueName?: string;
    competitionLogoUrl?: string;
    category?: string;
  }
>;

function inferCategoryFromCompetition(competitionName: string): string {
  const n = (competitionName || '').toLowerCase();
  if (n.includes('sub-20') || n.includes('sub20') || n.includes('u-20') || n.includes('u20')) return 'sub20';
  if (n.includes('sub-17') || n.includes('sub17') || n.includes('u-17') || n.includes('u17')) return 'sub17';
  if (n.includes('sub-15') || n.includes('sub15') || n.includes('u-15') || n.includes('u15')) return 'sub15';
  if (n.includes('sub-13') || n.includes('sub13') || n.includes('u-13') || n.includes('u13')) return 'sub13';
  if (n.includes('sub-11') || n.includes('sub11') || n.includes('u-11') || n.includes('u11')) return 'sub11';
  if (n.includes('sub-9') || n.includes('sub9') || n.includes('u-9') || n.includes('u9')) return 'sub9';
  if (n.includes('feminin')) return 'feminino';
  return 'principal';
}

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pagesService: PagesService,
    private readonly sofaScore: SofaScoreService,
    private readonly s3: S3Service,
    private readonly mediaMeta: MediaMetaService,
  ) {}

  /** Logos de adversários (S3 clubes-adv + cadastro) para preencher cards públicos quando o JSON não tem URL. */
  private async buildVisitingTeamLogoMergeMap(): Promise<Map<string, string>> {
    const [teams, assets] = await Promise.all([
      this.prisma.visitingTeam.findMany({ orderBy: { name: 'asc' } }),
      this.s3.listAllAssets(),
    ]);
    const advAssets = assets.filter(
      (a) =>
        a.key.startsWith('logos/clubes-adv/') ||
        a.key.startsWith('logos/external/'),
    );
    const displayNames = await this.mediaMeta.getDisplayNames(
      advAssets.map((a) => a.key),
    );
    const advItems = advAssets.map((a) => ({
      key: a.key,
      url: a.url,
      displayName: displayNames[a.key] ?? null,
    }));
    return buildVisitingTeamLogoUrlByMergeKey(
      teams.map((t) => ({
        id: t.id,
        name: t.name,
        logoUrl: t.logoUrl,
      })),
      advItems,
    );
  }

  private enrichFixturesWithVisitingLogos(
    list: FixtureDto[],
    map: Map<string, string>,
  ): FixtureDto[] {
    return list.map((f) => {
      const home = (f.homeTeamName ?? '').trim();
      const away = (f.awayTeamName ?? '').trim();
      let homeTeamLogoUrl = f.homeTeamLogoUrl;
      let awayTeamLogoUrl = f.awayTeamLogoUrl;
      /** Sempre que o mapa tiver logo (cadastro + S3), usa URL canônica — corrige JSON vazio ou URL de dev/localhost. */
      if (home) {
        const nk = normalizeTeamNameKeyForMerge(home);
        const url = nk ? map.get(nk) : undefined;
        if (url) homeTeamLogoUrl = url;
      }
      if (away) {
        const nk = normalizeTeamNameKeyForMerge(away);
        const url = nk ? map.get(nk) : undefined;
        if (url) awayTeamLogoUrl = url;
      }
      if (
        homeTeamLogoUrl === f.homeTeamLogoUrl &&
        awayTeamLogoUrl === f.awayTeamLogoUrl
      ) {
        return f;
      }
      return {
        ...f,
        homeTeamLogoUrl,
        awayTeamLogoUrl,
      };
    });
  }

  private async enrichFixturesWithVisitingLogosAsync(
    list: FixtureDto[],
  ): Promise<FixtureDto[]> {
    if (list.length === 0) return list;
    try {
      const map = await this.buildVisitingTeamLogoMergeMap();
      return this.enrichFixturesWithVisitingLogos(list, map);
    } catch {
      return list;
    }
  }

  /**
   * Jogadores do tenant pelo slug, agrupados por categoria. Só inclui jogadores com teamPage visível
   * (publicFields.teamPage !== false). Usado pelo módulo Times por Categorias na página pública.
   */
  async getPlayersForTenantSlug(slug: string): Promise<{
    categories: Array<{
      id: string;
      namePT: string;
      nameEN: string;
      players: Array<{
        id: string;
        name: string;
        photoUrl?: string | null;
        birthDate?: string | null;
        nationality?: string | null;
        height?: number | null;
        weight?: number | null;
        preferredFoot?: string | null;
        jerseyNumber?: number | null;
        position?: string | null;
        currentTeam?: string | null;
        socialMedia?: unknown;
        matchesPlayed?: number | null;
        goals?: number | null;
        assists?: number | null;
        yellowCards?: number | null;
        redCards?: number | null;
        highlights?: string[] | null;
        bioPT?: string | null;
        bioEN?: string | null;
      }>;
    }>;
  }> {
    // Busca case-insensitive para aceitar americano-fc, Americano-FC, etc.
    const slugNorm = slug.trim();
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug: { equals: slugNorm, mode: 'insensitive' } },
      select: { id: true },
    });
    if (!tenant) return { categories: [] };
    return this.getPlayersForTenantId(tenant.id);
  }

  /** Jogadores do tenant pelo ID — usado quando já temos o tenant da página. */
  async getPlayersForTenantId(tenantId: string): Promise<{
    categories: Array<{
      id: string;
      namePT: string;
      nameEN: string;
      players: Array<{
        id: string;
        name: string;
        photoUrl?: string | null;
        birthDate?: string | null;
        nationality?: string | null;
        height?: number | null;
        weight?: number | null;
        preferredFoot?: string | null;
        jerseyNumber?: number | null;
        position?: string | null;
        currentTeam?: string | null;
        socialMedia?: unknown;
        matchesPlayed?: number | null;
        goals?: number | null;
        assists?: number | null;
        yellowCards?: number | null;
        redCards?: number | null;
        highlights?: string[] | null;
        bioPT?: string | null;
        bioEN?: string | null;
      }>;
    }>;
  }> {
    const players = await this.prisma.player.findMany({
      where: { tenantId },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        photoUrl: true,
        birthDate: true,
        nationality: true,
        height: true,
        weight: true,
        preferredFoot: true,
        jerseyNumber: true,
        position: true,
        fieldPositionX: true,
        fieldPositionY: true,
        currentTeam: true,
        previousTeams: true,
        seasonHistory: true,
        socialMedia: true,
        matchesPlayed: true,
        goals: true,
        assists: true,
        yellowCards: true,
        redCards: true,
        highlights: true,
        bioPT: true,
        bioEN: true,
        category: true,
        publicFields: true,
      },
    });

    // Só jogadores visíveis na página do time (publicFields.teamPage !== false)
    const visible = players.filter((p) => {
      const pf = p.publicFields as Record<string, unknown> | null;
      if (!pf || typeof pf !== 'object') return true;
      const teamPage = pf.teamPage;
      return teamPage !== false;
    });

    const FIXTURE_CATEGORIES = [
      { value: 'principal', labelPT: 'Principal', labelEN: 'First Team' },
      { value: 'sub20', labelPT: 'Sub-20', labelEN: 'U-20' },
      { value: 'sub17', labelPT: 'Sub-17', labelEN: 'U-17' },
      { value: 'sub15', labelPT: 'Sub-15', labelEN: 'U-15' },
      { value: 'sub13', labelPT: 'Sub-13', labelEN: 'U-13' },
      { value: 'sub11', labelPT: 'Sub-11', labelEN: 'U-11' },
      { value: 'sub9', labelPT: 'Sub-9', labelEN: 'U-9' },
      { value: 'feminino', labelPT: 'Feminino', labelEN: "Women's" },
    ] as const;

    const byCategory = new Map<string, typeof visible>();
    for (const p of visible) {
      const cat = (p.category?.trim() || 'principal').toLowerCase();
      const list = byCategory.get(cat) ?? [];
      list.push(p);
      byCategory.set(cat, list);
    }

    const categories = FIXTURE_CATEGORIES.map((c) => ({
      id: c.value,
      namePT: c.labelPT,
      nameEN: c.labelEN,
      players: (byCategory.get(c.value) ?? []).map((pl) => ({
        id: pl.id,
        name: pl.name,
        photoUrl: pl.photoUrl,
        birthDate: pl.birthDate,
        nationality: pl.nationality,
        height: pl.height,
        weight: pl.weight,
        preferredFoot: pl.preferredFoot,
        jerseyNumber: pl.jerseyNumber,
        position: pl.position,
        fieldPosition: (pl.fieldPositionX != null || pl.fieldPositionY != null)
          ? { x: pl.fieldPositionX ?? 50, y: pl.fieldPositionY ?? 50 }
          : undefined,
        currentTeam: pl.currentTeam,
        previousTeams: pl.previousTeams,
        seasonHistory: pl.seasonHistory,
        socialMedia: pl.socialMedia,
        matchesPlayed: pl.matchesPlayed,
        goals: pl.goals,
        assists: pl.assists,
        yellowCards: pl.yellowCards,
        redCards: pl.redCards,
        highlights: Array.isArray(pl.highlights) ? (pl.highlights as string[]) : null,
        bioPT: pl.bioPT,
        bioEN: pl.bioEN,
      })),
    }));

    return { categories };
  }

  /** Dados públicos do tenant pelo slug (nome e logo para "nosso clube" nos módulos). */
  async getTenantBySlug(slug: string): Promise<{ id: string; name: string; slug: string; logoUrl: string | null } | null> {
    const slugNorm = slug.trim();
    const t = await this.prisma.tenant.findFirst({
      where: { slug: { equals: slugNorm, mode: 'insensitive' } },
      select: { id: true, name: true, slug: true, logoUrl: true },
    });
    if (!t) return null;
    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      logoUrl: t.logoUrl ?? null,
    };
  }

  /** Lista tenants públicos por tipo (club | company) para carrossel. Exclui grupo master; opcionalmente só com logo. */
  async getPublicTenantsForCarousel(
    type: 'club' | 'company',
    options?: { withLogoOnly?: boolean; limit?: number },
  ): Promise<PublicTenantCarouselItem[]> {
    const withLogoOnly = options?.withLogoOnly !== false;
    const limit = options?.limit && options.limit > 0 ? options.limit : 100;

    const tenants = await this.prisma.tenant.findMany({
      where: {
        slug: { not: 'bcg' },
        ...(withLogoOnly ? { logoUrl: { not: null } } : {}),
      },
      include: { kind: true },
      orderBy: { name: 'asc' },
      take: limit,
    });

    const filtered = tenants.filter((t) => {
      const isClub = isClubKind(t.kind?.name ?? null);
      return type === 'club' ? isClub : !isClub;
    });

    return filtered.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      logoUrl: t.logoUrl ?? null,
      websiteUrl: t.websiteUrl ?? null,
      city: t.city ?? null,
      country: t.country ?? null,
    }));
  }

  /**
   * Próximos jogos do tenant pelo ID. Usado pelo módulo Logística (evita dependência do slug).
   */
  async getFixturesForTenantId(tenantId: string): Promise<FixtureDto[]> {
    const page = await this.pagesService.findByTenantId(tenantId);
    return this.buildFixturesFromPage(page, tenantId);
  }

  /**
   * Próximos jogos do tenant (pelo slug). Usado pelos módulos "Próximos Jogos" e "Últimos Resultados".
   * Lê o bloco proximos_jogos da página; se dataSource=manual retorna lista manual;
   * se dataSource=sofascore usa tenant.sofascoreTeamId e aplica overrides.
   * Mescla placares de resultadosManuais (bloco ultimos_resultados) para jogos passados.
   */
  async getFixturesForTenantSlug(slug: string): Promise<FixtureDto[]> {
    const page = await this.pagesService.findByTenantSlug(slug);
    const tenant = page?.tenantId
      ? await this.prisma.tenant.findUnique({
          where: { id: page.tenantId },
          select: { id: true },
        })
      : await this.prisma.tenant.findFirst({
          where: { slug: { equals: slug.trim(), mode: 'insensitive' } },
          select: { id: true },
        });
    return this.buildFixturesFromPage(page, tenant?.id ?? '');
  }

  /**
   * Próximos/últimos jogos a partir do conteúdo do evento (blocos proximos_eventos ou proximos_jogos).
   * GET /public/events/:slug/fixtures
   */
  async getFixturesForEventSlug(slug: string): Promise<FixtureDto[]> {
    const slugNorm = slug.trim();
    const event = await this.prisma.event.findFirst({
      where: {
        slug: { equals: slugNorm, mode: 'insensitive' },
        status: 'published',
      },
      select: {
        content: true,
        tenantId: true,
        name: true,
        fixtureCategory: true,
      },
    });
    const blocks = (event?.content as { blocks?: unknown[] } | null)?.blocks;
    if (!Array.isArray(blocks) || blocks.length === 0) {
      return [];
    }
    const list = await this.buildFixturesFromBlocks(
      blocks,
      event?.tenantId ?? '',
    );
    const eventName = (event?.name ?? '').trim();
    const lockCat = (event?.fixtureCategory ?? '').trim() || null;
    let mapped = list.map((f) => ({
      ...f,
      competitionName: (f.competitionName ?? '').trim() || eventName,
    }));
    if (lockCat) {
      mapped = mapped.filter(
        (f) => (f.category ?? 'principal') === lockCat,
      );
    }
    return mapped;
  }

  private async buildFixturesFromPage(
    page: PageResponseDto | null,
    tenantIdForSofascore: string,
  ): Promise<FixtureDto[]> {
    const blocks = page?.content?.blocks;
    if (!Array.isArray(blocks) || blocks.length === 0) {
      return [];
    }
    return this.buildFixturesFromBlocks(blocks, tenantIdForSofascore);
  }

  private matchBlockType(
    b: { type?: string },
    allowed: readonly string[],
  ): boolean {
    const t = String(b.type ?? '').toLowerCase();
    return allowed.includes(t);
  }

  private async buildFixturesFromBlocks(
    blocks: unknown[],
    tenantIdForSofascore: string,
  ): Promise<FixtureDto[]> {
    const block = blocks.find(
      (b) =>
        this.matchBlockType(b as { type?: string }, [
          'proximos_jogos',
          'proximos_eventos',
        ]),
    ) as { config?: Record<string, unknown> } | undefined;
    if (!block?.config) {
      return [];
    }

    const resultadosBlock = blocks.find((b) =>
      this.matchBlockType(b as { type?: string }, [
        'ultimos_resultados',
        'ultimos_eventos',
      ]),
    ) as { config?: Record<string, unknown> } | undefined;
    const resultadosManuais =
      (resultadosBlock?.config as Record<string, unknown>)?.resultadosManuais as
        | Record<string, { homeScore?: number; awayScore?: number }>
        | undefined;

    const config = block.config as Record<string, unknown>;
    const dataSource = (config.proximosJogosDataSource as string) || 'manual';
    // api_futebol e football_data removidos — treat as manual
    const effectiveSource =
      dataSource === 'sofascore' ? 'sofascore' : 'manual';

    if (effectiveSource === 'manual') {
      const manual = (config.proximosJogosManualFixtures as FixtureDto[]) ?? [];
      const list = Array.isArray(manual)
        ? manual
            .filter((f) => f && f.startISO)
            .map((f, i) => {
              const extId =
                (f as { id?: string }).id ??
                f.externalId ??
                `manual-${i}-${f.startISO}`;
              const manualScore = resultadosManuais?.[extId];
              return {
                externalId: extId,
                startISO: f.startISO,
                status: (f.status as FixtureDto['status']) ?? 'SCHEDULED',
                competitionName: f.competitionName ?? '',
                competitionLogoUrl: f.competitionLogoUrl,
                venueName: f.venueName,
                homeTeamName: f.homeTeamName ?? '',
                awayTeamName: f.awayTeamName ?? '',
                watchUrl: f.watchUrl,
                ticketUrl: f.ticketUrl,
                featured: f.featured,
                category: (f as { category?: string }).category ?? 'principal',
                isOurTeamHome: f.isOurTeamHome,
                homeTeamLogoUrl: f.homeTeamLogoUrl,
                awayTeamLogoUrl: f.awayTeamLogoUrl,
                homeScore: manualScore?.homeScore,
                awayScore: manualScore?.awayScore,
              };
            })
            .sort(
              (a, b) =>
                new Date(a.startISO).getTime() - new Date(b.startISO).getTime(),
            )
        : [];
      return this.enrichFixturesWithVisitingLogosAsync(list);
    }

    // effectiveSource === 'sofascore'
    const tenant = tenantIdForSofascore
      ? await this.prisma.tenant.findUnique({
          where: { id: tenantIdForSofascore },
          select: { sofascoreTeamId: true },
        })
      : null;
    const teamId = tenant?.sofascoreTeamId?.trim();
    if (!teamId) {
      return [];
    }

    let list: NormalizedFixture[] = [];
    try {
      const [upcoming, last] = await Promise.all([
        this.sofaScore.getUpcomingByTeamId(teamId, { daysAhead: 60, maxItems: 30 }),
        this.sofaScore.getLastByTeamId(teamId, { maxItems: 30 }),
      ]);
      const byId = new Map<string, NormalizedFixture>();
      last.forEach((f) => byId.set(f.externalId, f));
      upcoming.forEach((f) => byId.set(f.externalId, f));
      list = Array.from(byId.values()).sort(
        (a, b) => new Date(a.startISO).getTime() - new Date(b.startISO).getTime(),
      );
      if (list.length === 0) {
        console.warn(`[fixtures] SofaScore retornou 0 jogos para teamId=${teamId}`);
      }
    } catch (err) {
      console.warn(`[fixtures] erro SofaScore teamId=${teamId}:`, err);
      list = [];
    }

    const overrides = (config.proximosJogosOverrides as FixtureOverrides) ?? {};
    const featuredId = Object.entries(overrides).find(
      ([_, o]) => o?.featured === true,
    )?.[0];

    const out: FixtureDto[] = list
      .filter((f) => !overrides[f.externalId]?.hidden)
      .map((f) => {
        const o = overrides[f.externalId];
        const inferred = inferCategoryFromCompetition(f.competitionName);
        const manualScore = resultadosManuais?.[f.externalId];
        return {
          externalId: f.externalId,
          startISO: f.startISO,
          status: f.status,
          competitionName: f.competitionName,
          competitionLogoUrl: o?.competitionLogoUrl ?? f.competitionLogoUrl,
          venueName: o?.venueName ?? f.venueName,
          homeTeamName: f.homeTeamName,
          awayTeamName: f.awayTeamName,
          watchUrl: o?.watchUrl ?? f.watchUrl,
          ticketUrl: o?.ticketUrl ?? f.ticketUrl,
          featured: o?.featured ?? (featuredId === f.externalId),
          category: o?.category ?? inferred,
          isOurTeamHome: f.isOurTeamHome,
          homeTeamLogoUrl: f.homeTeamLogoUrl,
          awayTeamLogoUrl: f.awayTeamLogoUrl,
          homeScore: manualScore?.homeScore ?? (f as { homeScore?: number }).homeScore,
          awayScore: manualScore?.awayScore ?? (f as { awayScore?: number }).awayScore,
        };
      })
      .sort(
        (a, b) =>
          new Date(a.startISO).getTime() - new Date(b.startISO).getTime(),
      );

    return this.enrichFixturesWithVisitingLogosAsync(out);
  }

  async getPortfolio(): Promise<PortfolioItemDto[]> {
    const tenants = await this.prisma.tenant.findMany({
      include: { kind: true },
      orderBy: { name: 'asc' },
    });
    return tenants.map((t) => {
      const type = isClubKind(t.kind?.name ?? null) ? 'club' : 'company';
      const subdomain = t.slug;
      const websiteUrl =
        type === 'club'
          ? `https://${subdomain}.bostoncitygroup.biz`
          : null;
      return {
        id: t.id,
        type,
        name: t.name,
        slug: t.slug,
        shortDescription: null,
        logoUrl: t.logoUrl ?? null,
        websiteUrl,
        email: null,
        phone: null,
        location: null,
        address: t.address ?? null,
        contactName: t.contactName ?? null,
        contactPhone: t.contactPhone ?? null,
        segment: t.kind?.name ?? null,
        subdomain,
        isActive: true,
      } satisfies PortfolioItemDto;
    });
  }
}
