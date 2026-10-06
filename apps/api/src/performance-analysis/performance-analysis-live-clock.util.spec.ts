import {
  applyClockCommand,
  effectiveClockSeconds,
  parseLiveClock,
} from './performance-analysis-live-clock.util';

describe('performance-analysis-live-clock.util', () => {
  it('calcula segundos efetivos com relógio rodando', () => {
    const state = parseLiveClock({
      running: true,
      period: '1T',
      clockSeconds: 100,
      anchorAt: 1000,
    });
    expect(effectiveClockSeconds(state, 6000)).toBe(105);
  });

  it('comandos de período e relógio manual', () => {
    const base = parseLiveClock({ running: true, period: '1T', clockSeconds: 10, anchorAt: 0 });
    const paused = applyClockCommand(base, { action: 'pause' }, 5000);
    expect(paused.running).toBe(false);
    expect(paused.clockSeconds).toBeGreaterThanOrEqual(10);
    const period = applyClockCommand(paused, { action: 'set_period', period: '2T' }, 5000);
    expect(period.period).toBe('2T');
  });
});
