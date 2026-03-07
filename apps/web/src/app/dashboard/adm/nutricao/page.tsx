"use client";

import { UtensilsCrossed } from "lucide-react";
import { ModulePlaceholderPage } from "@/components/dashboard/ModulePlaceholderPage";

export default function AdmNutricaoPage() {
  return (
    <ModulePlaceholderPage
      title="Nutrição"
      description="Departamento administrativo — Nutrição"
      moduleSlug="adm_nutricao"
      Icon={UtensilsCrossed}
      backHref="/dashboard"
    />
  );
}
