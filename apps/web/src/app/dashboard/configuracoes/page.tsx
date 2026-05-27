"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

/** Hub legado — redireciona para a página correta no submenu de Configurações. */
export default function ConfiguracoesPage() {
  const router = useRouter();
  const { canAccessModule, isSuperAdmin, loading } = useAuth();

  const canViewComprasSettings =
    canAccessModule("configuracoes") ||
    canAccessModule("adm_compras") ||
    canAccessModule("adm_financeiro");

  useEffect(() => {
    if (loading) return;
    if (isSuperAdmin) {
      router.replace("/dashboard/configuracoes/modulos");
      return;
    }
    if (canViewComprasSettings) {
      router.replace("/dashboard/configuracoes/compras");
      return;
    }
    router.replace("/403");
  }, [loading, isSuperAdmin, canViewComprasSettings, router]);

  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
