import { NextRequest, NextResponse } from "next/server";

const CANONICAL_HOST = process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "").split("/")[0] ?? "www.bostoncitygroup.biz";

const TRUSTED_PLATFORM_HOSTS = new Set([
  CANONICAL_HOST.toLowerCase(),
  "www.bostoncitygroup.biz",
  "bostoncitygroup.biz",
  "localhost",
  "127.0.0.1",
]);

function parseTrustedHostList(): Set<string> {
  const raw = process.env.CUP360_TRUSTED_PUBLIC_HOSTS?.trim();
  const s = new Set(TRUSTED_PLATFORM_HOSTS);
  if (!raw) return s;
  for (const p of raw.split(/[\s,]+/)) {
    const h = p.trim().toLowerCase().replace(/\.$/, "");
    if (h) s.add(h);
  }
  return s;
}

const TRUSTED_HOSTS = parseTrustedHostList();

type HostnameContext =
  | { mode: "none" }
  | { mode: "apex_redirect"; redirectTo: string }
  | { mode: "custom_domain"; tenantSlug: string; canonicalOrigin: string; pathPrefix: string };

async function fetchHostnameContext(
  hostOnly: string,
  pathname: string,
  search: string,
): Promise<HostnameContext> {
  const base =
    process.env.API_INTERNAL_URL ||
    process.env.API_BASE_URL ||
    (process.env.NODE_ENV === "development" ? "http://127.0.0.1:3001" : "");
  if (!base) return { mode: "none" };
  try {
    const u = new URL("/public/hostname-context", base.replace(/\/$/, ""));
    u.searchParams.set("host", hostOnly);
    u.searchParams.set("pathname", pathname || "/");
    u.searchParams.set("search", search || "");
    const res = await fetch(u.toString(), {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return { mode: "none" };
    const data = (await res.json()) as HostnameContext;
    if (data?.mode === "apex_redirect" && data.redirectTo) return data;
    return data?.mode === "custom_domain" && data.tenantSlug && data.pathPrefix
      ? data
      : { mode: "none" };
  } catch {
    return { mode: "none" };
  }
}

function isPlatformRequest(hostOnly: string): boolean {
  if (!hostOnly) return false;
  const h = hostOnly.split(":")[0]?.toLowerCase() ?? "";
  return TRUSTED_HOSTS.has(h);
}

function isBlockedPublicPath(pathname: string): boolean {
  return (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/portfolio")
  );
}

/**
 * Middleware: slash em dashboard/login, origin → www, domínio público customizado → rewrite para /portfolio/[slug].
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname === "/dashboard" || pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = pathname + "/";
    const res = NextResponse.rewrite(url);
    res.headers.set("X-Middleware-Auth", "rewrite-add-slash");
    return res;
  }

  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || request.headers.get("host") || "";
  const hostOnly = host.replace(/^https?:\/\//, "").split("/")[0] ?? "";
  if (hostOnly === "origin.bostoncitygroup.biz") {
    const path = request.nextUrl.pathname + request.nextUrl.search;
    const canonicalUrl = new URL(path, `https://${CANONICAL_HOST}`);
    return NextResponse.redirect(canonicalUrl, 302);
  }

  if (!isPlatformRequest(hostOnly) && !isBlockedPublicPath(pathname)) {
    const ctx = await fetchHostnameContext(hostOnly, pathname, request.nextUrl.search);
    if (ctx.mode === "apex_redirect") {
      return NextResponse.redirect(ctx.redirectTo, 308);
    }
    if (ctx.mode === "custom_domain") {
      const prefix = ctx.pathPrefix.replace(/\/$/, "");
      const path = pathname === "/" ? prefix : `${prefix}${pathname}`;
      const url = request.nextUrl.clone();
      url.pathname = path;
      const reqHeaders = new Headers(request.headers);
      reqHeaders.set("x-cup360-custom-domain", "1");
      const res = NextResponse.rewrite(url, { request: { headers: reqHeaders } });
      res.headers.set("X-Middleware-Auth", "custom-domain-rewrite");
      res.headers.set("x-cup360-pathname", pathname);
      return res;
    }
  }

  const res = NextResponse.next();
  res.headers.set("X-Middleware-Auth", "no-redirect");
  res.headers.set("x-cup360-pathname", pathname);
  return res;
}

export const config = {
  matcher: [
    /*
     * Match all paths except static assets — necessário para domínio customizado na raiz.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
