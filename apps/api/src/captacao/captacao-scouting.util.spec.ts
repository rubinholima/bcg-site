import {
  averageDimensionRating,
  buildSchedulerNotificationMessage,
  buildWhatsAppNotifyUrl,
  computeReportDimensionRatings,
  enrichProspectDisplay,
  isProspectInCtQueue,
  resolveEffectiveRatings,
  resolveProspectObservation,
} from './captacao-scouting.util';

describe('captacao-scouting.util', () => {
  it('averageDimensionRating', () => {
    expect(
      averageDimensionRating({
        a: { rating: 8 },
        b: { rating: 6 },
      }),
    ).toBe(7);
  });

  it('computeReportDimensionRatings', () => {
    const result = computeReportDimensionRatings({
      technical: { a: { rating: 8 } },
      tactical: { b: { rating: 7 } },
      physical: { c: { rating: 9 } },
      mental: { d: { rating: 6 } },
    });
    expect(result).toEqual({
      technicalRating: 8,
      tacticalRating: 7,
      physicalRating: 9,
      cognitiveRating: 6,
    });
  });

  it('buildWhatsAppNotifyUrl', () => {
    const url = buildWhatsAppNotifyUrl('teste', '33984133636');
    expect(url).toContain('wa.me/5533984133636');
    expect(url).toContain('text=');
    expect(buildWhatsAppNotifyUrl('teste', null)).toBeNull();
  });

  it('resolveEffectiveRatings usa fallback do último relatório', () => {
    const result = resolveEffectiveRatings(
      { overallRating: null, technicalRating: null },
      { overallRating: 8, technicalRating: 7 },
    );
    expect(result.overallRating).toBe(8);
    expect(result.technicalRating).toBe(7);
  });

  it('resolveProspectObservation prioriza descriptiveObservation', () => {
    const text = resolveProspectObservation(
      { descriptiveObservation: 'Nota do prospect' },
      { scoutNotes: 'Nota do relatório' },
    );
    expect(text).toBe('Nota do prospect');
  });

  it('isProspectInCtQueue', () => {
    expect(
      isProspectInCtQueue({ stage: 'tryout', evaluationOutcome: 'pendente' }),
    ).toBe(true);
    expect(
      isProspectInCtQueue({ stage: 'recusado', evaluationOutcome: 'para_teste' }),
    ).toBe(false);
    expect(
      isProspectInCtQueue({
        stage: 'prioridade',
        evaluationOutcome: 'para_teste',
        ctScheduleStatus: 'concluido',
      }),
    ).toBe(false);
  });

  it('enrichProspectDisplay', () => {
    const enriched = enrichProspectDisplay({
      stage: 'tryout',
      evaluationOutcome: 'para_teste',
      reports: [{ overallRating: 7.5, scoutNotes: 'Bom jogo' }],
    });
    expect(enriched.overallRating).toBe(7.5);
    expect(enriched.inCtQueue).toBe(true);
    expect(enriched.effectiveCtScheduleStatus).toBe('nao_agendado');
  });

  it('buildSchedulerNotificationMessage', () => {
    const msg = buildSchedulerNotificationMessage({
      prospectName: 'João',
      evaluationOutcome: 'para_teste',
    });
    expect(msg).toContain('João');
    expect(msg).toContain('Para teste');
  });
});
