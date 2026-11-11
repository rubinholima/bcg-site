import type { PublicDomainDnsCapability } from './public-domain-dns-instruction.model';

/** Nome da zona pai (ex.: www.foo.com → foo.com.) para ListHostedZonesByName. */
export function zoneParentFqdn(hostnameNormalized: string): string {
  const parts = hostnameNormalized.split('.');
  if (parts.length < 2) return `${hostnameNormalized}.`;
  return `${parts.slice(-2).join('.')}.`;
}

export function stripRoute53HostedZoneId(id: string): string {
  return id.replace(/^\/hostedzone\//, '');
}

/** Zona autorizada explicitamente na configuração CUP360 (multi-zone). */
export function isHostedZoneAuthorized(hostedZoneId: string | null | undefined, allowedIds: string[]): boolean {
  if (!hostedZoneId?.trim()) return false;
  const id = hostedZoneId.trim();
  const set = new Set(allowedIds.map((z) => z.trim()).filter(Boolean));
  return set.has(id);
}

/** Classificação pura (testável sem AWS). */
export function classifyPublicDomainDnsCapability(params: {
  awsEnabled: boolean;
  runtimeOk: boolean;
  route53ManageDns: boolean;
  hostedZoneId: string | null;
  allowedZoneIds: string[];
}): PublicDomainDnsCapability {
  if (!params.awsEnabled) return 'EXTERNAL_DNS';
  if (!params.runtimeOk) return 'UNAVAILABLE';
  if (!params.hostedZoneId) return 'EXTERNAL_DNS';
  if (
    params.route53ManageDns &&
    isHostedZoneAuthorized(params.hostedZoneId, params.allowedZoneIds)
  ) {
    return 'MANAGED_ROUTE53';
  }
  return 'EXTERNAL_DNS';
}
