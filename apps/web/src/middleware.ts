import { NextRequest, NextResponse } from "next/server";
import {
  CUP360_EDGE_CONTRACT_HEADERS,
  cup360EdgeContractHeadersComplete,
  getOriginInboundHost,
  isCup360PlatformHost,
  shouldResolvePublicDomainRouting,
} from "@/lib/middleware-edge-routing";

type HostnameContext =
  | { mode: "none" }
  | { mode: "apex_redirect"; redirectTo: string }
  | { mode: "custom_domain"; tenantSlug: string; canonicalOrigin: string; pathPrefix: string };

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
    if (edgeSecret && cup360EdgeContractHeadersComplete(incoming)) {
      for (const k of CUP360_EDGE_CONTRACT_HEADERS) {
        const v = incoming.get(k);
        if (v?.trim()) hdrs[k] = v.trim();
      }
    }
    const res = await fetch(u.toString(), {
      cache: "no-store",
      headers: hdrs,
    });
    if (res.status === 403) return "forbidden";
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

/**
 * Middleware: slash em dashboard/login, domínio público customizado → rewrite para /portfolio/[slug].
 * Na origem compartilhada (Host=origin.bostoncitygroup.biz), o tenant vem do contrato de borda assinado.
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

  const hostOnly = getOriginInboundHost(request.headers.get("host"));
  const edgeSecret = process.env.CUP360_EDGE_HOST_SECRET?.trim();

  if (
    edgeSecret &&
    !isCup360PlatformHost(hostOnly) &&
    !cup360EdgeContractHeadersComplete(request.headers)
  ) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (shouldResolvePublicDomainRouting(hostOnly, pathname, request.headers, edgeSecret)) {
    const ctx = await fetchHostnameContext(
      request.headers,
      hostOnly,
      pathname,
      request.nextUrl.search,
    );
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
