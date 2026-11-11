import { Injectable } from '@nestjs/common';
import { ListHostedZonesByNameCommand } from '@aws-sdk/client-route-53';
import type { PublicDomainDnsCapability } from './public-domain-dns-instruction.model';
import { createPublicDomainAwsClients } from './public-domain-aws.clients';
import { loadPublicDomainAwsConfig } from './public-domain-aws.config';
import { validatePublicDomainAwsRuntimeConfig } from './public-domain-aws.runtime';
import { classifyPublicDomainDnsCapability } from './public-domain-hosted-zone.util';
import {
  findMostSpecificPublicHostedZone,
  hostedZoneLookupDnsName,
} from './public-domain-route53-discovery.util';

export type DnsCapabilityContext = {
  capability: PublicDomainDnsCapability;
  hostedZoneId: string | null;
  zoneName: string | null;
};

@Injectable()
export class PublicDomainDnsCapabilityService {
  async resolveForHostname(hostnameNormalized: string): Promise<DnsCapabilityContext> {
    const cfg = loadPublicDomainAwsConfig();
    if (!cfg.enabled) {
      return { capability: 'EXTERNAL_DNS', hostedZoneId: null, zoneName: null };
    }
    const runtime = validatePublicDomainAwsRuntimeConfig(cfg);
    if (!runtime.ok) {
      return { capability: 'UNAVAILABLE', hostedZoneId: null, zoneName: null };
    }

    let hostedZoneId: string | null = null;
    let zoneName: string | null = null;

    try {
      const { r53 } = createPublicDomainAwsClients(cfg);
      const listed = await r53.send(
        new ListHostedZonesByNameCommand({
          DNSName: hostedZoneLookupDnsName(hostnameNormalized),
          MaxItems: 100,
        }),
      );
      const match = findMostSpecificPublicHostedZone(
        listed.HostedZones ?? [],
        hostnameNormalized,
      );
      if (match) {
        hostedZoneId = match.hostedZoneId;
        zoneName = match.zoneName;
      }
    } catch {
      return { capability: 'UNAVAILABLE', hostedZoneId: null, zoneName: null };
    }

    const capability = classifyPublicDomainDnsCapability({
      awsEnabled: true,
      runtimeOk: true,
      route53ManageDns: cfg.route53ManageDns,
      hostedZoneId,
      allowedZoneIds: cfg.route53AllowedHostedZoneIds,
    });

    return { capability, hostedZoneId, zoneName };
  }
}
