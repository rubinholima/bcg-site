import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/media/proxy?url=...
 * Redireciona (302) para /media/proxy?url=... com Location relativo (sem host/protocolo).
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  const target =
    url != null && url !== "" ? `/media/proxy?url=${encodeURIComponent(url)}` : "/media/proxy";
  const res = NextResponse.redirect(target, 302);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
