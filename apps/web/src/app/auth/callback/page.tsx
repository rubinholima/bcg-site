"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { getCallbackOrigin } from "@/lib/cognito-hosted-ui";

/**
 * Cognito redireciona para /auth/callback?code=xxx&state=yyy.
 * Form POST (não fetch) para garantir que cookies sejam enviados no redirect.
 * Navegação completa do browser — sem fetch que pode falhar com cookies.
 */
function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const error = searchParams.get("error");
    const errorDesc = searchParams.get("error_description") ?? "";
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (error) {
      const errParam = errorDesc.includes("invalid_scope") ? "invalid_scope" : "auth";
      window.location.replace(`/login?error=${errParam}`);
      return;
    }

    if (!code) {
      window.location.replace("/login?error=missing");
      return;
    }

    formRef.current?.submit();
  }, [searchParams]);

  const error = searchParams.get("error");
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (error || !code) return null;

  const origin = getCallbackOrigin().replace(/\/$/, "");
  const redirectUri = `${origin}/auth/callback`;

  return (
    <form
      ref={formRef}
      method="POST"
      action="/api/auth/callback"
      className="hidden"
    >
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="state" value={state ?? ""} />
      <input type="hidden" name="redirect_uri" value={redirectUri} />
    </form>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <p className="text-muted-foreground">Concluindo login…</p>
        </div>
      }
    >
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Concluindo login…</p>
        <AuthCallbackContent />
      </div>
    </Suspense>
  );
}
