/**
 * URLs do Cognito Hosted UI.
 * Nenhum fetch no browser — apenas montagem de URL para redirect.
 */

const cognitoDomain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN ?? "";
const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? "";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export function getHostedUiLoginUrl(): string {
  const redirectUri = `${appUrl.replace(/\/$/, "")}/api/auth/callback`;
  // Scope: use "openid" (mínimo). Se no App Client estiverem habilitados email/profile, pode usar "openid email profile".
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    scope: "openid",
    redirect_uri: redirectUri,
  });
  return `${cognitoDomain}/oauth2/authorize?${params.toString()}`;
}

export function getHostedUiLogoutUrl(): string {
  const params = new URLSearchParams({
    client_id: clientId,
    logout_uri: appUrl,
  });
  return `${cognitoDomain}/logout?${params.toString()}`;
}

export function isCognitoConfigured(): boolean {
  return Boolean(cognitoDomain && clientId);
}
