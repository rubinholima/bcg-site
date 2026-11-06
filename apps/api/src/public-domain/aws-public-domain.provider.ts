import { Injectable, Logger } from '@nestjs/common';
import { ACMClient, DescribeCertificateCommand, RequestCertificateCommand } from '@aws-sdk/client-acm';
import {
  CloudFrontClient,
  CreateInvalidationCommand,
  GetDistributionCommand,
  GetDistributionConfigCommand,
  UpdateDistributionCommand,
} from '@aws-sdk/client-cloudfront';
import { ChangeResourceRecordSetsCommand, ListHostedZonesByNameCommand, Route53Client } from '@aws-sdk/client-route-53';
import type { PublicDomainSslStatus, PublicDomainVerificationStatus } from '@prisma/client';
import { isCup360ManagedWebRecord } from './aws-route53-record-safety.util';
import { loadPublicDomainAwsConfig } from './public-domain-aws.config';
import { hostnamesForCertificate } from './public-domain-dns.util';
import {
  PublicDomainProvisioner,
  type DnsInstruction,
  type ProvisionRequest,
  type ProvisionResult,
} from './public-domain-provisioner.interface';

const TAG_KEY = 'cup360-managed';
const TAG_VALUE = 'public-domain';

/** Hosted zone ID fixo do CloudFront (alias A/AAAA). */
const CLOUDFRONT_HOSTED_ZONE_ID = 'Z2FDTNDATAQYW2';

