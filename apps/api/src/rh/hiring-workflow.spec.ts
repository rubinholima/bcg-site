import { canTransition, flowForContractType, HIRING_STATUS } from './hiring-workflow.constants';

describe('hiring-workflow', () => {
  it('PJ pula etapas médicas', () => {
    const pj = flowForContractType('PJ');
    const clt = flowForContractType('CLT');
    expect(pj).not.toContain(HIRING_STATUS.MEDICAL_SCHEDULED);
    expect(clt).toContain(HIRING_STATUS.MEDICAL_SCHEDULED);
  });

  it('transição sequencial CLT', () => {
    expect(canTransition('CLT', HIRING_STATUS.DRAFT, HIRING_STATUS.SUBMITTED)).toBe(true);
    expect(canTransition('CLT', HIRING_STATUS.DRAFT, HIRING_STATUS.ADMITTED)).toBe(false);
    expect(canTransition('CLT', HIRING_STATUS.HR_ANALYSIS, HIRING_STATUS.CANCELLED)).toBe(true);
  });
});
