import { createHmac, timingSafeEqual } from 'crypto';
import { normalizePublicHostname, PublicDomainHostnameError } from './public-domain.hostname.util';

const MAX_SKEW_SEC = 300;

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

/**
 * Assinatura HMAC-SHA256: `timestampSeconds + "." + hostnameAscii`
 */
export function verifyEdgePublicHostSignature(
  secret: string,
  timestampSec: string | undefined,
  signatureHex: string | undefined,
  claimedHost: string | undefined,
): string | null {
  if (!secret || !timestampSec || !signatureHex || !claimedHost) return null;
  const ts = Number(timestampSec);
  if (!Number.isFinite(ts)) return null;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > MAX_SKEW_SEC) return null;

  let hostNorm: string;
  try {
    hostNorm = normalizePublicHostname(claimedHost);
  } catch (e) {
    if (e instanceof PublicDomainHostnameError) return null;
    throw e;
  }

  const payload = `${Math.floor(ts)}.${hostNorm}`;
  const expected = createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
  if (!safeEqualHex(expected, signatureHex)) return null;
  return hostNorm;
}
