"use client";

import { useParams } from "next/navigation";
import { FisiologiaShell } from "@/components/dashboard/fisiologia/FisiologiaShell";
import { FisiologiaTransicaoDetailPanel } from "@/components/dashboard/fisiologia/FisiologiaTransicaoDetailPanel";

export default function FisiologiaTransicaoDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <FisiologiaShell
      title="Transição do atleta"
      backHref="/dashboard/futebol/fisiologia/transicoes"
      backLabel="Atletas em Transição"
    >
      <FisiologiaTransicaoDetailPanel programId={id} />
    </FisiologiaShell>
  );
}
