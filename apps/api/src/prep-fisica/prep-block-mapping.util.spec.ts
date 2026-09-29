import {
  decodePrepBlockFields,
  encodePrepBlockFields,
  normalizeIndepBlockGroupId,
} from './prep-block-mapping.util';

describe('prep-block-mapping', () => {
  it('sessão separada com agenda usa prep-indep para não agrupar por agenda', () => {
    const enc = encodePrepBlockFields({
      mode: 'separate',
      sessionId: 's1',
      agendaEntryId: 'ag1',
    });
    expect(enc.blockGroupId).toBe('prep-indep:s1');
    expect(enc.blockSequence).toBe(0);
  });

  it('simultâneo com agenda não usa blockGroupId (dedupe por agenda)', () => {
    const enc = encodePrepBlockFields({
      mode: 'simultaneous',
      sessionId: 's1',
      agendaEntryId: 'ag1',
    });
    expect(enc.blockGroupId).toBeNull();
  });

  it('sequencial define blockSequence', () => {
    const enc = encodePrepBlockFields({
      mode: 'sequential',
      sessionId: 's1',
      sequentialOrder: 2,
    });
    expect(enc.blockSequence).toBe(2);
    expect(enc.blockGroupId).toBeNull();
  });

  it('decode simultâneo por agenda', () => {
    const d = decodePrepBlockFields({
      id: 's1',
      agendaEntryId: 'ag1',
      blockGroupId: null,
      blockSequence: 0,
    });
    expect(d.mode).toBe('simultaneous');
  });

  it('normaliza prep-indep após create', () => {
    expect(normalizeIndepBlockGroupId('prep-indep:draft', 'real-id')).toBe('prep-indep:real-id');
  });
});
