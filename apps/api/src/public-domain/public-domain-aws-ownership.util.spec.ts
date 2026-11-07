import {
  cup360PublicDomainTags,
  hasCup360PublicDomainSiteTag,
  CUP360_PUBLIC_DOMAIN_TAG_KEY,
  CUP360_PUBLIC_DOMAIN_TAG_VALUE,
} from './public-domain-aws-ownership.util';

describe('cup360PublicDomainTags', () => {
  it('inclui tag obrigatória IAM', () => {
    const tags = cup360PublicDomainTags('tenant-1', 'domain-1');
    expect(hasCup360PublicDomainSiteTag(tags)).toBe(true);
    expect(tags).toEqual(
      expect.arrayContaining([
        { Key: CUP360_PUBLIC_DOMAIN_TAG_KEY, Value: CUP360_PUBLIC_DOMAIN_TAG_VALUE },
      ]),
    );
  });
});
