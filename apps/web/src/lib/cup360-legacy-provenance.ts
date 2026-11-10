/** Manter alinhado a apps/api/src/public-domain/cup360-legacy-provenance.util.ts */
export const CUP360_LEGACY_PROVENANCE_HEADER = "x-cup360-legacy-provenance";
export const CUP360_LEGACY_PROVENANCE_NGINX_V1 = "nginx-v1";

export const CUP360_LEGACY_EDGE_HOST_SIG_HEADER = "x-cup360-edge-host-sig";
export const CUP360_LEGACY_EDGE_HOST_TS_HEADER = "x-cup360-edge-host-ts";

/** Edge middleware: só confia no marcador sobrescrito pelo Nginx (sem crypto no Edge Runtime). */
export function isCup360LegacyProvenanceTrusted(headers: Headers): boolean {
  const v = headers.get(CUP360_LEGACY_PROVENANCE_HEADER)?.trim().toLowerCase();
  return v === CUP360_LEGACY_PROVENANCE_NGINX_V1;
}

export function hasTrustedLegacyInboundProvenance(headers: Headers): boolean {
  return isCup360LegacyProvenanceTrusted(headers);
}
