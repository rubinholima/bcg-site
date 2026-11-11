/** Tag exigida pela política IAM do provisionador de domínios públicos. */
export const CUP360_PUBLIC_DOMAIN_TAG_KEY = 'cup360-managed';
export const CUP360_PUBLIC_DOMAIN_TAG_VALUE = 'public-domain-site';

export type AwsTag = { Key: string; Value: string };

export function cup360PublicDomainTags(tenantId: string, domainId: string): AwsTag[] {
  return [
    { Key: CUP360_PUBLIC_DOMAIN_TAG_KEY, Value: CUP360_PUBLIC_DOMAIN_TAG_VALUE },
    { Key: 'cup360-tenant', Value: tenantId.slice(0, 128) },
    { Key: 'cup360-public-domain-id', Value: domainId.slice(0, 128) },
  ];
}

export function hasCup360PublicDomainSiteTag(tags: AwsTag[] | undefined): boolean {
  if (!tags?.length) return false;
  return tags.some(
    (t) =>
      t.Key === CUP360_PUBLIC_DOMAIN_TAG_KEY &&
      t.Value === CUP360_PUBLIC_DOMAIN_TAG_VALUE,
  );
}

/** Nome canônico das CloudFront Functions — inclui domainId para evitar colisão entre sites. */
export function cup360CloudFrontFunctionName(tenantId: string, domainId: string): string {
  const t = tenantId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 24);
  const d = domainId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
  return `cup360-site-${t}-${d}`;
}

export function isCup360CloudFrontFunctionName(name: string | undefined): boolean {
  if (!name) return false;
  return /^cup360-site-[a-zA-Z0-9_-]+$/.test(name);
}
