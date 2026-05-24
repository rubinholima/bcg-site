"use client";

import {
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  Warehouse,
  UtensilsCrossed,
} from "lucide-react";
import { HubDashboardPage } from "@/components/dashboard/HubDashboardPage";

const LINKS = [
  {
    title: "Financeiro",
    description: "Contas, pagamentos e integração contábil.",
    href: "/dashboard/adm/financeiro",
    icon: DollarSign,
    moduleSlug: "adm_financeiro",
  },
  {
    title: "Compras",
    description: "Requisições, pedidos e fornecedores.",
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
      subtitle="Visão geral administrativa — financeiro, compras, estoque, RH e patrimônio."
      hubId="adm"
      links={[...LINKS]}
    />
  );
}
