"use client";

import { BarChart3, Gauge, Star } from "lucide-react";
import { HubDashboardPage } from "@/components/dashboard/HubDashboardPage";

const LINKS = [
  {
    title: "Avaliações",
    description: "Avaliações institucionais dos atletas.",
    href: "/dashboard/futebol/avaliacoes",
    icon: Star,
    moduleSlug: "diretoria",
  },
  {
    title: "Desempenho",
    description: "Métricas e análise de performance esportiva.",
    href: "/dashboard/futebol/analise",
    icon: BarChart3,
    moduleSlug: "futebol_analise",
  },
] as const;

export default function FutebolPerformanceHubPage() {
  return (
    <HubDashboardPage
      section="Depto Futebol"
      sectionIcon={Gauge}
      title="Performance"
      subtitle="Avaliações, desempenho e indicadores de performance esportiva."
      hubId="futebol"
      links={[...LINKS]}
    />
  );
}
