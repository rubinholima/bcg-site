import { NextRequest, NextResponse } from "next/server";

const cognitoDomain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN ?? "";
const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? "";

/**
 * Renova id_token e access_token usando o refresh_token (cookie).
 * Chamado quando o frontend recebe 401 para evitar logout a cada expiração do JWT.
 */
export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get("refresh_token")?.value;

  if (!refreshToken || !cognitoDomain || !clientId) {
    const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const clearOpts = { path: "/", httpOnly: true, sameSite: "lax" as const, maxAge: 0 };
    res.cookies.set("id_token", "", clearOpts);
    res.cookies.set("access_token", "", clearOpts);
    res.cookies.set("refresh_token", "", clearOpts);
    return res;
  }

  const tokenUrl = `${cognitoDomain}/oauth2/token`;
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    refresh_token: refreshToken,
  });

  const tokenRes = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    console.error("[auth/refresh] Cognito refresh failed", tokenRes.status, text);
    const res = NextResponse.json({ error: "Refresh failed", code: "invalid_grant" }, { status: 401 });
    const clearOpts = { path: "/", httpOnly: true, sameSite: "lax" as const, maxAge: 0 };
    res.cookies.set("id_token", "", clearOpts);
    res.cookies.set("access_token", "", clearOpts);
    res.cookies.set("refresh_token", "", clearOpts);
    return res;
  }

  const tokens = (await tokenRes.json()) as {
    id_token?: string;
    access_token?: string;
    expires_in?: number;
  };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const isLocalhost = appUrl.startsWith("http://localhost") || appUrl.startsWith("http://127.0.0.1");
  const res = NextResponse.json({ ok: true });
  const cookieOpts = {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7,
    secure: !isLocalhost,
  };

  if (tokens.id_token) {
    res.cookies.set("id_token", tokens.id_token, cookieOpts);
  }
  if (tokens.access_token) {
    res.cookies.set("access_token", tokens.access_token, cookieOpts);
  }

  return res;
}
