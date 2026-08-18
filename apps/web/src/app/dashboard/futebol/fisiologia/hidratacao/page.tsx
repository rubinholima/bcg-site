"use client";

import { FisiologiaShell } from "@/components/dashboard/fisiologia/FisiologiaShell";
import { FisiologiaHydratacaoPanel } from "@/components/dashboard/fisiologia/FisiologiaHydratacaoPanel";

export default function FisiologiaHidratacaoPage() {
  return (
    <FisiologiaShell title="Hidratação">
      <FisiologiaHydratacaoPanel />
    </FisiologiaShell>
  );
}
