"use client";

import { Ticket } from "lucide-react";
import { ModulePlaceholderPage } from "@/components/dashboard/ModulePlaceholderPage";

export default function SocioTorcedorPage() {
  return (
    <ModulePlaceholderPage
      title="Sócio Torcedor"
      description="Ingressos, benefícios e cadastro de sócios"
      moduleSlug="socio_torcedor"
      Icon={Ticket}
      backHref="/dashboard"
    />
  );
}
