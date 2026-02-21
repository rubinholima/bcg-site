import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/media/proxy?url=...
 * Redireciona (302) para /media/proxy?url=... com URL absoluta a partir de headers
 * (x-forwarded-proto, x-forwarded-host/host), nunca localhost em produção.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  const xfProto = request.headers.get("x-forwarded-proto");
  const cfProto = request.headers.get("cloudfront-viewer-protocol");
  let proto = (xfProto || cfProto || "https").split(",")[0].trim().toLowerCase();
  if (proto !== "https") proto = "https";
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    request.nextUrl.host;
  const dest = new URL("/media/proxy", `${proto}://${host}`);
  if (url != null && url !== "") {
    dest.searchParams.set("url", url);
  }
  const res = NextResponse.redirect(dest.toString(), 302);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
