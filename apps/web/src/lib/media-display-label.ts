import type { MediaItem } from "@/lib/media-placeholders";
import { mediaKeyFromStoredUrl } from "@/lib/media-url";
import { displayNameFromUploadFilename } from "@/lib/upload-display-name";

/** Mapa url/key S3 → nome amigável (como em Mídia / pickers). */
export function buildMediaDisplayNameLookup(items: MediaItem[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const item of items) {
    const label = item.displayName?.trim();
    if (!label) continue;
    map.set(item.key, label);
    if (item.url?.trim()) map.set(item.url.trim(), label);
    const keyFromUrl = mediaKeyFromStoredUrl(item.url);
    if (keyFromUrl) map.set(keyFromUrl, label);
  }
  return map;
}

export function resolveMediaDisplayName(
  url: string,
  lookup: Map<string, string>,
): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  const direct = lookup.get(trimmed);
  if (direct) return direct;
  const key = mediaKeyFromStoredUrl(trimmed);
  if (key) {
    const byKey = lookup.get(key);
    if (byKey) return byKey;
  }
  return null;
}

/** Fallback: nome do arquivo sem extensão (upload antigo sem displayName). */
export function mediaFilenameFallback(url: string): string {
  const fromName = (base: string): string => {
    if (!base) return "";
    const derived = displayNameFromUploadFilename(base);
    if (derived) return derived;
    const stripped = base.replace(/\.[^.]+$/, "").trim();
    return stripped || base;
  };
  try {
    const base = decodeURIComponent(new URL(url).pathname.split("/").pop() || "");
    return fromName(base);
  } catch {
    const last = url.split("/").pop() ?? "";
    return fromName(last);
  }
}

export function mediaFileContentLabel(
  url: string,
  lookup: Map<string, string>,
  prefix: "Imagem" | "Vídeo",
): string {
  const friendly = resolveMediaDisplayName(url, lookup);
  if (friendly) return `${prefix} — ${friendly}`;
  const fallback = mediaFilenameFallback(url);
  if (fallback) return `${prefix} — ${fallback}`;
  return prefix === "Imagem" ? "Imagem" : "Vídeo MP4";
}
