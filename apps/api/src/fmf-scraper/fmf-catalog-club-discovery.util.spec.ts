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
  it('d=12 e d=13 produzem a mesma assinatura (alias FMF)', () => {
    const fixtures = [
      match('2026-09-12', 'VILLA NOVA', 'UBERLANDIA S.A.F', 51),
      match('2026-09-27', 'CA PATROCINENSE', 'VILLA NOVA', 58),
    ];
    const sigA = buildFmfFixtureSignature(fixtures);
    const sigB = buildFmfFixtureSignature([...fixtures]);
    expect(sigA).toBe(sigB);
  });

  it('infere preset sub20_2div a partir do rótulo oficial', () => {
    const preset = inferPresetFromCompetitionContext(31, {
      officialLabel: 'SUB 20 - 2ª DIVISÃO - 2026',
      catalogEntry: { fmfD: 31, navLabel: '2ª Divisão', categoryHint: 'Sub 20', url: '' },
      season: 2026,
    });
    expect(preset.key).toBe('sub20_2div');
    expect(preset.fixtureCategory).toBe('sub20_2div');
  });

  it('assinatura muda quando fixtures diferem', () => {
    const a = buildFmfFixtureSignature([match('2026-09-12', 'VILLA NOVA', 'UBERLANDIA S.A.F', 51)]);
    const b = buildFmfFixtureSignature([match('2026-09-12', 'VILLA NOVA', 'OUTRO', 51)]);
    expect(a).not.toBe(b);
  });
});
