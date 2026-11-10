/** Provenance confiável: Nginx do vhost legado sobrescreve este header (cliente não pode forjar na origem). */
export const CUP360_LEGACY_PROVENANCE_HEADER = 'x-cup360-legacy-provenance';
export const CUP360_LEGACY_PROVENANCE_NGINX_V1 = 'nginx-v1';

export const CUP360_LEGACY_EDGE_HOST_SIG_HEADER = 'x-cup360-edge-host-sig';
export const CUP360_LEGACY_EDGE_HOST_TS_HEADER = 'x-cup360-edge-host-ts';

export function isCup360LegacyProvenanceTrusted(
  headers: Record<string, string | string[] | undefined> | Headers | undefined,
): boolean {
  if (!headers) return false;
  const v = pickHeader(headers, CUP360_LEGACY_PROVENANCE_HEADER);
  return (v ?? '').trim().toLowerCase() === CUP360_LEGACY_PROVENANCE_NGINX_V1;
}

function pickHeader(
  headers: Record<string, string | string[] | undefined> | Headers,
  name: string,
): string | undefined {
  if (headers instanceof Headers) {
    return headers.get(name)?.trim() ?? undefined;
  }
  const lower = name.toLowerCase();
  for (const [k, val] of Object.entries(headers)) {
    if (k.toLowerCase() !== lower) continue;
    if (Array.isArray(val)) return val[0]?.trim();
    return val?.trim();
  }
  return undefined;
}
