import { isCup360PlatformHostname } from './cup360-platform-hosts.util';
import {
  findMostSpecificPublicHostedZone,
  hostnameBelongsToPublicZone,
} from './public-domain-route53-discovery.util';
import { assertRoute53WriteAllowed, Route53WriteGuardError } from './public-domain-route53-write-guard';
import { verifiedHostnamesForCertificate } from './public-domain-san.util';
import { tagsMatchTenantAndDomain } from './public-domain-aws-ownership.verify';
import {
  CUP360_PUBLIC_DOMAIN_TAG_KEY,
  CUP360_PUBLIC_DOMAIN_TAG_VALUE,
} from './public-domain-aws-ownership.util';
import { webAliasRecordPointsToDistribution } from './public-domain-web-alias-verify.util';
import { canMarkProvisioningActive } from './public-domain-active-readiness.util';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('PROMPT 037 blockers', () => {
  it('bloqueia hostname de plataforma', () => {
    expect(isCup360PlatformHostname('www.bostoncitygroup.biz')).toBe(true);
  });

  it('SAN sem verificação não inclui irmão', () => {
    const san = verifiedHostnamesForCertificate('www.clube.com', ['www.clube.com']);
    expect(san).toEqual(['www.clube.com']);
    expect(san).not.toContain('clube.com');
  });

  it('zona mais específica e exclui privada', () => {
    const zones = [
      { Name: 'com.', Id: '/hostedzone/Z1', Config: { PrivateZone: false } },
      { Name: 'clube.com.', Id: '/hostedzone/Z2', Config: { PrivateZone: false } },
      { Name: 'internal.clube.com.', Id: '/hostedzone/Z3', Config: { PrivateZone: true } },
    ];
    const match = findMostSpecificPublicHostedZone(zones, 'www.clube.com');
    expect(match?.hostedZoneId).toBe('Z2');
  });

  it('hostname pertence à zona pública', () => {
    expect(hostnameBelongsToPublicZone('www.foo.com', 'foo.com.')).toBe(true);
    expect(hostnameBelongsToPublicZone('other.com', 'foo.com.')).toBe(false);
  });

  it('write guard bloqueia MX', () => {
    const prev = {
      enabled: process.env.CUP360_PUBLIC_DOMAIN_AWS_ENABLED,
      manage: process.env.CUP360_PUBLIC_DOMAIN_ROUTE53_MANAGE,
      zones: process.env.CUP360_PUBLIC_DOMAIN_ROUTE53_ALLOWED_ZONES,
    };
    process.env.CUP360_PUBLIC_DOMAIN_AWS_ENABLED = 'true';
    process.env.CUP360_PUBLIC_DOMAIN_ROUTE53_MANAGE = 'true';
    process.env.CUP360_PUBLIC_DOMAIN_ROUTE53_ALLOWED_ZONES = 'Z1';
    expect(() =>
      assertRoute53WriteAllowed(
        {
          hostnameNormalized: 'www.foo.com',
          hostedZoneId: 'Z1',
          zoneName: 'foo.com.',
          purpose: 'WEB_ALIAS',
        },
        {
          Action: 'UPSERT',
          ResourceRecordSet: { Name: 'foo.com.', Type: 'MX', TTL: 300, ResourceRecords: [{ Value: '10 mail.foo.com' }] },
        },
      ),
    ).toThrow(Route53WriteGuardError);
    process.env.CUP360_PUBLIC_DOMAIN_AWS_ENABLED = prev.enabled;
    process.env.CUP360_PUBLIC_DOMAIN_ROUTE53_MANAGE = prev.manage;
    process.env.CUP360_PUBLIC_DOMAIN_ROUTE53_ALLOWED_ZONES = prev.zones;
  });

  it('ownership cross-tenant nas tags AWS', () => {
    expect(
      tagsMatchTenantAndDomain(
        [
          { Key: CUP360_PUBLIC_DOMAIN_TAG_KEY, Value: CUP360_PUBLIC_DOMAIN_TAG_VALUE },
          { Key: 'cup360-tenant', Value: 'tenant-a' },
        ],
        'tenant-b',
        'dom-1',
      ),
    ).toBe(false);
  });

  it('alias WEB só conta distribuição esperada', () => {
    const ok = webAliasRecordPointsToDistribution(
      [
        {
          Name: 'www.foo.com.',
          Type: 'A',
          AliasTarget: { DNSName: 'd123.cloudfront.net.', HostedZoneId: 'Z2', EvaluateTargetHealth: false },
        },
      ],
      'www.foo.com',
      'd123.cloudfront.net',
    );
    expect(ok).toBe(true);
    const bad = webAliasRecordPointsToDistribution(
      [
        {
          Name: 'www.foo.com.',
          Type: 'A',
          AliasTarget: { DNSName: 'd999.cloudfront.net.', HostedZoneId: 'Z2', EvaluateTargetHealth: false },
        },
      ],
      'www.foo.com',
      'd123.cloudfront.net',
    );
    expect(bad).toBe(false);
  });

  it('ACTIVE bloqueado sem pré-requisitos', () => {
    expect(
      canMarkProvisioningActive({
        provisioningStatus: 'ACTIVE',
        certificateArn: null,
        distributionId: 'X',
        distributionDomain: 'd.cloudfront.net',
        cloudFrontFunctionArn: 'arn:fn',
      }),
    ).toBe(false);
  });

  it('signer usa require(crypto) cloudfront-js-2.0', () => {
    const tpl = readFileSync(join(__dirname, 'cloudfront-viewer-request.template.js'), 'utf8');
    expect(tpl).toContain("require('crypto')");
    expect(tpl).toContain('cloudfront-js-2.0');
  });
});
