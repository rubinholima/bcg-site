/** Nome legível a partir do nome do arquivo (sem extensão). */
export function humanizeUploadFilename(fileName: string): string {
  const base = fileName.replace(/\\/g, "/").split("/").pop() ?? "";
  const withoutExt = base.replace(/\.[^.]+$/i, "").trim();
  if (!withoutExt) return "";
  return withoutExt
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Rótulo de origem na listagem Mídia (S3 key → categoria). */
export function mediaAssetOriginLabel(key: string): string {
  if (key.startsWith("logos/external/")) return "Clubes Adv";
  if (key.startsWith("logos/competitions/")) return "Competições";
  if (key.startsWith("logos/eventos/")) return "Eventos";
  if (key.startsWith("logos/group/")) return "Grupo BCG";
  if (key.startsWith("logos/tenants/")) return "Empresa / clube";
  const gal = key.match(/^media\/galeria_clubes\/([^/]+)\//);
  if (gal?.[1]) return `Galeria clubes (${gal[1]})`;
  if (key.startsWith("media/")) {
    const seg = key.slice("media/".length).split("/")[0];
    return seg ? `Mídia / ${seg}` : "Mídia";
  }
  if (key.startsWith("logos/")) return "Logos";
  return "—";
}
