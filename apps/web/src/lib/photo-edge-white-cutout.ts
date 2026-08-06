/**
 * Remove fundo branco de estúdio conectado às bordas da foto (flood-fill).
 * Preserva branco no meio (ex.: camisa) que não toca a borda.
 */

import { getPublicImageUrl, mediaKeyFromStoredUrl } from "@/lib/media-url";

/** URL same-origin para canvas (evita CORS / ORB no CDN). */
export function cutoutSourceUrl(photoUrl: string | null | undefined): string | null {
  if (!photoUrl?.trim()) return null;
  const key = mediaKeyFromStoredUrl(photoUrl);
  if (key) return `/api/public/media-asset?key=${encodeURIComponent(key)}`;
  return getPublicImageUrl(photoUrl) || photoUrl.trim();
}

function nearWhite(data: Uint8ClampedArray, pixelIndex: number, threshold: number): boolean {
  const i = pixelIndex * 4;
  const a = data[i + 3] ?? 0;
  if (a < 12) return false;
  return (
    (data[i] ?? 0) >= threshold &&
    (data[i + 1] ?? 0) >= threshold &&
    (data[i + 2] ?? 0) >= threshold
  );
}

/** Mutates ImageData — deixa transparente o branco ligado às bordas. */
export function cutoutEdgeWhiteInImageData(
  imageData: ImageData,
  threshold = 238,
): void {
  const { data, width, height } = imageData;
  const n = width * height;
  const visited = new Uint8Array(n);
  const stack: number[] = [];

  const at = (x: number, y: number) => y * width + x;

  const tryPush = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const p = at(x, y);
    if (visited[p]) return;
    if (!nearWhite(data, p, threshold)) return;
    stack.push(p);
  };

  for (let x = 0; x < width; x++) {
    tryPush(x, 0);
    tryPush(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    tryPush(0, y);
    tryPush(width - 1, y);
  }

  while (stack.length) {
    const p = stack.pop()!;
    if (visited[p]) continue;
    visited[p] = 1;
    if (!nearWhite(data, p, threshold)) continue;
    const i = p * 4;
    data[i + 3] = 0;
    const x = p % width;
    const y = (p / width) | 0;
    tryPush(x - 1, y);
    tryPush(x + 1, y);
    tryPush(x, y - 1);
    tryPush(x, y + 1);
  }

  // Suaviza borda: semi-branco ao lado de transparente
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const p = at(x, y);
      const i = p * 4;
      if ((data[i + 3] ?? 0) === 0) continue;
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      if (r < 200 || g < 200 || b < 200) continue;
      const neighbors = [
        at(x - 1, y),
        at(x + 1, y),
        at(x, y - 1),
        at(x, y + 1),
      ];
      const touchesHole = neighbors.some((np) => (data[np * 4 + 3] ?? 0) < 12);
      if (!touchesHole) continue;
      const whiteness = (r + g + b) / 3 / 255;
      data[i + 3] = Math.round((data[i + 3] ?? 255) * (1 - whiteness * 0.85));
    }
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Falha ao carregar imagem: ${url}`));
    img.src = url;
  });
}

/**
 * Retorna data URL PNG com fundo branco de borda removido.
 * Em falha (CORS etc.), devolve a URL original.
 */
export async function cutoutWhiteBackgroundUrl(
  photoUrl: string | null | undefined,
): Promise<string | null> {
  const src = cutoutSourceUrl(photoUrl);
  if (!src) return null;
  try {
    const img = await loadImage(src);
    const maxSide = 480;
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return src;
    ctx.drawImage(img, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    cutoutEdgeWhiteInImageData(imageData);
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL("image/png");
  } catch {
    return getPublicImageUrl(photoUrl) || photoUrl || null;
  }
}

/** Cache em memória por URL de origem (sessão). */
const cutoutCache = new Map<string, Promise<string | null>>();

export function cutoutWhiteBackgroundUrlCached(
  photoUrl: string | null | undefined,
): Promise<string | null> {
  const key = (photoUrl ?? "").trim();
  if (!key) return Promise.resolve(null);
  const hit = cutoutCache.get(key);
  if (hit) return hit;
  const p = cutoutWhiteBackgroundUrl(key);
  cutoutCache.set(key, p);
  return p;
}
