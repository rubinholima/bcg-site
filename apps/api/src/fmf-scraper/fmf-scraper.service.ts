import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { parseFmfProxJogosHtml, type FmfParsedMatch } from './fmf-proxjogos.parser';
import {
  FMF_SCRAPER_PRESET_KEYS,
  FMF_SCRAPER_PRESETS,
  type FmfScraperPresetKey,
  fmfProxJogosUrl,
  isFmfPresetKey,
} from './fmf-scraper.presets';

const STORE_KEY = 'fmf_scraper_data';

export type FmfStandingsRow = {
  time: string;
  pontos: number;
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  golsMarcados: number;
  golsSofridos: number;
  saldoGols: number;
  competicao?: string;
  categoria?: string;
  temporada?: string;
};

export type FmfCategorySnapshot = {
  preset: FmfScraperPresetKey;
  fmfD: number;
  slug: string;
  name: string;
  fixtureCategory: string;
  sourceUrl: string;
  fetchedAt: string;
  parsed: number;
  scheduled: number;
  finished: number;
  matches: FmfParsedMatch[];
  standings: FmfStandingsRow[];
  upcoming: FmfParsedMatch[];
  recentResults: FmfParsedMatch[];
};

export type FmfScraperStore = {
  updatedAt: string;
  lastRunOk: boolean;
  lastRunError?: string | null;
  categories: Partial<Record<FmfScraperPresetKey, FmfCategorySnapshot>>;
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeTeamName(name: string): string {
  return name.trim().toUpperCase();
}

/** Tabela simplificada a partir dos jogos finalizados (3 pts vitória, 1 empate). */
export function computeStandingsFromMatches(
  matches: FmfParsedMatch[],
  meta: { competicao: string; categoria: string; temporada: string },
): FmfStandingsRow[] {
  type Acc = {
    jogos: number;
    vitorias: number;
    empates: number;
    derrotas: number;
    golsMarcados: number;
    golsSofridos: number;
    pontos: number;
  };
  const table = new Map<string, Acc>();

  const ensure = (team: string) => {
    const key = normalizeTeamName(team);
    if (!table.has(key)) {
      table.set(key, {
        jogos: 0,
        vitorias: 0,
        empates: 0,
        derrotas: 0,
        golsMarcados: 0,
        golsSofridos: 0,
        pontos: 0,
      });
    }
    return table.get(key)!;
  };

  for (const m of matches) {
    if (m.status !== 'finished' || m.homeGoals == null || m.awayGoals == null) continue;
    const home = ensure(m.homeName);
    const away = ensure(m.awayName);
    const hg = m.homeGoals;
    const ag = m.awayGoals;

    home.jogos += 1;
    away.jogos += 1;
    home.golsMarcados += hg;
    home.golsSofridos += ag;
    away.golsMarcados += ag;
    away.golsSofridos += hg;

    if (hg > ag) {
      home.vitorias += 1;
      home.pontos += 3;
      away.derrotas += 1;
    } else if (hg < ag) {
      away.vitorias += 1;
      away.pontos += 3;
      home.derrotas += 1;
    } else {
      home.empates += 1;
      away.empates += 1;
      home.pontos += 1;
      away.pontos += 1;
    }
  }

  const rows: FmfStandingsRow[] = [...table.entries()].map(([time, s]) => ({
    time,
    ...s,
    saldoGols: s.golsMarcados - s.golsSofridos,
    competicao: meta.competicao,
    categoria: meta.categoria,
    temporada: meta.temporada,
  }));

  rows.sort((a, b) => {
    if (b.pontos !== a.pontos) return b.pontos - a.pontos;
    if (b.saldoGols !== a.saldoGols) return b.saldoGols - a.saldoGols;
    if (b.golsMarcados !== a.golsMarcados) return b.golsMarcados - a.golsMarcados;
    return a.time.localeCompare(b.time, 'pt-BR');
  });

  return rows;
}

function matchStartMs(m: FmfParsedMatch): number {
  if (!m.matchDate) return 0;
  const t = m.kickoffTime?.slice(0, 5) ?? '00:00';
  return Date.parse(`${m.matchDate}T${t}:00`);
}

@Injectable()
export class FmfScraperService {
  private readonly log = new Logger(FmfScraperService.name);
  private busy = false;

  constructor(private readonly prisma: PrismaService) {}

  getPresets() {
    return FMF_SCRAPER_PRESET_KEYS.map((key) => ({
      ...FMF_SCRAPER_PRESETS[key],
      sourceUrl: fmfProxJogosUrl(FMF_SCRAPER_PRESETS[key].fmfD),
    }));
  }

  async getStatus(): Promise<FmfScraperStore & { busy: boolean }> {
    const store = await this.loadStore();
    return { ...store, busy: this.busy };
  }

  async runImport(options: { preset?: string; all?: boolean } = {}): Promise<FmfScraperStore> {
    if (this.busy) throw new Error('Importação FMF já em andamento. Aguarde a conclusão.');
    this.busy = true;
    const store = await this.loadStore();
    store.lastRunError = null;

    const keys: FmfScraperPresetKey[] = options.all
      ? [...FMF_SCRAPER_PRESET_KEYS]
      : options.preset && isFmfPresetKey(options.preset)
        ? [options.preset]
        : [];

    if (keys.length === 0) {
      this.busy = false;
      throw new Error('Informe preset válido ou all=true');
    }

    const delayMs = Math.max(
      800,
      parseInt(process.env.FMF_FETCH_DELAY_MS ?? '1200', 10) || 1200,
    );
    const betweenMs = Math.max(delayMs, 2000);

    try {
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i]!;
        if (i > 0) await sleep(betweenMs);
        const snapshot = await this.fetchPreset(key, delayMs);
        store.categories[key] = snapshot;
      }
      store.updatedAt = new Date().toISOString();
      store.lastRunOk = true;
      await this.saveStore(store);
      this.log.log(`FMF import ok: ${keys.join(', ')}`);
      return store;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      store.lastRunOk = false;
      store.lastRunError = msg;
      store.updatedAt = new Date().toISOString();
      await this.saveStore(store);
      this.log.warn(`FMF import falhou: ${msg}`);
      throw e;
    } finally {
      this.busy = false;
    }
  }

  async runAllScheduled(): Promise<void> {
    if (this.busy) {
      this.log.debug('FMF scheduler: import já em andamento, pulando ciclo.');
      return;
    }
    try {
      await this.runImport({ all: true });
    } catch (e) {
      this.log.warn(`FMF scheduler: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  private async fetchPreset(key: FmfScraperPresetKey, delayMs: number): Promise<FmfCategorySnapshot> {
    const preset = FMF_SCRAPER_PRESETS[key];
    const sourceUrl = fmfProxJogosUrl(preset.fmfD);
    await sleep(delayMs);

    const res = await fetch(sourceUrl, {
      headers: {
        'user-agent': 'BCGPlatform/1.0 (importacao interna FMF; contato operador)',
        'accept-language': 'pt-BR,pt;q=0.9',
      },
    });
    if (!res.ok) throw new Error(`FMF HTTP ${res.status} — ${preset.name}`);
    const html = await res.text();
    const matches = parseFmfProxJogosHtml(html);
    const season = String(new Date().getFullYear());

    const upcoming = matches
      .filter((m) => m.status === 'scheduled')
      .sort((a, b) => matchStartMs(a) - matchStartMs(b));

    const recentResults = matches
      .filter((m) => m.status === 'finished')
      .sort((a, b) => matchStartMs(b) - matchStartMs(a));

    const standings = computeStandingsFromMatches(matches, {
      competicao: preset.name,
      categoria: preset.fixtureCategory,
      temporada: season,
    });

    return {
      preset: key,
      fmfD: preset.fmfD,
      slug: preset.slug,
      name: preset.name,
      fixtureCategory: preset.fixtureCategory,
      sourceUrl,
      fetchedAt: new Date().toISOString(),
      parsed: matches.length,
      scheduled: upcoming.length,
      finished: recentResults.length,
      matches,
      standings,
      upcoming,
      recentResults,
    };
  }

  private async loadStore(): Promise<FmfScraperStore> {
    const row = await this.prisma.integrationConfig.findUnique({ where: { key: STORE_KEY } });
    if (!row?.config || typeof row.config !== 'object') {
      return {
        updatedAt: '',
        lastRunOk: false,
        categories: {},
      };
    }
    return row.config as FmfScraperStore;
  }

  private async saveStore(store: FmfScraperStore): Promise<void> {
    await this.prisma.integrationConfig.upsert({
      where: { key: STORE_KEY },
      create: { key: STORE_KEY, config: store as object },
      update: { config: store as object },
    });
  }
}
