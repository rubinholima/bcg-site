import {
  buildFmfFixtureSignature,
  inferPresetFromCompetitionContext,
} from './fmf-catalog-club-discovery.util';
import type { FmfParsedMatch } from './fmf-proxjogos.parser';

const villaClub = {
  slug: 'villa-nova-saf',
  name: 'Villa Nova SAF',
  aliases: ['VILLA NOVA', 'VILLA NOVA SAF'],
};

function match(
  date: string,
  home: string,
  away: string,
  jogo = 1,
): FmfParsedMatch {
  return {
    matchDate: date,
    homeName: home,
    awayName: away,
    phaseLabel: 'CLASSIFICATÓRIA',
    roundNumber: 1,
    kickoffTime: '15:00:00',
    homeGoals: null,
    awayGoals: null,
    status: 'scheduled',
    homeEscudoUrl: null,
    awayEscudoUrl: null,
    venueText: null,
    reportUrl: null,
    externalMatchId: null,
    fmfJogoNumber: jogo,
  };
}

describe('fmf-catalog-club-discovery', () => {
  it('infere preset sub17_2div a partir do rótulo oficial (d=13)', () => {
    const preset = inferPresetFromCompetitionContext(13, {
      officialLabel: 'SUB 17 - 2ª DIVISÃO - 2026',
      catalogEntry: { fmfD: 13, navLabel: '2ª Divisão', categoryHint: null, url: '' },
      season: 2026,
    });
    expect(preset.key).toBe('sub17_2div');
    expect(preset.fixtureCategory).toBe('sub17');
    expect(preset.fmfD).toBe(13);
  });

  it('infere preset sub20_2div a partir do rótulo oficial', () => {
    const preset = inferPresetFromCompetitionContext(31, {
      officialLabel: 'SUB 20 - 2ª DIVISÃO - 2026',
      catalogEntry: { fmfD: 31, navLabel: '2ª Divisão', categoryHint: 'Sub 20', url: '' },
      season: 2026,
    });
    expect(preset.key).toBe('sub20_2div');
    expect(preset.fixtureCategory).toBe('sub20');
  });

  it('infere preset sub20_inconfidencia (Copa Inconfidência d=35)', () => {
    const preset = inferPresetFromCompetitionContext(35, {
      officialLabel: 'COPA INCONFIDÊNCIA - SUB 20 - 2026',
      catalogEntry: {
        fmfD: 35,
        navLabel: 'Copa Inconfidência - Sub 20',
        categoryHint: 'Sub 20',
        url: '',
      },
      season: 2026,
    });
    expect(preset.key).toBe('sub20_inconfidencia');
    expect(preset.fmfD).toBe(35);
    expect(preset.fixtureCategory).toBe('sub20');
    expect(preset.competitionLabelTemplate).toContain('INCONFID');
  });

  it('assinatura muda quando fixtures diferem', () => {
    const a = buildFmfFixtureSignature([match('2026-09-12', 'VILLA NOVA', 'UBERLANDIA S.A.F', 51)]);
    const b = buildFmfFixtureSignature([match('2026-09-12', 'VILLA NOVA', 'OUTRO', 51)]);
    expect(a).not.toBe(b);
  });
});
