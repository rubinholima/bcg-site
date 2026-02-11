import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { PortfolioItemDto } from './dto/portfolio-item.dto';
import type { FixtureDto } from './dto/fixture.dto';
import {
  SofaScoreService,
  type NormalizedFixture,
} from './sofascore.service';
import { PagesService } from '../pages/pages.service';

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
  ) {}

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
   * Próximos jogos do tenant (pelo slug). Usado pelo módulo "Próximos Jogos" na página do clube.
   * Lê o bloco proximos_jogos da página; se dataSource=manual retorna lista manual;
   * se dataSource=sofascore usa tenant.sofascoreTeamId e aplica overrides.
   */
  async getFixturesForTenantSlug(slug: string): Promise<FixtureDto[]> {
    const page = await this.pagesService.findByTenantSlug(slug);
    if (!page?.content?.blocks?.length) {
      console.warn(`[fixtures] página não encontrada ou sem blocos para slug=${slug}`);
      return [];
    }

    const block = page.content.blocks.find(
      (b) => String(b.type).toLowerCase() === 'proximos_jogos',
    );
    if (!block?.config) {
      console.warn(`[fixtures] bloco proximos_jogos não encontrado na página slug=${slug}`);
      return [];
    }

    const config = block.config as Record<string, unknown>;
    const dataSource = (config.proximosJogosDataSource as string) || 'manual';
    // api_futebol e football_data removidos — treat as manual
    const effectiveSource =
      dataSource === 'sofascore' ? 'sofascore' : 'manual';

    if (effectiveSource === 'manual') {
      const manual = (config.proximosJogosManualFixtures as FixtureDto[]) ?? [];
      return Array.isArray(manual)
        ? manual
            .filter((f) => f && f.startISO)
            .map((f) => ({
              externalId: f.externalId ?? `manual-${f.startISO}`,
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
            }))
            .sort(
              (a, b) =>
                new Date(a.startISO).getTime() - new Date(b.startISO).getTime(),
            )
        : [];
    }

    // effectiveSource === 'sofascore'
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: { sofascoreTeamId: true },
    });
    const teamId = tenant?.sofascoreTeamId?.trim();
    if (!teamId) {
      console.warn(`[fixtures] tenant slug=${slug} sem sofascoreTeamId configurado`);
      return [];
    }

    let list: NormalizedFixture[] = [];
    try {
      list = await this.sofaScore.getUpcomingByTeamId(teamId, {
        daysAhead: 60,
        maxItems: 30,
      });
      if (list.length === 0) {
        console.warn(`[fixtures] SofaScore retornou 0 jogos para teamId=${teamId} (slug=${slug})`);
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
        };
      })
      .sort(
        (a, b) =>
          new Date(a.startISO).getTime() - new Date(b.startISO).getTime(),
      );

    return out;
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
