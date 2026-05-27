"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CircleHelp, ClipboardList, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Tenant } from "@/types/tenant";
import { PurchaseWorkflowSettingsForm } from "@/components/settings/PurchaseWorkflowSettingsForm";

export default function ConfiguracoesRequisicoesPage() {
  const router = useRouter();
  const { canAccessModule, isSuperAdmin, isCompanyAdmin, loading: authLoading } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);

  const canView =
    canAccessModule("configuracoes") ||
    canAccessModule("adm_compras") ||
    canAccessModule("adm_financeiro");
  const canEdit =
    canAccessModule("adm_compras") ||
    ((isSuperAdmin || isCompanyAdmin) && canAccessModule("configuracoes"));

  useEffect(() => {
    if (!canView || authLoading) return;
    api.get<Tenant[]>("/tenants").then(({ data }) => setTenants(Array.isArray(data) ? data : []));
  }, [canView, authLoading]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canView) {
    router.replace("/403");
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardList className="h-8 w-8 shrink-0" />
            Requisições
          </h1>
          <Button variant="ghost" size="icon" asChild title="Manual — fluxo e alertas">
            <Link href="/dashboard/manual#requisicoes" aria-label="Abrir manual de requisições">
              <CircleHelp className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>

      {!canEdit && (
        <p className="text-sm text-amber-600 dark:text-amber-400">Somente visualização.</p>
      )}

      <PurchaseWorkflowSettingsForm
        tenants={tenants}
        readOnly={!canEdit}
        defaultTenantId={tenants[0]?.id}
        showAllResponsibles={isSuperAdmin}
      />
    </div>
  );
}
