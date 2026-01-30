"use client";

import { useEffect, useState } from "react";
import { getHostedUiLoginUrl, isCognitoConfigured } from "@/lib/cognito-hosted-ui";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LogIn } from "lucide-react";

/**
 * Login via Cognito Hosted UI.
 * Após logout, o usuário volta para esta tela (nossa página, não a da AWS).
 */
export default function LoginPage() {
  const [hasError, setHasError] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setHasError(params.get("error") === "auth" || params.get("error") === "missing");
  }, [mounted]);

  function handleEntrar() {
    const url = getHostedUiLoginUrl();
    if (!url || !isCognitoConfigured()) return;
    window.location.href = url;
  }

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
            {hasError && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                Não foi possível concluir o login. Verifique seus dados e tente novamente.
              </div>
            )}
            <Button
              className="w-full h-12 text-base font-medium"
              onClick={handleEntrar}
              disabled={!isCognitoConfigured()}
            >
              Entrar
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
