import {
  pitchZoneCentroid,
  resolvePitchZoneFromXY,
  buildZoneHeatCounts,
} from './analysis-pitch-zones.util';

describe('analysis pitch zones', () => {
  it('resolvePitchZoneFromXY — terços e corredores', () => {
    expect(resolvePitchZoneFromXY(0.1, 0.1)).toBe('esq_ultimo');
    expect(resolvePitchZoneFromXY(0.5, 0.5)).toBe('cent_meio');
    expect(resolvePitchZoneFromXY(0.9, 0.9)).toBe('dir_primeira');
  });

  it('pitchZoneCentroid dentro da célula', () => {
    const c = pitchZoneCentroid('cent_meio');
    expect(c.x).toBeCloseTo(0.5, 1);
    expect(c.y).toBeCloseTo(0.5, 1);
  });

  it('buildZoneHeatCounts usa fieldZoneKey', () => {
    const counts = buildZoneHeatCounts([
      { fieldZoneKey: 'cent_ultimo' },
      { fieldZoneKey: 'cent_ultimo' },
      { fieldX: 0.9, fieldY: 0.9 },
    ]);
    expect(counts.cent_ultimo).toBe(2);
    expect(counts.dir_primeira).toBe(1);
  });
});
