"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LogIn } from "lucide-react";

function LoginPageContent() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next")?.trim() || "/dashboard";
  const loginHref = `/auth/login?next=${encodeURIComponent(next)}`;

  const [hasError, setHasError] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [invalidScope, setInvalidScope] = useState(false);

  useEffect(() => {
    const err = searchParams.get("error");
    setHasError(err === "auth" || err === "missing" || err === "invalid_scope");
    setInvalidScope(err === "invalid_scope");
    setSessionExpired(searchParams.get("reason") === "session_expired");
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
      <div className="w-full max-w-[400px]">
        {/* Card central */}
        <Card className="border-border/80 shadow-2xl shadow-black/10 bg-card/95 backdrop-blur-sm">
          <CardHeader className="space-y-3 pb-2 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
              <LogIn className="h-8 w-8" />
            </div>
            <div>
              <CardTitle className="text-2xl font-semibold tracking-tight">
                Entrar
              </CardTitle>
              <CardDescription className="mt-1.5 text-balance">
                Use o botão abaixo. Você será redirecionado para fazer login de forma segura.
                No primeiro acesso, use a senha temporária e defina uma nova.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {sessionExpired && (
              <div
                role="alert"
                className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400"
              >
                Sua sessão expirou. Faça login novamente para continuar.
              </div>
            )}
            {hasError && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive space-y-1"
              >
                <p>
                  {invalidScope
                    ? "A última tentativa falhou por scopes incompatíveis. O app usa agora openid, email, phone. Clique em Entrar novamente ou acesse /login para tentar de novo."
                    : "Não foi possível concluir o login. Verifique seus dados e tente novamente."}
                </p>
                <p className="text-xs opacity-90">
                  Se persistir: Allowed callback URLs no Cognito deve incluir{" "}
                  <code className="bg-black/20 px-1 rounded">
                    {typeof window !== "undefined"
                      ? `${window.location.origin}/api/auth/callback`
                      : "https://www.bostoncitygroup.biz/api/auth/callback"}
                  </code>
                  . Ver <code className="bg-black/20 px-1 rounded">docs/TOKEN_STORAGE.md</code>.
                </p>
              </div>
            )}
            <Button asChild className="w-full h-12 text-base font-medium">
              <a href={loginHref}>Entrar</a>
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Login e senha são tratados de forma segura pelo provedor de identidade.
            </p>
          </CardContent>
        </Card>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Área restrita · Boston City Group
        </p>
      </div>
    </div>
  );
}

/**
 * Login via Cognito Hosted UI.
 * O botão "Entrar" leva a GET /api/auth/login?next=... que responde 302 para o Cognito (server-side).
 * Assim não dependemos de env no browser e o redirect funciona atrás de CloudFront/Nginx.
 */
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
          <div className="w-full max-w-[400px] text-center text-muted-foreground">
            Carregando…
          </div>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
