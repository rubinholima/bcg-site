import {
  buildFmfExternalId,
  buildLegacyFmfTravelExternalId,
  buildFmfTravelExternalId,
  fmfExternalIdCandidates,
  resolveFmfPresetKeys,
} from './fmf-fixture.util';
import { FMF_SCRAPER_PRESETS } from './fmf-scraper.presets';
import type { FmfScraperStore } from './fmf-scraper.service';

const emptySnap = (key: string, fixtureCategory: string) => ({
  preset: key,
  fmfD: 1,
  slug: key,
  name: key,
  fixtureCategory,
  sourceUrl: '',
  fetchedAt: '',
  parsed: 0,
  scheduled: 0,
  finished: 0,
  matches: [],
  standings: [],
  upcoming: [],
  recentResults: [],
});

describe('fmf external ids', () => {
  const match = {
    matchDate: '2026-09-27',
    homeName: 'CA PATROCINENSE',
    awayName: 'VILLA NOVA',
    fmfJogoNumber: 58,
    phaseLabel: 'CLASSIFICATÓRIA',
    roundNumber: 10,
    kickoffTime: '15:00:00',
    homeGoals: null,
    awayGoals: null,
    status: 'scheduled' as const,
    homeEscudoUrl: null,
    awayEscudoUrl: null,
    venueText: null,
    reportUrl: null,
    externalMatchId: null,
  };

  it('usa d + jogo FMF como identidade canônica', () => {
    expect(buildFmfExternalId(31, match as never)).toBe('fmf-d31-j58');
    expect(buildFmfTravelExternalId(31, match as never)).toBe('fmf-travel-d31-j58');
  });

  it('localiza legado preset-key no upsert', () => {
    const ids = fmfExternalIdCandidates('sub20_2div', 31, match as never);
    expect(ids.travel).toContain('fmf-travel-d31-j58');
    expect(ids.travel).toContain(buildLegacyFmfTravelExternalId('sub20_2div', match as never));
  });
});

describe('resolveFmfPresetKeys', () => {
  const store: FmfScraperStore = {
    updatedAt: '2026-01-01',
    lastRunOk: true,
    categories: {
      sub13: {
        ...emptySnap('sub13', 'sub13'),
        matches: [
          {
            matchDate: '2026-05-01',
            homeName: 'BOSTON CITY FUTEBOL CLUBE SAF',
            awayName: 'CRUZEIRO',
            phaseLabel: null,
            roundNumber: 1,
            kickoffTime: null,
            homeGoals: 1,
            awayGoals: 0,
            status: 'finished',
            homeEscudoUrl: null,
            awayEscudoUrl: null,
            venueText: null,
            reportUrl: null,
            externalMatchId: null,
            fmfJogoNumber: 1,
          },
        ],
      },
      sub14: emptySnap('sub14', 'sub14'),
      modulo_ii: {
        ...emptySnap('modulo_ii', 'modulo_ii'),
        matches: [
          {
            matchDate: '2026-06-01',
            homeName: 'VILLA NOVA',
            awayName: 'COIMBRA SAF',
            phaseLabel: null,
            roundNumber: 1,
            kickoffTime: null,
            homeGoals: 0,
            awayGoals: 0,
            status: 'scheduled',
            homeEscudoUrl: null,
            awayEscudoUrl: null,
            venueText: null,
            reportUrl: null,
            externalMatchId: null,
            fmfJogoNumber: 2,
          },
        ],
      },
      copa_master_mg: {
        ...emptySnap('copa_master_mg', 'copa_master_mg'),
        matches: [
          {
            matchDate: '2026-08-29',
            homeName: 'AMÉRICA TO',
            awayName: 'VILLA NOVA',
            phaseLabel: 'CLASSIFICATÓRIA',
            roundNumber: null,
            kickoffTime: null,
            homeGoals: null,
            awayGoals: null,
            status: 'scheduled',
            homeEscudoUrl: null,
            awayEscudoUrl: null,
            venueText: null,
            reportUrl: null,
            externalMatchId: null,
            fmfJogoNumber: 99,
          },
        ],
      },
    },
  };

  it('Boston: mantém presets das categorias cadastradas', () => {
    const keys = resolveFmfPresetKeys(store, ['sub13', 'sub14'], {
      presetMap: {
        ...FMF_SCRAPER_PRESETS,
        copa_master_mg: {
          key: 'copa_master_mg' as never,
          fmfD: 12,
          slug: 'copa-master-mg-2026',
          name: 'Copa Master MG 2026',
          fixtureCategory: 'copa_master_mg',
          competitionLabelTemplate: 'COPA MASTER - {year}',
        },
      },
      club: {
        tenantName: 'BOSTON CITY FC - BRASIL',
        aliases: ['BOSTON CITY', 'BOSTON CITY FUTEBOL CLUBE'],
      },
    });
    expect(keys).toEqual(['sub13', 'sub14']);
  });

  it('Villa Nova: une categorias cadastradas com presets descobertos no snapshot', () => {
    const keys = resolveFmfPresetKeys(store, ['modulo_ii', 'sub20'], {
      presetMap: {
        ...FMF_SCRAPER_PRESETS,
        copa_master_mg: {
          key: 'copa_master_mg' as never,
          fmfD: 12,
          slug: 'copa-master-mg-2026',
          name: 'Copa Master MG 2026',
          fixtureCategory: 'copa_master_mg',
          competitionLabelTemplate: 'COPA MASTER - {year}',
        },
      },
      club: {
        tenantName: 'VILLA NOVA SAF',
        aliases: ['VILLA NOVA', 'VILLA NOVA SAF'],
        season: 2026,
      },
    });
    expect(keys).toEqual(['copa_master_mg', 'modulo_ii']);
  });
});
