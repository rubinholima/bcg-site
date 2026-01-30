"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Login OIDC unificado em /login (Hosted UI redirect).
 * Redireciona para a página principal de login.
 */
export default function LoginOidcPage() {
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
