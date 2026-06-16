"use client";

import { Suspense, useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Check, Loader2 } from "lucide-react";
import {
  validateCognitoPassword,
  getPasswordRequirementChecks,
} from "@/lib/passwordPolicy";
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
import { cn } from "@/lib/utils";

function parseApiError(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "Erro ao definir senha.";
  try {
    const data = JSON.parse(trimmed) as { message?: string | string[] };
    if (Array.isArray(data.message)) return data.message.join("; ");
    if (typeof data.message === "string") return data.message;
  } catch {
    /* texto puro */
  }
  return trimmed.length > 200 ? "Erro ao definir senha." : trimmed;
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  show,
  onToggleShow,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-zinc-300">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          required
          minLength={8}
          className="bg-zinc-800/50 border-zinc-700 pr-11 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-amber-500/50"
          autoComplete={id === "newPassword" ? "new-password" : "new-password"}
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-zinc-400 hover:text-zinc-200"
          aria-label={show ? "Ocultar senha" : "Mostrar senha"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function PasswordRequirementsProgress({ password }: { password: string }) {
  const checks = useMemo(() => getPasswordRequirementChecks(password), [password]);
  const metCount = checks.filter((c) => c.met).length;
  const pct = Math.round((metCount / checks.length) * 100);

  return (
    <div className="space-y-3 rounded-lg border border-zinc-700/80 bg-zinc-900/50 p-3">
      <div className="flex items-center justify-between gap-2 text-xs text-zinc-400">
        <span>Força da senha</span>
        <span className="font-medium text-zinc-300">{metCount}/{checks.length}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            pct === 100 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : "bg-amber-600/70",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <ul className="space-y-1.5">
        {checks.map((c) => (
          <li
            key={c.id}
            className={cn(
              "flex items-start gap-2 text-xs",
              c.met ? "text-emerald-400" : "text-zinc-500",
            )}
          >
            <Check className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", !c.met && "opacity-30")} />
            <span>{c.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AuthScreenBackdrop() {
  return (
    <>
      <div
        className="absolute inset-0 scale-[1.08] bg-cover bg-center bg-no-repeat opacity-[0.22] blur-[2px] saturate-[0.75]"
        style={{ backgroundImage: "url(/login-platform-bg.jpg)" }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-zinc-950/82" aria-hidden />
      <div
        className="absolute inset-0 bg-gradient-to-br from-zinc-950/95 via-emerald-950/88 to-zinc-950/96"
        aria-hidden
      />
    </>
  );
}

function ChangePasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next")?.trim() || "/dashboard";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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
        throw new Error(parseApiError(await res.text()));
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
      <div className="relative flex min-h-dvh items-center justify-center px-4">
        <AuthScreenBackdrop />
        <p className="relative text-zinc-400">Carregando…</p>
      </div>
    );
  }

  const passwordsMatch =
    confirmPassword.length > 0 && newPassword.length > 0 && newPassword === confirmPassword;

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-8">
      <AuthScreenBackdrop />
      <div className="relative w-full max-w-[440px] rounded-2xl border-[3px] border-amber-400/90 p-[2px] shadow-2xl shadow-black/50">
        <Card className="rounded-[calc(1rem-2px)] border border-white/90 bg-zinc-900/95 shadow-none backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-zinc-100">Definir nova senha</CardTitle>
            <CardDescription className="text-zinc-400">
              Primeiro acesso: crie sua senha pessoal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
                >
                  {error}
                </div>
              )}
              <PasswordField
                id="newPassword"
                label="Nova senha *"
                value={newPassword}
                onChange={setNewPassword}
                show={showNew}
                onToggleShow={() => setShowNew((s) => !s)}
              />
              <PasswordRequirementsProgress password={newPassword} />
              <PasswordField
                id="confirmPassword"
                label="Confirmar senha *"
                value={confirmPassword}
                onChange={setConfirmPassword}
                show={showConfirm}
                onToggleShow={() => setShowConfirm((s) => !s)}
              />
              {confirmPassword.length > 0 && (
                <p
                  className={cn(
                    "text-xs",
                    passwordsMatch ? "text-emerald-400" : "text-amber-300",
                  )}
                >
                  {passwordsMatch ? "Senhas coincidem." : "As senhas ainda não coincidem."}
                </p>
              )}
              <Button
                type="submit"
                className="min-h-[44px] w-full bg-amber-600 font-medium text-zinc-950 hover:bg-amber-500"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando…
                  </>
                ) : (
                  "Definir senha e continuar"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ChangePasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="relative flex min-h-dvh items-center justify-center px-4">
          <AuthScreenBackdrop />
          <p className="relative text-zinc-400">Carregando…</p>
        </div>
      }
    >
      <ChangePasswordForm />
    </Suspense>
  );
}
