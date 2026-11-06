import { createHash, randomBytes } from 'crypto';
import { toASCII } from 'node:punycode';

/** Máximo de labels e tamanho prático para FQDN (RFC 1035 ~253). */
const MAX_HOSTNAME_LEN = 253;

/** Regex hostname ASCII (sem wildcard); cada label 1–63. */
const HOSTNAME_ASCII_RE =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

export class PublicDomainHostnameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PublicDomainHostnameError';
  }
}

/**
 * Normaliza hostname para armazenamento global único:
 * - lower case
 * - remove esquema, path, query, fragmento, porta
 * - remove barra final / ponto DNS final
 * - converte Unicode → punycode (IDNA)
 */
export function normalizePublicHostname(input: string): string {
  if (input == null || typeof input !== 'string') {
    throw new PublicDomainHostnameError('Hostname obrigatório.');
  }
  let s = input.trim();
  if (!s) throw new PublicDomainHostnameError('Hostname vazio.');

  // Strip scheme
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
  // Path / query / fragment
  const cut = s.search(/[/?#]/);
  if (cut !== -1) s = s.slice(0, cut);
  // Port
  s = s.replace(/:\d+$/, '');
  s = s.trim();
  // Trailing dot (FQDN)
  s = s.replace(/\.$/, '');
  s = s.trim().toLowerCase();

  if (s.length > MAX_HOSTNAME_LEN) {
    throw new PublicDomainHostnameError('Hostname muito longo.');
  }
  if (s.startsWith('.')) {
    throw new PublicDomainHostnameError('Hostname inválido.');
  }
  if (s.includes('..')) {
    throw new PublicDomainHostnameError('Hostname inválido.');
  }
  if (s.includes('*')) {
    throw new PublicDomainHostnameError('Wildcard não é permitido.');
  }

  let ascii: string;
  try {
    ascii = toASCII(s);
  } catch {
    throw new PublicDomainHostnameError('Hostname Unicode inválido.');
  }

  if (!HOSTNAME_ASCII_RE.test(ascii)) {
    throw new PublicDomainHostnameError('Formato de hostname inválido.');
  }

  return ascii;
}

export function hashVerificationToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function generateVerificationToken(byteLength = 32): string {
  return randomBytes(byteLength).toString('hex');
}

/** Nome DNS TXT sugerido para verificação de posse. */
export function verificationTxtRecordName(hostnameNormalized: string): string {
  return `_cup360-verification.${hostnameNormalized}`;
}
