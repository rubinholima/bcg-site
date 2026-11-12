import { buildFmfUpcomingListItems } from './fmf-upcoming-list.util';
import { mergeFmfPresetMaps } from '../fmf-scraper/fmf-preset-registry.util';
import type { FmfScraperStore } from '../fmf-scraper/fmf-scraper.service';

describe('buildFmfUpcomingListItems', () => {
  const presetMap = mergeFmfPresetMaps();
  const now = new Date('2026-11-01T12:00:00.000Z');

  it('inclui semi Sub-15 Inconfidência quando não há viagem', () => {
    const store: FmfScraperStore = {
      updatedAt: '2026-11-01T10:00:00.000Z',
      categories: {
        sub15_inconfidencia: {
          name: 'TROFÉU INCONFIDÊNCIA',
          fmfD: 33,
          fixtureCategory: 'sub15',
          matches: [
            {
              status: 'scheduled',
              matchDate: '2026-11-14',
              kickoffTime: '15:00:00',
              homeName: 'BOSTON CITY FC',
              awayName: 'AMÉRICA-MG',
              phaseLabel: 'SEMIFINAL',
              fmfJogoNumber: 58,
              venueText: 'Arena X',
              homeGoals: null,
              awayGoals: null,
              roundNumber: null,
            },
          ],
          standings: [],
        },
      },
    };

    const items = buildFmfUpcomingListItems({
      store,
      tenantName: 'Boston City FC Brasil',
      aliases: ['BOSTON CITY', 'BOSTON CITY FC'],
      tenantCategoryKeys: ['sub15'],
      presetMap,
      travels: [],
      categoryFilter: 'sub15',
      season: 2026,
      now,
      coachByTravel: new Map(),
      existing: [],
    });

    expect(items).toHaveLength(1);
    expect(items[0]?.opponentName).toContain('AMÉRICA');
    expect(items[0]?.competition).toMatch(/INCONFIDÊNCIA/i);
    expect(items[0]?.gameKey).toMatch(/^fmf-fixture:/);
  });
});
