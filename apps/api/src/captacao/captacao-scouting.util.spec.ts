import {
  averageDimensionRating,
  buildSchedulerNotificationMessage,
  buildWhatsAppNotifyUrl,
  computeReportDimensionRatings,
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
    const url = buildWhatsAppNotifyUrl('teste');
    expect(url).toContain('wa.me/5533984133636');
    expect(url).toContain('text=');
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
