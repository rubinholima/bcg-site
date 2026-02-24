import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/auth/logout — limpa o cookie e redireciona para /login.
 */
export async function GET(request: NextRequest) {
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host") ||
    "";
  const isLocalhost = host?.includes("localhost") || host?.startsWith("127.0.0.1");
  const hostOnly = (host ?? "").replace(/^https?:\/\//, "").split("/")[0] ?? "";
  const domain =
    !isLocalhost &&
    (hostOnly === "bostoncitygroup.biz" || hostOnly.endsWith(".bostoncitygroup.biz"))
      ? ".bostoncitygroup.biz"
      : undefined;

  const loginUrl = new URL("/login", request.url);
  const res = NextResponse.redirect(loginUrl);
  const opts = {
    path: "/",
    maxAge: 0,
    ...(domain && { domain }),
  };
  res.cookies.set("access_token", "", opts);
  res.cookies.set("id_token", "", opts);
  res.cookies.set("refresh_token", "", opts);
  return res;
}
