import { ForbiddenException } from '@nestjs/common';
import {
  buildCup360EdgeContractPayload,
  CUP360_EDGE_CONTRACT_VERSION,
  cup360EdgeContractHeadersComplete,
  signCup360EdgeContract,
  verifyCup360EdgeContract,
} from '../public-domain/cup360-edge-contract.util';
import { PublicController } from './public.controller';
import { PublicDomainResolveService } from '../public-domain/public-domain-resolve.service';
import { LegacyPublicDomainResolveService } from '../public-domain/legacy-public-domain-resolve.service';
import {
  CUP360_LEGACY_PROVENANCE_HEADER,
  CUP360_LEGACY_PROVENANCE_NGINX_V1,
} from '../public-domain/cup360-legacy-provenance.util';

describe('GET /public/hostname-context — contrato de borda', () => {
  const secret = 'test-secret-min-16bytes';
  const resolve = {
    resolveMiddlewareContext: jest.fn().mockResolvedValue({
      mode: 'custom_domain',
      tenantSlug: 'clube',
      canonicalOrigin: 'https://www.clube.com',
      pathPrefix: '/portfolio/clube',
    }),
  };
  const legacyResolve = {
    resolveMiddlewareContext: jest.fn().mockResolvedValue({
      mode: 'custom_domain',
      tenantSlug: 'legacy-clube',
      canonicalOrigin: 'https://legacy-clube.example',
      pathPrefix: '/portfolio/legacy-clube',
    }),
  };

  function headersForContract(host: string, ts: number): Record<string, string> {
    const payload = buildCup360EdgeContractPayload(CUP360_EDGE_CONTRACT_VERSION, ts, host);
    const sig = signCup360EdgeContract(secret, payload);
    return {
      'x-cup360-edge-v': CUP360_EDGE_CONTRACT_VERSION,
      'x-cup360-edge-ts': String(ts),
      'x-cup360-edge-host': host,
      'x-cup360-edge-sig': sig,
    };
  }

  let controller: PublicController;
  let prevSecret: string | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    prevSecret = process.env.CUP360_EDGE_HOST_SECRET;
    process.env.CUP360_EDGE_HOST_SECRET = secret;
    controller = new PublicController(
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
      legacyResolve as unknown as LegacyPublicDomainResolveService,
    );
  });

  afterEach(() => {
    process.env.CUP360_EDGE_HOST_SECRET = prevSecret;
  });

  it('usa hostname assinado, não query host, atrás da origem compartilhada', async () => {
    const ts = Math.floor(Date.now() / 1000);
    const h = headersForContract('www.customer.com', ts);
    await controller.hostnameContext('origin.bostoncitygroup.biz', '/', '', h);
    expect(resolve.resolveMiddlewareContext).toHaveBeenCalledWith('www.customer.com', '/', '');
  });

  it('assinatura inválida → Forbidden', async () => {
    const ts = Math.floor(Date.now() / 1000);
    const h = headersForContract('www.customer.com', ts);
    h['x-cup360-edge-sig'] = '00'.repeat(32);
    expect(cup360EdgeContractHeadersComplete(h)).toBe(true);
    await expect(controller.hostnameContext('origin.bostoncitygroup.biz', '/', '', h)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('timestamp expirado → Forbidden', async () => {
    const ts = Math.floor(Date.now() / 1000) - 400;
    const h = headersForContract('www.customer.com', ts);
    expect(verifyCup360EdgeContract(secret, h)).toBeNull();
    await expect(controller.hostnameContext('origin.bostoncitygroup.biz', '/', '', h)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('domínio cliente direto sem contrato → Forbidden', async () => {
    await expect(controller.hostnameContext('www.customer.com', '/', '', {})).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('domínio legado com provenance nginx → LegacyPublicDomainResolve', async () => {
    const out = await controller.hostnameContext('legacy-clube.example', '/', '', {
      [CUP360_LEGACY_PROVENANCE_HEADER]: CUP360_LEGACY_PROVENANCE_NGINX_V1,
    });
    expect(legacyResolve.resolveMiddlewareContext).toHaveBeenCalledWith(
      'legacy-clube.example',
      '/',
      '',
    );
    expect(out).toMatchObject({ mode: 'custom_domain', tenantSlug: 'legacy-clube' });
    expect(resolve.resolveMiddlewareContext).not.toHaveBeenCalled();
  });

  it('origin plataforma sem contrato → mode none', async () => {
    const out = await controller.hostnameContext('origin.bostoncitygroup.biz', '/', '', {});
    expect(out).toEqual({ mode: 'none' });
    expect(resolve.resolveMiddlewareContext).not.toHaveBeenCalled();
  });

  it('auth plataforma sem contrato → mode none (login direto)', async () => {
    const out = await controller.hostnameContext('auth.bostoncitygroup.biz', '/api/auth/login', '', {});
    expect(out).toEqual({ mode: 'none' });
    expect(resolve.resolveMiddlewareContext).not.toHaveBeenCalled();
  });

  it('api plataforma sem contrato → mode none', async () => {
    const out = await controller.hostnameContext('api.bostoncitygroup.biz', '/', '', {});
    expect(out).toEqual({ mode: 'none' });
    expect(resolve.resolveMiddlewareContext).not.toHaveBeenCalled();
  });
});
