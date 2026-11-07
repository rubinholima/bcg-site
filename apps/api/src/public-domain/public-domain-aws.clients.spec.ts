import { ACMClient } from '@aws-sdk/client-acm';
import { CloudFrontClient } from '@aws-sdk/client-cloudfront';
import { Route53Client } from '@aws-sdk/client-route-53';
import { createPublicDomainAwsClients } from './public-domain-aws.clients';
import type { PublicDomainAwsConfig } from './public-domain-aws.config';

jest.mock('@aws-sdk/client-acm', () => ({
  ACMClient: jest.fn().mockImplementation((opts) => ({ __kind: 'acm', opts })),
}));
jest.mock('@aws-sdk/client-cloudfront', () => ({
  CloudFrontClient: jest.fn().mockImplementation((opts) => ({ __kind: 'cf', opts })),
}));
jest.mock('@aws-sdk/client-route-53', () => ({
  Route53Client: jest.fn().mockImplementation((opts) => ({ __kind: 'r53', opts })),
}));

describe('createPublicDomainAwsClients', () => {
  it('injeta credenciais dedicadas apenas nos clientes do módulo', () => {
    const cfg: PublicDomainAwsConfig = {
      enabled: true,
      dedicatedCredentials: {
        accessKeyId: 'AKIADEDICATEDKEY01',
        secretAccessKey: 'dedicated-secret',
        sessionToken: 'token-session',
      },
      region: 'us-east-1',
      acmCertificateRegion: 'us-east-1',
      originDomain: 'origin.example.com',
      edgeSignatureSecret: 'x',
      route53ManageDns: false,
      route53AllowedHostedZoneIds: [],
    };
    const clients = createPublicDomainAwsClients(cfg);
    expect(clients.acm).toMatchObject({
      opts: {
        region: 'us-east-1',
        credentials: {
          accessKeyId: 'AKIADEDICATEDKEY01',
          secretAccessKey: 'dedicated-secret',
          sessionToken: 'token-session',
        },
      },
    });
    expect(ACMClient).toHaveBeenCalled();
    expect(CloudFrontClient).toHaveBeenCalled();
    expect(Route53Client).toHaveBeenCalled();
    expect(clients.cf).toBeDefined();
    expect(clients.r53).toBeDefined();
  });

  it('sem credenciais dedicadas não define credentials no SDK client', () => {
    jest.clearAllMocks();
    const cfg: PublicDomainAwsConfig = {
      enabled: true,
      dedicatedCredentials: null,
      region: 'us-east-1',
      acmCertificateRegion: 'us-east-1',
      originDomain: 'origin.example.com',
      edgeSignatureSecret: null,
      route53ManageDns: false,
      route53AllowedHostedZoneIds: [],
    };
    createPublicDomainAwsClients(cfg);
    const cfCall = (CloudFrontClient as unknown as jest.Mock).mock.calls[0][0];
    expect(cfCall.credentials).toBeUndefined();
  });
});
