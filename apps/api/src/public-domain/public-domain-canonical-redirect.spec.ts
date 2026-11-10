/**
 * Redirect canônico apex → www (PROMPT 027) — resolução + middleware (sem deploy).
 */
import {
  getOriginInboundHost,
  middlewareFailsClosedWithoutEdgeContract,
  shouldBlockCustomerDomainAdminPath,
  shouldResolvePublicDomainRouting,
} from '../../../web/src/lib/middleware-edge-routing';
import { PublicDomainResolveService } from './public-domain-resolve.service';
import type { PrismaService } from '../prisma/prisma.service';

function headersFromRecord(rec: Record<string, string>): Headers {
  const h = new Headers();
  for (const [k, v] of Object.entries(rec)) h.set(k, v);
  return h;
}

const APEX = 'bostoncityfc.com';
const WWW = 'www.bostoncityfc.com';
const SECRET = 'edge-secret';

function prismaCanonicalRedirectMock(opts: {
  activeHit?: unknown;
  findMany?: unknown[];
  redirectAlias?: unknown;
  canonical?: unknown;
}): Pick<PrismaService, 'publicDomain'> {
  const findFirst = jest.fn();
  /** 1ª chamada: resolveActiveByHostname */
  if (opts.activeHit !== undefined) {
    findFirst.mockResolvedValueOnce(opts.activeHit);
  }
  if (opts.redirectAlias !== undefined) {
    findFirst.mockResolvedValueOnce(opts.redirectAlias);
  }
  if (opts.canonical !== undefined) {
    findFirst.mockResolvedValueOnce(opts.canonical);
  }
  return {
    publicDomain: {
      findFirst,
      findMany: jest.fn().mockResolvedValue(opts.findMany ?? []),
    } as never,
  };
}

describe('PublicDomain canonical redirect (PROMPT 027)', () => {
  describe('PublicDomainResolveService', () => {
    it('apex / → 308 target https://www…/', async () => {
      const prisma = prismaCanonicalRedirectMock({
        activeHit: null,
        redirectAlias: { tenantId: 't-bcfc', hostnameNormalized: APEX },
        canonical: { hostnameNormalized: WWW },
      });
      const svc = new PublicDomainResolveService(prisma as unknown as PrismaService);
      await expect(svc.resolveMiddlewareContext(APEX, '/', '')).resolves.toEqual({
        mode: 'apex_redirect',
        redirectTo: `https://${WWW}/`,
      });
    });

    it('apex /test/path?x=1&y=2 preserva path + query', async () => {
      const prisma = prismaCanonicalRedirectMock({
        activeHit: null,
        redirectAlias: { tenantId: 't1', hostnameNormalized: 'clube.com' },
        canonical: { hostnameNormalized: 'www.clube.com' },
      });
      const svc = new PublicDomainResolveService(prisma as unknown as PrismaService);
      await expect(svc.resolveMiddlewareContext('clube.com', '/test/path', '?x=1&y=2')).resolves.toEqual({
        mode: 'apex_redirect',
        redirectTo: 'https://www.clube.com/test/path?x=1&y=2',
      });
    });

    it('apex DISABLED/VERIFIED ainda redireciona quando www ACTIVE', async () => {
      const prisma = prismaCanonicalRedirectMock({
        activeHit: null,
        redirectAlias: { tenantId: 't-bcfc', hostnameNormalized: APEX },
        canonical: { hostnameNormalized: WWW },
      });
      const svc = new PublicDomainResolveService(prisma as unknown as PrismaService);
      const out = await svc.resolveMiddlewareContext(APEX, '/news', '');
      expect(out.mode).toBe('apex_redirect');
      expect((out as { redirectTo: string }).redirectTo).toBe(`https://${WWW}/news`);
    });

    it('www canônico ACTIVE → custom_domain (sem redirect)', async () => {
      const hit = {
        tenantId: 't-bcfc',
        hostnameNormalized: WWW,
        isCanonical: true,
        tenant: { slug: 'boston-city-fc-usa' },
      };
      const prisma = prismaCanonicalRedirectMock({
        activeHit: hit,
        findMany: [{ hostnameNormalized: WWW, isCanonical: true }],
      });
      const svc = new PublicDomainResolveService(prisma as unknown as PrismaService);
      await expect(svc.resolveMiddlewareContext(WWW, '/', '')).resolves.toMatchObject({
        mode: 'custom_domain',
        tenantSlug: 'boston-city-fc-usa',
      });
    });
  });

  describe('middleware com contrato de borda', () => {
    const edgeHdrs = headersFromRecord({
      'x-cup360-edge-v': '1',
      'x-cup360-edge-ts': '1',
      'x-cup360-edge-host': APEX,
      'x-cup360-edge-sig': 'ab',
    });

    it('apex / deve resolver roteamento público', () => {
      expect(
        shouldResolvePublicDomainRouting('origin.bostoncitygroup.biz', '/', edgeHdrs, SECRET),
      ).toBe(true);
    });

    it('apex /dashboard bloqueado (não expõe plataforma)', () => {
      expect(
        shouldBlockCustomerDomainAdminPath(
          'origin.bostoncitygroup.biz',
          '/dashboard',
          SECRET,
          edgeHdrs,
        ),
      ).toBe(true);
    });

    it('apex /login bloqueado', () => {
      expect(
        shouldBlockCustomerDomainAdminPath('origin.bostoncitygroup.biz', '/login', SECRET, edgeHdrs),
      ).toBe(true);
    });

    it('www /dashboard bloqueado com host assinado www', () => {
      const wwwHdrs = headersFromRecord({
        'x-cup360-edge-v': '1',
        'x-cup360-edge-ts': '1',
        'x-cup360-edge-host': WWW,
        'x-cup360-edge-sig': 'ab',
      });
      expect(
        shouldBlockCustomerDomainAdminPath(
          'origin.bostoncitygroup.biz',
          '/dashboard',
          SECRET,
          wwwHdrs,
        ),
      ).toBe(true);
    });

    it('host desconhecido sem contrato → fail-closed', () => {
      expect(
        middlewareFailsClosedWithoutEdgeContract('www.unknown-customer.test', new Headers(), SECRET),
      ).toBe(true);
    });

    it('contrato incompleto → fail-closed', () => {
      expect(
        middlewareFailsClosedWithoutEdgeContract(WWW, headersFromRecord({ 'x-cup360-edge-host': WWW }), SECRET),
      ).toBe(true);
    });

    it('X-Forwarded-Host ignorado (só Host de entrada)', () => {
      const hdrs = headersFromRecord({ 'x-forwarded-host': APEX });
      expect(getOriginInboundHost('www.bostoncitygroup.biz')).toBe('www.bostoncitygroup.biz');
      expect(
        shouldResolvePublicDomainRouting('www.bostoncitygroup.biz', '/', hdrs, SECRET),
      ).toBe(false);
    });

    it('plataforma origin sem contrato não é fail-closed', () => {
      expect(
        middlewareFailsClosedWithoutEdgeContract('origin.bostoncitygroup.biz', new Headers(), SECRET),
      ).toBe(false);
    });
  });
});
