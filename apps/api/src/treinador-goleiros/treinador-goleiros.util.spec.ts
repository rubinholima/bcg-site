import { crossCategoryLabel, isGoalkeeperPosition, normalizeYoutubeUrl } from './treinador-goleiros.util';

describe('treinador-goleiros.util', () => {
  it('identifica goleiro', () => {
    expect(isGoalkeeperPosition('GOLEIRO')).toBe(true);
    expect(isGoalkeeperPosition('goleiro')).toBe(true);
    expect(isGoalkeeperPosition('ZAGUEIRO')).toBe(false);
  });

  it('monta label cross-category', () => {
    expect(crossCategoryLabel('Sub-13', 'Sub-15')).toBe('Sub-13 · treinou com Sub-15');
    expect(crossCategoryLabel('Sub-15', 'Sub-15')).toBeNull();
  });

  it('valida YouTube', () => {
    expect(normalizeYoutubeUrl('https://www.youtube.com/watch?v=abc12345678')).toContain('youtube.com');
    expect(normalizeYoutubeUrl('not-a-url')).toBeNull();
  });
});
