import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/media/proxy?url=...
 * Redireciona (302) para /media/proxy?url=... preservando host e protocolo do request
 * (nextUrl), sem hardcodar domínio nem protocolo.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  const redirectUrl = request.nextUrl.clone();
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedProto === "https") redirectUrl.protocol = "https:";
  redirectUrl.pathname = "/media/proxy";
  redirectUrl.search = url != null && url !== "" ? `url=${encodeURIComponent(url)}` : "";
  return NextResponse.redirect(redirectUrl, {
    status: 302,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
