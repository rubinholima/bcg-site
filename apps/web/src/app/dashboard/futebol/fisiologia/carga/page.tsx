"use client";

import { FisiologiaShell } from "@/components/dashboard/fisiologia/FisiologiaShell";
import { FisiologiaCargaPanel } from "@/components/dashboard/fisiologia/FisiologiaCargaPanel";

export default function FisiologiaCargaPage() {
  return (
    <FisiologiaShell title="Carga e GPS">
      <FisiologiaCargaPanel />
    </FisiologiaShell>
  );
}
