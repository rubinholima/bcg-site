import { hashVerificationToken, verificationTxtRecordName } from './public-domain.hostname.util';

export const CUP360_OWNERSHIP_TXT_PREFIX = 'cup360-verify=';

/** Valor TXT completo exibido ao operador / gravado no Route53 gerenciado. */
export function formatOwnershipTxtChallenge(token: string): string {
  const t = token.trim();
  if (!t) throw new Error('Token de verificação vazio.');
  return `${CUP360_OWNERSHIP_TXT_PREFIX}${t}`;
}

export function parseOwnershipTokenFromTxtValue(txtValue: string): string | null {
  const v = (txtValue ?? '').trim().replace(/^"|"$/g, '');
  if (!v.startsWith(CUP360_OWNERSHIP_TXT_PREFIX)) return null;
  const token = v.slice(CUP360_OWNERSHIP_TXT_PREFIX.length).trim();
  return token || null;
}

/** Compara valor TXT público com o hash persistido (sem reutilizar token colado no browser). */
export function ownershipTxtValueMatchesHash(txtValue: string, tokenHash: string | null | undefined): boolean {
  if (!tokenHash?.trim()) return false;
  const token = parseOwnershipTokenFromTxtValue(txtValue);
  if (!token) return false;
  return hashVerificationToken(token) === tokenHash.trim();
}

export function findOwnershipProofInTxtValues(
  txtValues: string[],
  tokenHash: string | null | undefined,
): boolean {
  return txtValues.some((v) => ownershipTxtValueMatchesHash(v, tokenHash));
}

export function ownershipDnsInstruction(hostnameNormalized: string, token: string) {
  return {
    name: verificationTxtRecordName(hostnameNormalized),
    type: 'TXT' as const,
    value: formatOwnershipTxtChallenge(token),
    purpose: 'OWNERSHIP' as const,
    status: 'PENDING' as const,
  };
}
