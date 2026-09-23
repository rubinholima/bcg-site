import {
  normalizeTenantOperationalCategories,
  operationalCategoryMergeKey,
  toOperationalCategory,
} from './fmf-operational-category.util';

describe('fmf-operational-category.util', () => {
  it('colapsa *_2div para categoria operacional', () => {
    expect(toOperationalCategory('sub20_2div')).toBe('sub20');
    expect(toOperationalCategory('sub15_2div')).toBe('sub15');
    expect(toOperationalCategory('sub13_2div')).toBe('sub13');
  });

  it('colapsa *_inconfidencia para categoria operacional', () => {
    expect(toOperationalCategory('sub20_inconfidencia')).toBe('sub20');
  });

  it('preserva categorias operacionais existentes', () => {
    expect(toOperationalCategory('sub20')).toBe('sub20');
    expect(toOperationalCategory('modulo_ii')).toBe('modulo_ii');
  });

  it('normaliza tenant categories sem duplicata', () => {
    expect(
      normalizeTenantOperationalCategories([
        'sub20_2div',
        'sub20',
        'sub15_2div',
        'modulo_ii',
      ]),
    ).toEqual(['sub20', 'sub15', 'modulo_ii']);
  });

  it('merge key une sub20 e sub20_2div', () => {
    expect(operationalCategoryMergeKey('sub20_2div')).toBe(
      operationalCategoryMergeKey('sub20'),
    );
    expect(operationalCategoryMergeKey('sub13_2div')).not.toBe(
      operationalCategoryMergeKey('sub15_2div'),
    );
  });
});
