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
): Promise<
  | { ok: true; tokens: { id_token?: string; access_token?: string; refresh_token?: string; expires_in?: number } }
  | { ok: false; cognitoError: string }
> {
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
  const text = await res.text();
  if (!res.ok) {
    let cognitoError = text;
    try {
      const j = JSON.parse(text) as { error?: string; error_description?: string };
      cognitoError = j.error_description ?? j.error ?? text;
    } catch {
      // use raw text
    }
    console.error("[auth/callback] token exchange failed", res.status, text, "redirect_uri:", redirectUri);
    return { ok: false, cognitoError };
  }
  const tokens = JSON.parse(text) as { id_token?: string; access_token?: string; refresh_token?: string; expires_in?: number };
  return { ok: true, tokens };
}

function applyTokenCookies(
  response: NextResponse,
  tokens: { id_token?: string; access_token?: string; refresh_token?: string },
  origin: string
) {
  const isLocalhost = origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1");
  const host = origin.replace(/^https?:\/\//, "").split("/")[0] ?? "";
  const domain =
    !isLocalhost && (host === "bostoncitygroup.biz" || host.endsWith(".bostoncitygroup.biz"))
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
  const result = await exchangeCodeForTokens(code, redirectUri, cognitoDomain, clientId);
  if (!result.ok) {
    const hint = encodeURIComponent(result.cognitoError.slice(0, 100));
    return NextResponse.redirect(new URL(`/login?error=auth&hint=${hint}`, requestOrigin));
  }
  const state = searchParams.get("state");
  const nextPath = isValidInternalPath(state) ? state : "/dashboard";
  const redirect = NextResponse.redirect(new URL(nextPath, requestOrigin));
  applyTokenCookies(redirect, result.tokens, requestOrigin);
  return redirect;
}

/**
 * POST: recebe { code, state?, redirect_uri } do cliente (página /auth/callback).
 * O code vem da URL no browser; assim não se perde com redirect/proxy.
 */
export async function POST(request: NextRequest) {
  console.log("[auth/callback] POST received");
  const cognitoDomain = getCognitoDomain();
  const clientId = getClientId();
  const requestOrigin = getRequestOrigin(request).replace(/\/$/, "");

  let body: { code?: string; state?: string; redirect_uri?: string };
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const fd = await request.formData();
    body = {
      code: fd.get("code")?.toString()?.trim(),
      state: fd.get("state")?.toString()?.trim() || undefined,
      redirect_uri: fd.get("redirect_uri")?.toString()?.trim() || undefined,
    };
  } else {
    try {
      body = (await request.json()) as { code?: string; state?: string; redirect_uri?: string };
    } catch {
      console.error("[auth/callback] POST invalid body");
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }
  }

  const code = body.code?.trim();
  const redirectUri = (body.redirect_uri ?? "").replace(/\/$/, "") || `${requestOrigin}/auth/callback`;

  if (!code || !cognitoDomain || !clientId) {
    console.error("[auth/callback] POST missing code or config", { hasCode: !!code });
    return NextResponse.json({ error: "missing", redirect: "/login?error=missing" });
  }

  const result = await exchangeCodeForTokens(code, redirectUri, cognitoDomain, clientId);
  if (!result.ok) {
    console.error("[auth/callback] POST token failed:", result.cognitoError);
    return NextResponse.json({
      error: "auth",
      redirect: "/login?error=auth",
      cognitoError: result.cognitoError,
    });
  }

  const nextPath = isValidInternalPath(body.state ?? null) ? body.state! : "/dashboard";
  console.log("[auth/callback] POST success ->", nextPath);
  const res = NextResponse.redirect(new URL(nextPath, requestOrigin), 302);
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  applyTokenCookies(res, result.tokens, requestOrigin);
  return res;
}
