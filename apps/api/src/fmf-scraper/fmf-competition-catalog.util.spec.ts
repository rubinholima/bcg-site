import {
  inferOperationalCategoryFromCatalogEntry,
  inferOperationalCategoryFromProbedHtml,
  catalogEntryMatchesOperationalCategory,
} from './fmf-competition-catalog.util';

describe('fmf-competition-catalog util', () => {
  it('infere sub17 a partir do categoryHint', () => {
    expect(
      inferOperationalCategoryFromCatalogEntry({
        fmfD: 34,
        navLabel: 'Copa Inconfidência - Sub 17',
        categoryHint: 'Sub 17',
        url: '',
      }),
    ).toBe('sub17');
  });

  it('probe HTML infere sub17 operacional', () => {
    expect(
      inferOperationalCategoryFromProbedHtml(
        '<html>SUB 17 - 2ª DIVISÃO - 2026</html>',
      ),
    ).toBe('sub17');
  });

  it('catalogEntryMatchesOperationalCategory compara operacional', () => {
    const entry = {
      fmfD: 31,
      navLabel: '2ª Divisão',
      categoryHint: 'Sub 20',
      url: '',
    };
    expect(catalogEntryMatchesOperationalCategory(entry, 'sub20')).toBe(true);
    expect(catalogEntryMatchesOperationalCategory(entry, 'sub17')).toBe(false);
  });
});
