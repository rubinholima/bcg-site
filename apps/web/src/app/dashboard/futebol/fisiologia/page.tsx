"use client";

import { FisiologiaShell } from "@/components/dashboard/fisiologia/FisiologiaShell";
import { FisiologiaHubCards } from "@/components/dashboard/fisiologia/FisiologiaHubCards";

export default function FisiologiaHubPage() {
  return (
    <FisiologiaShell title="Fisiologia">
      <FisiologiaHubCards />
    </FisiologiaShell>
  );
}
