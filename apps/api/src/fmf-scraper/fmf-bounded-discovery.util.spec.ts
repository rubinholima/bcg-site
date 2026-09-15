import {
  catalogEntryMatchesOperationalCategoriesAfterProbe,
  filterCatalogEntriesForOperationalDiscovery,
  isAmbiguousDivisionCatalogEntry,
} from './fmf-bounded-discovery.util';
import type { FmfCompetitionCatalogEntry } from './fmf-competition-catalog.util';

const sub17SecondDivHtml = `
  <html><body>SUB 17 - 2ª DIVISÃO - 2026</body></html>
`;

describe('fmf-bounded-discovery.util', () => {
  it('marca 2ª Divisão sem hint como ambígua', () => {
    const entry: FmfCompetitionCatalogEntry = {
      fmfD: 13,
      navLabel: '2ª Divisão',
      categoryHint: null,
      url: '',
    };
    expect(isAmbiguousDivisionCatalogEntry(entry)).toBe(true);
  });

  it('inclui divisões ambíguas quando sub17 está selecionado', () => {
    const entries: FmfCompetitionCatalogEntry[] = [
      { fmfD: 13, navLabel: '2ª Divisão', categoryHint: null, url: '' },
      { fmfD: 26, navLabel: 'SFAC SUB 17', categoryHint: 'Sub 17', url: '' },
      { fmfD: 7, navLabel: 'FEMININO', categoryHint: null, url: '' },
    ];
    const scoped = filterCatalogEntriesForOperationalDiscovery(entries, ['sub17']);
    expect(scoped.map((e) => e.fmfD).sort()).toEqual([13, 26]);
  });

  it('probe HTML identifica sub17 2ª divisão (d=13)', () => {
    const entry: FmfCompetitionCatalogEntry = {
      fmfD: 13,
      navLabel: '2ª Divisão',
      categoryHint: null,
      url: '',
    };
    expect(
      catalogEntryMatchesOperationalCategoriesAfterProbe(
        entry,
        sub17SecondDivHtml,
        ['sub17'],
      ),
    ).toBe(true);
    expect(
      catalogEntryMatchesOperationalCategoriesAfterProbe(
        entry,
        sub17SecondDivHtml,
        ['sub15'],
      ),
    ).toBe(false);
  });
});
