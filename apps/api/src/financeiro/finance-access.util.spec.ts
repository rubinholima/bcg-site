import { hasFinanceCapability } from './finance-access.util';

describe('finance-access.util', () => {
  it('adm_financeiro implica finance_view', () => {
    expect(hasFinanceCapability(['adm_financeiro'], 'finance_view')).toBe(true);
    expect(hasFinanceCapability(['adm_financeiro'], 'finance_pay')).toBe(true);
  });

  it('finance_create não concede finance_pay', () => {
    expect(hasFinanceCapability(['finance_create'], 'finance_create')).toBe(true);
    expect(hasFinanceCapability(['finance_create'], 'finance_pay')).toBe(false);
  });

  it('finance_bank_data_view isolado', () => {
    expect(hasFinanceCapability(['finance_bank_data_view'], 'finance_bank_data_view')).toBe(true);
    expect(hasFinanceCapability(['finance_view'], 'finance_bank_data_view')).toBe(false);
  });
});
