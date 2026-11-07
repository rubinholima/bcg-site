import type { PublicDomainAwsConfig, PublicDomainDedicatedAwsCredentials } from './public-domain-aws.config';

export type PublicDomainAwsRuntimeValidation =
  | { ok: true }
  | { ok: false; lastErrorCode: string; lastErrorMessage: string };

export function isPublicDomainAwsProductionRuntime(): boolean {
  return (process.env.NODE_ENV ?? '').trim().toLowerCase() === 'production';
}

function credentialsComplete(creds: PublicDomainDedicatedAwsCredentials | null): boolean {
  if (!creds) return false;
  return Boolean(creds.accessKeyId?.trim() && creds.secretAccessKey?.trim());
}

function credentialsPartiallySet(creds: PublicDomainDedicatedAwsCredentials | null): boolean {
  if (!creds) return false;
  const a = Boolean(creds.accessKeyId?.trim());
  const s = Boolean(creds.secretAccessKey?.trim());
  return (a && !s) || (!a && s);
}

/**
 * Valida credenciais dedicadas quando o provisionador AWS está habilitado.
 * Em produção: par completo obrigatório — sem fallback para credenciais globais da API.
 */
export function validatePublicDomainAwsRuntimeConfig(cfg: PublicDomainAwsConfig): PublicDomainAwsRuntimeValidation {
  if (!cfg.enabled) return { ok: true };

  if (credentialsPartiallySet(cfg.dedicatedCredentials)) {
    return {
      ok: false,
      lastErrorCode: 'DEDICATED_CREDENTIALS_INCOMPLETE',
      lastErrorMessage:
        'Configure CUP360_PUBLIC_DOMAIN_AWS_ACCESS_KEY_ID e CUP360_PUBLIC_DOMAIN_AWS_SECRET_ACCESS_KEY (ambos).',
    };
  }

  if (isPublicDomainAwsProductionRuntime() && !credentialsComplete(cfg.dedicatedCredentials)) {
    return {
      ok: false,
      lastErrorCode: 'DEDICATED_CREDENTIALS_REQUIRED',
      lastErrorMessage:
        'Em produção, domínios públicos exigem credenciais IAM dedicadas (cup360-public-domains-prod).',
    };
  }

  return { ok: true };
}
