import {
  orderedSelectedClipIds,
  presentationSectionKeys,
  selectPreMatchPresentationVersion,
} from './performance-analysis-prematch-presentation.util';

describe('performance-analysis-prematch-presentation.util', () => {
  it('prioriza versão PRESENTED depois APPROVED', () => {
    const versions = [
      { id: 'd1', lifecycle: 'DRAFT', versionNumber: 3 },
      { id: 'a1', lifecycle: 'APPROVED', versionNumber: 2 },
      { id: 'p1', lifecycle: 'PRESENTED', versionNumber: 1 },
    ];
    expect(selectPreMatchPresentationVersion(versions)?.id).toBe('p1');
    const onlyApproved = [
      { id: 'd2', lifecycle: 'DRAFT', versionNumber: 2 },
      { id: 'a2', lifecycle: 'APPROVED', versionNumber: 1 },
    ];
    expect(selectPreMatchPresentationVersion(onlyApproved)?.id).toBe('a2');
  });

  it('ordem de clips deduplica mantendo sequência', () => {
    expect(orderedSelectedClipIds(['c1', 'c2', 'c1', 'c3'])).toEqual(['c1', 'c2', 'c3']);
  });

  it('seções ocultas não entram na apresentação', () => {
    const keys = presentationSectionKeys(['jogo', 'clips_selecionados']);
    expect(keys).not.toContain('jogo');
    expect(keys).toContain('adversario');
  });
});
