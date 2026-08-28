import { resolveSubstitutionResolution, clockToSortSeconds } from './match-official-event.ordering';

describe('match-official-event.ordering', () => {
  it('preserva acréscimo no sort (47:00 > 45:00)', () => {
    expect(clockToSortSeconds('47:00')).toBeGreaterThan(clockToSortSeconds('45:00'));
    expect(clockToSortSeconds('45:01')).toBeGreaterThan(clockToSortSeconds('45:00'));
  });

  it('substituição partial quando só saída resolve', () => {
    const r = resolveSubstitutionResolution({
      out: { resolutionStatus: 'resolved' },
      in: { resolutionStatus: 'unresolved' },
    });
    expect(r.resolutionStatus).toBe('partial');
    expect(r.relatedResolutionStatus).toBe('unresolved');
  });

  it('substituição resolved quando ambos resolvem', () => {
    const r = resolveSubstitutionResolution({
      out: { resolutionStatus: 'resolved' },
      in: { resolutionStatus: 'resolved' },
    });
    expect(r.resolutionStatus).toBe('resolved');
  });

  it('substituição ambiguous prevalece', () => {
    const r = resolveSubstitutionResolution({
      out: { resolutionStatus: 'resolved' },
      in: { resolutionStatus: 'ambiguous' },
    });
    expect(r.resolutionStatus).toBe('ambiguous');
  });
});
