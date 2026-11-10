import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  PublicDomain,
  PublicDomainProvisioningStatus,
  PublicDomainStatus,
  PublicDomainVerificationStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantAccessService } from '../auth/tenant-access.service';
import type { CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { ModulesService } from '../modules/modules.service';
import {
  generateVerificationToken,
  hashVerificationToken,
  normalizePublicHostname,
  PublicDomainHostnameError,
  verificationTxtRecordName,
} from './public-domain.hostname.util';
import { AwsPublicDomainProvider } from './aws-public-domain.provider';
import type { DnsInstruction } from './public-domain-provisioner.interface';

const MODULE_SLUG = 'cup360_public_domains';

const VERIFICATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type PublicDomainDto = {
  id: string;
  tenantId: string;
  hostnameNormalized: string;
  isCanonical: boolean;
  status: PublicDomainStatus;
  verificationStatus: PublicDomainVerificationStatus;
  sslStatus: string;
  provisioningStatus: PublicDomainProvisioningStatus;
  provider: string;
  hostedZoneId: string | null;
  certificateArn: string | null;
  distributionId: string | null;
  distributionDomain: string | null;
  cloudFrontFunctionArn: string | null;
  verificationExpiresAt: string | null;
  verifiedAt: string | null;
  activatedAt: string | null;
  disabledAt: string | null;
  lastCheckedAt: string | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  provisioningStep: string | null;
  externalDnsInstructions: DnsInstruction[] | null;
  createdAt: string;
  updatedAt: string;
  /** Instrução DNS — valor esperado do TXT (não armazenado após verificação). */
  verificationTxtName?: string;
  verificationTxtValue?: string;
};

function toDto(row: PublicDomain, extras?: Partial<PublicDomainDto>): PublicDomainDto {
  const meta = row.provisioningMetadata as { externalDns?: DnsInstruction[] } | null;
  const externalFromMeta =
    meta && Array.isArray(meta.externalDns) ? meta.externalDns : null;

  return {
    id: row.id,
    tenantId: row.tenantId,
    hostnameNormalized: row.hostnameNormalized,
    isCanonical: row.isCanonical,
    status: row.status,
    verificationStatus: row.verificationStatus,
    sslStatus: row.sslStatus,
    provisioningStatus: row.provisioningStatus,
    provider: row.provider,
    hostedZoneId: row.hostedZoneId,
    certificateArn: row.certificateArn,
    distributionId: row.distributionId,
    distributionDomain: row.distributionDomain,
    cloudFrontFunctionArn: row.cloudFrontFunctionArn,
    verificationExpiresAt: row.verificationExpiresAt?.toISOString() ?? null,
    verifiedAt: row.verifiedAt?.toISOString() ?? null,
    activatedAt: row.activatedAt?.toISOString() ?? null,
    disabledAt: row.disabledAt?.toISOString() ?? null,
    lastCheckedAt: row.lastCheckedAt?.toISOString() ?? null,
    lastErrorCode: row.lastErrorCode,
    lastErrorMessage: row.lastErrorMessage,
    provisioningStep: row.provisioningStep ?? null,
    externalDnsInstructions: externalFromMeta,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ...extras,
  };
}

@Injectable()
export class PublicDomainService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantAccess: TenantAccessService,
    private readonly modules: ModulesService,
    private readonly awsProvider: AwsPublicDomainProvider,
  ) {}

  async list(tenantId: string, user: CognitoJwtPayload): Promise<PublicDomainDto[]> {
    await this.assertManageAccess(tenantId, user);
    const rows = await this.prisma.publicDomain.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => toDto(r));
  }

  async create(
    tenantId: string,
    body: { hostname: string; isCanonical?: boolean },
    user: CognitoJwtPayload,
  ): Promise<PublicDomainDto> {
    await this.assertManageAccess(tenantId, user);
    let hostnameNormalized: string;
    try {
      hostnameNormalized = normalizePublicHostname(body.hostname);
    } catch (e) {
      if (e instanceof PublicDomainHostnameError) {
        throw new BadRequestException(e.message);
      }
      throw e;
    }

    const existing = await this.prisma.publicDomain.findUnique({
      where: { hostnameNormalized },
    });
    if (existing && existing.tenantId !== tenantId) {
      throw new ConflictException('Este hostname já está reservado para outra empresa.');
    }
    if (existing) {
      return toDto(existing);
    }

    const token = generateVerificationToken(24);
    const tokenHash = hashVerificationToken(token);
    const exp = new Date(Date.now() + VERIFICATION_TTL_MS);

    const row = await this.prisma.publicDomain.create({
      data: {
        tenantId,
        hostnameNormalized,
        isCanonical: body.isCanonical !== false,
        status: 'DISABLED',
        verificationStatus: 'PENDING_VERIFICATION',
        provisioningStatus: 'PENDING_VERIFICATION',
        verificationTokenHash: tokenHash,
        verificationExpiresAt: exp,
      },
    });

    await this.audit(user, 'public_domain_create', row.id, tenantId, {
      hostname: hostnameNormalized,
    });

    return toDto(row, {
      verificationTxtName: verificationTxtRecordName(hostnameNormalized),
      verificationTxtValue: `cup360-verify=${token}`,
    });
  }

  async verifyOwnershipWithToken(
    tenantId: string,
    domainId: string,
    body: { token?: string },
    user: CognitoJwtPayload,
  ): Promise<PublicDomainDto> {
    await this.assertManageAccess(tenantId, user);
    const row = await this.requireDomain(tenantId, domainId);
    if (row.verificationStatus === 'VERIFIED') {
      return toDto(row);
    }
    const token = (body.token ?? '').trim();
    if (!token || !row.verificationTokenHash || !row.verificationExpiresAt) {
      throw new BadRequestException('Token inválido.');
    }
    if (row.verificationExpiresAt.getTime() < Date.now()) {
      await this.prisma.publicDomain.update({
        where: { id: row.id },
        data: { verificationStatus: 'EXPIRED', lastErrorCode: 'VERIFICATION_EXPIRED' },
      });
      throw new BadRequestException('Verificação expirada.');
    }
    const h = hashVerificationToken(token);
    if (h !== row.verificationTokenHash) {
      await this.prisma.publicDomain.update({
        where: { id: row.id },
        data: { verificationStatus: 'FAILED', lastErrorCode: 'VERIFICATION_MISMATCH' },
      });
      throw new ForbiddenException('Token de verificação incorreto.');
    }
    const updated = await this.prisma.publicDomain.update({
      where: { id: row.id },
      data: {
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date(),
        provisioningStatus: 'DNS_PENDING',
        lastErrorCode: null,
        lastErrorMessage: null,
        verificationTokenHash: null,
        verificationExpiresAt: null,
      },
    });
    await this.audit(user, 'public_domain_verified', updated.id, tenantId, {
      hostname: updated.hostnameNormalized,
    });
    return toDto(updated);
  }

  async setCanonical(
    tenantId: string,
    domainId: string,
    user: CognitoJwtPayload,
  ): Promise<PublicDomainDto> {
    await this.assertManageAccess(tenantId, user);
    const row = await this.requireDomain(tenantId, domainId);
    if (row.verificationStatus !== 'VERIFIED') {
      throw new BadRequestException('Domínio precisa estar verificado antes de ser canônico.');
    }
    await this.prisma.$transaction([
      this.prisma.publicDomain.updateMany({
        where: { tenantId, id: { not: domainId } },
        data: { isCanonical: false },
      }),
      this.prisma.publicDomain.update({
        where: { id: domainId },
        data: { isCanonical: true },
      }),
    ]);
    const fresh = await this.requireDomain(tenantId, domainId);
    await this.audit(user, 'public_domain_set_canonical', domainId, tenantId, {});
    return toDto(fresh);
  }

  async publish(tenantId: string, domainId: string, user: CognitoJwtPayload): Promise<PublicDomainDto> {
    await this.assertManageAccess(tenantId, user);
    const row = await this.requireDomain(tenantId, domainId);
    if (row.verificationStatus !== 'VERIFIED') {
      throw new BadRequestException('Verifique a propriedade do domínio antes de publicar.');
    }
    const tenantHosts = await this.prisma.publicDomain.findMany({
      where: { tenantId },
      select: { hostnameNormalized: true },
    });
    const allTenantHostnames = tenantHosts.map((h) => h.hostnameNormalized);
    const result = await this.awsProvider.provision({
      domainId: row.id,
      tenantId,
      hostnameNormalized: row.hostnameNormalized,
      isCanonical: row.isCanonical,
      allTenantHostnames,
      persistedCertificateArn: row.certificateArn,
      persistedHostedZoneId: row.hostedZoneId,
      persistedDistributionId: row.distributionId,
      persistedDistributionDomain: row.distributionDomain,
      persistedCloudFrontFunctionArn: row.cloudFrontFunctionArn,
    });

    const metaPayload = { externalDns: result.externalDnsInstructions ?? [] };

    const updated = await this.prisma.publicDomain.update({
      where: { id: row.id },
      data: {
        provisioningStatus: result.provisioningStatus,
        sslStatus: result.sslStatus ?? undefined,
        verificationStatus: result.verificationStatus ?? undefined,
        lastErrorCode: result.lastErrorCode ?? null,
        lastErrorMessage: result.lastErrorMessage ?? null,
        hostedZoneId: result.hostedZoneId ?? undefined,
        certificateArn: result.certificateArn ?? undefined,
        distributionId: result.distributionId ?? undefined,
        distributionDomain: result.distributionDomain ?? undefined,
        cloudFrontFunctionArn: result.cloudFrontFunctionArn ?? undefined,
        provisioningStep: result.provisioningStep ?? null,
        provisioningMetadata: metaPayload,
        lastCheckedAt: new Date(),
        status: result.provisioningStatus === 'ACTIVE' ? 'ACTIVE' : 'PENDING',
        activatedAt: result.provisioningStatus === 'ACTIVE' ? new Date() : null,
      },
    });

    if (result.provisioningStatus === 'ACTIVE') {
      await this.prisma.publicDomain.updateMany({
        where: {
          tenantId,
          verificationStatus: 'VERIFIED',
          id: { not: domainId },
        },
        data: {
          status: 'ACTIVE',
          provisioningStatus: 'ACTIVE',
          sslStatus: result.sslStatus ?? 'ISSUED',
          certificateArn: result.certificateArn ?? undefined,
          distributionId: result.distributionId ?? undefined,
          distributionDomain: result.distributionDomain ?? undefined,
          cloudFrontFunctionArn: result.cloudFrontFunctionArn ?? undefined,
          hostedZoneId: result.hostedZoneId ?? undefined,
          provisioningStep: null,
          lastErrorCode: null,
          lastErrorMessage: null,
          lastCheckedAt: new Date(),
          activatedAt: new Date(),
        },
      });
    }

    await this.audit(user, 'public_domain_publish', domainId, tenantId, {
      provisioningStatus: result.provisioningStatus,
    });
    return toDto(updated);
  }

  async retry(
    tenantId: string,
    domainId: string,
    user: CognitoJwtPayload,
  ): Promise<PublicDomainDto> {
    return this.publish(tenantId, domainId, user);
  }

  async disable(tenantId: string, domainId: string, user: CognitoJwtPayload): Promise<PublicDomainDto> {
    await this.assertManageAccess(tenantId, user);
    const row = await this.requireDomain(tenantId, domainId);
    const tenantHosts = await this.prisma.publicDomain.findMany({
      where: { tenantId },
      select: { hostnameNormalized: true },
    });
    const result = await this.awsProvider.disable({
      domainId: row.id,
      tenantId,
      hostnameNormalized: row.hostnameNormalized,
      isCanonical: row.isCanonical,
      allTenantHostnames: tenantHosts.map((h) => h.hostnameNormalized),
      persistedCertificateArn: row.certificateArn,
      persistedHostedZoneId: row.hostedZoneId,
      persistedDistributionId: row.distributionId,
      persistedDistributionDomain: row.distributionDomain,
      persistedCloudFrontFunctionArn: row.cloudFrontFunctionArn,
    });
    const updated = await this.prisma.publicDomain.update({
      where: { id: row.id },
      data: {
        status: 'DISABLED',
        provisioningStatus: result.provisioningStatus ?? 'DISABLED',
        provisioningStep: null,
        provisioningMetadata: Prisma.DbNull,
        disabledAt: new Date(),
        activatedAt: null,
        lastCheckedAt: new Date(),
      },
    });
    await this.audit(user, 'public_domain_disable', domainId, tenantId, {});
    return toDto(updated);
  }

  async remove(tenantId: string, domainId: string, user: CognitoJwtPayload): Promise<void> {
    await this.assertManageAccess(tenantId, user);
    const row = await this.requireDomain(tenantId, domainId);
    if (row.status === 'ACTIVE' || row.provisioningStatus === 'ACTIVE') {
      throw new BadRequestException('Despublique o domínio antes de remover.');
    }
    await this.prisma.publicDomain.delete({ where: { id: row.id } });
    await this.audit(user, 'public_domain_remove', domainId, tenantId, {
      hostname: row.hostnameNormalized,
    });
  }

  /** Novo token TXT (substitui hash anterior) — para quando o usuário perdeu o valor exibido na criação. */
  async refreshVerificationChallenge(
    tenantId: string,
    domainId: string,
    user: CognitoJwtPayload,
  ): Promise<PublicDomainDto> {
    await this.assertManageAccess(tenantId, user);
    const row = await this.requireDomain(tenantId, domainId);
    if (row.verificationStatus === 'VERIFIED') {
      throw new BadRequestException('Domínio já verificado.');
    }
    const token = generateVerificationToken(24);
    const tokenHash = hashVerificationToken(token);
    const exp = new Date(Date.now() + VERIFICATION_TTL_MS);
    const updated = await this.prisma.publicDomain.update({
      where: { id: row.id },
      data: {
        verificationTokenHash: tokenHash,
        verificationExpiresAt: exp,
        verificationStatus: 'PENDING_VERIFICATION',
        provisioningStatus: 'PENDING_VERIFICATION',
        lastErrorCode: null,
        lastErrorMessage: null,
      },
    });
    await this.audit(user, 'public_domain_refresh_challenge', domainId, tenantId, {});
    return toDto(updated, {
      verificationTxtName: verificationTxtRecordName(row.hostnameNormalized),
      verificationTxtValue: `cup360-verify=${token}`,
    });
  }

  private async requireDomain(tenantId: string, domainId: string): Promise<PublicDomain> {
    const row = await this.prisma.publicDomain.findFirst({
      where: { id: domainId, tenantId },
    });
    if (!row) throw new NotFoundException('Domínio não encontrado.');
    return row;
  }

  private async assertManageAccess(tenantId: string, user: CognitoJwtPayload): Promise<void> {
    const role = user.role ?? user['cognito:groups']?.[0] ?? 'user';
    const allowed = await this.tenantAccess.getAllowedTenantIds(user.sub, role);
    this.tenantAccess.assertCanAccessTenant(allowed, tenantId);
    const slugs = await this.modules.getSlugsForActor(user.sub, role);
    if (role !== 'super_admin' && !slugs.includes(MODULE_SLUG)) {
      throw new ForbiddenException('Sem permissão para gerenciar domínio público.');
    }
  }

  private async audit(
    user: CognitoJwtPayload,
    changeType: string,
    targetId: string,
    tenantId: string,
    after: Record<string, unknown>,
  ): Promise<void> {
    const email = user.email ?? null;
    await this.prisma.cup360AccessAudit.create({
      data: {
        actorSub: user.sub,
        actorEmail: email,
        targetType: 'public_domain',
        targetId,
        targetLabel: tenantId,
        moduleSlug: MODULE_SLUG,
        changeType,
        after: after as object,
      },
    });
  }
}
