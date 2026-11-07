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
  hasCup360PublicDomainSiteTag,
  isCup360CloudFrontFunctionName,
  type AwsTag,
} from './public-domain-aws-ownership.util';

function tagsFromList(items: AwsTag[] | undefined): AwsTag[] {
  return (items ?? []).filter((t) => t.Key != null);
}

export async function verifyCloudFrontDistributionOwned(
  cf: CloudFrontClient,
  distributionId: string,
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
  if (!hasCup360PublicDomainSiteTag(tags)) {
    return {
      ok: false,
      lastErrorCode: 'AWS_RESOURCE_NOT_OWNED',
      lastErrorMessage:
        'Distribuição CloudFront não pertence ao provisionador CUP360 (tag cup360-managed=public-domain-site ausente).',
    };
  }
  return { ok: true, arn };
}

export async function verifyAcmCertificateOwned(
  acm: ACMClient,
  certificateArn: string,
): Promise<{ ok: true } | { ok: false; lastErrorCode: string; lastErrorMessage: string }> {
  const tagsOut = await acm.send(new ListTagsForCertificateCommand({ CertificateArn: certificateArn }));
  const tags = tagsFromList(tagsOut.Tags as AwsTag[] | undefined);
  if (!hasCup360PublicDomainSiteTag(tags)) {
    return {
      ok: false,
      lastErrorCode: 'AWS_RESOURCE_NOT_OWNED',
      lastErrorMessage:
        'Certificado ACM não pertence ao provisionador CUP360 (tag cup360-managed=public-domain-site ausente).',
    };
  }
  return { ok: true };
}

export async function verifyCloudFrontFunctionOwned(
  cf: CloudFrontClient,
  functionName: string,
  functionArn: string | null | undefined,
): Promise<{ ok: true } | { ok: false; lastErrorCode: string; lastErrorMessage: string }> {
  if (!isCup360CloudFrontFunctionName(functionName)) {
    return {
      ok: false,
      lastErrorCode: 'AWS_RESOURCE_NOT_OWNED',
      lastErrorMessage: 'CloudFront Function fora do namespace CUP360 (nome não reconhecido).',
    };
  }
  if (!functionArn?.trim()) {
    return { ok: true };
  }
  try {
    const tagsOut = await cf.send(new ListTagsForResourceCommand({ Resource: functionArn }));
    const tags = tagsFromList(tagsOut.Tags?.Items as AwsTag[] | undefined);
    if (tags.length > 0 && !hasCup360PublicDomainSiteTag(tags)) {
      return {
        ok: false,
        lastErrorCode: 'AWS_RESOURCE_NOT_OWNED',
        lastErrorMessage:
          'CloudFront Function sem tag de propriedade CUP360 (cup360-managed=public-domain-site).',
      };
    }
  } catch {
    return { ok: true };
  }
  return { ok: true };
}
