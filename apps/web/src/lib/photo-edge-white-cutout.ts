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

/** Branco / off-white de estúdio (baixa saturação + alto brilho). */
function isStudioWhite(
  data: Uint8ClampedArray,
  pixelIndex: number,
  minChannel: number,
  maxSpread: number,
): boolean {
  const i = pixelIndex * 4;
  const a = data[i + 3] ?? 0;
  if (a < 12) return false;
  const r = data[i] ?? 0;
  const g = data[i + 1] ?? 0;
  const b = data[i + 2] ?? 0;
  if (r < minChannel || g < minChannel || b < minChannel) return false;
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  return spread <= maxSpread;
}

/** Mutates ImageData — deixa transparente o branco ligado às bordas. */
export function cutoutEdgeWhiteInImageData(imageData: ImageData): void {
  const { data, width, height } = imageData;
  const n = width * height;
  const visited = new Uint8Array(n);
  const stack: number[] = [];

  const at = (x: number, y: number) => y * width + x;

  const tryPush = (x: number, y: number, minCh: number, spread: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const p = at(x, y);
    if (visited[p]) return;
    if (!isStudioWhite(data, p, minCh, spread)) return;
    stack.push(p);
  };

  const flood = (minCh: number, spread: number) => {
    stack.length = 0;
    visited.fill(0);
    for (let x = 0; x < width; x++) {
      tryPush(x, 0, minCh, spread);
      tryPush(x, height - 1, minCh, spread);
    }
    for (let y = 0; y < height; y++) {
      tryPush(0, y, minCh, spread);
      tryPush(width - 1, y, minCh, spread);
    }
    while (stack.length) {
      const p = stack.pop()!;
      if (visited[p]) continue;
      visited[p] = 1;
      if (!isStudioWhite(data, p, minCh, spread)) continue;
      data[p * 4 + 3] = 0;
      const x = p % width;
      const y = (p / width) | 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          tryPush(x + dx, y + dy, minCh, spread);
        }
      }
    }
  };

  // Passo 1: branco puro da borda
  flood(228, 28);
  // Passo 2: off-white / sombra clara do estúdio ainda ligada ao furo
  flood(205, 40);

  // Remove auréola: near-white colado em transparente some de vez
  const scrubFringe = () => {
    const kill: number[] = [];
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const p = at(x, y);
        const i = p * 4;
        if ((data[i + 3] ?? 0) === 0) continue;
        const r = data[i] ?? 0;
        const g = data[i + 1] ?? 0;
        const b = data[i + 2] ?? 0;
        const avg = (r + g + b) / 3;
        if (avg < 190) continue;
        const spread = Math.max(r, g, b) - Math.min(r, g, b);
        if (spread > 45) continue;
        let touchesHole = false;
        for (let dy = -1; dy <= 1 && !touchesHole; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            if ((data[at(x + dx, y + dy) * 4 + 3] ?? 0) < 12) {
              touchesHole = true;
              break;
            }
          }
        }
        if (touchesHole) kill.push(p);
      }
    }
    for (const p of kill) data[p * 4 + 3] = 0;
  };

  scrubFringe();
  scrubFringe();
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
    const maxSide = 560;
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

/** Cache em memória por URL de origem (sessão). Bump vN ao mudar o algoritmo. */
const CUTOUT_CACHE_VER = "v3";
const cutoutCache = new Map<string, Promise<string | null>>();

export function cutoutWhiteBackgroundUrlCached(
  photoUrl: string | null | undefined,
): Promise<string | null> {
  const key = (photoUrl ?? "").trim();
  if (!key) return Promise.resolve(null);
  const cacheKey = `${CUTOUT_CACHE_VER}:${key}`;
  const hit = cutoutCache.get(cacheKey);
  if (hit) return hit;
  const p = cutoutWhiteBackgroundUrl(key);
  cutoutCache.set(cacheKey, p);
  return p;
}
