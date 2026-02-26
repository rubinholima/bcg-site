import { NextRequest, NextResponse } from "next/server";

/** Origem para redirect (produção: NEXT_PUBLIC_APP_URL; evita cair em localhost). */
function getRedirectOrigin(request: NextRequest): string {
  const canonical = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const fwdHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = (fwdHost || request.headers.get("host") || "").replace(/^https?:\/\//, "").split("/")[0]?.trim() ?? "";
  const isProduction = host === "bostoncitygroup.biz" || host?.endsWith(".bostoncitygroup.biz");
  if (canonical && !canonical.includes("localhost") && !canonical.includes("127.0.0.1") && isProduction) {
    return canonical.startsWith("https") ? canonical : `https://${canonical.replace(/^https?:\/\//, "")}`;
  }
  if (host === "origin.bostoncitygroup.biz" || host === "auth.bostoncitygroup.biz") {
    return canonical && !canonical.includes("localhost") ? canonical : "https://www.bostoncitygroup.biz";
  }
  const fwdProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim()?.toLowerCase();
  const cleanHost = (host ?? "").replace(/^https?:\/\//, "").split("/")[0] ?? "";
  if (cleanHost && !cleanHost.includes("127.0.0.1") && !cleanHost.startsWith("localhost")) {
    return (fwdProto === "https" ? "https" : "https") + "://" + cleanHost;
  }
  if (canonical && !canonical.includes("localhost")) return canonical;
  return new URL(request.url).origin;
}

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

  const origin = getRedirectOrigin(request);
  const loginUrl = new URL("/login", origin);
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
