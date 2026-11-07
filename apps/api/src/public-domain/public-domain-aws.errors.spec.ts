import { sanitizePublicDomainAwsErrorMessage } from './public-domain-aws.errors';

describe('sanitizePublicDomainAwsErrorMessage', () => {
  it('não expõe access key em mensagens', () => {
    const msg = sanitizePublicDomainAwsErrorMessage(
      new Error('Auth failure for AKIA0123456789ABCDEF'),
    );
    expect(msg).toContain('[REDACTED_ACCESS_KEY]');
    expect(msg).not.toContain('AKIA0123456789ABCDEF');
  });
});
