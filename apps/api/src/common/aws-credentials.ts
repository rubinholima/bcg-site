/**
 * Configuração de credenciais AWS para o SDK.
 * - Se AWS_ACCESS_KEY_ID e AWS_SECRET_ACCESS_KEY estiverem preenchidos, usa eles.
 * - Caso contrário, não seta credentials: o SDK usa a default chain
 *   (AWS_PROFILE, ~/.aws/credentials, SSO, IAM role em produção).
 */

export function getAwsClientConfig(): { region: string; credentials?: { accessKeyId: string; secretAccessKey: string } } {
  const region = (process.env.AWS_REGION ?? 'us-east-1').trim();
  const accessKeyId = (process.env.AWS_ACCESS_KEY_ID ?? '').trim();
  const secretAccessKey = (process.env.AWS_SECRET_ACCESS_KEY ?? '').trim();
  const credentials =
    accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined;
  return {
    region,
    ...(credentials ? { credentials } : {}),
  };
}

/** Retorna true se credenciais explícitas (env vars) estão definidas. */
export function hasExplicitAwsCredentials(): boolean {
  const accessKeyId = (process.env.AWS_ACCESS_KEY_ID ?? '').trim();
  const secretAccessKey = (process.env.AWS_SECRET_ACCESS_KEY ?? '').trim();
  return Boolean(accessKeyId && secretAccessKey);
}

/** Verifica se o erro é de credenciais AWS (SDK não encontrou provider). */
export function isCredentialsProviderError(err: unknown): boolean {
  if (err instanceof Error) {
    return (
      err.name === 'CredentialsProviderError' ||
      err.message.includes('Could not load credentials from any providers') ||
      err.message.includes('Unable to locate credentials')
    );
  }
  return false;
}

/** Verifica se o erro é de permissão IAM (AccessDenied). */
export function isAwsAccessDeniedError(err: unknown): boolean {
  if (err instanceof Error) {
    return (
      err.name === 'AccessDeniedException' ||
      (err as { name?: string }).name === 'AccessDeniedException' ||
      err.message.includes('Access Denied') ||
      err.message.includes('is not authorized')
    );
  }
  return false;
}
