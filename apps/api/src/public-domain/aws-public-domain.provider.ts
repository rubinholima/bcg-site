import { readFileSync } from 'fs';
import { join } from 'path';
import { Injectable, Logger } from '@nestjs/common';
import {
  CertificateStatus,
  DescribeCertificateCommand,
  RequestCertificateCommand,
} from '@aws-sdk/client-acm';
import {
  CreateDistributionWithTagsCommand,
  CreateFunctionCommand,
  DescribeFunctionCommand,
  type DistributionConfig,
  GetDistributionCommand,
  GetDistributionConfigCommand,
  PublishFunctionCommand,
  TagResourceCommand,
  UpdateDistributionCommand,
  UpdateFunctionCommand,
} from '@aws-sdk/client-cloudfront';
import {
  ChangeResourceRecordSetsCommand,
  ListHostedZonesByNameCommand,
  ListResourceRecordSetsCommand,
  type ResourceRecordSet,
} from '@aws-sdk/client-route-53';
import type { PublicDomainSslStatus, PublicDomainVerificationStatus } from '@prisma/client';
import { isCup360ManagedWebRecord } from './aws-route53-record-safety.util';
import {
  CUP360_EDGE_CONTRACT_VERSION,
  edgeSecretFingerprint,
} from './cup360-edge-contract.util';
import { createPublicDomainAwsClients } from './public-domain-aws.clients';
import { loadPublicDomainAwsConfig } from './public-domain-aws.config';
import {
  cup360CloudFrontFunctionName,
  cup360PublicDomainTags,
} from './public-domain-aws-ownership.util';
import {
  verifyAcmCertificateOwned,
  verifyCloudFrontDistributionOwned,
  verifyCloudFrontFunctionOwned,
} from './public-domain-aws-ownership.verify';
import { sanitizePublicDomainAwsErrorMessage } from './public-domain-aws.errors';
import { validatePublicDomainAwsRuntimeConfig } from './public-domain-aws.runtime';
import { hostnamesForCertificate } from './public-domain-dns.util';
import { planWebAliasTransition } from './route53-web-alias-plan.util';
import {
  PublicDomainProvisioner,
  type DnsInstruction,
  type ProvisionRequest,
  type ProvisionResult,
} from './public-domain-provisioner.interface';

const CLOUDFRONT_ALIAS_HOSTED_ZONE = 'Z2FDTNDATAQYW2';
/** Managed: CachingDisabled */
const CACHE_POLICY_DYNAMIC = '4135ea2d-6df8-44a3-9df3-4b5a84be39ad';
/** Managed: CachingOptimized — `/_next/static/*` */
const CACHE_POLICY_STATIC = '658327ea-f89d-4fab-a63d-7e88639e58f6';
/** Managed: AllViewerExceptHostHeader — não encaminha Host do viewer (CloudFront define host da origem). */
const ORIGIN_REQ_POLICY_VIEWER_EXCEPT_HOST = 'b689b0a8-53d0-40ab-baf2-68738e2966ac';

@Injectable()
export class AwsPublicDomainProvider extends PublicDomainProvisioner {
  private readonly log = new Logger(AwsPublicDomainProvider.name);

