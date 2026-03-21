import type { MediaItem } from "@/lib/media-placeholders";
import { api } from "@/lib/api";
import { normalizeTeamNameKeyForMerge } from "@/lib/names-match";
import { mediaKeyFromStoredUrl } from "@/lib/media-url";

export interface VisitingTeamOptionRow {
  id: string;
  name: string;
  logoUrl?: string | null;
}

function fileBasename(key: string): string {
  return (key.split("/").pop() ?? "").replace(/\.[a-z0-9]+$/i, "");
}

function nameFromClubesAdvMedia(m: MediaItem): string | null {
  const dn = m.displayName?.trim();
  if (dn) return dn;
  const base = fileBasename(m.key);
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(base)) {
    /** Sem nome na Mídia: ainda entra na lista (evita sumir logo válida no S3). */
    return `Logo ${base.slice(0, 8)}…`;
  }
  const fromFile = base.replace(/-/g, " ").trim();
  return fromFile || null;
}

/** Resolve arquivo no S3 mesmo se o cadastro ainda tiver URL em logos/external/ após migração. */
function resolveMediaForDbTeam(
  logoUrl: string | null | undefined,
  advLogos: MediaItem[],
  keyToMedia: Map<string, MediaItem>,
  validKeys: Set<string>,
): MediaItem | null {
  if (!logoUrl?.trim()) return null;
  const logoKey = mediaKeyFromStoredUrl(logoUrl);
  if (!logoKey) return null;
  if (validKeys.has(logoKey)) return keyToMedia.get(logoKey) ?? null;
  const baseFile = logoKey.split("/").pop();
  if (!baseFile) return null;
  const match = advLogos.find((m) => (m.key.split("/").pop() ?? "") === baseFile);
  return match ?? null;
}

/**
 * Lista do select = apenas logos que existem em S3 (clubes-adv / external legado),
 * enriquecidos com o cadastro quando o `logoUrl` do bate com um arquivo real.
 * Remove: duplicatas por nome (acento/hífen), cadastros com logo apagado no bucket,
 * e times só no banco sem arquivo correspondente.
 */
export function mergeVisitingTeamsWithS3Logos(
  dbTeams: VisitingTeamOptionRow[],
  allMediaItems: MediaItem[],
): VisitingTeamOptionRow[] {
  const advLogos = allMediaItems.filter(
    (i) =>
      i.key.startsWith("logos/clubes-adv/") ||
      i.key.startsWith("logos/external/"),
  );

  const validKeys = new Set(advLogos.map((m) => m.key));
  const keyToMedia = new Map(advLogos.map((m) => [m.key, m] as const));

  const merged = new Map<string, VisitingTeamOptionRow>();

  const dbSorted = [...dbTeams].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }),
  );

  for (const t of dbSorted) {
    const nk = normalizeTeamNameKeyForMerge(t.name);
    if (!nk) continue;
    const media = resolveMediaForDbTeam(t.logoUrl, advLogos, keyToMedia, validKeys);
    if (!media) continue;
    if (merged.has(nk)) continue;
    merged.set(nk, {
      id: t.id,
      name: t.name.trim(),
      logoUrl: media.url,
    });
  }

  const advSorted = [...advLogos].sort((a, b) => a.key.localeCompare(b.key));
  for (const m of advSorted) {
    const name = nameFromClubesAdvMedia(m);
    if (!name) continue;
    const nk = normalizeTeamNameKeyForMerge(name);
    if (!nk) continue;
    if (merged.has(nk)) continue;
    merged.set(nk, {
      id: `s3:${m.key}`,
      name,
      logoUrl: m.url,
    });
  }

  return [...merged.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }),
  );
}

/** Cadastro + logos só no S3 (clubes-adv / external legado) — usado no select de adversário. */
export async function fetchVisitingTeamsMergedWithS3(): Promise<VisitingTeamOptionRow[]> {
  const [{ data: dbTeams }, mediaRes] = await Promise.all([
    api.get<VisitingTeamOptionRow[]>("/visiting-teams"),
    fetch("/api/media?all=1", { credentials: "include", cache: "no-store" }),
  ]);
  const base = Array.isArray(dbTeams) ? dbTeams : [];
  if (!mediaRes.ok) {
    return [...base].sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }),
    );
  }
  const payload = (await mediaRes.json()) as { items?: MediaItem[] };
  return mergeVisitingTeamsWithS3Logos(base, payload.items ?? []);
}
