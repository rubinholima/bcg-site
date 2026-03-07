"use client";

import { Warehouse } from "lucide-react";
import { ModulePlaceholderPage } from "@/components/dashboard/ModulePlaceholderPage";

export default function AdmPatrimonioPage() {
  return (
    <ModulePlaceholderPage
      title="Patrimônio"
      description="Departamento administrativo — Patrimônio"
      moduleSlug="adm_patrimonio"
      Icon={Warehouse}
      backHref="/dashboard"
    />
  );
}
