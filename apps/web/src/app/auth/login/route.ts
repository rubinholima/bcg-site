import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MAX_STATE_LENGTH = 500;

/** Fallbacks when process.env is not available (Cognito domain and Client ID are public). */
const COGNITO_DOMAIN_FALLBACK = "https://us-east-1etlo1rsa7.auth.us-east-1.amazoncognito.com";
const COGNITO_CLIENT_ID_FALLBACK = "7j0lpgtmi1571iu007fscgkinp";

function isValidInternalPath(value: string | null | undefined): boolean {
  if (value == null || value.length > MAX_STATE_LENGTH) return false;
  if (!value.startsWith("/") || value.startsWith("//")) return false;
  if (value.includes("://") || value.includes("\\")) return false;
  return true;
}

/** Obtém a origem correta em produção (atrás de Nginx/CloudFront). */
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

/**
 * GET /auth/login?next=/dashboard
 * Redireciona (302) para o Cognito Hosted UI.
 * Rota no Next (fora de /api) para que Nginx não envie ao backend — em produção
 * location /api/ -> backend; location / -> Next.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const nextParam = searchParams.get("next")?.trim();
    const state = isValidInternalPath(nextParam) ? nextParam : "/dashboard";

    const cognitoDomainRaw =
      process.env.COGNITO_DOMAIN ||
      process.env.NEXT_PUBLIC_COGNITO_DOMAIN ||
      COGNITO_DOMAIN_FALLBACK;
    let cognitoDomain = cognitoDomainRaw.startsWith("http")
      ? cognitoDomainRaw.replace(/\/$/, "")
      : `https://${cognitoDomainRaw.replace(/\/$/, "")}`;
    if (cognitoDomain.includes("bostoncitygroup.auth.")) {
      cognitoDomain = COGNITO_DOMAIN_FALLBACK;
    }
    const clientId =
      process.env.COGNITO_CLIENT_ID ||
      process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ||
      COGNITO_CLIENT_ID_FALLBACK;
    const scopes =
      process.env.COGNITO_SCOPE ||
      process.env.COGNITO_SCOPES ||
      process.env.NEXT_PUBLIC_COGNITO_SCOPES ||
      "openid email profile";
    const responseType = process.env.COGNITO_RESPONSE_TYPE || "code";

    const origin =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      getRequestOrigin(request).replace(/\/$/, "");
    const redirectUri = `${origin}/api/auth/callback`;

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: responseType,
      scope: scopes,
      redirect_uri: redirectUri,
      state: state ?? "/dashboard",
    });

    const authorizeUrl = `${cognitoDomain}/oauth2/authorize?${params.toString()}`;
    const res = NextResponse.redirect(authorizeUrl, 302);
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (err) {
    console.error("[auth/login] error:", err);
    const fallbackOrigin =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      getRequestOrigin(request).replace(/\/$/, "");
    return NextResponse.redirect(
      new URL("/login?error=auth", fallbackOrigin),
      302,
    );
  }
}
