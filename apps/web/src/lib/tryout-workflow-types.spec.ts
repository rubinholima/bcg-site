import { labelTryoutSource, TRYOUT_DIRECT_ENTRY_SOURCES } from './tryout-workflow-types';

describe('tryout-workflow-types', () => {
  it('rótulos de origem direta incluem gestão', () => {
    expect(TRYOUT_DIRECT_ENTRY_SOURCES.some((s) => s.value === 'gestao_diretoria')).toBe(true);
    expect(labelTryoutSource('gestao_diretoria')).toMatch(/Gestão/i);
  });
});
