"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function RelatoriosHubRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hub = searchParams.get("hub");

  useEffect(() => {
    if (hub === "futebol") router.replace("/dashboard/relatorios/futebol");
    if (hub === "adm") router.replace("/dashboard/relatorios/adm");
    if (hub === "saude") router.replace("/dashboard/relatorios/saude");
  }, [hub, router]);

  return (
    <div className="flex items-center justify-center py-12">
      <p className="text-muted-foreground">Redirecionando…</p>
    </div>
  );
}

export default function RelatoriosPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      }
    >
      <RelatoriosHubRedirect />
    </Suspense>
  );
}
