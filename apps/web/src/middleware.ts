import { NextRequest, NextResponse } from "next/server";

const CANONICAL_HOST = process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "").split("/")[0] ?? "www.bostoncitygroup.biz";

/**
 * Middleware só redireciona origin → www.
 * NÃO redireciona /dashboard → /login aqui: o DashboardGuard (cliente) faz isso após /api/me.
 * Assim evitamos 302 no servidor que CloudFront/Nginx podem cachear e causar ERR_TOO_MANY_REDIRECTS.
 * Header X-Middleware-Auth: no-redirect confirma que esta versão está em produção (para diagnóstico).
 *
 * Rewrite /dashboard/ → /dashboard (sem redirect) para evitar loop 302 quando Nginx/CloudFront
 * enviam trailing slash e Next.js responde redirect para a mesma URL.
 */
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  // Rewrite /path/ → /path (evita 302 do Next.js para mesma URL)
  if (pathname !== "/" && pathname.endsWith("/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(0, -1);
    const res = NextResponse.rewrite(url);
    res.headers.set("X-Middleware-Auth", "rewrite-no-slash");
    return res;
  }

  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || request.headers.get("host") || "";
  const hostOnly = host.replace(/^https?:\/\//, "").split("/")[0] ?? "";
  if (hostOnly === "origin.bostoncitygroup.biz") {
    const path = request.nextUrl.pathname + request.nextUrl.search;
    const canonicalUrl = new URL(path, `https://${CANONICAL_HOST}`);
    return NextResponse.redirect(canonicalUrl, 302);
  }
  const res = NextResponse.next();
  res.headers.set("X-Middleware-Auth", "no-redirect");
  return res;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/login",
    "/login/",
  ],
};
