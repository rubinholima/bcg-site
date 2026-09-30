import { emptyTryoutBilateralTests } from '../fisioterapia/physio-tryout-clearance.constants';
import { resolveTryoutBlockReason, validateTryoutBilateralTestsComplete } from './tryout-workflow.util';

describe('validateTryoutBilateralTestsComplete', () => {
  it('rejeita testes incompletos', () => {
    expect(validateTryoutBilateralTestsComplete({})).toMatch(/squeeze_test/);
  });

  it('resolveTryoutBlockReason — fisio temporária', () => {
    expect(
      resolveTryoutBlockReason({
        prospect: { supervisionDocsValidatedAt: new Date() },
        physioStatus: 'temporario_nao_liberado',
      }),
    ).toMatch(/reavaliação/i);
  });

  it('aceita todos os lados preenchidos', () => {
    const tests = emptyTryoutBilateralTests();
    for (const key of Object.keys(tests)) {
      tests[key as keyof typeof tests] = {
        right: { response: 'normal', outcome: 'aprovado' },
        left: { response: 'normal', outcome: 'aprovado' },
      };
    }
    expect(validateTryoutBilateralTestsComplete(tests)).toBeNull();
  });
});
