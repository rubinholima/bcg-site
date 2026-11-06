import type { Change, ResourceRecordSet } from '@aws-sdk/client-route-53';
import { isCup360ManagedWebRecord } from './aws-route53-record-safety.util';

export type DnsRecordSnapshot = {
  name: string;
  type: string;
  ttl?: number;
  records?: string[];
  aliasDns?: string;
  aliasZoneId?: string;
};

/**
 * Monta fases de ChangeResourceRecordSets para transição segura CNAME → ALIAS A.
 * Não executa mutação — só retorna o plano.
 */
export function planWebAliasTransition(params: {
  zoneName: string;
  hostedZoneId: string;
  hostnames: string[];
  cloudFrontDnsName: string;
  existingAtName: (name: string) => ResourceRecordSet[];
}): { phases: Change[][]; diagnostics: string[] } {
  const cfZone = 'Z2FDTNDATAQYW2';
  const diagnostics: string[] = [];
  const phases: Change[][] = [];

  const deletes: Change[] = [];
  const upserts: Change[] = [];

  for (const h of params.hostnames) {
    const recordName = h.endsWith('.') ? h : `${h}.`;
    if (!isCup360ManagedWebRecord(recordName, 'A', params.zoneName)) {
      diagnostics.push(`skip_unsafe_name:${recordName}`);
      continue;
    }

    const existing = params.existingAtName(recordName);
    const hasCname = existing.some((r) => r.Type === 'CNAME');
    const hasAliasA = existing.some(
      (r) =>
        r.Type === 'A' &&
        r.AliasTarget?.DNSName?.toLowerCase().includes('cloudfront.net'),
    );

    if (hasCname) {
      const cname = existing.find((r) => r.Type === 'CNAME');
      if (cname) {
        deletes.push({
          Action: 'DELETE',
          ResourceRecordSet: {
            Name: cname.Name,
            Type: 'CNAME',
            TTL: cname.TTL,
            ResourceRecords: cname.ResourceRecords,
          },
        });
        diagnostics.push(`will_delete_cname:${recordName}`);
      }
    }

    if (!hasAliasA) {
      upserts.push({
        Action: 'UPSERT',
        ResourceRecordSet: {
          Name: recordName,
          Type: 'A',
          AliasTarget: {
            DNSName: params.cloudFrontDnsName.endsWith('.')
              ? params.cloudFrontDnsName
              : `${params.cloudFrontDnsName}.`,
            EvaluateTargetHealth: false,
            HostedZoneId: cfZone,
          },
        },
      });
      diagnostics.push(`will_upsert_alias_a:${recordName}`);
    } else {
      diagnostics.push(`alias_already_cf:${recordName}`);
    }
  }

  if (deletes.length) phases.push(deletes);
  if (upserts.length) phases.push(upserts);

  return { phases, diagnostics };
}
