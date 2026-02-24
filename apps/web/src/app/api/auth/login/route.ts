import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:3001";

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
    const fd = await request.formData();
    body = {
      email: fd.get("email")?.toString()?.trim(),
      password: fd.get("password")?.toString() ?? "",
      next: fd.get("next")?.toString()?.trim() || undefined,
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

  if (!email || !password) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "missing");
    return NextResponse.redirect(loginUrl);
  }

  try {
    const res = await fetch(`${API_BASE_URL}/internal/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = (await res.json()) as {
      access_token?: string;
      message?: string;
      statusCode?: number;
    };

    if (!res.ok || !data.access_token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("error", "invalid");
      if (data.message) loginUrl.searchParams.set("hint", data.message.slice(0, 80));
      return NextResponse.redirect(loginUrl);
    }

    const redirect = NextResponse.redirect(new URL(nextPath, request.url));
    redirect.cookies.set("access_token", data.access_token, getCookieOptions(request));
    redirect.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    return redirect;
  } catch (err) {
    console.error("[auth/login] backend error:", err);
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "server");
    return NextResponse.redirect(loginUrl);
  }
}
