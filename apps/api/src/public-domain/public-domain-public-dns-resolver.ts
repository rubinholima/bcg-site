import { resolveTxt } from 'dns/promises';
import { verificationTxtRecordName } from './public-domain.hostname.util';

export type PublicDnsTxtResolver = (fqdn: string) => Promise<string[]>;

/** Resolve registros TXT publicamente (autoritativo via recursores do SO). */
export async function resolvePublicTxtRecords(fqdn: string): Promise<string[]> {
  const normalized = fqdn.replace(/\.$/, '').toLowerCase();
  try {
    const chunks = await resolveTxt(normalized);
    return chunks.map((parts) => parts.join(''));
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException;
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
