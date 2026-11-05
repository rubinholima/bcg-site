"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Tenant } from "@/types/tenant";
import { PurchaseRequisitionWorkflowPanel } from "@/app/dashboard/adm/compras/components/PurchaseRequisitionWorkflowPanel";
import { WorkflowInboxBanner } from "@/components/settings/WorkflowInboxBanner";
import { canApprovePurchaseAsGerente } from "@/lib/purchase-requisition-access";

export default function FutebolAprovacoesComprasPage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading, role, isSuperAdmin } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const canView = canApprovePurchaseAsGerente(role, canAccessModule, isSuperAdmin);

  useEffect(() => {
    if (!canView && !authLoading) return;
    api.get<Tenant[]>("/tenants").then(({ data }) => setTenants(Array.isArray(data) ? data : []));
  }, [canView, authLoading]);

  if (authLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
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
        <Link href="/dashboard/futebol">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CheckCircle className="h-7 w-7" />
            Aprovações de compra
          </h1>
        </div>
      </div>
      <WorkflowInboxBanner variant="gerente" />
      <PurchaseRequisitionWorkflowPanel mode="gerente" tenants={tenants} />
    </div>
  );
}