function stripHostedZoneId(id: string): string {
  return id.replace(/^\/hostedzone\//, '');
}

/** Nome FQDN com ponto final (Route53). */
function fqdn(name: string): string {
  const n = name.trim().replace(/\s/g, '');
  if (!n) return n;
  return n.endsWith('.') ? n : `${n}.`;
}

function zoneParentName(hostnameNormalized: string): string {
  const parts = hostnameNormalized.split('.');
  if (parts.length < 2) return fqdn(hostnameNormalized);
  return fqdn(parts.slice(-2).join('.'));
}

function extractZoneName(zone: { Name?: string } | undefined): string {
  return zone?.Name ? String(zone.Name) : '';
}

@Injectable()
export class AwsPublicDomainProvider extends PublicDomainProvisioner {
  private readonly log = new Logger(AwsPublicDomainProvider.name);
  private readonly r53 = new Route53Client({ region: 'us-east-1' });
  private readonly cf = new CloudFrontClient({ region: 'us-east-1' });

  async provision(request: ProvisionRequest): Promise<ProvisionResult> {
    const cfg = loadPublicDomainAwsConfig();
    if (!cfg.enabled) {
      return {
        provisioningStatus: 'NOT_CONFIGURED',
        lastErrorCode: 'AWS_PROVIDER_DISABLED',
        lastErrorMessage:
          'Provisionamento AWS desativado. Defina CUP360_PUBLIC_DOMAIN_AWS_ENABLED=1 e as variáveis documentadas (sem secrets no repositório).',
      };
    }
    if (!cfg.originDomain || !cfg.sharedDistributionId) {
      return {
        provisioningStatus: 'ERROR',
        lastErrorCode: 'AWS_CONFIG_INCOMPLETE',
        lastErrorMessage:
          'Configure CUP360_PUBLIC_DOMAIN_ORIGIN_DOMAIN e CUP360_PUBLIC_DOMAIN_CLOUDFRONT_ID (distribuição compartilhada).',
      };
    }

    const certRegion = cfg.acmCertificateRegion;
    const acm = new ACMClient({ region: certRegion });
    const sanList = hostnamesForCertificate(request.hostnameNormalized, request.allTenantHostnames);
    const zoneQuery = zoneParentName(request.hostnameNormalized);

    try {
      let certArn = request.persistedCertificateArn ?? null;
      if (!certArn) {
        const created = await acm.send(
          new RequestCertificateCommand({
            DomainName: request.hostnameNormalized,
            SubjectAlternativeNames:
              sanList.length > 1 ? sanList.filter((h) => h !== request.hostnameNormalized) : undefined,
            ValidationMethod: 'DNS',
            Tags: [{ Key: TAG_KEY, Value: TAG_VALUE }],
          }),
        );
        certArn = created.CertificateArn ?? null;
      }
      if (!certArn) {
        return {
          provisioningStatus: 'ERROR',
          sslStatus: 'FAILED',
          lastErrorCode: 'ACM_REQUEST_FAILED',
          lastErrorMessage: 'ACM não retornou ARN do certificado.',
        };
      }

      const described = await acm.send(new DescribeCertificateCommand({ CertificateArn: certArn }));
      const cert = described.Certificate;
      const status = cert?.Status;

      const acmInstructions: DnsInstruction[] = (cert?.DomainValidationOptions ?? [])
        .filter((v) => v.ResourceRecord?.Name && v.ResourceRecord?.Type && v.ResourceRecord?.Value)
        .map((v) => ({
          name: String(v.ResourceRecord!.Name),
          type: String(v.ResourceRecord!.Type),
          value: String(v.ResourceRecord!.Value).replace(/\.$/, ''),
        }));

      const listed = await this.r53.send(
        new ListHostedZonesByNameCommand({ DNSName: zoneQuery, MaxItems: 50 }),
      );
      const matchZone = (listed.HostedZones ?? []).find(
        (z) => z.Name && fqdn(String(z.Name)).toLowerCase() === zoneQuery.toLowerCase(),
      );
      const hostedZoneId = request.persistedHostedZoneId ?? (matchZone?.Id ? stripHostedZoneId(matchZone.Id) : null);
      const zoneNameForSafety = extractZoneName(matchZone) || zoneQuery;

      if (status === 'PENDING_VALIDATION') {
        if (cfg.route53ManageDns && hostedZoneId && cfg.route53AllowedHostedZoneIds.includes(hostedZoneId)) {
          for (const v of acmInstructions) {
            if (v.type !== 'CNAME') continue;
            const recordName = fqdn(v.name);
            if (!isCup360ManagedWebRecord(recordName, 'CNAME', zoneNameForSafety)) {
              return {
                provisioningStatus: 'DNS_PENDING',
                sslStatus: 'PENDING',
                certificateArn: certArn,
                hostedZoneId,
                provisioningStep: 'acm_validation_manual',
                externalDnsInstructions: acmInstructions,
                lastErrorCode: 'ACM_VALIDATION_BLOCKED',
                lastErrorMessage:
                  'Nome de validação ACM não pode ser alterado automaticamente (política CUP360). Crie o CNAME manualmente.',
              };
            }
            await this.r53.send(
              new ChangeResourceRecordSetsCommand({
                HostedZoneId: hostedZoneId,
                ChangeBatch: {
                  Comment: 'CUP360 ACM validation',
                  Changes: [
                    {
                      Action: 'UPSERT',
                      ResourceRecordSet: {
                        Name: recordName,
                        Type: 'CNAME',
                        TTL: 300,
                        ResourceRecords: [{ Value: fqdn(v.value) }],
                      },
                    },
                  ],
                },
              }),
            );
          }
        } else {
          return {
            provisioningStatus: 'DNS_PENDING',
            sslStatus: 'PENDING',
            certificateArn: certArn,
            hostedZoneId,
            provisioningStep: 'acm_validation_cname',
            externalDnsInstructions: acmInstructions,
            lastErrorCode: 'EXTERNAL_DNS_INSTRUCTIONS',
            lastErrorMessage:
              'Crie os registros CNAME de validação ACM no DNS ou habilite gestão Route53 (CUP360_PUBLIC_DOMAIN_ROUTE53_MANAGE + zonas permitidas).',
          };
        }

        const d2 = await acm.send(new DescribeCertificateCommand({ CertificateArn: certArn }));
        if (d2.Certificate?.Status !== 'ISSUED') {
          return {
            provisioningStatus: 'CERTIFICATE_PENDING',
            sslStatus: 'PENDING',
            certificateArn: certArn,
            hostedZoneId,
            provisioningStep: 'awaiting_acm_issued',
          };
        }
      } else if (status !== 'ISSUED') {
        return {
          provisioningStatus: 'CERTIFICATE_PENDING',
          sslStatus: status === 'FAILED' ? 'FAILED' : 'PENDING',
          certificateArn: certArn,
          hostedZoneId,
          provisioningStep: `acm_${(status ?? 'UNKNOWN').toLowerCase()}`,
          lastErrorCode: status === 'FAILED' ? 'ACM_FAILED' : undefined,
          lastErrorMessage: status === 'FAILED' ? 'Certificado ACM em estado FAILED.' : undefined,
        };
      }

      const distId = cfg.sharedDistributionId;
      const distCfg = await this.cf.send(new GetDistributionConfigCommand({ Id: distId }));
      const config = distCfg.DistributionConfig;
      const etag = distCfg.ETag;
      if (!config || !etag) {
        return {
          provisioningStatus: 'ERROR',
          lastErrorCode: 'CLOUDFRONT_READ_FAILED',
          lastErrorMessage: 'Não foi possível ler a distribuição CloudFront configurada.',
          certificateArn: certArn,
        };
      }

      const existing = new Set((config.Aliases?.Items ?? []).map((a) => a.toLowerCase()));
      let aliasChanged = false;
      for (const h of sanList) {
        const hl = h.toLowerCase();
        if (!existing.has(hl)) {
          existing.add(hl);
          aliasChanged = true;
        }
      }

      if (aliasChanged) {
        const sorted = [...existing].sort();
        config.Aliases = { Quantity: sorted.length, Items: sorted };
      }

      config.ViewerCertificate = {
        ACMCertificateArn: certArn,
        SSLSupportMethod: 'sni-only',
        MinimumProtocolVersion: 'TLSv1.2_2021',
        Certificate: certArn,
        CertificateSource: 'acm',
      };

      if (config.DefaultCacheBehavior) {
        config.DefaultCacheBehavior.ViewerProtocolPolicy = 'redirect-to-https';
      }

      await this.cf.send(
        new UpdateDistributionCommand({
          Id: distId,
          DistributionConfig: config,
          IfMatch: etag,
        }),
      );

      await this.cf.send(
        new CreateInvalidationCommand({
          DistributionId: distId,
          InvalidationBatch: {
            CallerReference: `cup360-${request.domainId}-${Date.now()}`,
            Paths: { Quantity: 1, Items: ['/*'] },
          },
        }),
      );

      const distAfter = await this.cf.send(new GetDistributionCommand({ Id: distId }));
      const distDomainName = distAfter.Distribution?.DomainName;
      if (!distDomainName) {
        return {
          provisioningStatus: 'ERROR',
          lastErrorCode: 'CLOUDFRONT_DOMAIN_MISSING',
          lastErrorMessage: 'CloudFront não retornou o domain name da distribuição.',
          certificateArn: certArn,
          distributionId: distId,
        };
      }

      const deployed = distAfter.Distribution?.Status === 'Deployed';
      if (!deployed) {
        return {
          provisioningStatus: 'PROVISIONING',
          sslStatus: 'ISSUED' as PublicDomainSslStatus,
          certificateArn: certArn,
          distributionId: distId,
          hostedZoneId,
          provisioningStep: 'cloudfront_deploying',
        };
      }

      const aliasInstructions: DnsInstruction[] = sanList.map((h) => ({
        name: fqdn(h),
        type: 'ALIAS',
        value: `${fqdn(distDomainName)} (CloudFront, Z2FDTNDATAQYW2)`,
      }));

      if (cfg.route53ManageDns && hostedZoneId && cfg.route53AllowedHostedZoneIds.includes(hostedZoneId)) {
        for (const h of sanList) {
          const recordName = fqdn(h);
          if (!isCup360ManagedWebRecord(recordName, 'A', zoneNameForSafety)) continue;
          await this.r53.send(
            new ChangeResourceRecordSetsCommand({
              HostedZoneId: hostedZoneId,
              ChangeBatch: {
                Comment: 'CUP360 web alias → CloudFront',
                Changes: [
                  {
                    Action: 'UPSERT',
                    ResourceRecordSet: {
                      Name: recordName,
                      Type: 'A',
                      AliasTarget: {
                        DNSName: fqdn(distDomainName),
                        EvaluateTargetHealth: false,
                        HostedZoneId: CLOUDFRONT_HOSTED_ZONE_ID,
                      },
                    },
                  },
                ],
              },
            }),
          );
        }
      } else {
        return {
          provisioningStatus: 'DNS_PENDING',
          sslStatus: 'ISSUED' as PublicDomainSslStatus,
          verificationStatus: 'VERIFIED' as PublicDomainVerificationStatus,
          certificateArn: certArn,
          distributionId: distId,
          hostedZoneId,
          provisioningStep: 'customer_web_alias',
          externalDnsInstructions: aliasInstructions,
          lastErrorCode: 'EXTERNAL_WEB_ALIAS',
          lastErrorMessage:
            'Aponte cada hostname na zona DNS (ALIAS A para o domínio CloudFront) ou habilite gestão Route53 nas zonas permitidas.',
        };
      }

      return {
        provisioningStatus: 'ACTIVE',
        sslStatus: 'ISSUED' as PublicDomainSslStatus,
        verificationStatus: 'VERIFIED' as PublicDomainVerificationStatus,
        certificateArn: certArn,
        distributionId: distId,
        hostedZoneId,
        provisioningStep: null,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.log.warn(`provision: ${msg}`);
      return {
        provisioningStatus: 'ERROR',
        sslStatus: 'FAILED',
        lastErrorCode: 'AWS_ERROR',
        lastErrorMessage: msg.slice(0, 2000),
      };
    }
  }

  async disable(request: ProvisionRequest): Promise<ProvisionResult> {
    const cfg = loadPublicDomainAwsConfig();
    if (!cfg.enabled || !cfg.sharedDistributionId) {
      return { provisioningStatus: 'DISABLED' };
    }
    try {
      const distCfg = await this.cf.send(new GetDistributionConfigCommand({ Id: cfg.sharedDistributionId }));
      const config = distCfg.DistributionConfig;
      const etag = distCfg.ETag;
      if (!config || !etag) return { provisioningStatus: 'DISABLED' };

      const sanList = hostnamesForCertificate(request.hostnameNormalized, request.allTenantHostnames);
      const items = new Set((config.Aliases?.Items ?? []).map((a) => a.toLowerCase()));
      for (const h of sanList) items.delete(h.toLowerCase());
      config.Aliases = { Quantity: items.size, Items: [...items].sort() };

      await this.cf.send(
        new UpdateDistributionCommand({
          Id: cfg.sharedDistributionId,
          DistributionConfig: config,
          IfMatch: etag,
        }),
      );
      return { provisioningStatus: 'DISABLED' };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.log.warn(`disable: ${msg}`);
      return { provisioningStatus: 'DISABLED', lastErrorCode: 'AWS_DISABLE_PARTIAL', lastErrorMessage: msg.slice(0, 500) };
    }
  }
}
