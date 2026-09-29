"use client";

import { FisiologiaCargaPanel } from "@/components/dashboard/fisiologia/FisiologiaCargaPanel";
import { PrepFisicaShell } from "@/components/dashboard/futebol/prep-fisica/PrepFisicaShell";

export default function PrepFisicaCargaPage() {
  return (
    <PrepFisicaShell title="Carga / Performance">
      <FisiologiaCargaPanel />
    </PrepFisicaShell>
  );
}
