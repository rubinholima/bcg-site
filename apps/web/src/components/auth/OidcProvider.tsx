"use client";

import { AuthProvider as OidcAuthProvider } from "react-oidc-context";

const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
const cognitoDomain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN ?? "";

// Obrigatório: usar domínio do Hosted UI. NUNCA usar cognito-idp.*.amazonaws.com no frontend.
const authority = cognitoDomain;
const redirect_uri = `${appUrl.replace(/\/$/, "")}/auth/callback`;

const cognitoOidcConfig = {
  authority,
  client_id: clientId ?? "",
  redirect_uri,
  response_type: "code" as const,
  scope: "openid email profile",
  post_logout_redirect_uri: appUrl,
  onSigninCallback: () => {
    if (typeof window !== "undefined") {
      window.history.replaceState({}, document.title, window.location.pathname);
      window.location.href = "/dashboard";
    }
  },
};

export function OidcProvider({ children }: { children: React.ReactNode }) {
  if (!cognitoDomain || !clientId) {
    return <>{children}</>;
  }
  return (
    <OidcAuthProvider {...cognitoOidcConfig}>
      {children}
    </OidcAuthProvider>
  );
}
