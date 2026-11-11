import { Injectable, Logger } from '@nestjs/common';
import { ChangeResourceRecordSetsCommand } from '@aws-sdk/client-route-53';
import { createPublicDomainAwsClients } from './public-domain-aws.clients';
import { loadPublicDomainAwsConfig } from './public-domain-aws.config';
import { validatePublicDomainAwsRuntimeConfig } from './public-domain-aws.runtime';
import { planOwnershipTxtUpsert } from './public-domain-ownership-route53.util';
import {
  findOwnershipProofInTxtValues,
  ownershipDnsInstruction,
} from './public-domain-ownership-challenge.util';
import {
  resolveOwnershipTxtForHostname,
  type PublicDnsTxtResolver,
} from './public-domain-public-dns-resolver';
import { PublicDomainDnsCapabilityService } from './public-domain-dns-capability.service';
import type { PublicDomainDnsCapability } from './public-domain-dns-instruction.model';
import type { PublicDomainDnsInstruction } from './public-domain-dns-instruction.model';

export type OwnershipDnsCheckResult =
  | { ok: true; txtValues: string[] }
  | { ok: false; code: string; message: string; txtValues: string[] };

@Injectable()
export class PublicDomainOwnershipDnsService {
  private readonly log = new Logger(PublicDomainOwnershipDnsService.name);

  constructor(private readonly dnsCapability: PublicDomainDnsCapabilityService) {}

  async getCapability(hostnameNormalized: string): Promise<{
    capability: PublicDomainDnsCapability;
    hostedZoneId: string | null;
  }> {
    const ctx = await this.dnsCapability.resolveForHostname(hostnameNormalized);
    return { capability: ctx.capability, hostedZoneId: ctx.hostedZoneId };
  }

  ownershipInstructions(hostnameNormalized: string, token: string): PublicDomainDnsInstruction {
    return ownershipDnsInstruction(hostnameNormalized, token);
  }

  /**
   * UPSERT automático do TXT em zona Route53 autorizada (somente quando habilitado na config).
   * Não executa em ambientes sem credenciais — falha silenciosa controlada retorna skip.
   */
  async tryUpsertManagedOwnershipTxt(params: {
    hostnameNormalized: string;
    verificationToken: string;
    hostedZoneId: string;
    zoneName: string;
  }): Promise<{ attempted: boolean; applied: boolean; reason?: string }> {
    const cfg = loadPublicDomainAwsConfig();
    if (!cfg.route53ManageDns || !cfg.enabled) {
      return { attempted: false, applied: false, reason: 'ROUTE53_MANAGE_DISABLED' };
    }
    const runtime = validatePublicDomainAwsRuntimeConfig(cfg);
    if (!runtime.ok) {
      return { attempted: false, applied: false, reason: runtime.lastErrorCode };
    }
    const change = planOwnershipTxtUpsert({
      hostnameNormalized: params.hostnameNormalized,
      verificationToken: params.verificationToken,
      zoneName: params.zoneName,
    });
    if (!change) {
      return { attempted: true, applied: false, reason: 'OWNERSHIP_TXT_UNSAFE' };
    }
    try {
      const { r53 } = createPublicDomainAwsClients(cfg);
      await r53.send(
        new ChangeResourceRecordSetsCommand({
          HostedZoneId: params.hostedZoneId,
          ChangeBatch: {
            Comment: 'CUP360 ownership TXT verification',
            Changes: [change],
          },
        }),
      );
      return { attempted: true, applied: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.log.warn(`ownership TXT UPSERT: ${msg.slice(0, 200)}`);
      return { attempted: true, applied: false, reason: 'AWS_ROUTE53_UPSERT_FAILED' };
    }
  }

  async verifyAuthoritativeTxt(params: {
    hostnameNormalized: string;
    tokenHash: string;
    resolver?: PublicDnsTxtResolver;
  }): Promise<OwnershipDnsCheckResult> {
    let txtValues: string[];
    try {
      txtValues = await resolveOwnershipTxtForHostname(params.hostnameNormalized, params.resolver);
    } catch {
      return {
        ok: false,
        code: 'DNS_LOOKUP_FAILED',
        message: 'Falha ao consultar DNS público.',
        txtValues: [],
      };
    }
    if (!txtValues.length) {
      return {
        ok: false,
        code: 'OWNERSHIP_TXT_MISSING',
        message: 'Registro TXT de verificação não encontrado.',
        txtValues,
      };
    }
    if (!findOwnershipProofInTxtValues(txtValues, params.tokenHash)) {
      return {
        ok: false,
        code: 'OWNERSHIP_TXT_MISMATCH',
        message: 'TXT encontrado não corresponde ao desafio atual.',
        txtValues,
      };
    }
    return { ok: true, txtValues };
  }
}
