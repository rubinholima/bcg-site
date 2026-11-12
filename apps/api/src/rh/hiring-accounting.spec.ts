import { canTransition, HIRING_STATUS } from './hiring-workflow.constants';

describe('hiring accounting handoff flow', () => {
  it('permite envio após pronto contabilidade', () => {
    expect(
      canTransition('CLT', HIRING_STATUS.READY_ACCOUNTING, HIRING_STATUS.SENT_ACCOUNTING),
    ).toBe(true);
  });

  it('permite retorno com correção', () => {
    expect(
      canTransition('CLT', HIRING_STATUS.AWAITING_ACCOUNTING, HIRING_STATUS.CORRECTION_REQUESTED),
    ).toBe(true);
  });
});
