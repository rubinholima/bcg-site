import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function isAllowedImageUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    if (["localhost", "127.0.0.1"].includes(u.hostname)) return false;
    // Bloquear IPs internos
    if (/^10\.|^172\.(1[6-9]|2[0-9]|3[01])\.|^192\.168\./.test(u.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * GET /api/public/noticias-image?url=...
 * Proxy de imagens para o feed de notícias (evita CORS/referrer block).
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
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const parsed = new URL(decoded);
    const origin = `${parsed.protocol}//${parsed.host}`;
    // Sem Referer: muitos CDNs bloqueiam quando veem Referer de outro domínio.
    // User-Agent browser-like + Accept para parecer requisição de imagem legítima.
    const res = await fetch(decoded, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
        // Referer da origem da imagem — alguns CDNs exigem; outros bloqueiam. Testar sem se 403 persistir.
        ...(process.env.NOTICIAS_IMAGE_USE_REFERER === "1" ? { Referer: origin } : {}),
      },
      redirect: "follow",
    });
    clearTimeout(timeoutId);
    if (!res.ok) return new NextResponse(null, { status: res.status });
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const body = await res.arrayBuffer();
    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400", // 24h
      },
    });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar imagem" }, { status: 502 });
  }
}
