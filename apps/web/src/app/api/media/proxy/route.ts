import { NextRequest, NextResponse } from "next/server";
import { buildBackendUrl } from "@/lib/apiProxy";

const ALLOWED_ORIGIN = "https://bcg-platform-assets.s3.";
const ALLOWED_ORIGIN_ALT = "https://bcg-platform-assets.s3.amazonaws.com";

/** Extrai a key S3 (ex: media/hero/xxx.jpg) da URL do bucket. */
function s3UrlToKey(url: string): string | null {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/^\/+/, "");
    return path || null;
  } catch {
    return null;
  }
}

/**
 * GET /api/media/proxy?url=...
 * Proxy para imagens do S3. Usa o backend (GET /public/media?key=...) para
 * buscar com credenciais AWS, assim funciona com bucket privado.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }
  const trimmed = url.trim();
  const isS3 =
    trimmed.startsWith(ALLOWED_ORIGIN) || trimmed.startsWith(ALLOWED_ORIGIN_ALT);
  if (!isS3) {
    return NextResponse.json({ error: "URL not allowed" }, { status: 403 });
  }
  const key = s3UrlToKey(trimmed);
  if (!key) {
    return NextResponse.json({ error: "Invalid S3 URL" }, { status: 400 });
  }
  try {
    const res = await fetch(
      buildBackendUrl(`/public/media?key=${encodeURIComponent(key)}`),
      { cache: "force-cache" },
    );
    if (!res.ok) {
      return new NextResponse(null, { status: res.status });
    }
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const body = await res.arrayBuffer();
    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Proxy failed" }, { status: 502 });
  }
}
