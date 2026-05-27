"use client";

import {
  Building2,
  FileText,
  Image,
  Newspaper,
  Settings,
  Shirt,
  Trophy,
  Users,
  Stethoscope,
  Scale,
  Megaphone,
  Warehouse,
} from "lucide-react";
import { HubDashboardPage } from "@/components/dashboard/HubDashboardPage";
import { CompanyDashboardGate } from "@/components/dashboard/CompanyDashboardGate";
import { CompanyHubInsights } from "@/components/dashboard/hub/CompanyHubInsights";

const COMPANY_LINKS = [
  {
    title: "Cadastros",
    description: "Atletas, funcionários, campeonatos e dados mestre do clube.",
    href: "/dashboard/cadastros/jogadores",
    icon: Shirt,
    moduleSlug: "tipos",
  },
  {
    title: "Depto Futebol",
    description: "Agenda, logística, comissão e análise esportiva.",
    href: "/dashboard/futebol",
    icon: Trophy,
    moduleSlug: "futebol_logistica",
  },
  {
    title: "Saúde",
    description: "Psicologia, prontuários e acompanhamento médico.",
    href: "/dashboard/saude",
    icon: Stethoscope,
    moduleSlug: "saude",
  },
  {
    title: "ADM",
    description: "Financeiro, compras, estoque, RH e patrimônio.",
    href: "/dashboard/adm",
    icon: Warehouse,
    moduleSlug: "adm_financeiro",
  },
  {
    title: "Jurídico",
    description: "Contratos e documentos com assinatura digital.",
    href: "/dashboard/juridico",
    icon: Scale,
    moduleSlug: "juridico",
  },
  {
    title: "Marketing",
    description: "Páginas, notícias, mídia e Boston TV.",
    href: "/dashboard/marketing",
    icon: Megaphone,
    moduleSlug: "marketing",
  },
  {
    title: "Usuários",
    description: "Equipe com acesso ao painel da empresa.",
    href: "/dashboard/usuarios",
    icon: Users,
    moduleSlug: "usuarios",
  },
  {
    title: "Páginas",
    description: "Conteúdo público do site da empresa.",
    href: "/dashboard/paginas",
    icon: FileText,
    moduleSlug: "paginas",
  },
  {
    title: "Notícias",
    description: "Publicações e comunicados.",
    href: "/dashboard/noticias",
    icon: Newspaper,
    moduleSlug: "noticias",
  },
  {
    title: "Mídia",
    description: "Biblioteca de imagens e arquivos.",
    href: "/dashboard/midia",
    icon: Image,
    moduleSlug: "midia",
  },
  {
    title: "Minha empresa",
    description: "Dados e identidade visual do clube.",
    href: "/dashboard/empresas",
    icon: Building2,
    moduleSlug: "empresas",
  },
  {
    title: "Configurações",
    description: "Preferências e ajustes do painel.",
    href: "/dashboard/configuracoes",
    icon: Settings,
    moduleSlug: "configuracoes",
  },
] as const;

export default function CompanyDashboardPage() {
  return (
    <CompanyDashboardGate>
      <HubDashboardPage
        title="Painel da Empresa"
        subtitle="Dash do clube — atalhos para os módulos liberados ao seu perfil."
        hubId="clube"
        links={[...COMPANY_LINKS]}
      >
        <CompanyHubInsights />
      </HubDashboardPage>
    </CompanyDashboardGate>
  );
}
