"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CognitoUser } from "amazon-cognito-identity-js";
import { validateCognitoPassword, getPasswordRequirementLabels } from "@/lib/passwordPolicy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noUser, setNoUser] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && !(window as any)["__cognitoChallengeUser"]) {
      setNoUser(true);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const user = typeof window !== "undefined" ? (window as any)["__cognitoChallengeUser"] : undefined;
    if (!user) {
      setError("Sessão expirada. Faça login novamente.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    const validation = validateCognitoPassword(newPassword);
    if (!validation.valid) {
      setError(
        validation.unmet?.length
          ? `Requisitos não atendidos: ${validation.unmet.join("; ")}.`
          : validation.message ?? "A senha não atende aos requisitos."
      );
      return;
    }
    setLoading(true);
    try {
      const requiredAttrs = (window as any)["__cognitoChallengeRequiredAttrs"] || {};
      await new Promise<void>((resolve, reject) => {
        (user as CognitoUser).completeNewPasswordChallenge(
          newPassword,
          requiredAttrs,
          {
            onSuccess: () => resolve(),
            onFailure: (err) => reject(err),
          }
        );
      });
      delete (window as any)["__cognitoChallengeUser"];
      delete (window as any)["__cognitoChallengeRequiredAttrs"];
      router.replace("/dashboard");
    } catch (err: unknown) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: string }).code)
          : "";
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Erro ao definir senha";
      if (code === "InvalidPasswordException" || message.includes("Password"))
        setError("A senha não atende às regras do Cognito. Verifique: mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 número e 1 caractere especial.");
      else setError(message);
    } finally {
      setLoading(false);
    }
  }

  if (noUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sem sessão</CardTitle>
            <CardDescription>
              Não há solicitação de nova senha. Faça login novamente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.replace("/login")}
            >
              Ir para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Definir nova senha</CardTitle>
          <CardDescription className="space-y-1">
            <span className="block">Primeiro login: defina uma senha permanente.</span>
            <span className="block text-xs text-muted-foreground mt-1">
              Requisitos: {getPasswordRequirementLabels().join("; ")}.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-sm px-3 py-2 rounded-md bg-destructive/10 border border-destructive/20 text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova senha *</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar senha *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Salvando…" : "Definir senha e entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
