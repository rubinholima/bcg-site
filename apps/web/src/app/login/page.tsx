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
import { LogIn, Loader2 } from "lucide-react";

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next")?.trim() || "/dashboard";
  const errorParam = searchParams.get("error");
  const hintParam = searchParams.get("hint");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    errorParam === "invalid"
      ? hintParam || "Email ou senha incorretos."
      : errorParam === "missing"
        ? "Preencha email e senha."
        : errorParam === "server"
          ? hintParam || "Erro ao conectar. Tente novamente."
          : null
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Preencha email e senha.");
      return;
    }
    setLoading(true);
    (document.getElementById("login-form") as HTMLFormElement)?.submit();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,80,40,0.15),transparent)]" />
      <div className="w-full max-w-[420px] relative">
        <Card className="border-zinc-800/80 shadow-2xl shadow-black/30 bg-zinc-900/95 backdrop-blur-sm">
          <CardHeader className="space-y-4 pb-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30">
              <LogIn className="h-7 w-7" />
            </div>
            <div>
              <CardTitle className="text-2xl font-semibold tracking-tight text-zinc-100">
                Entrar
              </CardTitle>
              <CardDescription className="mt-1.5 text-zinc-400">
                Área restrita · Boston City Group
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <form
              id="login-form"
              method="POST"
              action="/api/auth/login"
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
                <Label htmlFor="email" className="text-zinc-300">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
            <p className="text-center text-xs text-zinc-500">
              Altere sua senha no dashboard em Usuários após o primeiro acesso.
            </p>
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
        <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-950">
          <div className="text-zinc-500">Carregando…</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
