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
 * GET /api/portfolio/[slug]/favicon
 * Retorna o logo do tenant como favicon. URL estável para não ser sobrescrito.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!slug?.trim()) {
    return NextResponse.redirect(new URL("/favicon.ico", _request.url));
  }
  try {
    const res = await fetch(
      `${apiUrl}/public/page-by-slug/${encodeURIComponent(slug)}`,
      { cache: "force-cache" }
    );
    if (!res.ok) return NextResponse.redirect(new URL("/favicon.ico", _request.url));
    const page = (await res.json()) as { tenant?: { logoUrl?: string | null } };
    const logoUrl = page?.tenant?.logoUrl?.trim();
    if (!logoUrl) {
      return NextResponse.redirect(new URL("/favicon.ico", _request.url));
    }
    const isS3 = logoUrl.startsWith(S3_PREFIX) || logoUrl.startsWith(S3_ALT);
    if (isS3) {
      const key = s3UrlToKey(logoUrl);
      if (!key) return NextResponse.redirect(new URL("/favicon.ico", _request.url));
      const mediaRes = await fetch(
        `${apiUrl}/public/media?key=${encodeURIComponent(key)}`,
        { cache: "force-cache" }
      );
      if (!mediaRes.ok) return NextResponse.redirect(new URL("/favicon.ico", _request.url));
      const contentType = mediaRes.headers.get("content-type") ?? "image/png";
      const body = await mediaRes.arrayBuffer();
      return new NextResponse(body, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=86400, immutable",
        },
      });
    }
    return NextResponse.redirect(logoUrl);
  } catch {
    return NextResponse.redirect(new URL("/favicon.ico", _request.url));
  }
}
