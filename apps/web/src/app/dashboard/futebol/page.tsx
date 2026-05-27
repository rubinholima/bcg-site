"use client";

import {
  Calendar,
  Map,
  BarChart3,
  Star,
  Users,
  Heart,
  UserCircle,
  Trophy,
  MapPin,
  Shirt,
  Layers,
  Archive,
} from "lucide-react";
import { HubDashboardPage } from "@/components/dashboard/HubDashboardPage";
import { FutebolHubInsights } from "@/components/dashboard/hub/FutebolHubInsights";
import { DASHBOARD_LABELS } from "@/lib/dashboard-labels";

const LINKS = [
  {
    title: DASHBOARD_LABELS.atletas,
    description: "Cadastro de atletas por clube.",
    href: "/dashboard/cadastros/jogadores",
    icon: UserCircle,
    moduleSlug: "tipos",
  },
  {
    title: "Atletas desligados",
    description: "Arquivo de atletas desligados.",
    href: "/dashboard/cadastros/jogadores/arquivo",
    icon: Archive,
    moduleSlug: "tipos",
  },
  {
    title: "Campeonatos",
    description: "Competições cadastradas.",
    href: "/dashboard/cadastros/campeonatos",
    icon: Trophy,
    moduleSlug: "tipos",
  },
  {
    title: DASHBOARD_LABELS.estadios,
    description: "Locais e estádios.",
    href: "/dashboard/cadastros/estadios",
    icon: MapPin,
    moduleSlug: "tipos",
  },
  {
    title: DASHBOARD_LABELS.timesAdversarios,
    description: "Times adversários.",
    href: "/dashboard/cadastros/times",
    icon: Shirt,
    moduleSlug: "tipos",
  },
  {
    title: "Categorias",
    description: "Categorias de base e profissional.",
    href: "/dashboard/cadastros/categorias",
    icon: Layers,
    moduleSlug: "tipos",
  },
  {
    title: "Logística — Agenda",
    description: "Calendário operacional: viagens, treinos, jogos e compromissos.",
    href: "/dashboard/futebol/logistica/agenda",
    icon: Calendar,
    moduleSlug: "futebol_logistica",
  },
  {
    title: "Logística — Viagens",
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
      subtitle={`Dash operacional — ${DASHBOARD_LABELS.atletas}, logística, comissão e análise.`}
      hubId="futebol"
      links={[...LINKS]}
    >
      <FutebolHubInsights />
    </HubDashboardPage>
  );
}
