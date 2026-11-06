import type { ResourceRecordSet } from '@aws-sdk/client-route-53';
import { planWebAliasTransition } from './route53-web-alias-plan.util';

describe('planWebAliasTransition', () => {
  it('fase DELETE antes de UPSERT quando há CNAME conflitante', () => {
    const www = 'www.example.com.';
    const existing: ResourceRecordSet[] = [
      {
        Name: www,
        Type: 'CNAME',
        TTL: 300,
        ResourceRecords: [{ Value: 'example.com.' }],
      },
    ];
    const { phases } = planWebAliasTransition({
      zoneName: 'example.com.',
      hostedZoneId: 'Z1',
      hostnames: ['www.example.com'],
      cloudFrontDnsName: 'd123.cloudfront.net.',
      existingAtName: (name) => (name.toLowerCase() === www.toLowerCase() ? existing : []),
    });
    expect(phases.length).toBeGreaterThanOrEqual(1);
    expect(phases[0]?.some((c) => c.Action === 'DELETE' && c.ResourceRecordSet?.Type === 'CNAME')).toBe(true);
    const upsertPhase = phases.find((p) => p.some((c) => c.Action === 'UPSERT'));
    expect(upsertPhase?.some((c) => c.ResourceRecordSet?.Type === 'A')).toBe(true);
  });

  it('não duplica UPSERT quando já existe ALIAS CloudFront', () => {
    const www = 'www.example.com.';
    const existing: ResourceRecordSet[] = [
      {
        Name: www,
        Type: 'A',
        AliasTarget: {
          DNSName: 'd999.cloudfront.net.',
          EvaluateTargetHealth: false,
          HostedZoneId: 'Z2FDTNDATAQYW2',
        },
      },
    ];
    const { phases } = planWebAliasTransition({
      zoneName: 'example.com.',
      hostedZoneId: 'Z1',
      hostnames: ['www.example.com'],
      cloudFrontDnsName: 'd999.cloudfront.net.',
      existingAtName: (name) => (name.toLowerCase() === www.toLowerCase() ? existing : []),
    });
    expect(phases.every((p) => !p.some((c) => c.Action === 'UPSERT'))).toBe(true);
  });
});
