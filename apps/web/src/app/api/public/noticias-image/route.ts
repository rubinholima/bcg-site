import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function isAllowedImageUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    if (["localhost", "127.0.0.1"].includes(u.hostname)) return false;
    if (/^10\.|^172\.(1[6-9]|2[0-9]|3[01])\.|^192\.168\./.test(u.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

/** Cache de imagens já buscadas (evita re-fetch, reduz rate limit) */
const imageCache = new Map<string, { body: ArrayBuffer; contentType: string; expires: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

/** Fetches em andamento (deduplica requisições simultâneas para mesma URL) */
const pendingFetches = new Map<string, Promise<{ body: ArrayBuffer; contentType: string } | null>>();

/** Fila para serializar fetches ao Instagram (evita 403 por rate limit) */
let lastFetchTime = 0;
const MIN_DELAY_MS = 900;

async function waitForQueue(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastFetchTime;
  if (elapsed < MIN_DELAY_MS) {
    await new Promise((r) => setTimeout(r, MIN_DELAY_MS - elapsed));
  }
  lastFetchTime = Date.now();
}

async function fetchImage(decoded: string): Promise<{ body: ArrayBuffer; contentType: string } | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);
  try {
    const parsed = new URL(decoded);
    const origin = `${parsed.protocol}//${parsed.host}`;
    const isInstagram = /cdninstagram|fbcdn\.net|instagram\.com/i.test(decoded);
    const headers: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      Accept: "image/webp,image/avif,image/apng,image/*,*/*;q=0.8",
    };
    if (process.env.NOTICIAS_IMAGE_USE_REFERER === "1") {
      headers.Referer = origin;
    } else if (isInstagram) {
      headers.Referer = "https://www.instagram.com/";
    }
    const res = await fetch(decoded, {
      signal: controller.signal,
      headers,
      redirect: "follow",
    });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const body = await res.arrayBuffer();
    return { body, contentType };
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

/** scontent.cdninstagram.com bloqueia mais que fbcdn.net — tenta via Lambda quando direto falha */
async function fetchViaLambda(decoded: string): Promise<{ body: ArrayBuffer; contentType: string } | null> {
  const proxyUrl = process.env.NOTICIAS_IMAGE_PROXY_URL?.trim();
  if (!proxyUrl) return null;
  const base = proxyUrl.replace(/\/$/, "");
  const url = `${base}?url=${encodeURIComponent(decoded)}`;
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const body = await res.arrayBuffer();
    return { body, contentType };
  } catch {
    return null;
  }
}

/**
 * GET /api/public/noticias-image?url=...
 * Proxy de imagens para o feed de notícias (evita CORS/CORP).
 * Fila serializa fetches ao Instagram para evitar 403 por rate limit.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url?.trim()) {
    return NextResponse.json({ error: "url é obrigatório" }, { status: 400 });
  }
  const decoded = decodeURIComponent(url.trim());
  if (!isAllowedImageUrl(decoded)) {
    return NextResponse.json({ error: "URL não permitida" }, { status: 403 });
  }

  const cached = imageCache.get(decoded);
  if (cached && cached.expires > Date.now()) {
    return new NextResponse(cached.body, {
      headers: {
        "Content-Type": cached.contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  }

  const isScontentCdn = /scontent\.cdninstagram\.com/i.test(decoded);
  let fetchPromise = pendingFetches.get(decoded);
  if (!fetchPromise) {
    fetchPromise = (async () => {
      const isInstagram = /cdninstagram|fbcdn\.net/i.test(decoded);
      if (isInstagram) await waitForQueue();
      /** scontent quase sempre bloqueia o IP do servidor — Lambda primeiro quando disponível */
      let r =
        isScontentCdn && process.env.NOTICIAS_IMAGE_PROXY_URL?.trim()
          ? await fetchViaLambda(decoded)
          : null;
      if (!r) r = await fetchImage(decoded);
      if (!r && isScontentCdn) r = await fetchViaLambda(decoded);
      pendingFetches.delete(decoded);
      return r;
    })();
    pendingFetches.set(decoded, fetchPromise);
  }

  const result = await fetchPromise;
  if (!result) {
    return new NextResponse(null, { status: 502 });
  }

  imageCache.set(decoded, {
    body: result.body,
    contentType: result.contentType,
    expires: Date.now() + CACHE_TTL_MS,
  });

  if (imageCache.size > 100) {
    const keys = [...imageCache.keys()];
    for (let i = 0; i < 50; i++) imageCache.delete(keys[i]);
  }

  return new NextResponse(result.body, {
    headers: {
      "Content-Type": result.contentType,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
