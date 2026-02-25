import { NextRequest, NextResponse } from "next/server";

const CANONICAL_HOST = process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "").split("/")[0] ?? "www.bostoncitygroup.biz";

export function middleware(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || request.headers.get("host") || "";
  const hostOnly = host.replace(/^https?:\/\//, "").split("/")[0] ?? "";
  if (hostOnly === "origin.bostoncitygroup.biz") {
    const path = request.nextUrl.pathname + request.nextUrl.search;
    const canonicalUrl = new URL(path, `https://${CANONICAL_HOST}`);
    return NextResponse.redirect(canonicalUrl, 302);
  }

  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get("access_token")?.value;
  const idToken = request.cookies.get("id_token")?.value;

  if (accessToken || idToken) {
    return NextResponse.next();
  }

  const next = `${pathname}${request.nextUrl.search}`;
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", next);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
