"use client";

import { Package } from "lucide-react";
import { ModulePlaceholderPage } from "@/components/dashboard/ModulePlaceholderPage";

export default function AdmEstoquePage() {
  return (
    <ModulePlaceholderPage
      title="Estoque"
      description="Departamento administrativo — Estoque"
      moduleSlug="adm_estoque"
      Icon={Package}
      backHref="/dashboard"
    />
  );
}
