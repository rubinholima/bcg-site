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
    const res = await fetch(decoded, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BCG-News/1.0)" },
      redirect: "follow",
    });
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
