"use client";

import { Megaphone } from "lucide-react";
import { ModulePlaceholderPage } from "@/components/dashboard/ModulePlaceholderPage";

export default function MarketingPage() {
  return (
    <ModulePlaceholderPage
      title="Marketing"
      description="Campanhas, redes e divulgação"
      moduleSlug="marketing"
      Icon={Megaphone}
      backHref="/dashboard"
    />
  );
}
