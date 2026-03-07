"use client";

import { Heart } from "lucide-react";
import { ModulePlaceholderPage } from "@/components/dashboard/ModulePlaceholderPage";

export default function FutebolFisiologiaPage() {
  return (
    <ModulePlaceholderPage
      title="Fisiologia"
      description="Acompanhamento fisiológico dos atletas"
      moduleSlug="futebol_fisiologia"
      Icon={Heart}
      backHref="/dashboard"
    />
  );
}
