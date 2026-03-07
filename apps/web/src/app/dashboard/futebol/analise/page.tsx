"use client";

import { BarChart3 } from "lucide-react";
import { ModulePlaceholderPage } from "@/components/dashboard/ModulePlaceholderPage";

export default function FutebolAnalisePage() {
  return (
    <ModulePlaceholderPage
      title="Desempenho (análise)"
      description="Análise de desempenho e indicadores"
      moduleSlug="futebol_analise"
      Icon={BarChart3}
      backHref="/dashboard"
    />
  );
}
