"use client";

import { getHostedUiLoginUrl, isCognitoConfigured } from "@/lib/cognito-hosted-ui";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Building2 } from "lucide-react";

/**
 * Login via Cognito Hosted UI.
 * Apenas redirect (window.location). Nenhum fetch no browser para Cognito.
 */
export default function LoginPage() {
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const hasError = searchParams?.get("error") === "auth" || searchParams?.get("error") === "missing";

  function handleEntrar() {
    const url = getHostedUiLoginUrl();
    if (!url || !isCognitoConfigured()) return;
    window.location.href = url;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <Building2 className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">
            Boston City Group
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Área restrita
          </p>
        </div>

        <Card className="border-border/80 shadow-xl">
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="text-xl">Login</CardTitle>
            <CardDescription>
              Use o botão abaixo para entrar. Você será redirecionado à tela de autenticação.
              Se for seu primeiro acesso, use a senha temporária e defina uma nova na próxima tela.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {hasError && (
              <div className="text-sm px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
                Falha na autenticação. Tente novamente.
              </div>
            )}
            <Button
              className="w-full h-11 text-base font-medium"
              onClick={handleEntrar}
              disabled={!isCognitoConfigured()}
            >
              Entrar
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Login e troca de senha são feitos de forma segura pelo provedor de identidade.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
