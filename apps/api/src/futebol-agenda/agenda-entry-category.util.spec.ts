import { entryMatchesOperationalCategoryFilter } from './agenda-entry-category.util';

describe('entryMatchesOperationalCategoryFilter', () => {
  const villaKeys = ['sub20', 'sub20_2div', 'sub17', 'profissional'];

  it('aceita sub20_2div quando filtro é sub20', () => {
    expect(
      entryMatchesOperationalCategoryFilter('sub20_2div', 'sub20', villaKeys),
    ).toBe(true);
  });

  it('rejeita categoria de outro elenco', () => {
    expect(
      entryMatchesOperationalCategoryFilter('sub17', 'sub20', villaKeys),
    ).toBe(false);
  });

  it('sem filtro inclui tudo', () => {
    expect(entryMatchesOperationalCategoryFilter('sub17', undefined, villaKeys)).toBe(
      true,
    );
  });
});
