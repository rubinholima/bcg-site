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
      redirect: "manual",
    })
      .then(async (res) => {
        if (res.type === "opaqueredirect" || res.status === 302) {
          const nextPath = state && state.startsWith("/") ? state : "/dashboard";
          setStatus("done");
          window.location.replace(nextPath);
          return;
        }
        const text = await res.text();
        let data: { redirect?: string; error?: string; cognitoError?: string };
        try {
          data = JSON.parse(text) as { redirect?: string; error?: string; cognitoError?: string };
        } catch {
          if (typeof sessionStorage !== "undefined") {
            sessionStorage.setItem("loginErrorReason", `Resposta inválida (${res.status}): não é JSON. Verifique se /api/auth/callback vai para o Next e não para o backend.`);
          }
          window.location.replace("/login?error=auth");
          return;
        }
        if (data.redirect) {
          setStatus("done");
          window.location.replace(data.redirect);
        } else {
          setStatus("error");
          if (data.cognitoError && typeof sessionStorage !== "undefined") {
            sessionStorage.setItem("loginErrorReason", data.cognitoError);
          }
          window.location.replace(`/login?error=${data.error ?? "auth"}`);
        }
      })
      .catch(() => {
        setStatus("error");
        if (typeof sessionStorage !== "undefined") {
          sessionStorage.setItem("loginErrorReason", "Falha de rede ao chamar /api/auth/callback. Verifique Nginx: /api/auth/ deve ir para o Next (porta 3000).");
        }
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
