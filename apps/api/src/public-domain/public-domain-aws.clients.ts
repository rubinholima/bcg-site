import { ACMClient } from '@aws-sdk/client-acm';
import { CloudFrontClient } from '@aws-sdk/client-cloudfront';
import { Route53Client } from '@aws-sdk/client-route-53';
import type { PublicDomainAwsConfig } from './public-domain-aws.config';

export type PublicDomainAwsClients = {
  acm: ACMClient;
  cf: CloudFrontClient;
  r53: Route53Client;
};

function baseClientOptions(cfg: PublicDomainAwsConfig): {
  region?: string;
  credentials?: { accessKeyId: string; secretAccessKey: string; sessionToken?: string };
} {
  const creds = cfg.dedicatedCredentials;
  const out: {
    region?: string;
    credentials?: { accessKeyId: string; secretAccessKey: string; sessionToken?: string };
  } = {};
  if (creds?.accessKeyId?.trim() && creds.secretAccessKey?.trim()) {
    out.credentials = {
      accessKeyId: creds.accessKeyId.trim(),
      secretAccessKey: creds.secretAccessKey.trim(),
      sessionToken: creds.sessionToken?.trim() || undefined,
    };
  }
  return out;
}

/** Clientes AWS usados exclusivamente pelo provisionador de domínios públicos. */
export function createPublicDomainAwsClients(cfg: PublicDomainAwsConfig): PublicDomainAwsClients {
  const shared = baseClientOptions(cfg);
  return {
    acm: new ACMClient({ ...shared, region: cfg.acmCertificateRegion }),
    cf: new CloudFrontClient({ ...shared, region: 'us-east-1' }),
    r53: new Route53Client({ ...shared, region: cfg.region || 'us-east-1' }),
  };
}
