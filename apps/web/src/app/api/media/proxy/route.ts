import { NextRequest, NextResponse } from "next/server";

/**
 * Origin do request (mesmo host que o cliente usou). Evita Location com localhost
 * atrás de CloudFront/Nginx: usa x-forwarded-proto + host quando presentes.
 */
function getRequestOrigin(request: NextRequest): string {
  const proto = request.headers.get("x-forwarded-proto");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (proto && host) {
    return `${proto.replace(/,.*$/, "").trim()}://${host.replace(/,.*$/, "").trim()}`;
  }
  return request.nextUrl.origin;
}

/**
 * GET /api/media/proxy?url=...
 * Redireciona (302) para /media/proxy?url=... no mesmo origin do request.
 * Em produção com Nginx, /api/* vai ao backend; quando esta rota Next responde,
 * o Location usa o host real (nunca localhost).
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  const origin = getRequestOrigin(request).replace(/\/$/, "");
  const target = url != null && url !== ""
    ? `${origin}/media/proxy?url=${encodeURIComponent(url)}`
    : `${origin}/media/proxy`;
  const res = NextResponse.redirect(target, 302);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
