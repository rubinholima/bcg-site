"use client";

import { FisiologiaShell } from "@/components/dashboard/fisiologia/FisiologiaShell";
import { FisiologiaAvaliacoesPanel } from "@/components/dashboard/fisiologia/FisiologiaAvaliacoesPanel";

export default function FisiologiaAvaliacoesPage() {
  return (
    <FisiologiaShell title="Avaliações físicas">
      <FisiologiaAvaliacoesPanel />
    </FisiologiaShell>
  );
}
