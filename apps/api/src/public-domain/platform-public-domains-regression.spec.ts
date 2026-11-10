/**
 * Matriz de regressão — Public Domains não pode quebrar hosts de plataforma (PROMPT 023).
 */
import {
  CUP360_PLATFORM_HOSTNAMES,
  getOriginInboundHost,
  isCup360PlatformHost,
  middlewareFailsClosedWithoutEdgeContract,
  shouldBlockCustomerDomainAdminPath,
  shouldResolvePublicDomainRouting,
} from '../../../web/src/lib/middleware-edge-routing';

function headersFromRecord(rec: Record<string, string>): Headers {
  const h = new Headers();
  for (const [k, v] of Object.entries(rec)) h.set(k, v);
  return h;
}

const EDGE_SECRETS = [
  { label: 'absent', secret: undefined as string | undefined },
  { label: 'present', secret: 'edge-secret' },
];

const CUSTOMER = 'www.bostoncityfc.com';

describe('platform-public-domains regression matrix', () => {
  describe.each(EDGE_SECRETS)('CUP360_EDGE_HOST_SECRET $label', ({ secret }) => {
    describe('PLATFORM — nunca Forbidden por Public Domains', () => {
      it.each(CUP360_PLATFORM_HOSTNAMES)('%s /login', (host) => {
        expect(isCup360PlatformHost(host)).toBe(true);
        expect(
          middlewareFailsClosedWithoutEdgeContract(host, new Headers(), secret),
        ).toBe(false);
        expect(shouldBlockCustomerDomainAdminPath(host, '/login', secret)).toBe(false);
        expect(
          shouldResolvePublicDomainRouting(host, '/login', new Headers(), secret),
        ).toBe(false);
      });

      it.each(CUP360_PLATFORM_HOSTNAMES)('%s /dashboard', (host) => {
        expect(
          middlewareFailsClosedWithoutEdgeContract(host, new Headers(), secret),
        ).toBe(false);
        expect(shouldBlockCustomerDomainAdminPath(host, '/dashboard', secret)).toBe(false);
      });

      it('origin /api/auth/login (proxy auth)', () => {
        const host = 'origin.bostoncitygroup.biz';
        expect(
          middlewareFailsClosedWithoutEdgeContract(host, new Headers(), secret),
        ).toBe(false);
        expect(shouldBlockCustomerDomainAdminPath(host, '/api/auth/login', secret)).toBe(false);
      });
    });

    describe('EXISTING PUBLIC — rotas portfolio na plataforma', () => {
      it('www /portfolio/villa-nova-saf não aciona fail-closed', () => {
        expect(
          middlewareFailsClosedWithoutEdgeContract(
            'www.bostoncitygroup.biz',
            new Headers(),
            secret,
          ),
        ).toBe(false);
        expect(
          shouldResolvePublicDomainRouting(
            'www.bostoncitygroup.biz',
            '/portfolio/villa-nova-saf',
            new Headers(),
            secret,
          ),
        ).toBe(false);
      });

      it('www /portfolio/boston-city-fc-usa', () => {
        expect(
          shouldResolvePublicDomainRouting(
            'www.bostoncitygroup.biz',
            '/portfolio/boston-city-fc-usa',
            new Headers(),
            secret,
          ),
        ).toBe(false);
      });
    });
  });

  describe('CUSTOM DOMAIN — só com segredo presente', () => {
    it('sem contrato → fail-closed', () => {
      expect(
        middlewareFailsClosedWithoutEdgeContract(CUSTOMER, new Headers(), 'edge-secret'),
      ).toBe(true);
    });

    it('com contrato completo na origem → resolução elegível', () => {
      const hdrs = headersFromRecord({
        'x-cup360-edge-v': '1',
        'x-cup360-edge-ts': '1',
        'x-cup360-edge-host': CUSTOMER,
        'x-cup360-edge-sig': 'ab',
      });
      expect(
        shouldResolvePublicDomainRouting('origin.bostoncitygroup.biz', '/', hdrs, 'edge-secret'),
      ).toBe(true);
      expect(
        middlewareFailsClosedWithoutEdgeContract(
          'origin.bostoncitygroup.biz',
          hdrs,
          'edge-secret',
        ),
      ).toBe(false);
    });

    it('dashboard/login bloqueados pelo host assinado', () => {
      const hdrs = headersFromRecord({
        'x-cup360-edge-v': '1',
        'x-cup360-edge-ts': '1',
        'x-cup360-edge-host': CUSTOMER,
        'x-cup360-edge-sig': 'ab',
      });
      expect(
        shouldBlockCustomerDomainAdminPath(
          'origin.bostoncitygroup.biz',
          '/dashboard',
          'edge-secret',
          hdrs,
        ),
      ).toBe(true);
      expect(
        shouldBlockCustomerDomainAdminPath(
          'origin.bostoncitygroup.biz',
          '/login',
          'edge-secret',
          hdrs,
        ),
      ).toBe(true);
    });

    it('X-Forwarded-Host não altera host efetivo (só header Host)', () => {
      expect(getOriginInboundHost('www.bostoncitygroup.biz')).toBe('www.bostoncitygroup.biz');
      const hdrs = headersFromRecord({
        'x-forwarded-host': 'www.bostoncityfc.com',
      });
      expect(
        shouldResolvePublicDomainRouting('www.bostoncitygroup.biz', '/', hdrs, 'edge-secret'),
      ).toBe(false);
    });
  });

  describe('segredo ausente — domínio cliente sem contrato não força fail-closed no middleware', () => {
    it('customer sem secret → middleware fail-closed off', () => {
      expect(
        middlewareFailsClosedWithoutEdgeContract(CUSTOMER, new Headers(), undefined),
      ).toBe(false);
    });
  });
});
