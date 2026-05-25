"use client";

import {
  Briefcase,
  UserCircle,
  Trophy,
  Stethoscope,
  Brain,
  Ticket,
} from "lucide-react";
import { HubDashboardPage } from "@/components/dashboard/HubDashboardPage";
import { CadastrosHubInsights } from "@/components/dashboard/hub/CadastrosHubInsights";
import { DASHBOARD_LABELS } from "@/lib/dashboard-labels";

const LINKS = [
  {
    title: "Funcionários",
    description: "Cadastro mestre de colaboradores e vínculos.",
    href: "/dashboard/cadastros/funcionarios",
    icon: Briefcase,
    moduleSlug: "adm_rh",
  },
  {
    title: DASHBOARD_LABELS.atletas,
    description: "Cadastro de atletas por clube.",
    href: "/dashboard/cadastros/jogadores",
    icon: UserCircle,
    moduleSlug: "tipos",
  },
  {
    title: "Campeonatos",
    description: "Competições e categorias.",
    href: "/dashboard/cadastros/campeonatos",
    icon: Trophy,
    moduleSlug: "tipos",
  },
  {
    title: "Médicos",
    description: "Profissionais médicos credenciados.",
    href: "/dashboard/medico/equipe",
    icon: Stethoscope,
    moduleSlug: "saude",
  },
  {
    title: "Psicólogos",
    description: "Profissionais de psicologia do esporte.",
    href: "/dashboard/psicologia/psicologos",
    icon: Brain,
    moduleSlug: "saude",
  },
  {
    title: "Planos sócio-torcedor",
    description: "Planos e benefícios para sócios.",
    href: "/dashboard/socio-torcedor/planos",
    icon: Ticket,
    moduleSlug: "socio_torcedor",
  },
] as const;

export default function CadastrosHubPage() {
  return (
    <HubDashboardPage
      title="Cadastros"
      subtitle="Visão geral de cadastros — funcionários, atletas, equipe de saúde e programas."
      hubId="cadastros"
      links={[...LINKS]}
    >
      <CadastrosHubInsights />
    </HubDashboardPage>
  );
}
