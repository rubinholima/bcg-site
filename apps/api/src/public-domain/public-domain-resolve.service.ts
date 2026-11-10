import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { normalizePublicHostname, PublicDomainHostnameError } from './public-domain.hostname.util';

export type HostnameMiddlewareContext =
  | { mode: 'none' }
  | { mode: 'apex_redirect'; redirectTo: string }
  | {
      mode: 'custom_domain';
      tenantSlug: string;
      canonicalOrigin: string;
      pathPrefix: string;
    };

/**
 * Resolução pública host → tenant (somente domínios ACTIVE+VERIFIED). Sem dependência de módulos/perfil.
 */
@Injectable()
export class PublicDomainResolveService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveActiveByHostname(hostnameRaw: string): Promise<{
    tenantId: string;
    tenantSlug: string;
    hostnameNormalized: string;
    isCanonical: boolean;
  } | null> {
    let hostnameNormalized: string;
    try {
      hostnameNormalized = normalizePublicHostname(hostnameRaw);
    } catch {
      return null;
    }
    const row = await this.prisma.publicDomain.findFirst({
      where: {
        hostnameNormalized,
        status: 'ACTIVE',
        verificationStatus: 'VERIFIED',
      },
      select: {
        tenantId: true,
        hostnameNormalized: true,
        isCanonical: true,
        tenant: { select: { slug: true } },
      },
    });
    if (!row) return null;
    return {
      tenantId: row.tenantId,
      tenantSlug: row.tenant.slug,
      hostnameNormalized: row.hostnameNormalized,
      isCanonical: row.isCanonical,
    };
  }

  /** Contexto para middleware Next: rewrite + origem canônica (https + host canônico do tenant). */
  async resolveMiddlewareContext(
    hostHeader: string,
    pathname = '/',
    search = '',
  ): Promise<HostnameMiddlewareContext> {
    let host: string;
    try {
      host = normalizePublicHostname(hostHeader);
    } catch (e) {
      if (e instanceof PublicDomainHostnameError) {
        return { mode: 'none' };
      }
      throw e;
    }

    const hit = await this.resolveActiveByHostname(host);
    if (hit) {
      const all = await this.prisma.publicDomain.findMany({
        where: { tenantId: hit.tenantId, status: 'ACTIVE', verificationStatus: 'VERIFIED' },
        select: { hostnameNormalized: true, isCanonical: true },
      });
      const canonicalRow = all.find((d) => d.isCanonical) ?? all[0];
      if (!canonicalRow) return { mode: 'none' };

      const canonicalHost = canonicalRow.hostnameNormalized;
      if (host !== canonicalHost) {
        const path = (pathname || '/') + (search ?? '');
        return { mode: 'apex_redirect', redirectTo: `https://${canonicalHost}${path}` };
      }
      const pathPrefix = `/portfolio/${hit.tenantSlug}`;

      return {
        mode: 'custom_domain',
        tenantSlug: hit.tenantSlug,
        canonicalOrigin: `https://${canonicalHost}`,
        pathPrefix,
      };
    }

    /** Alias de redirect (ex.: apex): VERIFIED + isCanonical=false — não precisa ACTIVE. */
    const redirectAlias = await this.prisma.publicDomain.findFirst({
      where: {
        hostnameNormalized: host,
        verificationStatus: 'VERIFIED',
        isCanonical: false,
      },
      select: { tenantId: true, hostnameNormalized: true },
    });
    if (!redirectAlias) return { mode: 'none' };

    const canonical = await this.findActiveCanonicalHostname(redirectAlias.tenantId);
    if (!canonical) return { mode: 'none' };

    const path = (pathname || '/') + (search ?? '');
    return {
      mode: 'apex_redirect',
      redirectTo: `https://${canonical.hostnameNormalized}${path}`,
    };
  }

  /** Host canônico publicado (ACTIVE+VERIFIED) do tenant — destino de redirect confiável. */
  private async findActiveCanonicalHostname(tenantId: string): Promise<{ hostnameNormalized: string } | null> {
    return this.prisma.publicDomain.findFirst({
      where: {
        tenantId,
        verificationStatus: 'VERIFIED',
        isCanonical: true,
        status: 'ACTIVE',
      },
      select: { hostnameNormalized: true },
    });
  }
}
