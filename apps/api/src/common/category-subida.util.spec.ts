import {
  isSubidaEvent,
  primaryEventCategory,
  resolveTravelEventCategories,
} from './category-subida.util';

describe('category-subida.util', () => {
  it('resolveTravelEventCategories prioriza lista categories', () => {
    expect(
      resolveTravelEventCategories({ category: 'sub20', categories: ['sub17', 'sub20'] }),
    ).toEqual(['sub17', 'sub20']);
  });

  it('isSubidaEvent detecta subida em categoria única', () => {
    expect(isSubidaEvent('sub17', 'sub20')).toBe(true);
    expect(isSubidaEvent('sub20', 'sub20')).toBe(false);
  });

  it('isSubidaEvent detecta quando cadastro não está na viagem multi-categoria', () => {
    expect(isSubidaEvent('sub15', ['sub17', 'sub20'])).toBe(true);
    expect(isSubidaEvent('sub17', ['sub17', 'sub20'])).toBe(false);
  });

  it('primaryEventCategory retorna primeira categoria', () => {
    expect(primaryEventCategory(['sub20', 'sub17'])).toBe('sub20');
  });
});
