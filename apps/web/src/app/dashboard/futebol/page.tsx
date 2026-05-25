"use client";

import {
  Calendar,
  Map,
  BarChart3,
  Star,
  Users,
  Heart,
} from "lucide-react";
import { HubDashboardPage } from "@/components/dashboard/HubDashboardPage";
import { FutebolHubInsights } from "@/components/dashboard/hub/FutebolHubInsights";
import { DASHBOARD_LABELS } from "@/lib/dashboard-labels";

const LINKS = [
  {
    title: "Agenda",
    description: "Calendário de jogos, treinos e compromissos do departamento.",
    href: "/dashboard/futebol/agenda",
    icon: Calendar,
    moduleSlug: "futebol_logistica",
  },
  {
    title: "Logística",
    description: "Viagens, hospedagem e deslocamentos da equipe.",
    href: "/dashboard/futebol/logistica",
    icon: Map,
    moduleSlug: "futebol_logistica",
  },
  {
    title: "Comissão técnica",
    description: "Quadro técnico, cargos e vínculos com elenco.",
    href: "/dashboard/futebol/comissao",
    icon: Users,
    moduleSlug: "futebol_comissao",
  },
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
  {
    title: "Fisiologia",
    description: "Dados fisiológicos integrados ao departamento.",
    href: "/dashboard/futebol/fisiologia",
    icon: Heart,
    moduleSlug: "futebol_fisiologia",
  },
] as const;

export default function FutebolHubPage() {
  return (
    <HubDashboardPage
      title="Depto Futebol"
      subtitle={`Visão geral operacional — ${DASHBOARD_LABELS.atletas}, logística, comissão e análise.`}
      hubId="futebol"
      links={[...LINKS]}
    >
      <FutebolHubInsights />
    </HubDashboardPage>
  );
}
