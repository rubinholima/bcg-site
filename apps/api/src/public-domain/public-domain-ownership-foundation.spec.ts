import {
  formatOwnershipTxtChallenge,
  findOwnershipProofInTxtValues,
  ownershipDnsInstruction,
} from './public-domain-ownership-challenge.util';
import {
  classifyPublicDomainDnsCapability,
  isHostedZoneAuthorized,
} from './public-domain-hosted-zone.util';
import { planOwnershipTxtUpsert } from './public-domain-ownership-route53.util';
import { hashVerificationToken, generateVerificationToken } from './public-domain.hostname.util';
import { PublicDomainOwnershipDnsService } from './public-domain-ownership-dns.service';
import { PublicDomainDnsCapabilityService } from './public-domain-dns-capability.service';

describe('PublicDomain ownership foundation (PROMPT 035)', () => {
  const host = 'www.customer-example.com';
  const token = generateVerificationToken(24);
  const tokenHash = hashVerificationToken(token);

  describe('ownership TXT exact match', () => {
    it('aceita valor cup360-verify correto', () => {
      const txt = formatOwnershipTxtChallenge(token);
      expect(findOwnershipProofInTxtValues([txt], tokenHash)).toBe(true);
    });

    it('rejeita TXT errado', () => {
      expect(findOwnershipProofInTxtValues(['cup360-verify=wrong'], tokenHash)).toBe(false);
    });

    it('rejeita TXT ausente', () => {
      expect(findOwnershipProofInTxtValues([], tokenHash)).toBe(false);
    });

    it('aceita múltiplos TXT com um válido', () => {
      const good = formatOwnershipTxtChallenge(token);
      expect(findOwnershipProofInTxtValues(['v=spf1 -all', good], tokenHash)).toBe(true);
    });
  });

  describe('hostname normalization / anti-reuse', () => {
    it('instrução ownership amarrada ao hostname', () => {
      const inst = ownershipDnsInstruction(host, token);
      expect(inst.name).toBe('_cup360-verification.www.customer-example.com');
      expect(inst.purpose).toBe('OWNERSHIP');
    });

    it('hash de token rotacionado não reutiliza desafio anterior', () => {
      const token2 = generateVerificationToken(24);
      expect(hashVerificationToken(token2)).not.toBe(tokenHash);
      expect(findOwnershipProofInTxtValues([formatOwnershipTxtChallenge(token2)], tokenHash)).toBe(false);
    });
  });

  describe('DNS capability (multi-zone)', () => {
    const zones = ['ZONE_A', 'ZONE_B'];

    it('MANAGED_ROUTE53 quando zona listada e manage ativo', () => {
      expect(
        classifyPublicDomainDnsCapability({
          awsEnabled: true,
          runtimeOk: true,
          route53ManageDns: true,
          hostedZoneId: 'ZONE_B',
          allowedZoneIds: zones,
        }),
      ).toBe('MANAGED_ROUTE53');
    });

    it('EXTERNAL_DNS quando zona não autorizada', () => {
      expect(
        classifyPublicDomainDnsCapability({
          awsEnabled: true,
          runtimeOk: true,
          route53ManageDns: true,
          hostedZoneId: 'ZONE_C',
          allowedZoneIds: zones,
        }),
      ).toBe('EXTERNAL_DNS');
    });

    it('UNAVAILABLE sem runtime IAM', () => {
      expect(
        classifyPublicDomainDnsCapability({
          awsEnabled: true,
          runtimeOk: false,
          route53ManageDns: true,
          hostedZoneId: 'ZONE_A',
          allowedZoneIds: zones,
        }),
      ).toBe('UNAVAILABLE');
    });

    it('isHostedZoneAuthorized', () => {
      expect(isHostedZoneAuthorized('ZONE_A', zones)).toBe(true);
      expect(isHostedZoneAuthorized('ZONE_Z', zones)).toBe(false);
    });
  });

  describe('verifyAuthoritativeTxt (mock resolver)', () => {
    const svc = new PublicDomainOwnershipDnsService({} as PublicDomainDnsCapabilityService);

    it('confirma via DNS público mockado', async () => {
      const txt = formatOwnershipTxtChallenge(token);
      const result = await svc.verifyAuthoritativeTxt({
        hostnameNormalized: host,
        tokenHash,
        resolver: async () => [txt],
      });
      expect(result.ok).toBe(true);
    });

    it('falha com TXT expirado/rotacionado', async () => {
      const other = generateVerificationToken(24);
      const result = await svc.verifyAuthoritativeTxt({
        hostnameNormalized: host,
        tokenHash,
        resolver: async () => [formatOwnershipTxtChallenge(other)],
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe('OWNERSHIP_TXT_MISMATCH');
    });
  });

  describe('Route53 ownership TXT plan (sem BCFC)', () => {
    it('gera UPSERT genérico', () => {
      const change = planOwnershipTxtUpsert({
        hostnameNormalized: host,
        verificationToken: token,
        zoneName: 'customer-example.com.',
      });
      expect(change?.Action).toBe('UPSERT');
      expect(change?.ResourceRecordSet?.Type).toBe('TXT');
      expect(change?.ResourceRecordSet?.Name).toContain('_cup360-verification');
    });
  });
});
