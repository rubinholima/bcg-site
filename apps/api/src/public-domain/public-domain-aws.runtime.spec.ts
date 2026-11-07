import { validatePublicDomainAwsRuntimeConfig } from './public-domain-aws.runtime';
import type { PublicDomainAwsConfig } from './public-domain-aws.config';

function baseCfg(over: Partial<PublicDomainAwsConfig> = {}): PublicDomainAwsConfig {
  return {
    enabled: true,
    dedicatedCredentials: {
      accessKeyId: 'AKIATESTKEY0000001',
      secretAccessKey: 'secret-value-not-in-errors',
      sessionToken: null,
    },
    region: 'us-east-1',
    acmCertificateRegion: 'us-east-1',
    originDomain: 'origin.bostoncitygroup.biz',
    edgeSignatureSecret: 'edge',
    route53ManageDns: true,
    route53AllowedHostedZoneIds: ['Z1'],
    ...over,
  };
}

describe('validatePublicDomainAwsRuntimeConfig', () => {
  const prevNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = prevNodeEnv;
  });

  it('ok quando AWS desabilitado', () => {
    expect(validatePublicDomainAwsRuntimeConfig(baseCfg({ enabled: false }))).toEqual({ ok: true });
  });

  it('falha com par incompleto de credenciais', () => {
    const v = validatePublicDomainAwsRuntimeConfig(
      baseCfg({
        dedicatedCredentials: { accessKeyId: 'AKIATEST', secretAccessKey: null, sessionToken: null },
      }),
    );
    expect(v.ok).toBe(false);
    if (!v.ok) {
      expect(v.lastErrorCode).toBe('DEDICATED_CREDENTIALS_INCOMPLETE');
      expect(v.lastErrorMessage).not.toMatch(/secret-value/);
    }
  });

  it('produção exige credenciais dedicadas', () => {
    process.env.NODE_ENV = 'production';
    const v = validatePublicDomainAwsRuntimeConfig(
      baseCfg({ dedicatedCredentials: null }),
    );
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.lastErrorCode).toBe('DEDICATED_CREDENTIALS_REQUIRED');
  });

  it('dev permite credencial default chain quando dedicadas ausentes', () => {
    process.env.NODE_ENV = 'development';
    expect(validatePublicDomainAwsRuntimeConfig(baseCfg({ dedicatedCredentials: null }))).toEqual({
      ok: true,
    });
  });
});
