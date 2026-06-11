import { NextRequest, NextResponse } from "next/server";
import { getServerBackendBaseUrl } from "@/lib/apiProxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Stream IPTV ao vivo — repassa bytes do Nest sem buffer (o catch-all /api/* corrompia MPEG-TS como texto).
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const itemIndex = request.nextUrl.searchParams.get("i") ?? "0";
  const backendBase = getServerBackendBaseUrl().replace(/\/$/, "");
  const backendUrl = `${backendBase}/public/boston-tv/play/${encodeURIComponent(token)}/stream?i=${encodeURIComponent(itemIndex)}`;

  const headers: Record<string, string> = {};
  const range = request.headers.get("range");
  if (range) headers.Range = range;

  try {
    const upstream = await fetch(backendUrl, {
      cache: "no-store",
      headers,
    });

    if (!upstream.ok && upstream.status !== 206) {
      return new NextResponse(null, { status: upstream.status === 404 ? 404 : 502 });
    }
    if (!upstream.body) {
      return new NextResponse(null, { status: 502 });
    }

    const out = new Headers();
    out.set(
      "Content-Type",
      upstream.headers.get("content-type") ?? "video/mp2t",
    );
    out.set("Cache-Control", "no-store");
    out.set("Accept-Ranges", "bytes");
    const contentRange = upstream.headers.get("content-range");
    if (contentRange) out.set("Content-Range", contentRange);

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: out,
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
