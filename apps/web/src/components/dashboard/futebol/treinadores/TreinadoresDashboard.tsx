"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import type { CoachContextResponse } from "@/lib/treinadores-types";
import { TreinadoresFilters } from "./TreinadoresFilters";
import { TreinadoresInformacoesTab } from "./TreinadoresInformacoesTab";
import { TreinadoresPosJogoTab } from "./TreinadoresPosJogoTab";
import { TreinadoresTreinosTab } from "./TreinadoresTreinosTab";

export function TreinadoresDashboard() {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get("tenantId") ?? "";
  const category = searchParams.get("category") ?? undefined;
  const tab = searchParams.get("tab") ?? "informacoes";

  const [context, setContext] = useState<CoachContextResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const loadContext = () => {
    if (!tenantId) {
      setContext(null);
      return;
    }
    setLoading(true);
    const params = new URLSearchParams({ tenantId });
    if (category) params.set("category", category);
    api
      .get<CoachContextResponse>(`/futebol-treinadores/context?${params}`)
      .then(({ data }) => setContext(data))
      .catch(() => setContext(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadContext();
  }, [tenantId, category]);

  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <TreinadoresFilters />
      </Suspense>

      {!tenantId ? (
        <p className="text-sm text-muted-foreground">Selecione um clube para continuar.</p>
      ) : tab === "pos-jogo" ? (
        <TreinadoresPosJogoTab tenantId={tenantId} category={category} context={context} />
      ) : tab === "treinos" ? (
        <TreinadoresTreinosTab tenantId={tenantId} category={category} context={context} />
      ) : (
        <TreinadoresInformacoesTab
          tenantId={tenantId}
          category={category}
          loading={loading}
          context={context}
          onRefresh={loadContext}
        />
      )}
    </div>
  );
}
