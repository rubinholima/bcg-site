import { NextRequest, NextResponse } from "next/server";

const CANONICAL_HOST = process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "").split("/")[0] ?? "www.bostoncitygroup.biz";

const TRUSTED_PLATFORM_HOSTS = new Set([
  CANONICAL_HOST.toLowerCase(),
  "www.bostoncitygroup.biz",
  "bostoncitygroup.biz",
  "origin.bostoncitygroup.biz",
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

const EDGE_CONTRACT_HEADERS = [
  "x-cup360-edge-v",
  "x-cup360-edge-ts",
  "x-cup360-edge-host",
  "x-cup360-edge-sig",
] as const;

async function fetchHostnameContext(
  incoming: Headers,
  hostOnly: string,
  pathname: string,
  search: string,
): Promise<HostnameContext | "forbidden"> {
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
    const edgeSecret = process.env.CUP360_EDGE_HOST_SECRET?.trim();
    const hdrs: Record<string, string> = { Accept: "application/json" };
    if (edgeSecret) {
      let hasContract = true;
      for (const k of EDGE_CONTRACT_HEADERS) {
        const v = incoming.get(k);
        if (!v?.trim()) hasContract = false;
        else hdrs[k] = v.trim();
      }
      if (!hasContract) {
        return "forbidden";
      }
    }
    const res = await fetch(u.toString(), {
      cache: "no-store",
      headers: hdrs,
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
 * Middleware: slash em dashboard/login, domínio público customizado → rewrite para /portfolio/[slug].
 * origin.bostoncitygroup.biz permanece host de origem (CloudFront) — sem redirect canônico.
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

  if (!isPlatformRequest(hostOnly) && !isBlockedPublicPath(pathname)) {
    const ctx = await fetchHostnameContext(request.headers, hostOnly, pathname, request.nextUrl.search);
    if (ctx === "forbidden") {
      return new NextResponse("Forbidden", { status: 403 });
    }
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
