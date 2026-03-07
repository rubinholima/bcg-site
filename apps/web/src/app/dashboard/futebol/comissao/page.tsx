"use client";

import { Users } from "lucide-react";
import { ModulePlaceholderPage } from "@/components/dashboard/ModulePlaceholderPage";

export default function FutebolComissaoPage() {
  return (
    <ModulePlaceholderPage
      title="Comissão técnica"
      description="Técnicos, assistentes e comissão"
      moduleSlug="futebol_comissao"
      Icon={Users}
      backHref="/dashboard"
    />
  );
}
