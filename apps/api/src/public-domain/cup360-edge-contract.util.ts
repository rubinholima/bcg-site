import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { normalizePublicHostname, PublicDomainHostnameError } from './public-domain.hostname.util';

/** Versão do contrato assinado na borda ↔ origem. */
export const CUP360_EDGE_CONTRACT_VERSION = '1';

const MAX_SKEW_SEC = 120;

export function buildCup360EdgeContractPayload(
  version: string,
  timestampSec: number,
  hostnameNormalized: string,
): string {
  return `${version}|${timestampSec}|${hostnameNormalized}`;
}

export function signCup360EdgeContract(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
}

/**
 * Valida headers confiáveis da CloudFront Function (não confiar em Host / X-Forwarded-Host do cliente).
 * Headers: x-cup360-edge-v, x-cup360-edge-ts, x-cup360-edge-host, x-cup360-edge-sig
 */
export function verifyCup360EdgeContract(
  secret: string | undefined,
  headers: Record<string, string | string[] | undefined> | undefined,
): { hostnameNormalized: string; version: string } | null {
  if (!secret?.trim() || !headers) return null;

  const v = pickHeader(headers, 'x-cup360-edge-v') ?? '';
  const tsRaw = pickHeader(headers, 'x-cup360-edge-ts') ?? '';
  const sig = pickHeader(headers, 'x-cup360-edge-sig') ?? '';
  const hostClaim = pickHeader(headers, 'x-cup360-edge-host') ?? '';

  if (!v || !tsRaw || !sig || !hostClaim) return null;
  if (v !== CUP360_EDGE_CONTRACT_VERSION) return null;

  const ts = Number(tsRaw);
  if (!Number.isFinite(ts)) return null;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > MAX_SKEW_SEC) return null;

  let hostnameNormalized: string;
  try {
    hostnameNormalized = normalizePublicHostname(hostClaim);
  } catch (e) {
    if (e instanceof PublicDomainHostnameError) return null;
    throw e;
  }

  const payload = buildCup360EdgeContractPayload(v, Math.floor(ts), hostnameNormalized);
  const expected = signCup360EdgeContract(secret.trim(), payload);
  if (!safeEqualHex(expected, sig)) return null;

  return { hostnameNormalized, version: v };
}

/** Compat: assinatura antiga ts.hostname (middleware/667c80e8). */
export function verifyLegacyEdgeHostSignature(
  secret: string | undefined,
  headers: Record<string, string | string[] | undefined> | undefined,
  claimedHost: string,
): string | null {
  if (!secret?.trim() || !headers) return null;
  const sig = pickHeader(headers, 'x-cup360-edge-host-sig');
  /** Contrato novo na borda usa `x-cup360-edge-ts`; legado do middleware usa `x-cup360-edge-host-ts`. */
  const ts = pickHeader(headers, 'x-cup360-edge-host-ts');
  if (!sig || !ts || !claimedHost) return null;
  const tsn = Number(ts);
  if (!Number.isFinite(tsn)) return null;
  if (Math.abs(Math.floor(Date.now() / 1000) - tsn) > 300) return null;
  let hostNorm: string;
  try {
    hostNorm = normalizePublicHostname(claimedHost);
  } catch {
    return null;
  }
  const payload = `${Math.floor(tsn)}.${hostNorm}`;
  const expected = createHmac('sha256', secret.trim()).update(payload, 'utf8').digest('hex');
  if (!safeEqualHex(expected, sig)) return null;
  return hostNorm;
}

function pickHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() !== lower) continue;
    if (Array.isArray(v)) return v[0]?.trim();
    return v?.trim();
  }
  return undefined;
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, 'hex');
    const bb = Buffer.from(b, 'hex');
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

/** Hash estável do segredo para o artefato CF Function (não expõe o segredo). */
export function edgeSecretFingerprint(secret: string): string {
  return createHash('sha256').update(secret, 'utf8').digest('hex').slice(0, 16);
}
