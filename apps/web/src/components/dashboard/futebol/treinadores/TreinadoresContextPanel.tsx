"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import type { CoachContextResponse } from "@/lib/treinadores-types";

interface Props {
  children: (props: {
    tenantId: string;
    category?: string;
    context: CoachContextResponse | null;
    contextLoading: boolean;
    loadError: string | null;
    refreshContext: () => void;
  }) => ReactNode;
}

export function TreinadoresContextPanel({ children }: Props) {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get("tenantId") ?? "";
  const category = searchParams.get("category") ?? undefined;

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

  if (!tenantId) {
    return <p className="text-sm text-muted-foreground">Selecione um clube para continuar.</p>;
  }

  return (
    <>
      {children({
        tenantId,
        category,
        context,
        contextLoading: loading,
        loadError,
        refreshContext: () => void fetchContext(),
      })}
    </>
  );
}
