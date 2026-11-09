import {
  cup360EdgeContractHeadersComplete,
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

describe('middleware-edge-routing (Web)', () => {
  const secret = 'edge-secret';

  it('origin Host + contrato completo → deve resolver domínio público', () => {
    const hdrs = headersFromRecord({
      'x-cup360-edge-v': '1',
      'x-cup360-edge-ts': '1',
      'x-cup360-edge-host': 'www.customer.com',
      'x-cup360-edge-sig': 'ab',
    });
    expect(
      shouldResolvePublicDomainRouting('origin.bostoncitygroup.biz', '/', hdrs, secret),
    ).toBe(true);
  });

  it('origin Host sem contrato → plataforma, não roteia tenant', () => {
    const hdrs = new Headers();
    expect(
      shouldResolvePublicDomainRouting('origin.bostoncitygroup.biz', '/', hdrs, secret),
    ).toBe(false);
  });

  it('host direto do cliente sem contrato → deve tentar (fail-closed no middleware)', () => {
    expect(
      shouldResolvePublicDomainRouting('www.customer.com', '/', new Headers(), secret),
    ).toBe(true);
  });

  it('dashboard/login em domínio cliente → bloqueio admin', () => {
    expect(shouldBlockCustomerDomainAdminPath('www.customer.com', '/dashboard', secret)).toBe(
      true,
    );
    expect(shouldBlockCustomerDomainAdminPath('www.customer.com', '/login', secret)).toBe(true);
    expect(
      shouldBlockCustomerDomainAdminPath('www.bostoncitygroup.biz', '/dashboard', secret),
    ).toBe(false);
  });

  it('origin Host + contrato → bloqueia dashboard pelo host assinado', () => {
    const hdrs = headersFromRecord({
      'x-cup360-edge-v': '1',
      'x-cup360-edge-ts': '1',
      'x-cup360-edge-host': 'www.customer.com',
      'x-cup360-edge-sig': 'ab',
    });
    expect(
      shouldBlockCustomerDomainAdminPath(
        'origin.bostoncitygroup.biz',
        '/dashboard',
        secret,
        hdrs,
      ),
    ).toBe(true);
  });

  it('origin Host sem contrato → fail-closed', () => {
    expect(
      middlewareFailsClosedWithoutEdgeContract(
        'origin.bostoncitygroup.biz',
        new Headers(),
        secret,
      ),
    ).toBe(true);
  });

  it('caminhos bloqueados não disparam resolução', () => {
    const hdrs = headersFromRecord({
      'x-cup360-edge-v': '1',
      'x-cup360-edge-ts': '1',
      'x-cup360-edge-host': 'www.customer.com',
      'x-cup360-edge-sig': 'ab',
    });
    expect(
      shouldResolvePublicDomainRouting('origin.bostoncitygroup.biz', '/dashboard', hdrs, secret),
    ).toBe(false);
  });

  it('getOriginInboundHost usa só Host (sem X-Forwarded-Host)', () => {
    expect(getOriginInboundHost('origin.bostoncitygroup.biz')).toBe('origin.bostoncitygroup.biz');
  });

  it('contrato incompleto não conta como presente', () => {
    const hdrs = headersFromRecord({
      'x-cup360-edge-host': 'www.customer.com',
    });
    expect(cup360EdgeContractHeadersComplete(hdrs)).toBe(false);
  });

  describe('hosts de infraestrutura da plataforma', () => {
    const infra = [
      'auth.bostoncitygroup.biz',
      'api.bostoncitygroup.biz',
      'origin.bostoncitygroup.biz',
      'www.bostoncitygroup.biz',
    ];

    it.each(infra)('%s é plataforma', (host) => {
      expect(isCup360PlatformHost(host)).toBe(true);
    });

    it('auth + /api/auth/login sem contrato não dispara fail-closed', () => {
      expect(
        middlewareFailsClosedWithoutEdgeContract(
          'auth.bostoncitygroup.biz',
          new Headers(),
          secret,
        ),
      ).toBe(false);
    });

    it('www.customer.com sem contrato → fail-closed', () => {
      expect(
        middlewareFailsClosedWithoutEdgeContract('www.customer.com', new Headers(), secret),
      ).toBe(true);
    });

    it('contrato inválido/incompleto em cliente continua fail-closed', () => {
      const hdrs = headersFromRecord({
        'x-cup360-edge-host': 'www.customer.com',
      });
      expect(
        middlewareFailsClosedWithoutEdgeContract('www.customer.com', hdrs, secret),
      ).toBe(true);
    });
  });
});
