import { createHmac } from 'crypto';
import {
  buildCup360EdgeContractPayload,
  CUP360_EDGE_CONTRACT_VERSION,
  cup360EdgeContractHeadersComplete,
  signCup360EdgeContract,
  verifyCup360EdgeContract,
  verifyLegacyEdgeHostSignature,
} from './cup360-edge-contract.util';

describe('cup360-edge-contract', () => {
  const secret = 'test-secret-min-16bytes';

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

  it('aceita contrato válido', () => {
    const ts = Math.floor(Date.now() / 1000);
    const h = headersForContract('www.example.com', ts);
    const out = verifyCup360EdgeContract(secret, h);
    expect(out).toEqual({ hostnameNormalized: 'www.example.com', version: CUP360_EDGE_CONTRACT_VERSION });
  });

  it('rejeita assinatura inválida', () => {
    const ts = Math.floor(Date.now() / 1000);
    const h = headersForContract('www.example.com', ts);
    h['x-cup360-edge-sig'] = '00'.repeat(32);
    expect(verifyCup360EdgeContract(secret, h)).toBeNull();
  });

  it('rejeita timestamp fora da tolerância', () => {
    const ts = Math.floor(Date.now() / 1000) - 400;
    const h = headersForContract('www.example.com', ts);
    expect(verifyCup360EdgeContract(secret, h)).toBeNull();
  });

  it('rejeita versão desconhecida', () => {
    const ts = Math.floor(Date.now() / 1000);
    const payload = buildCup360EdgeContractPayload('99', ts, 'www.example.com');
    const sig = signCup360EdgeContract(secret, payload);
    const out = verifyCup360EdgeContract(secret, {
      'x-cup360-edge-v': '99',
      'x-cup360-edge-ts': String(ts),
      'x-cup360-edge-host': 'www.example.com',
      'x-cup360-edge-sig': sig,
    });
    expect(out).toBeNull();
  });

  it('detecta conjunto completo de headers do contrato', () => {
    const ts = Math.floor(Date.now() / 1000);
    const h = headersForContract('www.example.com', ts);
    expect(cup360EdgeContractHeadersComplete(h)).toBe(true);
    expect(cup360EdgeContractHeadersComplete({ 'x-cup360-edge-host': 'x' })).toBe(false);
  });

  it('compat: assinatura legada (middleware) com x-cup360-edge-host-ts', () => {
    const host = 'www.example.com';
    const ts = Math.floor(Date.now() / 1000).toString();
    const sig = createHmac('sha256', secret).update(`${ts}.${host}`, 'utf8').digest('hex');
    const norm = verifyLegacyEdgeHostSignature(
      secret,
      {
        'x-cup360-edge-host-ts': ts,
        'x-cup360-edge-host-sig': sig,
      },
      host,
    );
    expect(norm).toBe('www.example.com');
  });
});
