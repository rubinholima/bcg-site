import { hostnamesForCertificate } from './public-domain-dns.util';

/**
 * SAN/aliases só incluem hostnames do mesmo tenant já VERIFICADOS (ownership DNS).
 * Nunca incluir irmão apex/www só por existir no cadastro sem verificação.
 */
export function verifiedHostnamesForCertificate(
  primaryHostname: string,
  verifiedTenantHostnames: string[],
): string[] {
  const verified = new Set(verifiedTenantHostnames.map((h) => h.toLowerCase()));
  const candidates = hostnamesForCertificate(primaryHostname, [...verified]);
  return candidates.filter((h) => verified.has(h.toLowerCase()));
}
