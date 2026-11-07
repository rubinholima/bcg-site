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

  it('assinatura inválida → Forbidden', () => {
    const ts = Math.floor(Date.now() / 1000);
    const h = headersForContract('www.customer.com', ts);
    h['x-cup360-edge-sig'] = '00'.repeat(32);
    expect(cup360EdgeContractHeadersComplete(h)).toBe(true);
    expect(() => controller.hostnameContext('origin.bostoncitygroup.biz', '/', '', h)).toThrow(
      ForbiddenException,
    );
  });

  it('timestamp expirado → Forbidden', () => {
    const ts = Math.floor(Date.now() / 1000) - 400;
    const h = headersForContract('www.customer.com', ts);
    expect(verifyCup360EdgeContract(secret, h)).toBeNull();
    expect(() => controller.hostnameContext('origin.bostoncitygroup.biz', '/', '', h)).toThrow(
      ForbiddenException,
    );
  });

  it('domínio cliente direto sem contrato → Forbidden', () => {
    expect(() => controller.hostnameContext('www.customer.com', '/', '', {})).toThrow(
      ForbiddenException,
    );
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
