"use client";

import {
  Stethoscope,
  ClipboardList,
  Heart,
  Activity,
  UtensilsCrossed,
} from "lucide-react";
import { HubDashboardPage } from "@/components/dashboard/HubDashboardPage";
import { SaudeHubInsights } from "@/components/dashboard/hub/SaudeHubInsights";

const LINKS = [
  {
    title: "Histórico médico",
    description: "Prontuários e histórico clínico dos atletas.",
    href: "/dashboard/medico",
    icon: Stethoscope,
    moduleSlug: "saude",
  },
  {
    title: "Consultas online",
    description: "Agenda e atendimentos psicológicos.",
    href: "/dashboard/consultas",
    icon: ClipboardList,
    moduleSlug: "saude",
  },
  {
    title: "Avaliação psicológica",
    description: "Formulários e laudos psicológicos.",
    href: "/dashboard/psicologia",
    icon: ClipboardList,
    moduleSlug: "saude",
  },
  {
    title: "Fisiologia",
    description: "Indicadores fisiológicos e testes.",
    href: "/dashboard/futebol/fisiologia",
    icon: Heart,
    moduleSlug: "futebol_fisiologia",
  },
  {
    title: "Fisioterapia",
    description: "Tratamentos e evolução fisioterapêutica.",
    href: "/dashboard/saude/fisioterapia",
    icon: Activity,
    moduleSlug: "saude",
  },
  {
    title: "Nutrição",
    description: "Planos nutricionais e acompanhamento.",
    href: "/dashboard/adm/nutricao",
    icon: UtensilsCrossed,
    moduleSlug: "adm_nutricao",
  },
] as const;

export default function SaudeHubPage() {
  return (
    <HubDashboardPage
      title="Depto de Saúde"
      subtitle="Visão geral clínica — médico, psicologia, fisiologia e nutrição."
      hubId="saude"
      links={[...LINKS]}
    >
      <SaudeHubInsights />
    </HubDashboardPage>
  );
}
