/**
 * Matriz permanent four-class: PLATFORM | LEGACY_CUSTOM | NATIVE_PUBLIC_DOMAIN | UNKNOWN (PROMPT 029).
 */
import { createHmac } from 'crypto';
import { ForbiddenException } from '@nestjs/common';
import {
  buildCup360EdgeContractPayload,
  CUP360_EDGE_CONTRACT_VERSION,
  signCup360EdgeContract,
} from './cup360-edge-contract.util';
import {
  CUP360_LEGACY_PROVENANCE_HEADER,
  CUP360_LEGACY_PROVENANCE_NGINX_V1,
} from './cup360-legacy-provenance.util';
import { LegacyPublicDomainResolveService } from './legacy-public-domain-resolve.service';
import { PublicController } from '../public/public.controller';
import { PublicDomainResolveService } from './public-domain-resolve.service';
import {
  CUP360_PLATFORM_HOSTNAMES,
  classifyCup360InboundDomain,
  getOriginInboundHost,
  middlewareFailsClosedWithoutEdgeContract,
  shouldBlockCustomerDomainAdminPath,
  shouldResolvePublicDomainRouting,
} from '../../../web/src/lib/middleware-edge-routing';

const SECRET = 'edge-secret-minimum-16b';
const BCFC = 'www.bostoncityfc.com';
const LEGACY = 'legacy-club.example';
const LEGACY_WWW = 'www.legacy-club.example';
const VILLA = 'villanovasaf.com';

function headersFrom(rec: Record<string, string>): Headers {
  const h = new Headers();
  for (const [k, v] of Object.entries(rec)) h.set(k, v);
  return h;
}

function legacyNginxHeaders(host: string): Record<string, string> {
  return {
    [CUP360_LEGACY_PROVENANCE_HEADER]: CUP360_LEGACY_PROVENANCE_NGINX_V1,
    host,
  };
}

function signLegacyNginx(host: string, ts = Math.floor(Date.now() / 1000)): Record<string, string> {
  const sig = createHmac('sha256', SECRET).update(`${ts}.${host}`, 'utf8').digest('hex');
  return {
    'x-cup360-edge-host-ts': String(ts),
    'x-cup360-edge-host-sig': sig,
  };
}

function validNativeContract(host: string): Record<string, string> {
  const ts = Math.floor(Date.now() / 1000);
  const payload = buildCup360EdgeContractPayload(CUP360_EDGE_CONTRACT_VERSION, ts, host);
  const sig = signCup360EdgeContract(SECRET, payload);
  return {
    'x-cup360-edge-v': CUP360_EDGE_CONTRACT_VERSION,
    'x-cup360-edge-ts': String(ts),
    'x-cup360-edge-host': host,
    'x-cup360-edge-sig': sig,
  };
}

