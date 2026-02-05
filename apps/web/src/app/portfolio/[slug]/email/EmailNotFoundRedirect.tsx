"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

/**
 * Quando a página do tenant não existe, tenta redirecionar para o login do WorkMail
 * (o tenant pode existir e ter e-mail configurado mesmo sem página de portfólio).
 */
export function EmailNotFoundRedirect({ slug }: { slug: string }) {
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (!slug?.trim()) {
      setTried(true);
      return;
    }
    let cancelled = false;
    fetch(`/api/public/workmail-web-url?slug=${encodeURIComponent(slug)}`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data: { url?: string | null }) => {
        if (cancelled) return;
        const url = data?.url?.trim();
        if (url) {
          window.location.href = url;
          return;
        }
        setTried(true);
      })
      .catch(() => {
        if (!cancelled) setTried(true);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (!tried) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-zinc-950 text-zinc-100">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
        <p className="text-zinc-400">Redirecionando para o e-mail…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-100">
      <p>Página não encontrada.</p>
      <Link href="/" className="ml-2 text-amber-400 hover:underline">
        ← Home
      </Link>
    </div>
  );
}
