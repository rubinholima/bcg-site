import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { normalizePublicHostname, PublicDomainHostnameError } from './public-domain.hostname.util';
import type { HostnameMiddlewareContext } from './public-domain-resolve.service';

/**
 * Domínios customizados legados (Nginx → origem): hostname registrado → /portfolio/[slug].
 */
@Injectable()
export class LegacyPublicDomainResolveService {
  constructor(private readonly prisma: PrismaService) {}

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

    const row = await this.prisma.legacyPublicDomain.findFirst({
      where: {
        hostnameNormalized: host,
        status: 'ACTIVE',
      },
      select: {
        hostnameNormalized: true,
        tenant: { select: { slug: true } },
      },
    });
    if (!row) return { mode: 'none' };

    const pathPrefix = `/portfolio/${row.tenant.slug}`;
    return {
      mode: 'custom_domain',
      tenantSlug: row.tenant.slug,
      canonicalOrigin: `https://${row.hostnameNormalized}`,
      pathPrefix,
    };
  }
}
