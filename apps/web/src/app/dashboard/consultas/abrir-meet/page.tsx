"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Página de redirecionamento: abre no nosso domínio para o navegador respeitar
 * posição/tamanho da janela; em seguida redireciona para o Meet.
 * Uso: /dashboard/consultas/abrir-meet?url=https://meet.google.com/...
 */
export default function AbrirMeetPage() {
  const searchParams = useSearchParams();
  const url = searchParams.get("url");

  useEffect(() => {
    if (typeof window === "undefined" || !url) return;
    try {
      const decoded = decodeURIComponent(url);
      if (decoded.startsWith("http://") || decoded.startsWith("https://")) {
        window.location.replace(decoded);
      }
    } catch {
      window.location.replace("/dashboard/consultas");
    }
  }, [url]);

  if (!url) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p>URL não informada.</p>
        <a href="/dashboard/consultas" className="underline mt-2 inline-block">Voltar às consultas</a>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[200px] text-muted-foreground">
      <p>Abrindo o Meet...</p>
    </div>
  );
}
