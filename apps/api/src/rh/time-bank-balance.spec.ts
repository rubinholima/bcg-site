import { deriveTimeBankBalanceHours } from './time-bank.util';

describe('time-bank derived balance', () => {
  it('soma créditos e subtrai débitos', () => {
    const balance = deriveTimeBankBalanceHours([
      { movementType: 'CREDIT', hours: 100 },
      { movementType: 'DEBIT', hours: 24 },
    ]);
    expect(balance).toBe(76);
  });
});
