/**
 * Remove fundo conectado às bordas da foto (flood-fill por cor).
 * Funciona com branco de estúdio e outros fundos (cinza, verde, azul…).
 * Preserva cores no meio da imagem que não tocam a borda.
 */

import { getPublicImageUrl, mediaKeyFromStoredUrl } from "@/lib/media-url";

/** URL same-origin para canvas (evita CORS / ORB no CDN). */
export function cutoutSourceUrl(photoUrl: string | null | undefined): string | null {
  if (!photoUrl?.trim()) return null;
  const key = mediaKeyFromStoredUrl(photoUrl);
  if (key) return `/api/public/media-asset?key=${encodeURIComponent(key)}`;
  return getPublicImageUrl(photoUrl) || photoUrl.trim();
}

function colorDist(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number,
): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/** Mutates ImageData — deixa transparente o fundo ligado às bordas. */
export function cutoutEdgeWhiteInImageData(imageData: ImageData): void {
  const { data, width, height } = imageData;
  const n = width * height;
  const visited = new Uint8Array(n);
  type Seed = { p: number; sr: number; sg: number; sb: number };
  const stack: Seed[] = [];

  const at = (x: number, y: number) => y * width + x;

  const pushSeed = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const p = at(x, y);
    const i = p * 4;
    if ((data[i + 3] ?? 0) < 12) return;
    stack.push({
      p,
      sr: data[i] ?? 0,
      sg: data[i + 1] ?? 0,
      sb: data[i + 2] ?? 0,
    });
  };

  const flood = (tolerance: number) => {
    stack.length = 0;
    visited.fill(0);
    for (let x = 0; x < width; x++) {
      pushSeed(x, 0);
      pushSeed(x, height - 1);
    }
    for (let y = 0; y < height; y++) {
      pushSeed(0, y);
      pushSeed(width - 1, y);
    }

    while (stack.length) {
      const cur = stack.pop()!;
      const p = cur.p;
      if (visited[p]) continue;
      const i = p * 4;
      if ((data[i + 3] ?? 0) < 12) {
        visited[p] = 1;
        continue;
      }
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      if (colorDist(r, g, b, cur.sr, cur.sg, cur.sb) > tolerance) continue;
      visited[p] = 1;
      data[i + 3] = 0;
      const x = p % width;
      const y = (p / width) | 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const np = at(nx, ny);
          if (visited[np]) continue;
          stack.push({ p: np, sr: cur.sr, sg: cur.sg, sb: cur.sb });
        }
      }
    }
  };

  // Passo 1: fundo da borda (qualquer cor) com tolerância moderada
  flood(38);
  // Passo 2: gradiente / sombra do fundo ainda ligada ao furo
  flood(52);

  // Remove auréola: pixels claros/semelhantes ao fundo colados em transparente
  const scrubFringe = () => {
    const kill: number[] = [];
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const p = at(x, y);
        const i = p * 4;
        if ((data[i + 3] ?? 0) === 0) continue;
        let touchesHole = false;
        let holeR = 0;
        let holeG = 0;
        let holeB = 0;
        let holeSamples = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const ni = at(x + dx, y + dy) * 4;
            if ((data[ni + 3] ?? 0) < 12) {
              touchesHole = true;
            } else if (holeSamples < 4) {
              // amostra vizinhos opacos próximos da borda do sujeito
              holeR += data[ni] ?? 0;
              holeG += data[ni + 1] ?? 0;
              holeB += data[ni + 2] ?? 0;
              holeSamples += 1;
            }
          }
        }
        if (!touchesHole) continue;
        const r = data[i] ?? 0;
        const g = data[i + 1] ?? 0;
        const b = data[i + 2] ?? 0;
        const avg = (r + g + b) / 3;
        const spread = Math.max(r, g, b) - Math.min(r, g, b);
        // near-white fringe clássico
        if (avg >= 185 && spread <= 48) {
          kill.push(p);
          continue;
        }
        // fringe colorido: bem diferente do sujeito vizinho e próximo de cinza/cor sólida
        if (holeSamples > 0) {
          const sr = holeR / holeSamples;
          const sg = holeG / holeSamples;
          const sb = holeB / holeSamples;
          if (colorDist(r, g, b, sr, sg, sb) >= 55 && spread <= 55) {
            kill.push(p);
          }
        }
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
 * Retorna data URL PNG com fundo de borda removido.
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
const CUTOUT_CACHE_VER = "v4-any-bg";
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
