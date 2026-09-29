"use client";

import { FisiologiaAvaliacoesPanel } from "@/components/dashboard/fisiologia/FisiologiaAvaliacoesPanel";
import { PrepFisicaShell } from "@/components/dashboard/futebol/prep-fisica/PrepFisicaShell";

export default function PrepFisicaAvaliacoesPage() {
  return (
    <PrepFisicaShell title="Avaliações físicas">
      <FisiologiaAvaliacoesPanel defaultEvaluatorRole="preparador_fisico" />
    </PrepFisicaShell>
  );
}
