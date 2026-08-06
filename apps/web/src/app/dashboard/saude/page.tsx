"use client";

import {
  Stethoscope,
  ClipboardList,
  Heart,
  Activity,
  UserCircle,
  GraduationCap,
  FolderOpen,
} from "lucide-react";
import { HubDashboardPage } from "@/components/dashboard/HubDashboardPage";
import { SaudeHubInsights } from "@/components/dashboard/hub/SaudeHubInsights";

const LINKS = [
  {
    title: "Médicos",
    description: "Cadastro da equipe médica.",
    href: "/dashboard/medico/equipe",
    icon: Stethoscope,
    moduleSlug: "saude",
  },
  {
    title: "Enfermeiros",
    description: "Cadastro de enfermeiros.",
    href: "/dashboard/medico/enfermeiros",
    icon: Heart,
    moduleSlug: "saude",
  },
  {
    title: "Psicólogos",
    description: "Cadastro de psicólogos.",
    href: "/dashboard/psicologia/psicologos",
    icon: UserCircle,
    moduleSlug: "saude",
  },
  {
    title: "Estagiários",
    description: "Cadastro único — área de atuação no futebol.",
    href: "/dashboard/saude/estagiarios",
    icon: GraduationCap,
    moduleSlug: "saude",
  },
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
    title: "Material de apoio",
    description: "Biblioteca compartilhada — PDFs, imagens e documentos para psicólogos e estagiários.",
    href: "/dashboard/psicologia/material-apoio",
    icon: FolderOpen,
    moduleSlug: "saude",
  },
  {
    title: "Fisioterapeutas",
    description: "Cadastro de fisioterapeutas para atendimentos e recovery.",
    href: "/dashboard/saude/fisioterapeutas",
    icon: Activity,
    moduleSlug: "saude",
  },
  {
    title: "Fisioterapia",
    description: "Tratamentos e evolução fisioterapêutica.",
    href: "/dashboard/saude/fisioterapia",
    icon: Activity,
    moduleSlug: "saude",
  },
] as const;

export default function SaudeHubPage() {
  return (
    <HubDashboardPage
      section="Depto de Saúde"
      title="Dash"
      subtitle="Dash clínico — médico, enfermeiros, fisioterapia e psicologia."
      hubId="saude"
      links={[...LINKS]}
    >
      <SaudeHubInsights />
    </HubDashboardPage>
  );
}
