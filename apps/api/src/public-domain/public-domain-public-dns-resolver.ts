import { resolveTxt } from 'dns/promises';
import { verificationTxtRecordName } from './public-domain.hostname.util';

export type PublicDnsTxtResolver = (fqdn: string) => Promise<string[]>;

const DEFAULT_DNS_TIMEOUT_MS = 12_000;

function dnsLookupTimeoutMs(): number {
  const raw = process.env.CUP360_DNS_LOOKUP_TIMEOUT_MS?.trim();
  const n = raw ? Number(raw) : DEFAULT_DNS_TIMEOUT_MS;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_DNS_TIMEOUT_MS;
}

async function withDnsTimeout<T>(work: Promise<T>): Promise<T> {
  const ms = dnsLookupTimeoutMs();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(Object.assign(new Error('DNS_TIMEOUT'), { code: 'ETIMEOUT' })), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Resolve registros TXT publicamente (autoritativo via recursores do SO). */
export async function resolvePublicTxtRecords(fqdn: string): Promise<string[]> {
  const normalized = fqdn.replace(/\.$/, '').toLowerCase();
  try {
    const chunks = await withDnsTimeout(resolveTxt(normalized));
    return chunks.map((parts) => parts.join(''));
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException;
    if (err?.code === 'ETIMEOUT' || err?.message === 'DNS_TIMEOUT') {
      throw err;
    }
    if (err?.code === 'ENOTFOUND' || err?.code === 'ENODATA') {
      return [];
    }
    throw e;
  }
}

export async function resolveOwnershipTxtForHostname(
  hostnameNormalized: string,
  resolver: PublicDnsTxtResolver = resolvePublicTxtRecords,
): Promise<string[]> {
  const name = verificationTxtRecordName(hostnameNormalized);
  return resolver(name);
}
