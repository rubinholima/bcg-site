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
  if (secret) {
    return !isCup360PlatformHost(hostOnly);
  }
  return !isCup360PlatformHost(hostOnly);
}

/** Fail-closed do middleware quando há segredo de borda e o host não é plataforma. */
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
