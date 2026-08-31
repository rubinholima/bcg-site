"use client";

import { FisiologiaShell } from "@/components/dashboard/fisiologia/FisiologiaShell";
import { FisiologiaTransicoesPanel } from "@/components/dashboard/fisiologia/FisiologiaTransicoesPanel";

export default function FisiologiaTransicoesPage() {
  return (
    <FisiologiaShell title="Atletas em Transição">
      <FisiologiaTransicoesPanel />
    </FisiologiaShell>
  );
}
