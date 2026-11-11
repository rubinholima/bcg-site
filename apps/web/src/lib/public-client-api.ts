/**
 * URLs de API públicas no browser — compatível com domínio customizado (sem /api/*).
 * Usa `/cup360-pub/*` que não é bloqueado pelo middleware de segurança.
 */
const CUP360_PUB_PREFIX = "/cup360-pub";

export function toPublicClientApiPath(pathOrUrl: string): string {
  const raw = pathOrUrl.trim();
  if (!raw) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith(`${CUP360_PUB_PREFIX}/`)) return raw;
  if (raw.startsWith("/api/public/")) {
    return `${CUP360_PUB_PREFIX}/${raw.slice("/api/public/".length)}`;
  }
  if (raw.startsWith("/public/")) {
    return `${CUP360_PUB_PREFIX}/${raw.slice("/public/".length)}`;
  }
  return raw;
}

export async function publicClientFetch(input: string, init?: RequestInit): Promise<Response> {
  const url = toPublicClientApiPath(input);
  return fetch(url, { ...init, cache: init?.cache ?? "no-store" });
}
