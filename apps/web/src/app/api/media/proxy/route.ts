import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/media/proxy?url=...
 * Redireciona para /media/proxy (Next). No ambiente com Nginx, /api/* vai
 * ao backend e esta rota não é atingida; em dev ou onde Next atende /api,
 * o redirect mantém links antigos funcionando.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  const base = request.nextUrl.origin;
  const target = url
    ? `${base}/media/proxy?url=${encodeURIComponent(url)}`
    : `${base}/media/proxy`;
  return NextResponse.redirect(target, 302);
}
