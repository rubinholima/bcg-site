"use client";

import { BarChart3, Video } from "lucide-react";
import { HubDashboardPage } from "@/components/dashboard/HubDashboardPage";

const LINKS = [
  {
    title: "Análise de vídeo",
    description: "Vídeos e imagens de jogo — passes, mapas de calor e recortes táticos.",
    href: "/dashboard/futebol/analise-desempenho/video",
    icon: Video,
    moduleSlug: "futebol_analise_desempenho",
  },
  {
    title: "Métricas de atletas",
    description: "Indicadores e métricas de desempenho por atleta.",
    href: "/dashboard/futebol/analise",
    icon: BarChart3,
    moduleSlug: "futebol_analise",
  },
] as const;

export default function FutebolAnaliseDesempenhoHubPage() {
  return (
    <HubDashboardPage
      section="Depto Futebol"
      sectionIcon={Video}
      title="Análise e desempenho"
      subtitle="Análise de vídeo e imagens do jogo — departamento separado de Performance."
      hubId="futebol"
      links={[...LINKS]}
    />
  );
}
