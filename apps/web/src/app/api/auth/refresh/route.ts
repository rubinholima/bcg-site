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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    return NextResponse.json({ error: "Refresh failed" }, { status: 401 });
  }

  const tokens = (await tokenRes.json()) as {
    id_token?: string;
    access_token?: string;
    expires_in?: number;
  };

  const res = NextResponse.json({ ok: true });
  const cookieOpts = {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7,
  };

  if (tokens.id_token) {
    res.cookies.set("id_token", tokens.id_token, cookieOpts);
  }
  if (tokens.access_token) {
    res.cookies.set("access_token", tokens.access_token, cookieOpts);
  }

  return res;
}
