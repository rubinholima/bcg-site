import { NextRequest, NextResponse } from "next/server";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const S3_PREFIX = "https://bcg-platform-assets.s3.";
const S3_ALT = "https://bcg-platform-assets.s3.amazonaws.com";

function s3UrlToKey(url: string): string | null {
  try {
    const u = new URL(url);
    return u.pathname.replace(/^\/+/, "") || null;
  } catch {
    return null;
  }
}

/**
 * GET /api/public/group-favicon
 * Retorna o logo do Grupo Master como favicon (página principal /).
 */
export async function GET(request: NextRequest) {
  try {
    const res = await fetch(`${apiUrl}/group`, { cache: "no-store" });
    if (!res.ok) return NextResponse.redirect(new URL("/favicon.ico", request.url));
    const group = (await res.json()) as { logoUrl?: string | null };
    const logoUrl = group?.logoUrl?.trim();
    if (!logoUrl) {
      return NextResponse.redirect(new URL("/favicon.ico", request.url));
    }
    const isS3 = logoUrl.startsWith(S3_PREFIX) || logoUrl.startsWith(S3_ALT);
    if (isS3) {
      const key = s3UrlToKey(logoUrl);
      if (!key) return NextResponse.redirect(new URL("/favicon.ico", request.url));
      const mediaRes = await fetch(
        `${apiUrl}/public/media?key=${encodeURIComponent(key)}`,
        { cache: "no-store" }
      );
      if (!mediaRes.ok) return NextResponse.redirect(new URL("/favicon.ico", request.url));
      const contentType = mediaRes.headers.get("content-type") ?? "image/png";
      const body = await mediaRes.arrayBuffer();
      return new NextResponse(body, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=86400",
        },
      });
    }
    return NextResponse.redirect(logoUrl);
  } catch {
    return NextResponse.redirect(new URL("/favicon.ico", request.url));
  }
}
