/**
 * Configuração de provisionamento AWS (domínio público CUP360).
 * Valores vêm de variáveis de ambiente — nunca commitar secrets.
 */
export type PublicDomainDedicatedAwsCredentials = {
  accessKeyId: string | null;
  secretAccessKey: string | null;
  sessionToken: string | null;
};

export type PublicDomainAwsConfig = {
  /** Quando true, executa chamadas reais à AWS (ACN/CloudFront/Route53). */
  enabled: boolean;
  /** Credenciais IAM dedicadas ao provisionador (nunca reutilizar credenciais globais da API em produção). */
  dedicatedCredentials: PublicDomainDedicatedAwsCredentials | null;
  /** Região padrão (Route53, ACM regional). */
  region: string;
  /** Região do certificado para CloudFront (obrigatório us-east-1). */
  acmCertificateRegion: string;
  /** Domínio do origin HTTPS compartilhado (ex.: origin.bostoncitygroup.biz). */
  originDomain: string;
  /**
   * Secret compartilhado entre edge (Lambda@Edge/CloudFront Function) e origem.
   * O request legitimo do CloudFront envia o host público neste header assinado.
   */
  edgeSignatureSecret: string | null;
  /**
   * Se true, o provisionador também gerencia registros DNS na zona Route53
   * (apenas nomes com tag/ownership CUP360, sem tocar mail).
   */
  route53ManageDns: boolean;
  /** Zonas permitidas para mutação — lista de hosted zone IDs. */
  route53AllowedHostedZoneIds: string[];
};

function parseBool(v: string | undefined, defaultValue = false): boolean {
  if (v == null || v === '') return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(v.trim().toLowerCase());
}

function parseList(v: string | undefined): string[] {
  if (!v?.trim()) return [];
  return v
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function loadDedicatedCredentials(): PublicDomainDedicatedAwsCredentials | null {
  const accessKeyId = (process.env.CUP360_PUBLIC_DOMAIN_AWS_ACCESS_KEY_ID ?? '').trim() || null;
  const secretAccessKey = (process.env.CUP360_PUBLIC_DOMAIN_AWS_SECRET_ACCESS_KEY ?? '').trim() || null;
  const sessionToken = (process.env.CUP360_PUBLIC_DOMAIN_AWS_SESSION_TOKEN ?? '').trim() || null;
  if (!accessKeyId && !secretAccessKey && !sessionToken) return null;
  return { accessKeyId, secretAccessKey, sessionToken };
}

export function loadPublicDomainAwsConfig(): PublicDomainAwsConfig {
  return {
    enabled: parseBool(process.env.CUP360_PUBLIC_DOMAIN_AWS_ENABLED),
    dedicatedCredentials: loadDedicatedCredentials(),
    region: process.env.CUP360_PUBLIC_DOMAIN_AWS_REGION ?? process.env.AWS_REGION ?? 'us-east-1',
    acmCertificateRegion:
      process.env.CUP360_PUBLIC_DOMAIN_ACM_REGION?.trim() ||
      process.env.AWS_ACM_REGION?.trim() ||
      'us-east-1',
    originDomain: (process.env.CUP360_PUBLIC_DOMAIN_ORIGIN_DOMAIN ?? '').trim().toLowerCase(),
    edgeSignatureSecret: (process.env.CUP360_EDGE_HOST_SECRET ?? '').trim() || null,
    route53ManageDns: parseBool(process.env.CUP360_PUBLIC_DOMAIN_ROUTE53_MANAGE),
    route53AllowedHostedZoneIds: parseList(process.env.CUP360_PUBLIC_DOMAIN_ROUTE53_ALLOWED_ZONES),
  };
}
