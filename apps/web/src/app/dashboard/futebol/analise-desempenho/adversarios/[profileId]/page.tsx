"use client";

import { useParams } from "next/navigation";
import { AnaliseDesempenhoShell } from "@/components/dashboard/futebol/analise-desempenho/AnaliseDesempenhoShell";
import { OpponentProfileWorkspace } from "@/components/dashboard/futebol/analise-desempenho/OpponentProfileWorkspace";
import { useAnaliseDesempenhoQuery } from "@/components/dashboard/futebol/analise-desempenho/AnaliseDesempenhoFilters";

export default function AdversarioProfilePage() {
  const profileId = String(useParams().profileId ?? "");
  const { qs } = useAnaliseDesempenhoQuery();
  const suffix = qs ? `?${qs}` : "";

  return (
    <AnaliseDesempenhoShell title="Adversário">
      <OpponentProfileWorkspace profileId={profileId} querySuffix={suffix} />
    </AnaliseDesempenhoShell>
  );
}
