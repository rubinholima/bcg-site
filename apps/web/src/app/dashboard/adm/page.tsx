"use client";

import {
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  Warehouse,
  UtensilsCrossed,
  Truck,
} from "lucide-react";
import { HubDashboardPage } from "@/components/dashboard/HubDashboardPage";
import { AdmHubInsights } from "@/components/dashboard/hub/AdmHubInsights";

const LINKS = [
  {
    title: "Clientes",
    description: "Cadastro para contas a receber.",
    href: "/dashboard/adm/clientes",
    icon: Users,
    moduleSlug: "adm_financeiro",
  },
  {
    title: "Fornecedores",
    description: "Cadastro para contas a pagar e compras.",
    href: "/dashboard/adm/fornecedores",
    icon: Truck,
    moduleSlug: "adm_financeiro",
  },
  {
    title: "Financeiro",
    description: "Contas, pagamentos e integração contábil.",
    href: "/dashboard/adm/financeiro",
    icon: DollarSign,
    moduleSlug: "adm_financeiro",
  },
  {
    title: "Compras",
    description: "Requisições, pedidos e ordens de compra.",
    href: "/dashboard/adm/compras",
    icon: ShoppingCart,
    moduleSlug: "adm_compras",
  },
  {
    title: "Estoque",
    description: "Produtos, saldos e movimentações.",
    href: "/dashboard/adm/estoque",
    icon: Package,
    moduleSlug: "adm_estoque",
  },
  {
    title: "RH",
    description: "Funcionários, cargos e departamentos.",
    href: "/dashboard/adm/rh",
    icon: Users,
    moduleSlug: "adm_rh",
  },
  {
    title: "Patrimônio",
    description: "Bens, ativos e controle patrimonial.",
    href: "/dashboard/adm/patrimonio",
    icon: Warehouse,
    moduleSlug: "adm_patrimonio",
  },
  {
    title: "Nutrição",
    description: "Planos alimentares e acompanhamento nutricional.",
    href: "/dashboard/adm/nutricao",
    icon: UtensilsCrossed,
    moduleSlug: "adm_nutricao",
  },
] as const;

export default function AdmHubPage() {
  return (
    <HubDashboardPage
      title="Depto Adm"
      subtitle="Visão geral administrativa — financeiro, compras, clientes, fornecedores, estoque, RH e patrimônio."
      hubId="adm"
      links={[...LINKS]}
    >
      <AdmHubInsights />
    </HubDashboardPage>
  );
}
