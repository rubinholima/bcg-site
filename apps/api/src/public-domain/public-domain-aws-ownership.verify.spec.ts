import type { CloudFrontClient } from '@aws-sdk/client-cloudfront';
import {
  CUP360_PUBLIC_DOMAIN_TAG_KEY,
  CUP360_PUBLIC_DOMAIN_TAG_VALUE,
} from './public-domain-aws-ownership.util';
import { verifyCloudFrontDistributionOwned } from './public-domain-aws-ownership.verify';

describe('verifyCloudFrontDistributionOwned', () => {
  it('rejeita distribuição BCG sem tag CUP360 (ex.: EQ7G08XI2IC8C)', async () => {
    const cf = {
      send: jest
        .fn()
        .mockResolvedValueOnce({
          Distribution: { ARN: 'arn:aws:cloudfront::123:distribution/EQ7G08XI2IC8C' },
        })
        .mockResolvedValueOnce({
          Tags: { Items: [{ Key: 'project', Value: 'bcg-portal' }] },
        }),
    } as unknown as CloudFrontClient;

    const out = await verifyCloudFrontDistributionOwned(cf, 'EQ7G08XI2IC8C', 'tenant-a', 'dom-a');
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.lastErrorCode).toBe('AWS_RESOURCE_NOT_OWNED');
      expect(out.lastErrorMessage).not.toContain('AKIA');
    }
  });

  it('aceita distribuição com tag cup360-managed=public-domain-site', async () => {
    const cf = {
      send: jest
        .fn()
        .mockResolvedValueOnce({
          Distribution: { ARN: 'arn:aws:cloudfront::123:distribution/ABC123' },
        })
        .mockResolvedValueOnce({
          Tags: {
            Items: [
              { Key: CUP360_PUBLIC_DOMAIN_TAG_KEY, Value: CUP360_PUBLIC_DOMAIN_TAG_VALUE },
              { Key: 'cup360-tenant', Value: 'tenant-a' },
              { Key: 'cup360-public-domain-id', Value: 'dom-a' },
            ],
          },
        }),
    } as unknown as CloudFrontClient;

    const out = await verifyCloudFrontDistributionOwned(cf, 'ABC123', 'tenant-a', 'dom-a');
    expect(out).toEqual({
      ok: true,
      arn: 'arn:aws:cloudfront::123:distribution/ABC123',
    });
  });
});
