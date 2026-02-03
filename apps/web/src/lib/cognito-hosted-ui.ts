/**
 * URLs do Cognito Hosted UI.
 * Nenhum fetch no browser — apenas montagem de URL para redirect.
 */

const cognitoDomain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN ?? "";
const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? "";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export function getHostedUiLoginUrl(state?: string): string {
  const redirectUri = `${appUrl.replace(/\/$/, "")}/api/auth/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    scope: "openid offline_access",
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
