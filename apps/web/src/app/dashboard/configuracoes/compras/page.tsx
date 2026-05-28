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
