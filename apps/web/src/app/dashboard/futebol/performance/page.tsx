"use client";

import { Dumbbell, Gauge, Heart, UtensilsCrossed } from "lucide-react";
import { HubDashboardPage } from "@/components/dashboard/HubDashboardPage";

const LINKS = [
  {
    title: "Fisiologista",
    description: "Indicadores fisiológicos, testes e acompanhamento do elenco.",
    href: "/dashboard/futebol/fisiologia",
    icon: Heart,
    moduleSlug: "futebol_fisiologia",
  },
  {
    title: "Preparação física",
    description: "Treinos físicos, cargas e periodização.",
    href: "/dashboard/futebol/preparacao-fisica",
    icon: Dumbbell,
    moduleSlug: "futebol_preparacao_fisica",
  },
  {
    title: "Nutricionista",
    description: "Planos nutricionais e avaliações do departamento de performance.",
    href: "/dashboard/adm/nutricao",
    icon: UtensilsCrossed,
    moduleSlug: "adm_nutricao",
  },
] as const;

export default function FutebolPerformanceHubPage() {
  return (
    <HubDashboardPage
      section="Depto Futebol"
      sectionIcon={Gauge}
      title="Performance"
      subtitle="Fisiologista, preparação física e nutricionista — dentro do departamento de Futebol."
      hubId="futebol"
      links={[...LINKS]}
    />
  );
}