describe('CUP360 four-class domain regression (PROMPT 029)', () => {
  describe('DOMAIN CLASSIFIER', () => {
    it('PLATFORM', () => {
      for (const h of CUP360_PLATFORM_HOSTNAMES) {
        expect(classifyCup360InboundDomain(h, new Headers(), SECRET)).toBe('PLATFORM');
      }
    });

    it('NATIVE_PUBLIC_DOMAIN com contrato completo', () => {
      const hdrs = headersFrom(validNativeContract(BCFC));
      expect(classifyCup360InboundDomain('origin.bostoncitygroup.biz', hdrs, SECRET)).toBe(
        'NATIVE_PUBLIC_DOMAIN',
      );
    });

    it('LEGACY_CUSTOM com provenance nginx', () => {
      const hdrs = headersFrom(legacyNginxHeaders(LEGACY));
      expect(classifyCup360InboundDomain(LEGACY, hdrs, SECRET)).toBe('LEGACY_CUSTOM');
    });

    it('UNKNOWN sem contrato nem provenance', () => {
      expect(classifyCup360InboundDomain('evil.example', new Headers(), SECRET)).toBe('UNKNOWN');
    });
  });

  describe('PLATFORM', () => {
    it.each(CUP360_PLATFORM_HOSTNAMES)('%s /login sem fail-closed', (host) => {
      expect(middlewareFailsClosedWithoutEdgeContract(host, new Headers(), SECRET)).toBe(false);
      expect(shouldBlockCustomerDomainAdminPath(host, '/login', SECRET)).toBe(false);
    });

    it('origin /api/auth/login', () => {
      const host = 'origin.bostoncitygroup.biz';
      expect(middlewareFailsClosedWithoutEdgeContract(host, new Headers(), SECRET)).toBe(false);
    });
  });

  describe('LEGACY_CUSTOM', () => {
    const legacyHdrs = headersFrom(legacyNginxHeaders(VILLA));

    it(`${VILLA} / não fail-closed com provenance`, () => {
      expect(middlewareFailsClosedWithoutEdgeContract(VILLA, legacyHdrs, SECRET)).toBe(false);
      expect(shouldResolvePublicDomainRouting('origin.bostoncitygroup.biz', '/', legacyHdrs, SECRET)).toBe(
        true,
      );
    });

    it('www legado com provenance', () => {
      const hdrs = headersFrom(legacyNginxHeaders(LEGACY_WWW));
      expect(middlewareFailsClosedWithoutEdgeContract(LEGACY_WWW, hdrs, SECRET)).toBe(false);
    });

    it('legacy /dashboard bloqueado', () => {
      expect(shouldBlockCustomerDomainAdminPath(VILLA, '/dashboard', SECRET, legacyHdrs)).toBe(true);
      expect(shouldBlockCustomerDomainAdminPath(VILLA, '/login', SECRET, legacyHdrs)).toBe(true);
      expect(shouldBlockCustomerDomainAdminPath(VILLA, '/api/me', SECRET, legacyHdrs)).toBe(true);
    });

    it('marcador forjado sem registro → API Forbidden', async () => {
      const legacy = { resolveMiddlewareContext: jest.fn().mockResolvedValue({ mode: 'none' }) };
      const resolve = { resolveMiddlewareContext: jest.fn() };
      const controller = new PublicController(
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        resolve as unknown as PublicDomainResolveService,
        legacy as unknown as LegacyPublicDomainResolveService,
      );
      const prev = process.env.CUP360_EDGE_HOST_SECRET;
      process.env.CUP360_EDGE_HOST_SECRET = SECRET;
      try {
        await expect(
          controller.hostnameContext(
            'unknown-forge.example',
            '/',
            '',
            { [CUP360_LEGACY_PROVENANCE_HEADER]: CUP360_LEGACY_PROVENANCE_NGINX_V1 },
          ),
        ).rejects.toThrow(ForbiddenException);
      } finally {
        process.env.CUP360_EDGE_HOST_SECRET = prev;
      }
    });

    it('tenant swap: assinatura de outro host → Forbidden', async () => {
      const legacy = { resolveMiddlewareContext: jest.fn() };
      const resolve = { resolveMiddlewareContext: jest.fn() };
      const controller = new PublicController(
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        resolve as unknown as PublicDomainResolveService,
        legacy as unknown as LegacyPublicDomainResolveService,
      );
      const prev = process.env.CUP360_EDGE_HOST_SECRET;
      process.env.CUP360_EDGE_HOST_SECRET = SECRET;
      const other = 'other-club.example';
      const signed = signLegacyNginx(other);
      try {
        await expect(
          controller.hostnameContext(LEGACY, '/', '', signed),
        ).rejects.toThrow(ForbiddenException);
      } finally {
        process.env.CUP360_EDGE_HOST_SECRET = prev;
      }
    });
  });

  describe('NATIVE_PUBLIC_DOMAIN', () => {
    const contract = validNativeContract(BCFC);
    const hdrs = headersFrom(contract);

    it('contrato válido resolve (fail-closed off)', () => {
      expect(middlewareFailsClosedWithoutEdgeContract('origin.bostoncitygroup.biz', hdrs, SECRET)).toBe(
        false,
      );
      expect(shouldResolvePublicDomainRouting('origin.bostoncitygroup.biz', '/', hdrs, SECRET)).toBe(
        true,
      );
    });

    it('BCFC /dashboard bloqueado', () => {
      expect(
        shouldBlockCustomerDomainAdminPath('origin.bostoncitygroup.biz', '/dashboard', SECRET, hdrs),
      ).toBe(true);
    });

    it('sem contrato → fail-closed', () => {
      expect(middlewareFailsClosedWithoutEdgeContract(BCFC, new Headers(), SECRET)).toBe(true);
    });

    it('contrato inválido → Forbidden na API', async () => {
      const bad = { ...contract, 'x-cup360-edge-sig': '00'.repeat(32) };
      const resolve = { resolveMiddlewareContext: jest.fn() };
      const legacy = { resolveMiddlewareContext: jest.fn() };
      const controller = new PublicController(
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        resolve as unknown as PublicDomainResolveService,
        legacy as unknown as LegacyPublicDomainResolveService,
      );
      const prev = process.env.CUP360_EDGE_HOST_SECRET;
      process.env.CUP360_EDGE_HOST_SECRET = SECRET;
      try {
        await expect(
          controller.hostnameContext('origin.bostoncitygroup.biz', '/', '', bad),
        ).rejects.toThrow(ForbiddenException);
      } finally {
        process.env.CUP360_EDGE_HOST_SECRET = prev;
      }
    });
  });

  describe('UNKNOWN', () => {
    it('host desconhecido fail-closed', () => {
      expect(middlewareFailsClosedWithoutEdgeContract('random.example', new Headers(), SECRET)).toBe(
        true,
      );
    });

    it('host desconhecido + /portfolio/path ainda fail-closed', () => {
      expect(
        shouldResolvePublicDomainRouting(
          'random.example',
          '/portfolio/villa-nova-saf',
          new Headers(),
          SECRET,
        ),
      ).toBe(false);
    });

    it('marcador legado forjado sem host registrado não classifica LEGACY na API', () => {
      expect(classifyCup360InboundDomain('random.example', headersFrom(legacyNginxHeaders('random.example')), SECRET)).toBe(
        'LEGACY_CUSTOM',
      );
      expect(middlewareFailsClosedWithoutEdgeContract('random.example', headersFrom(legacyNginxHeaders('random.example')), SECRET)).toBe(
        false,
      );
    });

    it('X-Forwarded-Host não altera Host de origem', () => {
      const hdrs = new Headers({ 'x-forwarded-host': BCFC });
      expect(getOriginInboundHost(VILLA)).toBe(VILLA);
      expect(middlewareFailsClosedWithoutEdgeContract(VILLA, hdrs, SECRET)).toBe(true);
    });
  });
});
