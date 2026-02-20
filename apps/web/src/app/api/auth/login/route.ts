import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MAX_STATE_LENGTH = 500;

function isValidInternalPath(value: string | null | undefined): boolean {
  if (value == null || value.length > MAX_STATE_LENGTH) return false;
  if (!value.startsWith("/") || value.startsWith("//")) return false;
  if (value.includes("://") || value.includes("\\")) return false;
  return true;
}

/**
 * GET /api/auth/login?next=/dashboard
 * Redireciona (302) para o Cognito Hosted UI (oauth2/authorize).
 * Toda a config é lida no server (process.env); nada no client.
 * Em produção, o botão "Entrar" aponta para esta rota para evitar env vars no browser.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const nextParam = searchParams.get("next")?.trim();
  const state = isValidInternalPath(nextParam) ? nextParam : "/dashboard";

  const cognitoDomain =
    process.env.COGNITO_DOMAIN ||
    process.env.NEXT_PUBLIC_COGNITO_DOMAIN ||
    "";
  const clientId =
    process.env.COGNITO_CLIENT_ID ||
    process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ||
    "";
  const scopes =
    process.env.COGNITO_SCOPE ||
    process.env.COGNITO_SCOPES ||
    process.env.NEXT_PUBLIC_COGNITO_SCOPES ||
    "openid email phone";
  const responseType =
    process.env.COGNITO_RESPONSE_TYPE || "code";

  if (!cognitoDomain || !clientId) {
    console.error("[auth/login] missing Cognito config", {
      hasDomain: Boolean(cognitoDomain),
      hasClientId: Boolean(clientId),
    });
    return NextResponse.json(
      {
        error: "Login not configured",
        message:
          "Set COGNITO_DOMAIN and COGNITO_CLIENT_ID (or NEXT_PUBLIC_* equivalents) on the server.",
      },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

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
