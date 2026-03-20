import { NextRequest, NextResponse } from "next/server";
import { buildBackendUrl } from "@/lib/apiProxy";

export const dynamic = "force-dynamic";

const ALLOWED_PREFIXES = ["logos/", "media/"];

function isAllowedKey(key: string): boolean {
  const k = key.trim().replace(/^\/+/, "").toLowerCase();
  return ALLOWED_PREFIXES.some((p) => k.startsWith(p));
}

/**
 * GET /api/public/media-asset?key=logos/eventos/xxx.png
 * Stream público via Nest (/public/media) na **mesma origem** do Next — evita ERR_BLOCKED_BY_ORB no Chrome
 * quando `next dev` carrega imagens do S3 ou do CDN em outro host.
 */
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key")?.trim();
  if (!key || !isAllowedKey(key)) {
    return new NextResponse("Invalid key", { status: 400 });
  }

  try {
    const mediaRes = await fetch(
      buildBackendUrl(`/public/media?key=${encodeURIComponent(key)}`),
      { cache: "no-store" },
    );
    if (!mediaRes.ok) {
      return new NextResponse(null, { status: mediaRes.status === 404 ? 404 : 502 });
    }
    const contentType = mediaRes.headers.get("content-type") ?? "application/octet-stream";
    const body = await mediaRes.arrayBuffer();
    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Cross-Origin-Resource-Policy": "cross-origin",
        "Cache-Control": "public, max-age=120",
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
