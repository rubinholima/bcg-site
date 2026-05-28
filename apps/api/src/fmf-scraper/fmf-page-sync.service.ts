import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PagesService, type PageContentDto } from '../pages/pages.service';
import { S3Service } from '../s3/s3.service';
import { MediaMetaService } from '../media/media-meta.service';
import { isClubKind } from '../public/public.service';
import {
  buildVisitingTeamLogoUrlByMergeKey,
  mediaKeyFromStoredUrl,
  normalizeTeamNameKeyForMerge,
} from '../public/visiting-team-logo-merge.util';
import {
  FMF_SCRAPER_PRESET_KEYS,
  FMF_SCRAPER_PRESETS,
  type FmfScraperPresetKey,
} from './fmf-scraper.presets';
import { FmfScraperService, type FmfScraperStore, type FmfStandingsRow } from './fmf-scraper.service';
import type { FmfParsedMatch } from './fmf-proxjogos.parser';
import { isFmfTeamMatch } from './fmf-team-match.util';

const SYNC_CONFIG_KEY = 'fmf_scraper_sync';
const FMF_FIXTURE_CATEGORIES = new Set(
  FMF_SCRAPER_PRESET_KEYS.map((k) => FMF_SCRAPER_PRESETS[k].fixtureCategory),
);

export type FmfScraperSyncTenantConfig = {
  tenantId: string;
  enabled?: boolean;
  /** Nomes como aparecem na FMF (ex.: AMÉRICA). Se vazio, usa tenant.name. */
  fmfTeamNames?: string[];
  /** Presets a sincronizar; se vazio, todos importados. */
  presetKeys?: FmfScraperPresetKey[];
};

export type FmfScraperSyncConfig = {
  lastSyncAt?: string;
  lastSyncError?: string | null;
  lastResults?: FmfPageSyncResult;
  tenants?: FmfScraperSyncTenantConfig[];
};

export type FmfPageSyncTenantResult = {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  ok: boolean;
  error?: string;
  skipped?: string;
  fixturesUpdated: number;
  resultadosUpdated: number;
  tabelaRowsUpdated: number;
  missingLogos: string[];
  categoriesSynced: string[];
};

export type FmfPageSyncResult = {
  syncedAt: string;
  tenants: FmfPageSyncTenantResult[];
};

export type FmfSyncCandidate = {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  hasPage: boolean;
  fmfTeamNames: string[];
  matchCountByPreset: Partial<Record<FmfScraperPresetKey, number>>;
  totalMatches: number;
  missingLogosPreview: string[];
};

type ManualFixture = {
  externalId: string;
  startISO: string;
  status: 'SCHEDULED' | 'LIVE' | 'FINAL';
  competitionName: string;
  venueName?: string;
  homeTeamName: string;
  awayTeamName: string;
  category: string;
  isOurTeamHome?: boolean;
  homeTeamLogoUrl?: string;
  awayTeamLogoUrl?: string;
};

type TabelaRow = {
  competicao?: string;
  categoria?: string;
  temporada?: string;
  time: string;
  logoTime?: string;
  pontos: number;
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  golsMarcados: number;
  golsSofridos: number;
  saldoGols?: number;
};

@Injectable()
export class FmfPageSyncService {
  private readonly log = new Logger(FmfPageSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pages: PagesService,
    private readonly s3: S3Service,
    private readonly mediaMeta: MediaMetaService,
    private readonly fmfScraper: FmfScraperService,
  ) {}

  async getSyncConfig(): Promise<FmfScraperSyncConfig> {
    const row = await this.prisma.integrationConfig.findUnique({
      where: { key: SYNC_CONFIG_KEY },
    });
    if (!row?.config || typeof row.config !== 'object') return {};
    return row.config as FmfScraperSyncConfig;
  }

  async updateSyncConfig(patch: FmfScraperSyncConfig): Promise<FmfScraperSyncConfig> {
    const current = await this.getSyncConfig();
    const next: FmfScraperSyncConfig = { ...current, ...patch };
    await this.prisma.integrationConfig.upsert({
      where: { key: SYNC_CONFIG_KEY },
      create: { key: SYNC_CONFIG_KEY, config: next as object },
      update: { config: next as object },
    });
    return next;
  }

