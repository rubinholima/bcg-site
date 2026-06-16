"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
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
import { Loader2 } from "lucide-react";
import { PLATFORM_LOGO_SRC, PLATFORM_TAGLINE } from "@/lib/platform-branding";

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next")?.trim() || "/dashboard";
  const errorParam = searchParams.get("error");
  const hintParam = searchParams.get("hint");
  const authApiUrl = (typeof process.env.NEXT_PUBLIC_AUTH_API_URL === "string" && process.env.NEXT_PUBLIC_AUTH_API_URL.trim()) || "";
  const loginAction = authApiUrl ? authApiUrl.replace(/\/$/, "") + "/api/auth/login" : "/api/auth/login";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    errorParam === "invalid"
      ? hintParam || "Usuário ou senha incorretos."
      : errorParam === "missing"
        ? "Preencha usuário e senha."
        : errorParam === "server"
          ? hintParam || "Erro ao conectar. Tente novamente."
          : null
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const usernameEl = form.elements.namedItem("username") as HTMLInputElement | null;
    const passwordEl = form.elements.namedItem("password") as HTMLInputElement | null;
    const username = usernameEl?.value?.trim() ?? "";
    const password = passwordEl?.value ?? "";
    if (!username || !password) {
      setError("Preencha usuário e senha.");
      return;
    }
    if (authApiUrl) {
      form.action = loginAction;
      form.submit();
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, next }),
        credentials: "include",
      });
      window.location.href = res.url;
    } catch {
      setLoading(false);
      form.submit();
    }
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-8">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/login-platform-bg.jpg)" }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-950/88 via-emerald-950/75 to-zinc-950/90" aria-hidden />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_40%,rgba(245,158,11,0.12),transparent)] pointer-events-none" aria-hidden />
      <div className="relative w-full max-w-[420px] rounded-2xl border-[3px] border-amber-400/90 p-[2px] shadow-2xl shadow-black/50">
        <Card className="rounded-[calc(1rem-2px)] border border-white/90 shadow-none bg-zinc-900/95 backdrop-blur-sm">
          <CardHeader className="space-y-4 pb-4 text-center">
            <div className="mx-auto flex flex-col items-center gap-3">
              <img
                src={PLATFORM_LOGO_SRC}
                alt="CUP360"
                width={88}
                height={88}
                className="h-[88px] w-[88px] rounded-2xl object-contain shadow-lg shadow-black/40 ring-1 ring-amber-500/25"
              />
              <p className="text-sm font-medium tracking-[0.2em] text-amber-400/90 uppercase">
                {PLATFORM_TAGLINE}
              </p>
            </div>
            <div>
              <CardTitle className="text-2xl font-semibold tracking-tight text-zinc-100">
                Entrar
              </CardTitle>
              <CardDescription className="mt-1.5 text-zinc-400">
                Área restrita da plataforma
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <form
              id="login-form"
              method="POST"
              action={loginAction}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <input type="hidden" name="next" value={next} />
              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
                >
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-zinc-300">
                  Usuário
                </Label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  placeholder="seu.usuario"
                  defaultValue=""
                  className="bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-amber-500/50"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-zinc-300">
                  Senha
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  defaultValue=""
                  className="bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-amber-500/50"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full h-11 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-medium"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 bg-zinc-950">
          <div className="text-zinc-500">Carregando…</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
