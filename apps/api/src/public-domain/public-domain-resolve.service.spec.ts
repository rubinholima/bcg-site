import { PublicDomainResolveService } from './public-domain-resolve.service';
import type { PrismaService } from '../prisma/prisma.service';

function createPrismaMock(overrides: {
  findFirst?: unknown;
  findMany?: unknown[];
}): Pick<PrismaService, 'publicDomain'> {
  return {
    publicDomain: {
      findFirst: jest.fn().mockResolvedValue(overrides.findFirst),
      findMany: jest.fn().mockResolvedValue(overrides.findMany ?? []),
    } as never,
  };
}

describe('PublicDomainResolveService', () => {
  it('retorna none para hostname inválido', async () => {
    const svc = new PublicDomainResolveService(createPrismaMock({}) as unknown as PrismaService);
    await expect(svc.resolveMiddlewareContext('')).resolves.toEqual({ mode: 'none' });
  });

  it('custom_domain com rewrite para pathPrefix quando visita host canônico', async () => {
    const hit = {
      tenantId: 't1',
      hostnameNormalized: 'www.clube.com',
      isCanonical: true,
      tenant: { slug: 'meu-slug' },
    };
    const prisma = createPrismaMock({
      findFirst: hit,
      findMany: [{ hostnameNormalized: 'www.clube.com', isCanonical: true }],
    });
    const svc = new PublicDomainResolveService(prisma as unknown as PrismaService);
    await expect(
      svc.resolveMiddlewareContext('www.clube.com', '/foo', '?bar=1'),
    ).resolves.toEqual({
      mode: 'custom_domain',
      tenantSlug: 'meu-slug',
      canonicalOrigin: 'https://www.clube.com',
      pathPrefix: '/portfolio/meu-slug',
    });
  });

  it('apex_redirect quando visita alias ACTIVE (não canônico)', async () => {
    const hit = {
      tenantId: 't1',
      hostnameNormalized: 'clube.com',
      isCanonical: false,
      tenant: { slug: 'meu-slug' },
    };
    const prisma = createPrismaMock({
      findFirst: hit,
      findMany: [
        { hostnameNormalized: 'clube.com', isCanonical: false },
        { hostnameNormalized: 'www.clube.com', isCanonical: true },
      ],
    });
    const svc = new PublicDomainResolveService(prisma as unknown as PrismaService);
    await expect(
      svc.resolveMiddlewareContext('clube.com', '/x', '?y=2'),
    ).resolves.toEqual({
      mode: 'apex_redirect',
      redirectTo: 'https://www.clube.com/x?y=2',
    });
  });

  it('apex_redirect quando alias VERIFIED mas DISABLED (só redirect)', async () => {
    const findFirst = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ tenantId: 't1', hostnameNormalized: 'clube.com' })
      .mockResolvedValueOnce({ hostnameNormalized: 'www.clube.com' });
    const prisma = {
      publicDomain: { findFirst, findMany: jest.fn() },
    };
    const svc = new PublicDomainResolveService(prisma as unknown as PrismaService);
    await expect(svc.resolveMiddlewareContext('clube.com', '/', '')).resolves.toEqual({
      mode: 'apex_redirect',
      redirectTo: 'https://www.clube.com/',
    });
  });

  it('none quando não há domínio ACTIVE+VERIFIED', async () => {
    const prisma = createPrismaMock({ findFirst: null });
    const svc = new PublicDomainResolveService(prisma as unknown as PrismaService);
    await expect(svc.resolveMiddlewareContext('unknown.example')).resolves.toEqual({ mode: 'none' });
  });
});
