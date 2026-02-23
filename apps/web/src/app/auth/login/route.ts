import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MAX_STATE_LENGTH = 500;

/** Fallbacks when process.env is not available (Cognito domain and Client ID are public). */
const COGNITO_DOMAIN_FALLBACK = "https://bostoncitygroup.auth.us-east-1.amazoncognito.com";
const COGNITO_CLIENT_ID_FALLBACK = "7j0lpgtmi1571iu007fscgkinp";

function isValidInternalPath(value: string | null | undefined): boolean {
  if (value == null || value.length > MAX_STATE_LENGTH) return false;
  if (!value.startsWith("/") || value.startsWith("//")) return false;
  if (value.includes("://") || value.includes("\\")) return false;
  return true;
}

/**
 * GET /auth/login?next=/dashboard
 * Redireciona (302) para o Cognito Hosted UI.
 * Rota no Next (fora de /api) para que Nginx não envie ao backend — em produção
 * location /api/ -> backend; location / -> Next.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const nextParam = searchParams.get("next")?.trim();
  const state = isValidInternalPath(nextParam) ? nextParam : "/dashboard";

  const cognitoDomain =
    process.env.COGNITO_DOMAIN ||
    process.env.NEXT_PUBLIC_COGNITO_DOMAIN ||
    COGNITO_DOMAIN_FALLBACK;
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

  const origin = request.nextUrl.origin;
  const redirectUri = `${origin.replace(/\/$/, "")}/api/auth/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: responseType,
    scope: scopes,
    redirect_uri: redirectUri,
    state: state ?? "/dashboard",
  });

  const authorizeUrl = `${cognitoDomain.replace(/\/$/, "")}/oauth2/authorize?${params.toString()}`;
  const res = NextResponse.redirect(authorizeUrl, 302);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
