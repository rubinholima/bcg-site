"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getCallbackOrigin } from "@/lib/cognito-hosted-ui";

/**
 * Cognito redireciona para /auth/callback?code=xxx&state=yyy.
 * O code fica na URL no browser (não se perde com proxy/redirect).
 * Enviamos por POST para a API trocar por tokens e definir cookies.
 */
function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");

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

    const origin = getCallbackOrigin().replace(/\/$/, "");
    const redirectUri = `${origin}/auth/callback`;
    fetch("/api/auth/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, state: state ?? undefined, redirect_uri: redirectUri }),
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data: { redirect?: string; error?: string; cognitoError?: string }) => {
        if (data.redirect) {
          setStatus("done");
          window.location.replace(data.redirect);
        } else {
          setStatus("error");
          const hint = data.cognitoError ? `&hint=${encodeURIComponent(data.cognitoError.slice(0, 120))}` : "";
          window.location.replace(`/login?error=${data.error ?? "auth"}${hint}`);
        }
      })
      .catch(() => {
        setStatus("error");
        window.location.replace("/login?error=auth");
      });
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground">
        {status === "loading" && "Concluindo login…"}
        {status === "done" && "Redirecionando…"}
        {status === "error" && "Erro. Redirecionando…"}
      </p>
    </div>
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
      <AuthCallbackContent />
    </Suspense>
  );
}
