"use client";

import { ShoppingCart } from "lucide-react";
import { ModulePlaceholderPage } from "@/components/dashboard/ModulePlaceholderPage";

export default function AdmComprasPage() {
  return (
    <ModulePlaceholderPage
      title="Compras"
      description="Departamento administrativo — Compras"
      moduleSlug="adm_compras"
      Icon={ShoppingCart}
      backHref="/dashboard"
    />
  );
}
