import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildFmfCompetitionCatalog,
  FMF_COMPETITION_CATALOG_KEY,
  isFmfCatalogStale,
  parseStoredFmfCompetitionCatalog,
  type FmfCompetitionCatalog,
} from './fmf-competition-catalog.util';
import { toOperationalCategory } from './fmf-operational-category.util';
import {
  catalogEntryMatchesOperationalCategoriesAfterProbe,
  filterCatalogEntriesForOperationalDiscovery,
} from './fmf-bounded-discovery.util';
import {
  discoverClubCompetitionsFromCatalog,
  inferPresetFromCompetitionContext,
  type FmfSyncClubRef,
} from './fmf-catalog-club-discovery.util';
import type { FmfScraperStore } from './fmf-scraper.service';
import {
  FMF_SCRAPER_PRESET_EXTENSIONS_KEY,
  loadFmfPresetExtensionMap,
  mergeFmfPresetMaps,
} from './fmf-preset-registry.util';
import { FMF_SCRAPER_PRESETS, fmfProxJogosUrl, type FmfScraperPreset } from './fmf-scraper.presets';
import {
  FMF_SYNC_TENANT_DEFAULTS,
  FMF_SYNC_TENANT_SLUGS,
  unionOperationalCategoriesFromTenants,
} from './fmf-sync-tenants.config';

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

@Injectable()
export class FmfCatalogDiscoveryService {
  private readonly log = new Logger(FmfCatalogDiscoveryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async loadCatalog(): Promise<FmfCompetitionCatalog | null> {
    const row = await this.prisma.integrationConfig.findUnique({
      where: { key: FMF_COMPETITION_CATALOG_KEY },
    });
    return parseStoredFmfCompetitionCatalog(row?.config);
  }

  async refreshCatalogIfStale(force = false): Promise<FmfCompetitionCatalog> {
    const existing = await this.loadCatalog();
    if (!force && existing && !isFmfCatalogStale(existing)) {
      return existing;
    }

    const sourceUrl = fmfProxJogosUrl(2);
    const res = await fetch(sourceUrl, {
      headers: {
        'user-agent': 'BCGPlatform/1.0 (catalogo competicoes FMF)',
        'accept-language': 'pt-BR,pt;q=0.9',
      },
    });
    if (!res.ok) throw new Error(`FMF catálogo HTTP ${res.status}`);
    const html = await res.text();
    const catalog = buildFmfCompetitionCatalog(html, sourceUrl);

    await this.prisma.integrationConfig.upsert({
      where: { key: FMF_COMPETITION_CATALOG_KEY },
      create: { key: FMF_COMPETITION_CATALOG_KEY, config: catalog as object },
      update: { config: catalog as object },
    });

    this.log.log(`FMF catálogo atualizado: ${catalog.entries.length} entradas`);
    return catalog;
  }

  private syncClubs(): FmfSyncClubRef[] {
    return FMF_SYNC_TENANT_SLUGS.map((slug) => ({
      slug,
      name: slug === 'villa-nova-saf' ? 'Villa Nova SAF' : 'Boston City FC Brasil',
      aliases: [...FMF_SYNC_TENANT_DEFAULTS[slug].fmfTeamNames],
    }));
  }

  private knownFmfDs(extensions: Record<string, FmfScraperPreset>): Set<number> {
    const merged = mergeFmfPresetMaps(extensions);
    return new Set(Object.values(merged).map((p) => p.fmfD));
  }

  private async loadStoreSnapshot(): Promise<FmfScraperStore> {
    const row = await this.prisma.integrationConfig.findUnique({
      where: { key: 'fmf_scraper_data' },
    });
    const config = row?.config;
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      return { updatedAt: '', lastRunOk: false, categories: {} };
    }
    return config as FmfScraperStore;
  }

  /**
   * Varredura de participação por clube — apenas em importação completa (não em request HTTP).
   * Dedup por assinatura de fixtures; ignora d= espelhados.
   */
  private async loadSyncTenantOperationalCategories(): Promise<string[]> {
    const rows = await this.prisma.tenant.findMany({
      where: { slug: { in: [...FMF_SYNC_TENANT_SLUGS] } },
      select: { categories: true },
    });
    return unionOperationalCategoriesFromTenants(rows);
  }

