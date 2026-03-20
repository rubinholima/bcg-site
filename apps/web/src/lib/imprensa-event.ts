import { headers } from "next/headers";
import {
  getAppBaseUrl,
  getBackendOriginForServerFetch,
  getServerBackendBaseUrl,
} from "@/lib/apiProxy";
import { normalizeEventSlugParam, publicEventSlugLookupVariants } from "@/lib/event-slug";

/**
 * Slug do evento cujo logo e nome aparecem na página /imprensa.
 * Sobrescreva com NEXT_PUBLIC_IMPRENSA_EVENT_SLUG ou ?event=outro-slug na URL.
 */
export const DEFAULT_IMPRENSA_EVENT_SLUG =
  process.env.NEXT_PUBLIC_IMPRENSA_EVENT_SLUG?.trim() || "coffee-tournament";

/**
 * Logo do torneio na imprensa quando a API ainda não devolve o evento (ex.: dev sem Nest na mesma rede).
 * Opcional: URL absoluta do arquivo (S3, CDN, etc.).
 */
export const IMPRENSA_LOGO_FALLBACK_URL =
  process.env.NEXT_PUBLIC_IMPRENSA_LOGO_URL?.trim() || "";

export type PressEventInfo = {
  name: string;
  slug: string;
  logoUrl: string | null;
  description: string | null;
};

function trimStr(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t || null;
}

/** Logo do cadastro do evento — campo logoUrl do registro. */
function eventLogoFromPayload(d: Record<string, unknown>): string | null {
  return trimStr(d.logoUrl) ?? trimStr((d as { logo_url?: unknown }).logo_url);
}

function parsePressEventPayload(data: unknown): PressEventInfo | null {
  const d = data as Record<string, unknown> | null;
  if (!d || typeof d.slug !== "string" || !d.slug.trim()) return null;
  const slug = d.slug.trim();
  const name = trimStr(d.name) ?? slug;
  return {
    name,
    slug,
    logoUrl: eventLogoFromPayload(d),
    description: typeof d.description === "string" ? d.description : null,
  };
}

/** No SSR, usa o Host da requisição para chamar /api (evita localhost fixo quando o browser abre por 127.0.0.1, IP da rede, etc.). */
async function ssrNextApiRoot(): Promise<string> {
  const envFallback = `${getAppBaseUrl().replace(/\/$/, "")}/api`;
  try {
    const h = await headers();
    const host =
      h.get("x-forwarded-host")?.split(",")[0]?.trim() ?? h.get("host")?.trim() ?? "";
    if (!host || host.includes("..")) return envFallback;
    let proto = (h.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "http").toLowerCase();
    if (proto !== "http" && proto !== "https") proto = "http";
    return `${proto}://${host}/api`;
  } catch {
    return envFallback;
  }
}

function distinctBackendOrigins(): string[] {
  const a = getBackendOriginForServerFetch().replace(/\/$/, "");
  const b = getServerBackendBaseUrl().replace(/\/$/, "");
  return a === b ? [a] : [a, b];
}

async function fetchPressEventFromUrl(url: string): Promise<PressEventInfo | null> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const parsed = parsePressEventPayload(await res.json());
    return parsed;
  } catch {
    return null;
  }
}

export async function fetchPublishedEventForPress(slug: string): Promise<PressEventInfo | null> {
  const variants = publicEventSlugLookupVariants(slug);
  const backends = distinctBackendOrigins();
  const appApi = await ssrNextApiRoot();

  for (const v of variants) {
    const encoded = encodeURIComponent(v);
    for (const backend of backends) {
      const hit = await fetchPressEventFromUrl(`${backend}/public/events/${encoded}`);
      if (hit) return hit;
    }
    const viaNext = await fetchPressEventFromUrl(`${appApi}/public/events/${encoded}`);
    if (viaNext) return viaNext;
  }

  /* Slug default/env desatualizado: lista pública. Match exato ou primeiro evento (slug real + logo). */
  const want = normalizeEventSlugParam(slug);
  for (const backend of backends) {
    try {
      const res = await fetch(`${backend}/public/events`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) continue;
      const list = (await res.json()) as unknown;
      if (!Array.isArray(list) || list.length === 0) continue;
      const exact = want
        ? list.find(
            (e) =>
              e &&
              typeof e === "object" &&
              typeof (e as { slug?: string }).slug === "string" &&
              normalizeEventSlugParam((e as { slug: string }).slug) === want,
          )
        : null;
      const row = (exact ?? list[0]) as Record<string, unknown>;
      if (!row?.slug || typeof row.slug !== "string") continue;
      const fromList = parsePressEventPayload(row);
      if (fromList?.logoUrl) return fromList;
      const canonical = trimStr(row.slug);
      if (canonical) {
        for (const b of backends) {
          const full = await fetchPressEventFromUrl(`${b}/public/events/${encodeURIComponent(canonical)}`);
          if (full) return full;
        }
      }
      if (fromList) return fromList;
      break;
    } catch {
      /* próximo backend */
    }
  }

  return null;
}
