import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const SLUG = 'home';
const GROUP_MASTER_SLUG = 'bcg';

export type HomeContentBlockDto = {
  id: string;
  type: string;
  sortOrder: number;
  config?: Record<string, unknown>;
};

export type HomeContentDto = {
  pt?: Record<string, unknown>;
  en?: Record<string, unknown>;
  images?: { hero?: string; what?: string; founder?: string; cta?: string };
  blocks?: HomeContentBlockDto[];
};

/** Considera "clube" se o tipo contiver futebol/clube/football. */
function isClubKind(kindName: string | null): boolean {
  if (!kindName) return false;
  const k = kindName.toLowerCase();
  return k.includes('futebol') || k.includes('clube') || k.includes('football');
}

/** Contadores padrão do Presença Global (para garantir que Empresas e todos os 5 existam ao enriquecer). */
const DEFAULT_PRESENCE_COUNTER_KEYS = [
  { key: 'clubs', labelPT: 'Clubes', labelEN: 'Clubs' },
  { key: 'companies', labelPT: 'Empresas', labelEN: 'Companies' },
  { key: 'athletes', labelPT: 'Atletas', labelEN: 'Athletes' },
  { key: 'projects', labelPT: 'Projetos', labelEN: 'Projects' },
  { key: 'countries', labelPT: 'Países', labelEN: 'Countries' },
] as const;

@Injectable()
export class HomeContentService {
  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<HomeContentDto> {
    const row = await this.prisma.homeContent.findUnique({
      where: { slug: SLUG },
    });
    if (!row || !row.content || typeof row.content !== 'object') {
      return {};
    }
    return row.content as HomeContentDto;
  }

  /**
   * Enriquece os blocos com contadores e localizações do cadastro (tenants).
   * Atualiza o bloco global_presence com clubsCount, companiesCount, countries e locations.
   * Usado por getPublic() e por getGroupHomePageShape().
   */
  async enrichBlocksWithGlobalPresence(
    blocks: HomeContentBlockDto[] | undefined,
  ): Promise<HomeContentBlockDto[]> {
    if (!Array.isArray(blocks) || blocks.length === 0) return blocks ?? [];

    const tenants = await this.prisma.tenant.findMany({
      where: { slug: { not: GROUP_MASTER_SLUG } },
      select: {
        id: true,
        name: true,
        kind: true,
        lat: true,
        lng: true,
        city: true,
        country: true,
        websiteUrl: true,
        logoUrl: true,
      },
    });

    let clubsCount = 0;
    let companiesCount = 0;
    const locationsWithCoords: Array<{
      id: string;
      name: string;
      type: 'Club' | 'Company';
      city: string;
      country: string;
      lat: number;
      lng: number;
      logoMediaId?: string;
      websiteUrl?: string;
      active: boolean;
    }> = [];

    for (const t of tenants) {
      const kindName = t.kind?.name ?? null;
      if (isClubKind(kindName)) clubsCount++;
      else companiesCount++;

      if (t.lat != null && t.lng != null) {
        locationsWithCoords.push({
          id: t.id,
          name: t.name,
          type: isClubKind(kindName) ? 'Club' : 'Company',
          city: t.city ?? '',
          country: t.country ?? '',
          lat: t.lat,
          lng: t.lng,
          logoMediaId: t.logoUrl ?? undefined,
          websiteUrl: t.websiteUrl ?? undefined,
          active: true,
        });
      }
    }

    const result = [...blocks];
    const idx = result.findIndex((b) => b.type === 'global_presence');
    if (idx >= 0 && result[idx].config) {
      const config = { ...result[idx].config } as Record<string, unknown>;
      const existingCounters = Array.isArray(config.counters) ? (config.counters as Record<string, unknown>[]) : [];
      const byKey = new Map<string, Record<string, unknown>>();
      for (const c of existingCounters) {
        const k = (c.key as string)?.trim();
        if (k) byKey.set(k === 'empresas' ? 'companies' : k, { ...c });
      }
      const uniqueCountries = new Set(locationsWithCoords.map((l) => (l.country || '').trim()).filter(Boolean)).size;
      const updatedCounters = DEFAULT_PRESENCE_COUNTER_KEYS.map((def) => {
        const existing = byKey.get(def.key);
        let value = typeof existing?.value === 'number' ? existing.value : 0;
        if (def.key === 'clubs') value = clubsCount;
        if (def.key === 'companies') value = companiesCount;
        if (def.key === 'countries') value = uniqueCountries;
        return {
          key: def.key,
          labelPT: existing?.labelPT ?? def.labelPT,
          labelEN: existing?.labelEN ?? def.labelEN,
          value,
          enabled: existing?.enabled !== false,
        };
      });
      config.counters = updatedCounters;
      config.locations = locationsWithCoords;
      result[idx] = { ...result[idx], config };
    }
    return result;
  }

  /**
   * Home content para a página pública: enriquece o bloco global_presence com
   * contadores (clube/empresas do cadastro) e localizações (tenants com lat/lng).
   */
  async getPublic(): Promise<HomeContentDto> {
    const content = await this.get();
    const blocks = await this.enrichBlocksWithGlobalPresence(content.blocks);
    return { ...content, blocks };
  }

  async update(dto: HomeContentDto): Promise<HomeContentDto> {
    const content = (dto && typeof dto === 'object') ? dto : {};
    await this.prisma.homeContent.upsert({
      where: { slug: SLUG },
      create: { slug: SLUG, content: content as object },
      update: { content: content as object },
    });
    return this.get();
  }
}