  async getSyncCandidates(): Promise<FmfSyncCandidate[]> {
    const store = await this.loadStore();
    const logoMap = await this.buildLogoMap();
    const clubs = await this.listClubTenants();
    const syncConfig = await this.getSyncConfig();

    return clubs.map((t) => {
      const cfg = syncConfig.tenants?.find((c) => c.tenantId === t.id);
      const aliases = cfg?.fmfTeamNames ?? [];
      const presetKeys = this.resolvePresetKeys(cfg, store);
      const { matches, missingLogos } = this.collectTenantData(
        store,
        presetKeys,
        t.name,
        aliases,
        t.logoUrl,
        logoMap,
      );

      const matchCountByPreset: Partial<Record<FmfScraperPresetKey, number>> = {};
      for (const m of matches) {
        const pk = m.presetKey;
        matchCountByPreset[pk] = (matchCountByPreset[pk] ?? 0) + 1;
      }

      return {
        tenantId: t.id,
        tenantName: t.name,
        tenantSlug: t.slug,
        hasPage: !!t.pageId,
        fmfTeamNames: aliases.length > 0 ? aliases : [t.name],
        matchCountByPreset,
        totalMatches: matches.length,
        missingLogosPreview: [...missingLogos].sort((a, b) => a.localeCompare(b, 'pt-BR')),
      };
    });
  }

