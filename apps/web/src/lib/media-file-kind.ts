import type { MediaItem } from "@/lib/media-placeholders";

export type MediaFileKind = "image" | "video";

const IMAGE_KEY = /\.(png|jpe?g|webp|svg|gif)$/i;
const VIDEO_KEY = /\.(mp4|webm|mov|m4v|mkv)$/i;

export function isImageMediaKey(key: string): boolean {
  return IMAGE_KEY.test(key) && !VIDEO_KEY.test(key);
}

export function isVideoMediaKey(key: string): boolean {
  return VIDEO_KEY.test(key);
}

export function filterMediaByKind(items: MediaItem[], kind: MediaFileKind): MediaItem[] {
  const pred = kind === "image" ? isImageMediaKey : isVideoMediaKey;
  return items.filter((item) => item.url?.trim() && pred(item.key));
}

/** Pasta lógica dentro de media/ a partir da key S3 (ex.: media/hero/x.webp → hero). */
export function mediaFolderFromKey(key: string): string {
  const parts = key.replace(/^media\//, "").split("/");
  if (parts.length <= 1) return "custom";
  return parts[0] || "custom";
}
