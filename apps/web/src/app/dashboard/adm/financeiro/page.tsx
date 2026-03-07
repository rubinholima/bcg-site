"use client";

import { DollarSign } from "lucide-react";
import { ModulePlaceholderPage } from "@/components/dashboard/ModulePlaceholderPage";

export default function AdmFinanceiroPage() {
  return (
    <ModulePlaceholderPage
      title="Financeiro"
      description="Departamento administrativo — Financeiro"
      moduleSlug="adm_financeiro"
      Icon={DollarSign}
      backHref="/dashboard"
    />
  );
}
