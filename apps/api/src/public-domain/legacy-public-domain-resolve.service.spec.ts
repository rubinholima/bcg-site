import { LegacyPublicDomainResolveService } from './legacy-public-domain-resolve.service';
import type { PrismaService } from '../prisma/prisma.service';

describe('LegacyPublicDomainResolveService', () => {
  it('rewrite custom_domain para tenant registrado', async () => {
    const prisma = {
      legacyPublicDomain: {
        findFirst: jest.fn().mockResolvedValue({
          hostnameNormalized: 'club.example',
          tenant: { slug: 'club-slug' },
        }),
      },
    };
    const svc = new LegacyPublicDomainResolveService(prisma as unknown as PrismaService);
    await expect(svc.resolveMiddlewareContext('club.example', '/news', '?id=1')).resolves.toEqual({
      mode: 'custom_domain',
      tenantSlug: 'club-slug',
      canonicalOrigin: 'https://club.example',
      pathPrefix: '/portfolio/club-slug',
    });
  });

  it('host não registrado → none', async () => {
    const prisma = {
      legacyPublicDomain: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const svc = new LegacyPublicDomainResolveService(prisma as unknown as PrismaService);
    await expect(svc.resolveMiddlewareContext('unknown.example', '/', '')).resolves.toEqual({
      mode: 'none',
    });
  });
});
