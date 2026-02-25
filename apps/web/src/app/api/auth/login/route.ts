import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:3001";

/** Origem pública para redirects. Em produção (Nginx/CloudFront) X-Forwarded-Proto pode vir como http; usar NEXT_PUBLIC_APP_URL para garantir https. */
function getRedirectOrigin(request: NextRequest): string {
  const canonical = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const fwdHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = (fwdHost || request.headers.get("host") || "").replace(/^https?:\/\//, "").split("/")[0]?.trim() ?? "";
  const isProduction = host === "bostoncitygroup.biz" || host.endsWith(".bostoncitygroup.biz");
  if (canonical && !canonical.includes("localhost") && !canonical.includes("127.0.0.1") && isProduction) {
    return canonical.startsWith("https") ? canonical : `https://${canonical.replace(/^https?:\/\//, "")}`;
  }
  if (host === "origin.bostoncitygroup.biz") {
    return canonical && !canonical.includes("localhost") ? canonical : "https://www.bostoncitygroup.biz";
  }
  const fwdProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim()?.toLowerCase();
  const cleanHost = host.replace(/^https?:\/\//, "").split("/")[0]?.trim() ?? "";
  if (cleanHost === "origin.bostoncitygroup.biz") {
    return canonical && !canonical.includes("localhost") ? canonical : "https://www.bostoncitygroup.biz";
  }
  if (cleanHost && !cleanHost.includes("127.0.0.1") && !cleanHost.startsWith("localhost")) {
    const proto = fwdProto === "https" ? "https" : "https";
    return `${proto}://${cleanHost}`;
  }
  if (canonical && !canonical.includes("localhost")) return canonical;
  return new URL(request.url).origin;
}

function getCookieOptions(request: NextRequest) {
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host") ||
    "";
  const isLocalhost =
    host?.includes("localhost") || host?.startsWith("127.0.0.1");
  const hostOnly = (host ?? "").replace(/^https?:\/\//, "").split("/")[0] ?? "";
  const domain =
    !isLocalhost &&
    (hostOnly === "bostoncitygroup.biz" || hostOnly.endsWith(".bostoncitygroup.biz"))
      ? ".bostoncitygroup.biz"
      : undefined;
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7,
    secure: !isLocalhost,
    ...(domain && { domain }),
  };
}

/**
 * POST /api/auth/login
 * Body: { email, password, next? }
 * Valida com o backend (Nest) e define cookie access_token; redireciona para next ou /dashboard.
 */
export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string; next?: string };
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    // Ler body como texto e parsear manualmente — evita body vazio quando Nginx/proxy altera o request
    const raw = await request.text();
    const params = new URLSearchParams(raw);
    body = {
      email: params.get("email")?.trim() ?? undefined,
      password: params.get("password") ?? "",
      next: params.get("next")?.trim() || undefined,
    };
  } else {
    try {
      body = (await request.json()) as { email?: string; password?: string; next?: string };
    } catch {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }
  }

  const email = body.email?.trim();
  const password = body.password ?? "";
  const nextPath = body.next?.startsWith("/") ? body.next : "/dashboard";

  if (process.env.NODE_ENV === "development") {
    console.log("[auth/login] body keys:", Object.keys(body), "email:", !!email, "password:", !!password);
  }

  if (!email || !password) {
    const origin = getRedirectOrigin(request);
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("error", "missing");
    return NextResponse.redirect(loginUrl);
  }

  try {
    const base = process.env.API_BASE_URL?.trim() || "http://127.0.0.1:3001";
    const url = `${base.replace(/\/$/, "")}/internal/auth/login`;
    if (process.env.NODE_ENV === "development") {
      console.log("[auth/login] sending to backend:", url, "email:", email?.slice(0, 5) + "...", "passwordLen:", password?.length);
    }
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(15000),
    });
    const data = (await res.json()) as {
      access_token?: string;
      message?: string;
      statusCode?: number;
    };

    if (!res.ok || !data.access_token) {
      const origin = getRedirectOrigin(request);
      const loginUrl = new URL("/login", origin);
      loginUrl.searchParams.set("error", "invalid");
      if (data.message) loginUrl.searchParams.set("hint", data.message.slice(0, 80));
      return NextResponse.redirect(loginUrl);
    }

    const origin = getRedirectOrigin(request);
    const redirect = NextResponse.redirect(new URL(nextPath, origin));
    redirect.cookies.set("access_token", data.access_token, getCookieOptions(request));
    redirect.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    return redirect;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[auth/login] backend error:", message);
    const origin = getRedirectOrigin(request);
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("error", "server");
    // Hint para o usuário: API inacessível (servidor pode estar fora do ar)
    if (/ECONNREFUSED|ETIMEDOUT|fetch failed|Failed to fetch/i.test(message)) {
      loginUrl.searchParams.set("hint", "API indisponível. No servidor rode: pm2 status e ./deploy.sh");
    }
    return NextResponse.redirect(loginUrl);
  }
}