  async discoverAndMergeExtensions(
    extensions: Record<string, FmfScraperPreset>,
    options: {
      season?: number;
      delayMs?: number;
      /** Categorias operacionais selecionadas nos tenants FMF — direciona a varredura. */
      tenantOperationalCategories?: string[];
    } = {},
  ): Promise<Record<string, FmfScraperPreset>> {
    const season = options.season ?? new Date().getFullYear();
    const delayMs = Math.max(800, options.delayMs ?? 1200);
    const catalog = await this.refreshCatalogIfStale(false);
    const knownDs = this.knownFmfDs(extensions);
    const mergedPresets = mergeFmfPresetMaps(extensions);
    const clubs = this.syncClubs();

    const tenantOps =
      options.tenantOperationalCategories?.length
        ? options.tenantOperationalCategories.map(toOperationalCategory).filter(Boolean)
        : await this.loadSyncTenantOperationalCategories();
    const opsSet = new Set(tenantOps);

    const htmlByD = new Map<number, string>();
    const catalogScoped = filterCatalogEntriesForOperationalDiscovery(
      catalog.entries,
      tenantOps,
    );
    const candidates = catalogScoped.filter((e) => !knownDs.has(e.fmfD));

    if (opsSet.size > 0) {
      this.log.log(
        `FMF discovery category-driven: ${[...opsSet].join(', ')} — ${catalogScoped.length} competições no catálogo, ${candidates.length} d= novos`,
      );
    }

    for (let i = 0; i < candidates.length; i++) {
      const entry = candidates[i]!;
      if (i > 0) await sleep(delayMs);
      try {
        const res = await fetch(entry.url, {
          headers: {
            'user-agent': 'BCGPlatform/1.0 (descoberta participacao FMF)',
            'accept-language': 'pt-BR,pt;q=0.9',
          },
        });
        if (!res.ok) continue;
        htmlByD.set(entry.fmfD, await res.text());
      } catch (e) {
        this.log.warn(
          `FMF discovery d=${entry.fmfD}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    const probedEntries = catalogScoped.filter((entry) => htmlByD.has(entry.fmfD));
    const discovered = discoverClubCompetitionsFromCatalog(
      probedEntries,
      clubs,
      htmlByD,
      season,
    ).filter((row) => {
      if (opsSet.size === 0) return true;
      const html = htmlByD.get(row.fmfD) ?? '';
      return catalogEntryMatchesOperationalCategoriesAfterProbe(
        row.catalogEntry,
        html,
        tenantOps,
      );
    });

    const out = { ...extensions };
    let added = 0;
    for (const row of discovered) {
      if (knownDs.has(row.fmfD)) continue;
      const presetTakenByOtherD = Object.values(mergedPresets).some(
        (p) => p.fmfD === row.fmfD,
      );
      if (presetTakenByOtherD) continue;
      if (out[row.presetKey] && out[row.presetKey]!.fmfD !== row.fmfD) {
        this.log.warn(
          `FMF discovery: preset ${row.presetKey} já mapeado para d=${out[row.presetKey]!.fmfD}, ignorando d=${row.fmfD}`,
        );
        continue;
      }
      const preset = inferPresetFromCompetitionContext(row.fmfD, {
        officialLabel: row.officialLabel,
        catalogEntry: row.catalogEntry,
        season,
      });
      if (FMF_SCRAPER_PRESETS[preset.key as keyof typeof FMF_SCRAPER_PRESETS]) {
        continue;
      }
      if (mergedPresets[preset.key] && mergedPresets[preset.key]!.fmfD === preset.fmfD) {
        continue;
      }
      out[preset.key] = preset as unknown as FmfScraperPreset;
      knownDs.add(row.fmfD);
      added++;
      this.log.log(
        `FMF discovery: ${preset.key} d=${row.fmfD} (${row.villaFixtureCount} jogos ${season})`,
      );
    }

    if (added > 0) {
      await this.prisma.integrationConfig.upsert({
        where: { key: FMF_SCRAPER_PRESET_EXTENSIONS_KEY },
        create: { key: FMF_SCRAPER_PRESET_EXTENSIONS_KEY, config: out as object },
        update: { config: out as object },
      });
    }

    return out;
  }

  async loadExtensionsWithDiscovery(
    discover: boolean,
  ): Promise<Record<string, FmfScraperPreset>> {
    let extensions = await loadFmfPresetExtensionMap(this.prisma);
    if (!discover) return extensions;
    return this.discoverAndMergeExtensions(extensions);
  }
}
