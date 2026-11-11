import type { ResourceRecordSet } from '@aws-sdk/client-route-53';
import { resolveCname } from 'dns/promises';

function normHost(name: string): string {
  return name.replace(/\.$/, '').toLowerCase();
}

/** Registro A/ALIAS na zona aponta para o domínio CloudFront esperado. */
export function webAliasRecordPointsToDistribution(
  records: ResourceRecordSet[],
  hostname: string,
  expectedDistributionDomain: string,
): boolean {
  const target = normHost(hostname);
  const expected = normHost(expectedDistributionDomain);
  for (const r of records) {
    if (normHost(String(r.Name ?? '')) !== target) continue;
    const alias = r.AliasTarget?.DNSName;
    if (alias && normHost(alias) === expected) return true;
    if (r.Type === 'CNAME' && r.ResourceRecords?.[0]?.Value) {
      if (normHost(String(r.ResourceRecords[0].Value)) === expected) return true;
    }
  }
  return false;
}

export async function publicDnsResolvesToCloudFront(
  hostname: string,
  expectedDistributionDomain: string,
): Promise<boolean> {
  const expected = normHost(expectedDistributionDomain);
  try {
    const cnames = await resolveCname(hostname);
    return cnames.some((c) => normHost(c) === expected);
  } catch {
    return false;
  }
}

export function managedWebAliasesReady(
  hostnames: string[],
  expectedDistributionDomain: string,
  recordsByName: (name: string) => ResourceRecordSet[],
): boolean {
  return hostnames.every((h) =>
    webAliasRecordPointsToDistribution(recordsByName(h), h, expectedDistributionDomain),
  );
}
