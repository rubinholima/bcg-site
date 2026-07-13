"use client";

import { MessagesSquare, Inbox, Cable, FileText } from "lucide-react";
import { HubDashboardPage } from "@/components/dashboard/HubDashboardPage";

const LINKS = [
  {
    title: "Inbox",
    description: "Conversas unificadas, filtros por unidade e timeline.",
    href: "/dashboard/comunicacao/inbox",
    icon: Inbox,
    moduleSlug: "comunicacao",
  },
  {
    title: "Canais",
    description: "Contas WhatsApp Cloud API e próximos provedores.",
    href: "/dashboard/comunicacao/canais",
    icon: Cable,
    moduleSlug: "comunicacao",
  },
  {
    title: "Templates",
    description: "Respostas prontas e templates por canal.",
    href: "/dashboard/comunicacao/templates",
    icon: FileText,
    moduleSlug: "comunicacao",
  },
] as const;

export default function ComunicacaoHubPage() {
  return (
    <HubDashboardPage
      section="Communication Center"
      sectionIcon={MessagesSquare}
      title="Dash"
      subtitle="Hub unificado de comunicação BCG — WhatsApp primeiro; e-mail, IG e SMS na mesma infraestrutura."
      hubId="comunicacao"
      links={[...LINKS]}
    />
  );
}
