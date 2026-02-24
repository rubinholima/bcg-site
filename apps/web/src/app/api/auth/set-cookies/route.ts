import { NextRequest, NextResponse } from "next/server";
import { getPendingTokens, deletePendingTokens } from "../pending-tokens";

/** GET /api/auth/set-cookies?t=TOKEN&next=/dashboard — define cookies e redireciona. Evita 302+Set-Cookie na mesma resposta do POST. */
export async function GET(request: NextRequest) {
  const t = request.nextUrl.searchParams.get("t");
  const nextPath = request.nextUrl.searchParams.get("next")?.trim() || "/dashboard";
  if (!t || !nextPath.startsWith("/")) {
    return NextResponse.redirect(new URL("/login?error=missing", request.url));
  }
  const tokens = getPendingTokens(t);
  deletePendingTokens(t);
  if (!tokens) {
    return NextResponse.redirect(new URL("/login?error=expired", request.url));
  }

  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim()?.toLowerCase() ||
    request.headers.get("cloudfront-viewer-protocol")?.split(",")[0]?.trim() ||
    "https";
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host") ||
    "";
  const origin = host ? `${proto}://${host}` : request.nextUrl.origin;
  const isLocalhost = origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1");
  const hostOnly = origin.replace(/^https?:\/\//, "").split("/")[0] ?? "";
  const domain =
    !isLocalhost && (hostOnly === "bostoncitygroup.biz" || hostOnly.endsWith(".bostoncitygroup.biz"))
      ? ".bostoncitygroup.biz"
      : undefined;
  const cookieOpts = {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7,
    secure: !isLocalhost,
    ...(domain && { domain }),
  };

  const res = NextResponse.redirect(new URL(nextPath, origin), 302);
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  if (tokens.id_token) res.cookies.set("id_token", tokens.id_token, cookieOpts);
  if (tokens.access_token) res.cookies.set("access_token", tokens.access_token, cookieOpts);
  if (tokens.refresh_token) {
    res.cookies.set("refresh_token", tokens.refresh_token, { ...cookieOpts, maxAge: 60 * 60 * 24 * 30 });
  }
  return res;
}
