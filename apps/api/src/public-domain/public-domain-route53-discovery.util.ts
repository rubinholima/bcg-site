import type { HostedZone } from '@aws-sdk/client-route-53';
import { stripRoute53HostedZoneId } from './public-domain-hosted-zone.util';

function stripDot(s: string): string {
  return s.replace(/\.$/, '').toLowerCase();
}

/** Hostname pertence à zona DNS (ex.: www.foo.com em foo.com.). */
export function hostnameBelongsToPublicZone(hostnameNormalized: string, zoneName: string): boolean {
  const host = stripDot(hostnameNormalized);
  const zone = stripDot(zoneName);
  return host === zone || host.endsWith(`.${zone}`);
}

/**
 * Escolhe a zona hospedada pública mais específica para o hostname (exclui PrivateZone).
 */
export function findMostSpecificPublicHostedZone(
  zones: HostedZone[],
  hostnameNormalized: string,
): { hostedZoneId: string; zoneName: string } | null {
  const host = stripDot(hostnameNormalized);
  let best: { hostedZoneId: string; zoneName: string; labelCount: number } | null = null;

  for (const z of zones) {
    if (!z.Name || !z.Id) continue;
    if (z.Config?.PrivateZone) continue;
    const zoneName = String(z.Name);
    const zoneBare = stripDot(zoneName);
    if (!hostnameBelongsToPublicZone(host, zoneBare)) continue;
    const labels = zoneBare.split('.').length;
    if (!best || labels > best.labelCount) {
      best = {
        hostedZoneId: stripRoute53HostedZoneId(z.Id),
        zoneName,
        labelCount: labels,
      };
    }
  }
  return best ? { hostedZoneId: best.hostedZoneId, zoneName: best.zoneName } : null;
}

/** Sufixo DNS para ListHostedZonesByName — caminho completo do hostname. */
export function hostedZoneLookupDnsName(hostnameNormalized: string): string {
  const host = stripDot(hostnameNormalized);
  return `${host}.`;
}
