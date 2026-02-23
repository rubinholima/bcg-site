import { NextRequest, NextResponse } from "next/server";

const COGNITO_DOMAIN_FALLBACK = "https://us-east-1etlo1rsa7.auth.us-east-1.amazoncognito.com";
const CLIENT_ID_FALLBACK = "7j0lpgtmi1571iu007fscgkinp";

function getCognitoDomain(): string {
  const raw = process.env.NEXT_PUBLIC_COGNITO_DOMAIN ?? process.env.COGNITO_DOMAIN ?? "";
  const resolved = raw.startsWith("http") ? raw.replace(/\/$/, "") : raw ? `https://${raw.replace(/\/$/, "")}` : COGNITO_DOMAIN_FALLBACK;
  return resolved.includes("bostoncitygroup.auth.") ? COGNITO_DOMAIN_FALLBACK : resolved;
}

function getClientId(): string {
  return process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? process.env.COGNITO_CLIENT_ID ?? CLIENT_ID_FALLBACK;
}

const MAX_STATE_LENGTH = 500;

function isValidInternalPath(value: string | null): value is string {
  if (value == null || value.length > MAX_STATE_LENGTH) return false;
  if (!value.startsWith("/") || value.startsWith("//")) return false;
  if (value.includes("://") || value.includes("\\")) return false;
  return true;
}

/** Origem correta em produção (atrás de Nginx/CloudFront). */
function getRequestOrigin(request: NextRequest): string {
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim()?.toLowerCase() ||
    request.headers.get("cloudfront-viewer-protocol")?.split(",")[0]?.trim()?.toLowerCase() ||
    "https";
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host") ||
    request.nextUrl.host;
  if (host && (proto === "https" || proto === "http")) {
    return `${proto}://${host}`;
  }
  return request.nextUrl.origin;
}

async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
  cognitoDomain: string,
  clientId: string
): Promise<{ id_token?: string; access_token?: string; refresh_token?: string; expires_in?: number } | null> {
  const tokenUrl = `${cognitoDomain}/oauth2/token`;
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    code,
    redirect_uri: redirectUri,
  });
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("[auth/callback] token exchange failed", res.status, text, "redirect_uri:", redirectUri);
    return null;
  }
  return (await res.json()) as { id_token?: string; access_token?: string; refresh_token?: string; expires_in?: number };
}

function applyTokenCookies(
  response: NextResponse,
  tokens: { id_token?: string; access_token?: string; refresh_token?: string },
  origin: string
) {
  const isLocalhost = origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1");
  const cookieOpts = {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7,
    secure: !isLocalhost,
  };
  if (tokens.id_token) response.cookies.set("id_token", tokens.id_token, cookieOpts);
  if (tokens.access_token) response.cookies.set("access_token", tokens.access_token, cookieOpts);
  if (tokens.refresh_token) {
    response.cookies.set("refresh_token", tokens.refresh_token, { ...cookieOpts, maxAge: 60 * 60 * 24 * 30 });
  }
}

/**
 * GET: callback direto (Cognito -> /api/auth/callback). Mantido por compat.
 * POST: página /auth/callback envia code no body; evita proxy/Nginx cortar ?code=...
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDesc = searchParams.get("error_description") ?? "";

  const cognitoDomain = getCognitoDomain();
  const clientId = getClientId();
  const requestOrigin = getRequestOrigin(request).replace(/\/$/, "");

  if (error) {
    const errParam = errorDesc.includes("invalid_scope") ? "invalid_scope" : "auth";
    return NextResponse.redirect(new URL(`/login?error=${errParam}`, requestOrigin));
  }

  if (!code || !cognitoDomain || !clientId) {
    console.error("[auth/callback] GET missing code or config", { hasCode: !!code, hasDomain: !!cognitoDomain, hasClientId: !!clientId });
    return NextResponse.redirect(new URL("/login?error=missing", requestOrigin));
  }

  const redirectUri = `${requestOrigin}/auth/callback`;
  const tokens = await exchangeCodeForTokens(code, redirectUri, cognitoDomain, clientId);
  if (!tokens) return NextResponse.redirect(new URL("/login?error=auth", requestOrigin));

  const state = searchParams.get("state");
  const nextPath = isValidInternalPath(state) ? state : "/dashboard";
  const redirect = NextResponse.redirect(new URL(nextPath, requestOrigin));
  applyTokenCookies(redirect, tokens, requestOrigin);
  return redirect;
}

/**
 * POST: recebe { code, state?, redirect_uri } do cliente (página /auth/callback).
 * O code vem da URL no browser; assim não se perde com redirect/proxy.
 */
export async function POST(request: NextRequest) {
  const cognitoDomain = getCognitoDomain();
  const clientId = getClientId();
  const requestOrigin = getRequestOrigin(request).replace(/\/$/, "");

  let body: { code?: string; state?: string; redirect_uri?: string };
  try {
    body = (await request.json()) as { code?: string; state?: string; redirect_uri?: string };
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const code = body.code?.trim();
  const redirectUri = (body.redirect_uri ?? "").replace(/\/$/, "") || `${requestOrigin}/auth/callback`;

  if (!code || !cognitoDomain || !clientId) {
    console.error("[auth/callback] POST missing code or config", { hasCode: !!code });
    return NextResponse.json({ error: "missing", redirect: "/login?error=missing" });
  }

  const tokens = await exchangeCodeForTokens(code, redirectUri, cognitoDomain, clientId);
  if (!tokens) {
    return NextResponse.json({ error: "auth", redirect: "/login?error=auth" });
  }

  const nextPath = isValidInternalPath(body.state ?? null) ? body.state! : "/dashboard";
  const res = NextResponse.json({ redirect: nextPath });
  applyTokenCookies(res, tokens, requestOrigin);
  return res;
}
