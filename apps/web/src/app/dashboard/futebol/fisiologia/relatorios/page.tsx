"use client";

import { Suspense } from "react";
import { FisiologiaShell } from "@/components/dashboard/fisiologia/FisiologiaShell";
import { FisiologiaRelatorioPanel } from "@/components/dashboard/fisiologia/FisiologiaRelatorioPanel";

export default function FisiologiaRelatoriosPage() {
  return (
    <FisiologiaShell title="Relatórios">
      <Suspense fallback={null}>
        <FisiologiaRelatorioPanel />
      </Suspense>
    </FisiologiaShell>
  );
}
