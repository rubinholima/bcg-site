import type { FmfScraperStore } from '../fmf-scraper/fmf-scraper.service';
import {
  buildStandingsFromStore,
  findStoreCategoryEntry,
  resolveStoreCategory,
} from './coach-context.helper';

function villaStoreFixture(): FmfScraperStore {
  return {
    updatedAt: new Date().toISOString(),
    lastRunOk: true,
    categories: {
      modulo_ii: {
        preset: 'modulo_ii',
        fmfD: 1,
        slug: 'mineiro-modulo-ii',
        name: 'Campeonato Mineiro Modulo II',
        fixtureCategory: 'modulo_ii',
        sourceUrl: '',
        fetchedAt: new Date().toISOString(),
        parsed: 10,
        scheduled: 0,
        finished: 10,
        matches: [
          {
            homeName: 'CRUZEIRO - SAF',
            awayName: 'ATHLETIC',
            matchDate: '2026-09-01',
            status: 'finished',
            phaseLabel: '1ª FASE',
            roundNumber: 1,
            homeScore: 1,
            awayScore: 0,
          },
        ],
        standings: [
          {
            time: 'CRUZEIRO - SAF',
            pontos: 16,
            jogos: 5,
            vitorias: 5,
            empates: 0,
            derrotas: 0,
            golsMarcados: 10,
            golsSofridos: 2,
            saldoGols: 8,
          },
        ],
        upcoming: [],
        recentResults: [],
      },
      sub20: {
        preset: 'sub20',
        fmfD: 2,
        slug: 'mineiro-sub20-1div',
        name: 'Campeonato Mineiro Sub-20 1ª Divisão',
        fixtureCategory: 'sub20',
        sourceUrl: '',
        fetchedAt: new Date().toISOString(),
        parsed: 5,
        scheduled: 0,
        finished: 5,
        matches: [
          {
            homeName: 'CRUZEIRO - SAF',
            awayName: 'ATLÉTICO',
            matchDate: '2026-08-01',
            status: 'finished',
            phaseLabel: '1ª FASE',
            roundNumber: 1,
            homeScore: 2,
            awayScore: 1,
          },
        ],
        standings: [
          {
            time: 'CRUZEIRO - SAF',
            pontos: 12,
            jogos: 4,
            vitorias: 4,
            empates: 0,
            derrotas: 0,
            golsMarcados: 8,
            golsSofridos: 2,
            saldoGols: 6,
          },
        ],
        upcoming: [],
        recentResults: [],
      },
      sub20_2div: {
        preset: 'sub20_2div',
        fmfD: 31,
        slug: 'mineiro-sub20-2div',
        name: 'Campeonato Mineiro Sub-20 2ª Divisão',
        fixtureCategory: 'sub20_2div',
        sourceUrl: '',
        fetchedAt: new Date().toISOString(),
        parsed: 8,
        scheduled: 0,
        finished: 8,
        matches: [
          {
            homeName: 'VILLA NOVA SAF',
            awayName: 'BETIM FUTEBOL',
            matchDate: '2026-09-10',
            status: 'finished',
            phaseLabel: 'DECAGONAL FINAL',
            roundNumber: 1,
            homeScore: 2,
            awayScore: 1,
          },
        ],
        standings: [
          {
            time: 'VILLA NOVA SAF',
            pontos: 9,
            jogos: 3,
            vitorias: 3,
            empates: 0,
            derrotas: 0,
            golsMarcados: 6,
            golsSofridos: 2,
            saldoGols: 4,
          },
        ],
        upcoming: [],
        recentResults: [],
      },
    },
  };
}

describe('coach context — snapshot FMF por categoria operacional', () => {
  const store = villaStoreFixture();
  const tenantKeys = ['modulo_ii', 'sub15_2div', 'sub20_2div', 'sub13_2div'];
  const clubName = 'Villa Nova SAF';
  const aliases = ['VILLA NOVA'];

  it('resolveStoreCategory mapeia sub20 do filtro para sub20_2div do tenant', () => {
    expect(
      resolveStoreCategory(store, 'sub20', ['sub20'], tenantKeys),
    ).toBe('sub20_2div');
  });

  it('buildStandingsFromStore usa 2ª divisão sub-20, não Modulo II', () => {
    const storeCategory = resolveStoreCategory(store, 'sub20', ['sub20'], tenantKeys);
    const rows = buildStandingsFromStore(store, 'sub20', clubName, aliases, {
      tenantCategoryKeys: tenantKeys,
      clubName,
      aliases,
    });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some((r) => /villa nova/i.test(r.team))).toBe(true);
    expect(rows.some((r) => /cruzeiro/i.test(r.team))).toBe(false);
  });

  it('findStoreCategoryEntry ignora chave sub20 (1ª div) quando o clube só joga na sub20_2div', () => {
    const tenantKeysSub20Only = ['modulo_ii', 'sub20'];
    const entry = findStoreCategoryEntry(store, 'sub20', {
      tenantCategoryKeys: tenantKeysSub20Only,
      clubName,
      aliases,
    });
    expect(entry?.storeKey).toBe('sub20_2div');
  });
});