  async provision(request: ProvisionRequest): Promise<ProvisionResult> {
    const cfg = loadPublicDomainAwsConfig();
    if (!cfg.enabled) {
      return {
        provisioningStatus: 'NOT_CONFIGURED',
        lastErrorCode: 'AWS_PROVIDER_DISABLED',
        lastErrorMessage:
          'Provisionamento AWS desativado. Defina CUP360_PUBLIC_DOMAIN_AWS_ENABLED=1 e credenciais IAM dedicadas.',
      };
    }
    const runtime = validatePublicDomainAwsRuntimeConfig(cfg);
    if (!runtime.ok) {
      return {
        provisioningStatus: 'ERROR',
        lastErrorCode: runtime.lastErrorCode,
        lastErrorMessage: runtime.lastErrorMessage,
      };
    }
    const { acm, cf, r53 } = createPublicDomainAwsClients(cfg);
    if (!cfg.originDomain) {
      return {
        provisioningStatus: 'ERROR',
        lastErrorCode: 'AWS_CONFIG_INCOMPLETE',
        lastErrorMessage: 'Configure CUP360_PUBLIC_DOMAIN_ORIGIN_DOMAIN (HTTPS no contrato final).',
      };
    }
    const edgeSecret = cfg.edgeSignatureSecret;
    if (!edgeSecret) {
      return {
        provisioningStatus: 'ERROR',
        lastErrorCode: 'EDGE_SECRET_MISSING',
        lastErrorMessage:
          'Defina CUP360_EDGE_HOST_SECRET (mesmo valor na origem e na CloudFront Function).',
      };
    }

    const sanList = hostnamesForCertificate(request.hostnameNormalized, request.allTenantHostnames);
    const primaryDomainName = pickAcmPrimaryDomainName(sanList);
    const sanForAcm =
      sanList.length > 1 ? sanList.filter((h) => h !== primaryDomainName) : undefined;

    const zoneQuery = zoneParentName(request.hostnameNormalized);

    try {
      const listed = await r53.send(
        new ListHostedZonesByNameCommand({ DNSName: zoneQuery, MaxItems: 50 }),
      );
      const matchZone = (listed.HostedZones ?? []).find(
        (z) => z.Name && fqdn(String(z.Name)).toLowerCase() === zoneQuery.toLowerCase(),
      );
      const hostedZoneId =
        request.persistedHostedZoneId ?? (matchZone?.Id ? stripHostedZoneId(matchZone.Id) : null);
      const zoneNameForSafety = matchZone?.Name ? String(matchZone.Name) : zoneQuery;

      let certArn = request.persistedCertificateArn ?? null;
      if (certArn) {
        const ownedCert = await verifyAcmCertificateOwned(acm, certArn);
        if (!ownedCert.ok) {
          return {
            provisioningStatus: 'ERROR',
            lastErrorCode: ownedCert.lastErrorCode,
            lastErrorMessage: ownedCert.lastErrorMessage,
          };
        }
      }
      if (!certArn) {
        const created = await acm.send(
          new RequestCertificateCommand({
            DomainName: primaryDomainName,
            SubjectAlternativeNames: sanForAcm,
            ValidationMethod: 'DNS',
            Tags: cup360PublicDomainTags(request.tenantId, request.domainId),
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
      let status = cert?.Status as CertificateStatus | undefined;

      const acmInstructions: DnsInstruction[] = (cert?.DomainValidationOptions ?? [])
        .filter((v) => v.ResourceRecord?.Name && v.ResourceRecord?.Type && v.ResourceRecord?.Value)
        .map((v) => ({
          name: String(v.ResourceRecord!.Name),
          type: String(v.ResourceRecord!.Type),
          value: String(v.ResourceRecord!.Value).replace(/\.$/, ''),
        }));

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
                lastErrorMessage: 'ACM validation CNAME bloqueado pela política de segurança DNS.',
              };
            }
            await r53.send(
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
              'Crie os CNAMEs de validação ACM ou habilite Route53 gerenciado nas zonas permitidas.',
          };
        }

        const d2 = await acm.send(new DescribeCertificateCommand({ CertificateArn: certArn }));
        status = d2.Certificate?.Status as CertificateStatus | undefined;
        if (status !== 'ISSUED') {
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
        };
      }

      const fnName = cup360CloudFrontFunctionName(request.tenantId);
      const fnCode = Buffer.from(buildViewerFunctionCode(edgeSecret, sanList, CUP360_EDGE_CONTRACT_VERSION));

      let fnArn: string | null = request.persistedCloudFrontFunctionArn ?? null;
      try {
        const ownedFn = await verifyCloudFrontFunctionOwned(cf, fnName, request.persistedCloudFrontFunctionArn);
        if (!ownedFn.ok) {
          return {
            provisioningStatus: 'ERROR',
            lastErrorCode: ownedFn.lastErrorCode,
            lastErrorMessage: ownedFn.lastErrorMessage,
          };
        }
        const existingFn = await cf.send(new DescribeFunctionCommand({ Name: fnName }));
        const etagFn = existingFn.ETag;
        if (etagFn) {
          await cf.send(
            new UpdateFunctionCommand({
              Name: fnName,
              IfMatch: etagFn,
              FunctionCode: fnCode,
              FunctionConfig: {
                Comment: `CUP360 viewer ${edgeSecretFingerprint(edgeSecret)}`,
                Runtime: 'cloudfront-js-2.0',
              },
            }),
          );
        }
      } catch {
        await cf.send(
          new CreateFunctionCommand({
            Name: fnName,
            FunctionCode: fnCode,
            FunctionConfig: {
              Comment: `CUP360 viewer ${edgeSecretFingerprint(edgeSecret)}`,
              Runtime: 'cloudfront-js-2.0',
            },
          }),
        );
      }

      const fnAfter = await cf.send(new DescribeFunctionCommand({ Name: fnName }));
      const etagPublish = fnAfter.ETag;
      if (etagPublish) {
        const pub = await cf.send(
          new PublishFunctionCommand({ Name: fnName, IfMatch: etagPublish }),
        );
        fnArn = pub.FunctionSummary?.FunctionMetadata?.FunctionARN ?? fnArn;
      }

      if (fnArn) {
        try {
          await cf.send(
            new TagResourceCommand({
              Resource: fnArn,
              Tags: {
                Items: cup360PublicDomainTags(request.tenantId, request.domainId),
              },
            }),
          );
        } catch (tagErr) {
          this.log.debug(
            `TagResource function: ${tagErr instanceof Error ? tagErr.message : String(tagErr)}`,
          );
        }
      }

      if (!fnArn) {
        return {
          provisioningStatus: 'ERROR',
          lastErrorCode: 'CF_FUNCTION_PUBLISH_FAILED',
          lastErrorMessage: 'Não foi possível publicar a CloudFront Function.',
          certificateArn: certArn,
        };
      }

      let distId = request.persistedDistributionId ?? null;
      let distDomain: string | null = request.persistedDistributionDomain ?? null;

      if (!distId) {
        const createOut = await cf.send(
          new CreateDistributionWithTagsCommand({
            DistributionConfigWithTags: {
              DistributionConfig: buildNewDistributionConfig({
                callerReference: `cup360-${request.tenantId}-${request.domainId}`,
                comment: `CUP360 PublicDomain site tenant=${request.tenantId}`,
                aliases: sanList,
                certificateArn: certArn,
                originDomain: cfg.originDomain,
                functionArn: fnArn,
              }),
              Tags: {
                Items: cup360PublicDomainTags(request.tenantId, request.domainId),
              },
            },
          }),
        );
        distId = createOut.Distribution?.Id ?? null;
        distDomain = createOut.Distribution?.DomainName ?? null;
      } else {
        const ownedDist = await verifyCloudFrontDistributionOwned(cf, distId);
        if (!ownedDist.ok) {
          return {
            provisioningStatus: 'ERROR',
            lastErrorCode: ownedDist.lastErrorCode,
            lastErrorMessage: ownedDist.lastErrorMessage,
          };
        }
        const g = await cf.send(new GetDistributionConfigCommand({ Id: distId }));
        const dcfg = g.DistributionConfig;
        const etag = g.ETag;
        if (!dcfg || !etag) {
          return {
            provisioningStatus: 'ERROR',
            lastErrorCode: 'CLOUDFRONT_CONFIG_MISSING',
            certificateArn: certArn,
            cloudFrontFunctionArn: fnArn,
          };
        }
        if (!distDomain) {
          const gd = await cf.send(new GetDistributionCommand({ Id: distId }));
          distDomain = gd.Distribution?.DomainName ?? null;
        }

        const prevStatus = (await cf.send(new GetDistributionCommand({ Id: distId }))).Distribution?.Status;
        const distConfigCurrent = cloudFrontDistributionMatchesDesired(
          dcfg,
          sanList,
          certArn,
          fnArn,
          cfg.originDomain,
        );
        if (!distConfigCurrent) {
          if (prevStatus && prevStatus !== 'Deployed') {
            return {
              provisioningStatus: 'PROVISIONING',
              sslStatus: 'ISSUED' as PublicDomainSslStatus,
              certificateArn: certArn,
              distributionId: distId,
              distributionDomain: distDomain,
              cloudFrontFunctionArn: fnArn,
              hostedZoneId,
              provisioningStep: 'cloudfront_previous_update_deploying',
            };
          }

          dcfg.Comment = `CUP360 site ${request.tenantId}`;
          dcfg.Aliases = { Quantity: sanList.length, Items: [...sanList] };
          dcfg.ViewerCertificate = {
            ACMCertificateArn: certArn,
            SSLSupportMethod: 'sni-only',
            MinimumProtocolVersion: 'TLSv1.2_2021',
            Certificate: certArn,
            CertificateSource: 'acm',
          };
          attachViewerFunction(dcfg, fnArn);

          await cf.send(
            new UpdateDistributionCommand({
              Id: distId,
              DistributionConfig: dcfg,
              IfMatch: etag,
            }),
          );
          const gd2 = await cf.send(new GetDistributionCommand({ Id: distId }));
          distDomain = gd2.Distribution?.DomainName ?? distDomain;
        }
      }

      if (!distId || !distDomain) {
        return {
          provisioningStatus: 'ERROR',
          lastErrorCode: 'CLOUDFRONT_MISSING',
          certificateArn: certArn,
          cloudFrontFunctionArn: fnArn,
        };
      }

      const distStatus = (await cf.send(new GetDistributionCommand({ Id: distId }))).Distribution?.Status;
      if (distStatus !== 'Deployed') {
        return {
          provisioningStatus: 'PROVISIONING',
          sslStatus: 'ISSUED' as PublicDomainSslStatus,
          certificateArn: certArn,
          distributionId: distId,
          distributionDomain: distDomain,
          cloudFrontFunctionArn: fnArn,
          hostedZoneId,
          provisioningStep: 'cloudfront_deploying',
        };
      }

      const cfDns = distDomain.endsWith('.') ? distDomain : `${distDomain}.`;
      const aliasInstructions: DnsInstruction[] = sanList.map((h) => ({
        name: fqdn(h),
        type: 'ALIAS',
        value: `${cfDns} (CloudFront)`,
      }));

      if (cfg.route53ManageDns && hostedZoneId && cfg.route53AllowedHostedZoneIds.includes(hostedZoneId)) {
        const listRecordsAtName = async (hostname: string): Promise<ResourceRecordSet[]> => {
          const target = fqdn(hostname).toLowerCase();
          const collected: ResourceRecordSet[] = [];
          let marker: string | undefined = fqdn(hostname);
          for (let page = 0; page < 40; page++) {
            const out = await r53.send(
              new ListResourceRecordSetsCommand({
                HostedZoneId: hostedZoneId,
                StartRecordName: marker,
                MaxItems: 100,
              }),
            );
            const sets = out.ResourceRecordSets ?? [];
            let passed = false;
            for (const r of sets) {
              const rn = String(r.Name ?? '').toLowerCase();
              if (rn === target) collected.push(r);
              else if (collected.length > 0 && rn !== target) {
                passed = true;
                break;
              }
            }
            if (passed || !out.IsTruncated || !out.NextRecordName) break;
            marker = out.NextRecordName;
          }
          return collected;
        };

        const existingByName = new Map<string, ResourceRecordSet[]>();
        for (const h of sanList) {
          existingByName.set(fqdn(h).toLowerCase(), await listRecordsAtName(h));
        }

        const { phases, diagnostics } = planWebAliasTransition({
          zoneName: zoneNameForSafety,
          hostedZoneId,
          hostnames: sanList,
          cloudFrontDnsName: cfDns,
          existingAtName: (recordName) => existingByName.get(recordName.toLowerCase()) ?? [],
        });
        this.log.debug(`Route53 plan: ${diagnostics.join('; ')}`);

        for (const batch of phases) {
          if (!batch.length) continue;
          await r53.send(
            new ChangeResourceRecordSetsCommand({
              HostedZoneId: hostedZoneId,
              ChangeBatch: { Comment: 'CUP360 web alias transition', Changes: batch },
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
          distributionDomain: distDomain,
          cloudFrontFunctionArn: fnArn,
          hostedZoneId,
          provisioningStep: 'customer_web_alias',
          externalDnsInstructions: aliasInstructions,
          lastErrorCode: 'EXTERNAL_WEB_ALIAS',
          lastErrorMessage: 'Aponte apex e www (ALIAS A) para o domínio CloudFront indicado.',
        };
      }

      return {
        provisioningStatus: 'ACTIVE',
        sslStatus: 'ISSUED' as PublicDomainSslStatus,
        verificationStatus: 'VERIFIED' as PublicDomainVerificationStatus,
        certificateArn: certArn,
        distributionId: distId,
        distributionDomain: distDomain,
        cloudFrontFunctionArn: fnArn,
        hostedZoneId,
        provisioningStep: null,
      };
    } catch (e) {
      const msg = sanitizePublicDomainAwsErrorMessage(e);
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
    if (!cfg.enabled) return { provisioningStatus: 'DISABLED' };
    const runtime = validatePublicDomainAwsRuntimeConfig(cfg);
    if (!runtime.ok) {
      return {
        provisioningStatus: 'ERROR',
        lastErrorCode: runtime.lastErrorCode,
        lastErrorMessage: runtime.lastErrorMessage,
      };
    }
    const { cf } = createPublicDomainAwsClients(cfg);
    try {
      const distId = request.persistedDistributionId;
      if (distId) {
        const owned = await verifyCloudFrontDistributionOwned(cf, distId);
        if (!owned.ok) {
          return {
            provisioningStatus: 'ERROR',
            lastErrorCode: owned.lastErrorCode,
            lastErrorMessage: owned.lastErrorMessage,
          };
        }
        const g = await cf.send(new GetDistributionConfigCommand({ Id: distId }));
        const dc = g.DistributionConfig;
        const etag = g.ETag;
        if (dc && etag) {
          dc.Enabled = false;
          dc.Aliases = { Quantity: 0, Items: [] };
          await cf.send(
            new UpdateDistributionCommand({
              Id: distId,
              DistributionConfig: dc,
              IfMatch: etag,
            }),
          );
        }
      }
      return { provisioningStatus: 'DISABLED' };
    } catch (e) {
      const msg = sanitizePublicDomainAwsErrorMessage(e);
      return {
        provisioningStatus: 'DISABLED',
        lastErrorCode: 'AWS_DISABLE_PARTIAL',
        lastErrorMessage: msg.slice(0, 400),
      };
    }
  }
}

function stripHostedZoneId(id: string): string {
  return id.replace(/^\/hostedzone\//, '');
}

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

/** Prefer www como CN do ACM quando existir no SAN. */
function pickAcmPrimaryDomainName(hostnames: string[]): string {
  const lower = hostnames.map((h) => h.toLowerCase());
  const www = lower.find((h) => h.startsWith('www.'));
  if (www) return hostnames[lower.indexOf(www)];
  return hostnames[0];
}

function buildViewerFunctionCode(secret: string, aliases: string[], version: string): string {
  const tplPath = join(__dirname, 'cloudfront-viewer-request.template.js');
  const tpl = readFileSync(tplPath, 'utf8');
  const secretJs = JSON.stringify(secret);
  return tpl
    .replace(/__SECRET__/g, secretJs)
    .replace(/__ALIASES_JSON__/g, JSON.stringify(aliases))
    .replace(/__VERSION__/g, version);
}

function sortedLowerHostnames(items: string[] | undefined): string[] {
  return [...(items ?? [])].map((h) => h.toLowerCase()).sort();
}

function cloudFrontDistributionMatchesDesired(
  dcfg: DistributionConfig,
  sanList: string[],
  certificateArn: string,
  fnArn: string,
  originDomain: string,
): boolean {
  const aliases = sortedLowerHostnames(dcfg.Aliases?.Items);
  const desired = sortedLowerHostnames(sanList);
  if (aliases.length !== desired.length || aliases.some((a, i) => a !== desired[i])) {
    return false;
  }
  const vc = dcfg.ViewerCertificate;
  if (vc?.ACMCertificateArn !== certificateArn) return false;
  const origin = dcfg.Origins?.Items?.[0];
  if (origin?.DomainName !== originDomain) return false;
  if (origin?.CustomOriginConfig?.OriginProtocolPolicy !== 'https-only') return false;
  const fnAssocs = [
    ...(dcfg.DefaultCacheBehavior?.FunctionAssociations?.Items ?? []),
    ...(dcfg.CacheBehaviors?.Items?.[0]?.FunctionAssociations?.Items ?? []),
  ];
  if (!fnAssocs.some((f) => f.FunctionARN === fnArn && f.EventType === 'viewer-request')) {
    return false;
  }
  const defReq = dcfg.DefaultCacheBehavior?.OriginRequestPolicyId;
  const staticReq = dcfg.CacheBehaviors?.Items?.[0]?.OriginRequestPolicyId;
  if (defReq !== ORIGIN_REQ_POLICY_VIEWER_EXCEPT_HOST) return false;
  if (staticReq !== ORIGIN_REQ_POLICY_VIEWER_EXCEPT_HOST) return false;
  return true;
}

function attachViewerFunction(dcfg: DistributionConfig, fnArn: string): void {
  const def = dcfg.DefaultCacheBehavior;
  if (!def) return;
  def.FunctionAssociations = {
    Quantity: 1,
    Items: [{ FunctionARN: fnArn, EventType: 'viewer-request' }],
  };
}

function buildNewDistributionConfig(opts: {
  callerReference: string;
  comment: string;
  aliases: string[];
  certificateArn: string;
  originDomain: string;
  functionArn: string;
}): DistributionConfig {
  const originId = 'cup360-shared-origin';
  return {
    CallerReference: opts.callerReference,
    Comment: opts.comment,
    DefaultRootObject: '',
    Origins: {
      Quantity: 1,
      Items: [
        {
          Id: originId,
          DomainName: opts.originDomain,
          OriginPath: '',
          CustomHeaders: { Quantity: 0, Items: [] },
          CustomOriginConfig: {
            HTTPPort: 80,
            HTTPSPort: 443,
            OriginProtocolPolicy: 'https-only',
            OriginSslProtocols: { Quantity: 1, Items: ['TLSv1.2'] },
            OriginReadTimeout: 30,
            OriginKeepaliveTimeout: 5,
          },
          ConnectionAttempts: 3,
          ConnectionTimeout: 10,
        },
      ],
    },
    OriginGroups: { Quantity: 0, Items: [] },
    DefaultCacheBehavior: {
      TargetOriginId: originId,
      ViewerProtocolPolicy: 'redirect-to-https',
      AllowedMethods: {
        Quantity: 7,
        Items: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'POST', 'PATCH', 'DELETE'],
        CachedMethods: { Quantity: 2, Items: ['GET', 'HEAD'] },
      },
      Compress: true,
      CachePolicyId: CACHE_POLICY_DYNAMIC,
      OriginRequestPolicyId: ORIGIN_REQ_POLICY_VIEWER_EXCEPT_HOST,
      FunctionAssociations: {
        Quantity: 1,
        Items: [{ FunctionARN: opts.functionArn, EventType: 'viewer-request' }],
      },
      SmoothStreaming: false,
      FieldLevelEncryptionId: '',
      TrustedSigners: { Enabled: false, Quantity: 0, Items: [] },
      TrustedKeyGroups: { Enabled: false, Quantity: 0, Items: [] },
      GrpcConfig: { Enabled: false },
    },
    CacheBehaviors: {
      Quantity: 1,
      Items: [
        {
          PathPattern: '/_next/static/*',
          TargetOriginId: originId,
          ViewerProtocolPolicy: 'redirect-to-https',
          AllowedMethods: {
            Quantity: 3,
            Items: ['GET', 'HEAD', 'OPTIONS'],
            CachedMethods: { Quantity: 2, Items: ['GET', 'HEAD'] },
          },
          Compress: true,
          CachePolicyId: CACHE_POLICY_STATIC,
          OriginRequestPolicyId: ORIGIN_REQ_POLICY_VIEWER_EXCEPT_HOST,
          FunctionAssociations: {
            Quantity: 1,
            Items: [{ FunctionARN: opts.functionArn, EventType: 'viewer-request' }],
          },
          SmoothStreaming: false,
          FieldLevelEncryptionId: '',
          TrustedSigners: { Enabled: false, Quantity: 0, Items: [] },
          TrustedKeyGroups: { Enabled: false, Quantity: 0, Items: [] },
          GrpcConfig: { Enabled: false },
        },
      ],
    },
    CustomErrorResponses: { Quantity: 0, Items: [] },
    Logging: { Enabled: false, IncludeCookies: false, Bucket: '', Prefix: '' },
    PriceClass: 'PriceClass_100',
    Enabled: true,
    ViewerCertificate: {
      ACMCertificateArn: opts.certificateArn,
      SSLSupportMethod: 'sni-only',
      MinimumProtocolVersion: 'TLSv1.2_2021',
      Certificate: opts.certificateArn,
      CertificateSource: 'acm',
    },
    HttpVersion: 'http2and3',
    Aliases: {
      Quantity: opts.aliases.length,
      Items: [...opts.aliases],
    },
    Restrictions: { GeoRestriction: { RestrictionType: 'none', Quantity: 0, Items: [] } },
    WebACLId: '',
  };
}
