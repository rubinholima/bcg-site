import {
  ListTagsForCertificateCommand,
  type ACMClient,
} from '@aws-sdk/client-acm';
import {
  GetDistributionCommand,
  ListTagsForResourceCommand,
  type CloudFrontClient,
} from '@aws-sdk/client-cloudfront';
import {
  cup360CloudFrontFunctionName,
  hasCup360PublicDomainSiteTag,
  isCup360CloudFrontFunctionName,
  type AwsTag,
} from './public-domain-aws-ownership.util';

function tagsFromList(items: AwsTag[] | undefined): AwsTag[] {
  return (items ?? []).filter((t) => t.Key != null) as AwsTag[];
}

function tagValue(tags: AwsTag[], key: string): string | undefined {
  return tags.find((t) => t.Key === key)?.Value;
}

export function tagsMatchTenantAndDomain(
  tags: AwsTag[] | undefined,
  tenantId: string,
  domainId: string,
): boolean {
  if (!hasCup360PublicDomainSiteTag(tags)) return false;
  const tenant = tagValue(tags ?? [], 'cup360-tenant');
  if (tenant && tenant !== tenantId) return false;
  const domain = tagValue(tags ?? [], 'cup360-public-domain-id');
  if (domain && domain !== domainId) return false;
  return true;
}

export async function verifyCloudFrontDistributionOwned(
  cf: CloudFrontClient,
  distributionId: string,
  tenantId: string,
  domainId: string,
): Promise<{ ok: true; arn: string } | { ok: false; lastErrorCode: string; lastErrorMessage: string }> {
  const dist = await cf.send(new GetDistributionCommand({ Id: distributionId }));
  const arn = dist.Distribution?.ARN;
  if (!arn) {
    return {
      ok: false,
      lastErrorCode: 'AWS_RESOURCE_NOT_OWNED',
      lastErrorMessage: 'Distribuição CloudFront sem ARN — não é possível verificar propriedade.',
    };
  }
  const tagsOut = await cf.send(new ListTagsForResourceCommand({ Resource: arn }));
  const tags = tagsFromList(tagsOut.Tags?.Items as AwsTag[] | undefined);
  if (!tagsMatchTenantAndDomain(tags, tenantId, domainId)) {
    return {
      ok: false,
      lastErrorCode: 'AWS_RESOURCE_NOT_OWNED',
      lastErrorMessage:
        'Distribuição CloudFront não pertence a este tenant/domínio CUP360 (tags de propriedade).',
    };
  }
  return { ok: true, arn };
}

export async function verifyAcmCertificateOwned(
  acm: ACMClient,
  certificateArn: string,
  tenantId: string,
  domainId: string,
): Promise<{ ok: true } | { ok: false; lastErrorCode: string; lastErrorMessage: string }> {
  const tagsOut = await acm.send(new ListTagsForCertificateCommand({ CertificateArn: certificateArn }));
  const tags = tagsFromList(tagsOut.Tags as AwsTag[] | undefined);
  if (!tagsMatchTenantAndDomain(tags, tenantId, domainId)) {
    return {
      ok: false,
      lastErrorCode: 'AWS_RESOURCE_NOT_OWNED',
      lastErrorMessage:
        'Certificado ACM não pertence a este tenant/domínio CUP360 (tags de propriedade).',
    };
  }
  return { ok: true };
}

export async function verifyCloudFrontFunctionOwned(
  cf: CloudFrontClient,
  tenantId: string,
  domainId: string,
  functionArn: string | null | undefined,
): Promise<{ ok: true; name: string } | { ok: false; lastErrorCode: string; lastErrorMessage: string }> {
  const functionName = cup360CloudFrontFunctionName(tenantId, domainId);
  if (!isCup360CloudFrontFunctionName(functionName)) {
    return {
      ok: false,
      lastErrorCode: 'AWS_RESOURCE_NOT_OWNED',
      lastErrorMessage: 'CloudFront Function fora do namespace CUP360 (nome não reconhecido).',
    };
  }
  if (!functionArn?.trim()) {
    return { ok: true, name: functionName };
  }
  try {
    const tagsOut = await cf.send(new ListTagsForResourceCommand({ Resource: functionArn }));
    const tags = tagsFromList(tagsOut.Tags?.Items as AwsTag[] | undefined);
    if (tags.length > 0 && !tagsMatchTenantAndDomain(tags, tenantId, domainId)) {
      return {
        ok: false,
        lastErrorCode: 'AWS_RESOURCE_NOT_OWNED',
        lastErrorMessage:
          'CloudFront Function sem propriedade CUP360 para este tenant/domínio.',
      };
    }
  } catch {
    return { ok: true, name: functionName };
  }
  return { ok: true, name: functionName };
}
