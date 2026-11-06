/**
 * Deriva o par www/apex para certificados e aliases quando ambos existem no tenant.
 */
export function hostnamesForCertificate(primaryHostname: string, allTenantHostnames: string[]): string[] {
  const norm = primaryHostname.toLowerCase();
  const set = new Set(allTenantHostnames.map((x) => x.toLowerCase()));
  const out = new Set<string>([norm]);
  const apex = norm.startsWith('www.') ? norm.slice(4) : null;
  const www = !norm.startsWith('www.') ? `www.${norm}` : null;
  if (apex && set.has(apex)) out.add(apex);
  if (www && set.has(www)) out.add(www);
  return [...out].sort();
}
