/** Remove padrões que possam vazar credenciais AWS em mensagens de erro. */
export function sanitizePublicDomainAwsErrorMessage(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  return raw
    .replace(/AKIA[0-9A-Z]{16}/g, '[REDACTED_ACCESS_KEY]')
    .replace(/(?<=SecretAccessKey[=\s])[^\s]{8,}/gi, '[REDACTED]');
}
