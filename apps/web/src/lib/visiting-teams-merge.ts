import type { MediaItem } from "@/lib/media-placeholders";
import { api } from "@/lib/api";
import { normalizeNameKey } from "@/lib/names-match";

export interface VisitingTeamOptionRow {
  id: string;
  name: string;
  logoUrl?: string | null;
}

function nameFromClubesAdvMedia(m: MediaItem): string | null {
  const dn = m.displayName?.trim();
  if (dn) return dn;
  const last = m.key.split("/").pop() ?? "";
  const base = last.replace(/\.[a-z0-9]+$/i, "");
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(base)) {
    return null;
  }
  const fromFile = base.replace(/-/g, " ").trim();
  return fromFile || null;
}

/**
 * Lista do select = cadastro (VisitingTeam) + logos em S3 em clubes-adv e, até migrar, external.
 * Após POST /media/migrate-external-logos, só clubes-adv terá arquivos. Prioridade ao cadastro no banco.
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

  const merged = new Map<string, VisitingTeamOptionRow>();
  for (const t of dbTeams) {
    merged.set(normalizeNameKey(t.name), { ...t });
  }
  for (const m of advLogos) {
    const name = nameFromClubesAdvMedia(m);
    if (!name) continue;
    const nk = normalizeNameKey(name);
    if (!nk) continue;
    if (!merged.has(nk)) {
      merged.set(nk, {
        id: `s3:${m.key}`,
        name,
        logoUrl: m.url,
      });
    }
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
