import { discoverFmfPresetKeysForClub } from './fmf-club-preset-discovery.util';
import type { FmfScraperStore } from './fmf-scraper.service';

function storeWith(
  presets: Record<
    string,
    Array<{ matchDate: string; homeName: string; awayName: string }>
  >,
): FmfScraperStore {
  return {
    updatedAt: '2026-01-01T00:00:00.000Z',
    lastRunOk: true,
    categories: Object.fromEntries(
      Object.entries(presets).map(([key, matches]) => [
        key,
        {
          preset: key,
          fmfD: 1,
          slug: key,
          name: key,
          fixtureCategory: key,
          sourceUrl: '',
          fetchedAt: '',
          parsed: matches.length,
          scheduled: 0,
          finished: matches.length,
          matches: matches.map((m) => ({
            ...m,
            phaseLabel: null,
            roundNumber: null,
            kickoffTime: null,
            homeGoals: 1,
            awayGoals: 0,
            status: 'finished' as const,
            homeEscudoUrl: null,
            awayEscudoUrl: null,
            venueText: null,
            reportUrl: null,
            externalMatchId: null,
            fmfJogoNumber: null,
          })),
          standings: [],
          upcoming: [],
          recentResults: [],
        },
      ]),
    ),
  };
}

describe('discoverFmfPresetKeysForClub', () => {
  it('retorna presets onde o clube aparece na temporada', () => {
    const store = storeWith({
      modulo_ii: [{ matchDate: '2026-06-01', homeName: 'VILLA NOVA', awayName: 'COIMBRA SAF' }],
      sub20: [{ matchDate: '2026-06-01', homeName: 'BOSTON CITY', awayName: 'CRUZEIRO' }],
      copa_master_mg: [
        { matchDate: '2026-08-29', homeName: 'AMÉRICA TO', awayName: 'VILLA NOVA' },
      ],
    });

    expect(
      discoverFmfPresetKeysForClub(store, {
        tenantName: 'VILLA NOVA SAF',
        aliases: ['VILLA NOVA', 'VILLA NOVA SAF'],
        season: 2026,
      }),
    ).toEqual(['copa_master_mg', 'modulo_ii']);
  });

  it('ignora jogos de outras temporadas', () => {
    const store = storeWith({
      modulo_ii: [{ matchDate: '2025-06-01', homeName: 'VILLA NOVA', awayName: 'COIMBRA SAF' }],
    });

    expect(
      discoverFmfPresetKeysForClub(store, {
        tenantName: 'VILLA NOVA SAF',
        aliases: ['VILLA NOVA'],
        season: 2026,
      }),
    ).toEqual([]);
  });
});
