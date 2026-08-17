"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import type { CoachContextResponse } from "@/lib/treinadores-types";
import { TreinadoresFilters } from "./TreinadoresFilters";
import { TreinadoresInformacoesTab } from "./TreinadoresInformacoesTab";
import { TreinadoresPosJogoTab } from "./TreinadoresPosJogoTab";
import { TreinadoresTreinosTab } from "./TreinadoresTreinosTab";
import { CoachTeamReportPanel } from "./CoachTeamReportPanel";

export function TreinadoresDashboard() {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get("tenantId") ?? "";
  const category = searchParams.get("category") ?? undefined;
  const tab = searchParams.get("tab") ?? "informacoes";

  const [context, setContext] = useState<CoachContextResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchContext = useCallback(async (cancelRef?: { cancelled: boolean }) => {
    if (!tenantId) {
      setContext(null);
      setLoadError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    const params = new URLSearchParams({ tenantId });
    if (category) params.set("category", category);

    try {
      const { data } = await api.get<CoachContextResponse>(`/futebol-treinadores/context?${params}`);
      if (!cancelRef?.cancelled) {
        setContext(data);
        setLoadError(null);
      }
    } catch (err) {
      if (!cancelRef?.cancelled) {
        setContext(null);
        setLoadError(err instanceof Error ? err.message : "Não foi possível carregar as informações.");
      }
    } finally {
      if (!cancelRef?.cancelled) setLoading(false);
    }
  }, [tenantId, category]);

  useEffect(() => {
    const cancelRef = { cancelled: false };
    void fetchContext(cancelRef);
    return () => {
      cancelRef.cancelled = true;
    };
  }, [fetchContext]);

  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <TreinadoresFilters />
      </Suspense>

      {!tenantId ? (
        <p className="text-sm text-muted-foreground">Selecione um clube para continuar.</p>
      ) : tab === "pos-jogo" ? (
        <TreinadoresPosJogoTab
          tenantId={tenantId}
          category={category}
          contextLoading={loading}
          context={context}
        />
      ) : tab === "treinos" ? (
        <TreinadoresTreinosTab tenantId={tenantId} category={category} context={context} />
      ) : tab === "relatorio-equipe" ? (
        <CoachTeamReportPanel
          tenantId={tenantId}
          category={category}
          contextLoading={loading}
          context={context}
        />
      ) : (
        <TreinadoresInformacoesTab
          tenantId={tenantId}
          category={category}
          loading={loading}
          loadError={loadError}
          context={context}
          onRefresh={() => void fetchContext()}
        />
      )}
    </div>
  );
}
