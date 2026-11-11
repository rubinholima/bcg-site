import type { Change } from '@aws-sdk/client-route-53';
import { loadPublicDomainAwsConfig } from './public-domain-aws.config';
import {
  hostnameBelongsToPublicZone,
  findMostSpecificPublicHostedZone,
} from './public-domain-route53-discovery.util';
import {
  isCup360ManagedWebRecord,
  isProtectedTxtContent,
} from './aws-route53-record-safety.util';
import { isHostedZoneAuthorized } from './public-domain-hosted-zone.util';
import type { DnsInstructionPurpose } from './public-domain-dns-instruction.model';

export type Route53MutationPurpose = DnsInstructionPurpose;

export type Route53WriteGuardContext = {
  hostnameNormalized: string;
  hostedZoneId: string;
  zoneName: string;
  purpose: Route53MutationPurpose;
};

export class Route53WriteGuardError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'Route53WriteGuardError';
  }
}

function assertPurposeRecordType(purpose: Route53MutationPurpose, type: string): void {
  const t = type.toUpperCase();
  if (purpose === 'OWNERSHIP' && t !== 'TXT') {
    throw new Route53WriteGuardError('ROUTE53_GUARD_TYPE', 'Ownership permite apenas TXT.');
  }
  if (purpose === 'ACM_VALIDATION' && t !== 'CNAME') {
    throw new Route53WriteGuardError('ROUTE53_GUARD_TYPE', 'ACM validation permite apenas CNAME.');
  }
  if (purpose === 'WEB_ALIAS' && t !== 'A' && t !== 'ALIAS') {
    throw new Route53WriteGuardError('ROUTE53_GUARD_TYPE', 'WEB alias permite apenas A/ALIAS.');
  }
}

/** Valida mutação Route53 — chamar dentro de cada write. */
export function assertRoute53WriteAllowed(ctx: Route53WriteGuardContext, change: Change): void {
  const cfg = loadPublicDomainAwsConfig();
  if (!cfg.enabled || !cfg.route53ManageDns) {
    throw new Route53WriteGuardError('ROUTE53_MANAGE_DISABLED', 'Route53 gerenciado desabilitado.');
  }
  if (!isHostedZoneAuthorized(ctx.hostedZoneId, cfg.route53AllowedHostedZoneIds)) {
    throw new Route53WriteGuardError('ROUTE53_ZONE_UNAUTHORIZED', 'Hosted zone não autorizada.');
  }
  if (!hostnameBelongsToPublicZone(ctx.hostnameNormalized, ctx.zoneName)) {
    throw new Route53WriteGuardError('ROUTE53_HOST_OUTSIDE_ZONE', 'Hostname não pertence à zona.');
  }

  const rrs = change.ResourceRecordSet;
  if (!rrs?.Name || !rrs.Type) {
    throw new Route53WriteGuardError('ROUTE53_GUARD_INVALID', 'Change incompleto.');
  }

  assertPurposeRecordType(ctx.purpose, rrs.Type);

  if (!isCup360ManagedWebRecord(rrs.Name, rrs.Type, ctx.zoneName)) {
    throw new Route53WriteGuardError('ROUTE53_GUARD_UNSAFE_NAME', 'Nome de registro bloqueado pela política CUP360.');
  }

  if (rrs.Type === 'TXT' && rrs.ResourceRecords?.length) {
    const joined = rrs.ResourceRecords.map((x) => x.Value ?? '').join(' ');
    if (isProtectedTxtContent(joined)) {
      throw new Route53WriteGuardError('ROUTE53_GUARD_MAIL_TXT', 'TXT protegido (SPF/DMARC/DKIM).');
    }
    if (ctx.purpose === 'OWNERSHIP' && !joined.includes('cup360-verify=')) {
      throw new Route53WriteGuardError('ROUTE53_GUARD_OWNERSHIP', 'TXT de ownership inválido.');
    }
  }
}

export function assertHostedZoneMatchesHostname(
  zones: Parameters<typeof findMostSpecificPublicHostedZone>[0],
  hostnameNormalized: string,
  expectedZoneId: string,
): void {
  const match = findMostSpecificPublicHostedZone(zones, hostnameNormalized);
  if (!match || match.hostedZoneId !== expectedZoneId) {
    throw new Route53WriteGuardError(
      'ROUTE53_ZONE_MISMATCH',
      'Zona hospedada não corresponde ao hostname público.',
    );
  }
}
