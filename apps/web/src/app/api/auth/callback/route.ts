import { NextRequest, NextResponse } from "next/server";

const cognitoDomain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN ?? "";
const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? "";

const MAX_STATE_LENGTH = 500;

function isValidInternalPath(value: string | null): value is string {
  if (value == null || value.length > MAX_STATE_LENGTH) return false;
  if (!value.startsWith("/") || value.startsWith("//")) return false;
  if (value.includes("://") || value.includes("\\")) return false;
  return true;
}

/**
 * Callback do Cognito Hosted UI.
 * Cognito redireciona aqui com ?code=xxx&state=yyy.
 * Troca o code por tokens no servidor (sem fetch no browser, sem CORS).
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDesc = searchParams.get("error_description") ?? "";

  const requestOrigin = request.nextUrl.origin;

  if (error) {
    const errParam = errorDesc.includes("invalid_scope") ? "invalid_scope" : "auth";
    return NextResponse.redirect(new URL(`/login?error=${errParam}`, requestOrigin));
  }

  if (!code || !cognitoDomain || !clientId) {
    console.error("[auth/callback] missing code or config", { hasCode: !!code, hasDomain: !!cognitoDomain, hasClientId: !!clientId });
    return NextResponse.redirect(new URL("/login?error=missing", requestOrigin));
  }

  // Usa a origem real da requisição (onde o Cognito redirecionou) — evita mismatch com localhost vs 127.0.0.1
  const redirectUri = `${requestOrigin.replace(/\/$/, "")}/api/auth/callback`;
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
    console.error("[auth/callback] redirect_uri usado:", redirectUri, "| requestOrigin:", requestOrigin);
    return NextResponse.redirect(new URL("/login?error=auth", requestOrigin));
  }

  const tokens = (await tokenRes.json()) as {
    id_token?: string;
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };

  const state = searchParams.get("state");
  const nextPath = isValidInternalPath(state) ? state : "/dashboard";
  const redirect = NextResponse.redirect(new URL(nextPath, requestOrigin));
  const isLocalhost = requestOrigin.startsWith("http://localhost") || requestOrigin.startsWith("http://127.0.0.1");
  const cookieOpts = {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7,
    secure: !isLocalhost,
  };

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
