import { hasRhCapability } from './rh-access.util';

describe('rh-access.util', () => {
  it('adm_rh concede compensação mas usuário só com slug granular também', () => {
    expect(hasRhCapability(['adm_rh'], 'rh_compensation_manage')).toBe(true);
    expect(hasRhCapability(['rh_compensation_view'], 'rh_compensation_view')).toBe(true);
    expect(hasRhCapability(['rh_compensation_view'], 'rh_compensation_manage')).toBe(false);
  });

  it('company_admin tem tudo', () => {
    expect(hasRhCapability([], 'rh_bank_manage', 'company_admin')).toBe(true);
  });
});
