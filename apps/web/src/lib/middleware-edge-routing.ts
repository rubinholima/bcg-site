export const CUP360_EDGE_CONTRACT_HEADERS = [
  "x-cup360-edge-v",
  "x-cup360-edge-ts",
  "x-cup360-edge-host",
  "x-cup360-edge-sig",
] as const;

const CANONICAL_HOST =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "").split("/")[0]?.toLowerCase() ??
  "www.bostoncitygroup.biz";

const DEFAULT_PLATFORM_HOSTS = new Set([
  CANONICAL_HOST,
  "www.bostoncitygroup.biz",
  "bostoncitygroup.biz",
  "origin.bostoncitygroup.biz",
  /** Login direto (bypass CloudFront) — nginx → Next :3000 */
  "auth.bostoncitygroup.biz",
  /** API pública documentada em produção (README-env) */
  "api.bostoncitygroup.biz",
  "localhost",
  "127.0.0.1",
]);

function parseTrustedHostList(): Set<string> {
  const raw = process.env.CUP360_TRUSTED_PUBLIC_HOSTS?.trim();
  const s = new Set(DEFAULT_PLATFORM_HOSTS);
  if (!raw) return s;
  for (const p of raw.split(/[\s,]+/)) {
    const h = p.trim().toLowerCase().replace(/\.$/, "");
    if (h) s.add(h);
  }
  return s;
}

const TRUSTED_PLATFORM_HOSTS = parseTrustedHostList();

/** Hosts de plataforma CUP360 (nunca exigem contrato de domínio cliente). */
export const CUP360_PLATFORM_HOSTNAMES = [
  "www.bostoncitygroup.biz",
  "bostoncitygroup.biz",
  "origin.bostoncitygroup.biz",
  "auth.bostoncitygroup.biz",
  "api.bostoncitygroup.biz",
] as const;

/** Host público efetivo: contrato de borda (x-cup360-edge-host) ou Host de entrada. */
export function getCup360EdgeClaimedHost(headers: Headers, hostOnly: string): string {
  const inbound = hostOnly.split(":")[0]?.toLowerCase() ?? hostOnly;
  const claimed = headers.get("x-cup360-edge-host")?.trim().toLowerCase();
  if (cup360EdgeContractHeadersComplete(headers) && claimed) {
    return claimed.split(":")[0] ?? claimed;
  }
  return inbound;
}

/** Host efetivo do pedido na origem — apenas header `Host` (não confiar em X-Forwarded-Host). */
export function getOriginInboundHost(hostHeader: string | null): string {
  const host = hostHeader ?? "";
  return host.replace(/^https?:\/\//, "").split("/")[0] ?? "";
}

export function isCup360PlatformHost(hostOnly: string): boolean {
  if (!hostOnly) return false;
  const h = hostOnly.split(":")[0]?.toLowerCase() ?? "";
  return TRUSTED_PLATFORM_HOSTS.has(h);
}

export function cup360EdgeContractHeadersComplete(headers: Headers): boolean {
  for (const k of CUP360_EDGE_CONTRACT_HEADERS) {
    if (!headers.get(k)?.trim()) return false;
  }
  return true;
}

export function isBlockedPublicPath(pathname: string): boolean {
  return (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/portfolio")
  );
}

/**
 * Decide se o middleware deve consultar hostname-context (domínio público / contrato de borda).
 * Com segredo de borda: origin + contrato assinado válido → roteia pelo host assinado, não pelo Host da origem.
 */
export function shouldResolvePublicDomainRouting(
  hostOnly: string,
  pathname: string,
  headers: Headers,
  edgeSecret?: string,
): boolean {
  if (isBlockedPublicPath(pathname)) return false;
  if (cup360EdgeContractHeadersComplete(headers)) return true;
  const secret = edgeSecret?.trim();
  const effectiveHost = getCup360EdgeClaimedHost(headers, hostOnly);
  if (secret) {
    return !isCup360PlatformHost(effectiveHost);
  }
  return !isCup360PlatformHost(effectiveHost);
}

/** Bloqueia rotas administrativas/API em host de cliente (não plataforma). */
export function shouldBlockCustomerDomainAdminPath(
  hostOnly: string,
  pathname: string,
  edgeSecret?: string,
  headers?: Headers,
): boolean {
  const secret = edgeSecret?.trim();
  if (!secret) return false;
  const effective = headers ? getCup360EdgeClaimedHost(headers, hostOnly) : hostOnly;
  if (isCup360PlatformHost(effective)) return false;
  return isBlockedPublicPath(pathname);
}

/**
 * Fail-closed apenas para hosts que não são da plataforma.
 * Hosts de plataforma (incl. origin compartilhada) nunca exigem contrato — com ou sem segredo.
 */
export function middlewareFailsClosedWithoutEdgeContract(
  hostHeader: string | null,
  headers: Headers,
  edgeSecret?: string,
): boolean {
  const secret = edgeSecret?.trim();
  if (!secret) return false;
  const hostOnly = getOriginInboundHost(hostHeader);
  if (isCup360PlatformHost(hostOnly)) return false;
  if (cup360EdgeContractHeadersComplete(headers)) return false;
  return true;
}
