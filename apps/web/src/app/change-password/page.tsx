"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { validateCognitoPassword, getPasswordRequirementLabels } from "@/lib/passwordPolicy";
import { authFetch } from "@/lib/authFetch";
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

function ChangePasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next")?.trim() || "/dashboard";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch("/api/me");
        if (!res.ok) {
          if (!cancelled) router.replace(`/login?next=${encodeURIComponent("/change-password")}`);
          return;
        }
        const data = await res.json();
        if (!cancelled && !data.mustChangePassword) {
          router.replace(next.startsWith("/") ? next : "/dashboard");
        }
      } catch {
        if (!cancelled) router.replace("/login");
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, next]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    const validation = validateCognitoPassword(newPassword);
    if (!validation.valid) {
      setError(
        validation.unmet?.length
          ? `Requisitos não atendidos: ${validation.unmet.join("; ")}.`
          : validation.message ?? "A senha não atende aos requisitos.",
      );
      return;
    }
    setLoading(true);
    try {
      const res = await authFetch("/api/me/change-password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Erro ao definir senha");
      }
      router.replace(next.startsWith("/") ? next : "/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao definir senha");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <p className="text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Definir nova senha</CardTitle>
          <CardDescription className="space-y-1">
            <span className="block">Primeiro acesso: crie sua senha pessoal.</span>
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
                className="text-foreground"
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
                className="text-foreground"
              />
            </div>
            <Button type="submit" className="w-full min-h-[44px]" disabled={loading}>
              {loading ? "Salvando…" : "Definir senha e continuar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ChangePasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <p className="text-muted-foreground">Carregando…</p>
        </div>
      }
    >
      <ChangePasswordForm />
    </Suspense>
  );
}
