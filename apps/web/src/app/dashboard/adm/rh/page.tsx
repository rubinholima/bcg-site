"use client";

import { Users } from "lucide-react";
import { ModulePlaceholderPage } from "@/components/dashboard/ModulePlaceholderPage";

export default function AdmRHPage() {
  return (
    <ModulePlaceholderPage
      title="RH"
      description="Departamento administrativo — Recursos Humanos"
      moduleSlug="adm_rh"
      Icon={Users}
      backHref="/dashboard"
    />
  );
}