  async syncPages(options: {
    tenantId?: string;
    all?: boolean;
    fmfTeamNames?: string[];
  } = {}): Promise<FmfPageSyncResult> {
    const store = await this.loadStore();
    if (!store.updatedAt) {
      throw new Error('Nenhum dado FMF importado. Execute a importação antes de aplicar no site.');
    }

    const logoMap = await this.buildLogoMap();
    const clubs = await this.listClubTenants();
    const syncConfig = await this.getSyncConfig();

    let targets = clubs;
    if (options.tenantId) {
      targets = clubs.filter((t) => t.id === options.tenantId);
      if (targets.length === 0) {
        throw new Error('Clube não encontrado ou não é um tenant de futebol.');
      }
    } else if (!options.all) {
      throw new Error('Informe tenantId ou all=true.');
    }

    const results: FmfPageSyncTenantResult[] = [];

    for (const tenant of targets) {
      const cfg = syncConfig.tenants?.find((c) => c.tenantId === tenant.id);
      if (cfg?.enabled === false) {
        results.push({
          tenantId: tenant.id,
          tenantName: tenant.name,
          tenantSlug: tenant.slug,
          ok: true,
          skipped: 'Desabilitado na configuração de sync.',
          fixturesUpdated: 0,
          resultadosUpdated: 0,
          tabelaRowsUpdated: 0,
          missingLogos: [],
          categoriesSynced: [],
        });
        continue;
      }

      const aliases =
        options.tenantId && options.fmfTeamNames?.length
          ? options.fmfTeamNames
          : (cfg?.fmfTeamNames ?? []);

      if (!tenant.pageId) {
        results.push({
          tenantId: tenant.id,
          tenantName: tenant.name,
          tenantSlug: tenant.slug,
          ok: false,
          error: 'Clube sem página cadastrada.',
          fixturesUpdated: 0,
          resultadosUpdated: 0,
          tabelaRowsUpdated: 0,
          missingLogos: [],
          categoriesSynced: [],
        });
        continue;
      }

      const presetKeys = this.resolvePresetKeys(cfg, store);
      const collected = this.collectTenantData(
        store,
        presetKeys,
        tenant.name,
        aliases,
        tenant.logoUrl,
        logoMap,
      );

      if (collected.matches.length === 0) {
        results.push({
          tenantId: tenant.id,
          tenantName: tenant.name,
          tenantSlug: tenant.slug,
          ok: true,
          skipped: `Nenhuma partida FMF encontrada para "${tenant.name}". Verifique o nome na FMF ou cadastre aliases.`,
          fixturesUpdated: 0,
          resultadosUpdated: 0,
          tabelaRowsUpdated: 0,
          missingLogos: [...collected.missingLogos],
          categoriesSynced: [],
        });
        continue;
      }

      try {
        const page = await this.pages.findOne(tenant.pageId);
        const content = page.content ?? { blocks: [] };
        const blocks = [...(content.blocks ?? [])];

        const fixtures = collected.matches.map((m) => m.fixture);
        const resultadosManuais = collected.resultadosManuais;
        const tabelaRows = collected.tabelaRows;
        const categoriesSynced = [...new Set(fixtures.map((f) => f.category))];

        const hasProximos = blocks.some((b) => b.type === 'proximos_jogos');
        const hasUltimos = blocks.some((b) => b.type === 'ultimos_resultados');
        const hasTabela = blocks.some((b) => b.type === 'tabela');

        if (!hasProximos && !hasUltimos && !hasTabela) {
          results.push({
            tenantId: tenant.id,
            tenantName: tenant.name,
            tenantSlug: tenant.slug,
            ok: false,
            error:
              'Página sem módulos Próximos jogos, Últimos resultados ou Tabela. Adicione os blocos no editor.',
            fixturesUpdated: 0,
            resultadosUpdated: 0,
            tabelaRowsUpdated: 0,
            missingLogos: [...collected.missingLogos],
            categoriesSynced: [],
          });
          continue;
        }

        const nextBlocks = blocks.map((b) => {
          if (b.type === 'proximos_jogos' && hasProximos) {
            const prev = (b.config ?? {}) as Record<string, unknown>;
            const kept = ((prev.proximosJogosManualFixtures as ManualFixture[]) ?? []).filter(
              (f) => !FMF_FIXTURE_CATEGORIES.has(String(f.category ?? '')),
            );
            return {
              ...b,
              config: {
                ...prev,
                proximosJogosDataSource: 'manual',
                proximosJogosManualFixtures: [...kept, ...fixtures].sort(
                  (a, b) => new Date(a.startISO).getTime() - new Date(b.startISO).getTime(),
                ),
              },
            };
          }
          if (b.type === 'ultimos_resultados' && hasUltimos) {
            const prev = (b.config ?? {}) as Record<string, unknown>;
            const oldRes =
              (prev.resultadosManuais as Record<string, { homeScore: number; awayScore: number }>) ??
              {};
            const fmfIds = new Set(Object.keys(resultadosManuais));
            const keptRes = Object.fromEntries(
              Object.entries(oldRes).filter(([id]) => !id.startsWith('fmf-')),
            );
            for (const [id, score] of Object.entries(resultadosManuais)) {
              if (fmfIds.has(id)) keptRes[id] = score;
            }
            return {
              ...b,
              config: {
                ...prev,
                resultadosManuais: keptRes,
              },
            };
          }
          if (b.type === 'tabela' && hasTabela) {
            const prev = (b.config ?? {}) as Record<string, unknown>;
            const existing = ((prev.tabelaManualRows as TabelaRow[]) ?? []).filter(
              (r) => !FMF_FIXTURE_CATEGORIES.has(String(r.categoria ?? '')),
            );
            return {
              ...b,
              config: {
                ...prev,
                tabelaDataSource: 'manual',
                tabelaManualRows: [...existing, ...tabelaRows],
              },
            };
          }
          return b;
        });

        await this.pages.update(tenant.pageId, {
          content: { ...content, blocks: nextBlocks } as PageContentDto,
        });

        results.push({
          tenantId: tenant.id,
          tenantName: tenant.name,
          tenantSlug: tenant.slug,
          ok: true,
          fixturesUpdated: fixtures.length,
          resultadosUpdated: Object.keys(resultadosManuais).length,
          tabelaRowsUpdated: tabelaRows.length,
          missingLogos: [...collected.missingLogos].sort((a, b) =>
            a.localeCompare(b, 'pt-BR'),
          ),
          categoriesSynced,
        });

        this.log.log(
          `FMF sync ${tenant.slug}: ${fixtures.length} jogos, ${collected.missingLogos.size} logos ausentes`,
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        results.push({
          tenantId: tenant.id,
          tenantName: tenant.name,
          tenantSlug: tenant.slug,
          ok: false,
          error: msg,
          fixturesUpdated: 0,
          resultadosUpdated: 0,
          tabelaRowsUpdated: 0,
          missingLogos: [...collected.missingLogos],
          categoriesSynced: [],
        });
      }
    }

    const result: FmfPageSyncResult = {
      syncedAt: new Date().toISOString(),
      tenants: results,
    };

    await this.updateSyncConfig({
      lastSyncAt: result.syncedAt,
      lastSyncError: results.some((r) => !r.ok && !r.skipped) ? 'Alguns clubes falharam' : null,
      lastResults: result,
    });

    return result;
  }

  private async loadStore(): Promise<FmfScraperStore> {
    const status = await this.fmfScraper.getStatus();
    const { busy: _busy, ...store } = status;
    return store;
  }

  private async listClubTenants(): Promise<
    Array<{
      id: string;
      name: string;
      slug: string;
      logoUrl: string | null;
      pageId: string | null;
    }>
  > {
    const rows = await this.prisma.tenant.findMany({
      where: { slug: { not: 'bcg' } },
      include: {
        kind: { select: { name: true } },
        pages: { select: { id: true }, take: 1 },
      },
      orderBy: { name: 'asc' },
    });

    return rows
      .filter((t) => isClubKind(t.kind?.name ?? null))
      .map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        logoUrl: t.logoUrl,
        pageId: t.pages[0]?.id ?? null,
      }));
  }

  private resolvePresetKeys(
    cfg: FmfScraperSyncTenantConfig | undefined,
    store: FmfScraperStore,
  ): FmfScraperPresetKey[] {
    if (cfg?.presetKeys?.length) {
      return cfg.presetKeys.filter((k) => store.categories[k]);
    }
    return FMF_SCRAPER_PRESET_KEYS.filter((k) => store.categories[k]);
  }

  private collectTenantData(
    store: FmfScraperStore,
    presetKeys: FmfScraperPresetKey[],
    tenantName: string,
    aliases: string[],
    tenantLogoUrl: string | null,
    logoMap: Map<string, string>,
  ): {
    matches: Array<{ presetKey: FmfScraperPresetKey; fixture: ManualFixture }>;
    resultadosManuais: Record<string, { homeScore: number; awayScore: number }>;
    tabelaRows: TabelaRow[];
    missingLogos: Set<string>;
  } {
    const missingLogos = new Set<string>();
    const matches: Array<{ presetKey: FmfScraperPresetKey; fixture: ManualFixture }> = [];
    const resultadosManuais: Record<string, { homeScore: number; awayScore: number }> = {};
    const tabelaRows: TabelaRow[] = [];
    const tabelaKeys = new Set<string>();

    const ourLogo = this.resolveLogo(tenantName, tenantName, aliases, tenantLogoUrl, logoMap, missingLogos, true);

    for (const presetKey of presetKeys) {
      const snap = store.categories[presetKey];
      if (!snap) continue;

      const ourMatches = snap.matches.filter(
        (m) =>
          isFmfTeamMatch(m.homeName, tenantName, aliases) ||
          isFmfTeamMatch(m.awayName, tenantName, aliases),
      );

      if (ourMatches.length === 0) continue;

      for (const m of ourMatches) {
        const extId = buildExternalId(presetKey, m);
        const isHome = isFmfTeamMatch(m.homeName, tenantName, aliases);
        const homeLogo = isHome
          ? ourLogo
          : this.resolveLogo(m.homeName, tenantName, aliases, null, logoMap, missingLogos, false);
        const awayLogo = isHome
          ? this.resolveLogo(m.awayName, tenantName, aliases, null, logoMap, missingLogos, false)
          : ourLogo;

        const fixture: ManualFixture = {
          externalId: extId,
          startISO: matchToStartISO(m),
          status: m.status === 'finished' ? 'FINAL' : 'SCHEDULED',
          competitionName: snap.name,
          venueName: m.venueText ?? undefined,
          homeTeamName: m.homeName,
          awayTeamName: m.awayName,
          category: snap.fixtureCategory,
          isOurTeamHome: isHome,
          homeTeamLogoUrl: homeLogo,
          awayTeamLogoUrl: awayLogo,
        };

        if (fixture.startISO) {
          matches.push({ presetKey, fixture });
        }

        if (
          m.status === 'finished' &&
          m.homeGoals != null &&
          m.awayGoals != null &&
          fixture.startISO
        ) {
          resultadosManuais[extId] = {
            homeScore: m.homeGoals,
            awayScore: m.awayGoals,
          };
        }
      }

      for (const row of snap.standings) {
        const rowKey = `${snap.fixtureCategory}:${normalizeTeamNameKeyForMerge(row.time)}`;
        if (tabelaKeys.has(rowKey)) continue;
        tabelaKeys.add(rowKey);

        const isOurRow = isFmfTeamMatch(row.time, tenantName, aliases);
        const rowLogo = isOurRow
          ? ourLogo
          : this.resolveLogo(row.time, tenantName, aliases, null, logoMap, missingLogos, false);

        tabelaRows.push(standingToTabelaRow(row, rowLogo));
      }
    }

    return { matches, resultadosManuais, tabelaRows, missingLogos };
  }

  private resolveLogo(
    teamName: string,
    tenantName: string,
    aliases: string[],
    tenantLogoUrl: string | null,
    logoMap: Map<string, string>,
    missingLogos: Set<string>,
    isOurTeam: boolean,
  ): string | undefined {
    if (isOurTeam || isFmfTeamMatch(teamName, tenantName, aliases)) {
      const url = this.tenantLogoPublicUrl(tenantLogoUrl);
      if (!url) missingLogos.add(`${tenantName} (logo do clube)`);
      return url;
    }

    const nk = normalizeTeamNameKeyForMerge(teamName);
    const url = nk ? logoMap.get(nk) : undefined;
    if (!url) {
      missingLogos.add(teamName.trim());
    }
    return url;
  }

  private tenantLogoPublicUrl(logoUrl: string | null): string | undefined {
    if (!logoUrl?.trim()) return undefined;
    const key = mediaKeyFromStoredUrl(logoUrl);
    if (key) return this.s3.getPublicUrl(key);
    if (/^https?:\/\//i.test(logoUrl)) return logoUrl.trim();
    return undefined;
  }

  private async buildLogoMap(): Promise<Map<string, string>> {
    const [teams, assets] = await Promise.all([
      this.prisma.visitingTeam.findMany({ orderBy: { name: 'asc' } }),
      this.s3.listAllAssets(),
    ]);
    const advAssets = assets.filter(
      (a) =>
        a.key.startsWith('logos/clubes-adv/') ||
        a.key.startsWith('logos/external/'),
    );
    const displayNames = await this.mediaMeta.getDisplayNames(advAssets.map((a) => a.key));
    return buildVisitingTeamLogoUrlByMergeKey(
      teams.map((t) => ({ id: t.id, name: t.name, logoUrl: t.logoUrl })),
      advAssets.map((a) => ({
        key: a.key,
        url: a.url,
        displayName: displayNames[a.key] ?? null,
      })),
    );
  }
}

function buildExternalId(presetKey: string, m: FmfParsedMatch): string {
  if (m.fmfJogoNumber != null) return `fmf-${presetKey}-j${m.fmfJogoNumber}`;
  const h = normalizeTeamNameKeyForMerge(m.homeName);
  const a = normalizeTeamNameKeyForMerge(m.awayName);
  return `fmf-${presetKey}-${m.matchDate ?? 'nodate'}-${h}-${a}`;
}

function matchToStartISO(m: FmfParsedMatch): string {
  if (!m.matchDate) return '';
  const t = (m.kickoffTime ?? '12:00:00').slice(0, 5);
  const combined = `${m.matchDate}T${t}:00`;
  const date = new Date(combined);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function standingToTabelaRow(row: FmfStandingsRow, logoTime?: string): TabelaRow {
  return {
    competicao: row.competicao,
    categoria: row.categoria,
    temporada: row.temporada,
    time: row.time,
    logoTime,
    pontos: row.pontos,
    jogos: row.jogos,
    vitorias: row.vitorias,
    empates: row.empates,
    derrotas: row.derrotas,
    golsMarcados: row.golsMarcados,
    golsSofridos: row.golsSofridos,
    saldoGols: row.saldoGols,
  };
}
