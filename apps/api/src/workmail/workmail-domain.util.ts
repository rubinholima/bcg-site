/**
 * Considera domínio custom apenas se NÃO for domínio interno AWS
 * (awsapps.com, amazonaws.com). Usado para criação de emails corporativos.
 */
export function isCustomDomain(domain: string): boolean {
  const d = (domain ?? '').toLowerCase().trim();
  if (d.length === 0) return false;
  if (d.endsWith('.awsapps.com') || d === 'awsapps.com') return false;
  if (d.endsWith('.amazonaws.com') || d === 'amazonaws.com') return false;
  return true;
}
