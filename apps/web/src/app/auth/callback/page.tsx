"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Callback do Hosted UI é tratado por GET /api/auth/callback.
 * Se alguém acessar /auth/callback diretamente, redireciona para login.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/login");
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground">Redirecionando…</p>
    </div>
  );
}
