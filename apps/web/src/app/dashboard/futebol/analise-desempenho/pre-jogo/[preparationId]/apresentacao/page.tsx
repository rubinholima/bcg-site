"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { PreMatchPresentationView } from "@/components/dashboard/futebol/analise-desempenho/PreMatchPresentationView";
import { useAnaliseDesempenhoQuery } from "@/components/dashboard/futebol/analise-desempenho/AnaliseDesempenhoFilters";
import { api } from "@/lib/api";

export default function PreJogoApresentacaoPage() {
  const preparationId = String(useParams().preparationId ?? "");
  const { qs } = useAnaliseDesempenhoQuery();
  const suffix = qs ? `?${qs}` : "";
  const [versionId, setVersionId] = useState<string | null>(null);
  const [title, setTitle] = useState("");

  useEffect(() => {
    api
      .get<{ title: string; versions: Array<{ id: string }> }>(
        `/performance-analysis/pre-match/${preparationId}`,
      )
      .then(({ data }) => {
        setTitle(data.title);
        setVersionId(data.versions[0]?.id ?? null);
      });
  }, [preparationId]);

  if (!versionId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <PreMatchPresentationView
      versionId={versionId}
      preparationId={preparationId}
      querySuffix={suffix}
      titleFallback={title}
    />
  );
}
