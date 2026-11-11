import type { Change } from '@aws-sdk/client-route-53';
import { formatOwnershipTxtChallenge } from './public-domain-ownership-challenge.util';
import { verificationTxtRecordName } from './public-domain.hostname.util';
import { isCup360ManagedWebRecord } from './aws-route53-record-safety.util';

function fqdn(name: string): string {
  const n = name.trim().replace(/\s/g, '');
  if (!n) return n;
  return n.endsWith('.') ? n : `${n}.`;
}

/**
 * Plano UPSERT do TXT de ownership — apenas zonas autorizadas; sem lógica BCFC.
 */
export function planOwnershipTxtUpsert(params: {
  hostnameNormalized: string;
  verificationToken: string;
  zoneName: string;
}): Change | null {
  const recordName = fqdn(verificationTxtRecordName(params.hostnameNormalized));
  const txtValue = formatOwnershipTxtChallenge(params.verificationToken);
  if (!isCup360ManagedWebRecord(recordName, 'TXT', params.zoneName)) {
    return null;
  }
  return {
    Action: 'UPSERT',
    ResourceRecordSet: {
      Name: recordName,
      Type: 'TXT',
      TTL: 300,
      ResourceRecords: [{ Value: `"${txtValue}"` }],
    },
  };
}
