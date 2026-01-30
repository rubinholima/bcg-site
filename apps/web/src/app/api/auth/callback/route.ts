import { NextRequest, NextResponse } from "next/server";

const cognitoDomain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN ?? "";
const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? "";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * Callback do Cognito Hosted UI.
 * Cognito redireciona aqui com ?code=xxx&state=yyy.
 * Troca o code por tokens no servidor (sem fetch no browser, sem CORS).
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL("/login?error=auth", appUrl));
  }

  if (!code || !cognitoDomain || !clientId) {
    return NextResponse.redirect(new URL("/login?error=missing", appUrl));
  }

  const redirectUri = `${appUrl.replace(/\/$/, "")}/api/auth/callback`;
  const tokenUrl = `${cognitoDomain}/oauth2/token`;

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    code,
    redirect_uri: redirectUri,
  });

  const tokenRes = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    console.error("[auth/callback] token exchange failed", tokenRes.status, text);
    return NextResponse.redirect(new URL("/login?error=auth", appUrl));
  }

  const tokens = (await tokenRes.json()) as {
    id_token?: string;
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };

  const redirect = NextResponse.redirect(new URL("/dashboard", appUrl));
  const cookieOpts = { path: "/", httpOnly: true, sameSite: "lax" as const, maxAge: 60 * 60 * 24 * 7 };

  if (tokens.id_token) {
    redirect.cookies.set("id_token", tokens.id_token, cookieOpts);
  }
  if (tokens.access_token) {
    redirect.cookies.set("access_token", tokens.access_token, cookieOpts);
  }
  if (tokens.refresh_token) {
    redirect.cookies.set("refresh_token", tokens.refresh_token, { ...cookieOpts, maxAge: 60 * 60 * 24 * 30 });
  }

  return redirect;
}
