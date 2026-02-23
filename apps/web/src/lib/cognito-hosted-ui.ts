/**
 * URLs do Cognito Hosted UI.
 * Nenhum fetch no browser — apenas montagem de URL para redirect.
 *
 * Scopes: por padrão "openid email phone" (compatível com App Client bcg-platform-web).
 * Para refresh_token, use NEXT_PUBLIC_COGNITO_SCOPES=openid offline_access (requer offline_access no Cognito).
 */

const COGNITO_DOMAIN_FALLBACK = "https://us-east-1etlo1rsa7.auth.us-east-1.amazoncognito.com";
const cognitoDomainRaw = process.env.NEXT_PUBLIC_COGNITO_DOMAIN ?? "";
const cognitoDomainResolved = cognitoDomainRaw.startsWith("http")
  ? cognitoDomainRaw.replace(/\/$/, "")
  : cognitoDomainRaw
    ? `https://${cognitoDomainRaw.replace(/\/$/, "")}`
    : COGNITO_DOMAIN_FALLBACK;
const cognitoDomain = cognitoDomainResolved.includes("bostoncitygroup.auth.")
  ? COGNITO_DOMAIN_FALLBACK
  : cognitoDomainResolved;
const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? "";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const scopes = process.env.NEXT_PUBLIC_COGNITO_SCOPES ?? "openid email phone";

export function getHostedUiLoginUrl(state?: string): string {
  // Browser: origem atual (login já redireciona para canônico em /login). Servidor: appUrl.
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : (appUrl && !appUrl.includes("localhost") ? appUrl : "http://localhost:3000").replace(/\/$/, "");
  const redirectUri = `${base.replace(/\/$/, "")}/api/auth/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    scope: scopes,
    redirect_uri: redirectUri,
  });
  if (state) params.set("state", state);
  return `${cognitoDomain}/oauth2/authorize?${params.toString()}`;
}

/** URL para onde o usuário vai após o logout (nossa tela de login). */
export function getHostedUiLogoutUrl(): string {
  const logoutRedirect = `${appUrl.replace(/\/$/, "")}/login`;
  const params = new URLSearchParams({
    client_id: clientId,
    logout_uri: logoutRedirect,
  });
  return `${cognitoDomain}/logout?${params.toString()}`;
}

export function isCognitoConfigured(): boolean {
  return Boolean(cognitoDomain && clientId);
}
