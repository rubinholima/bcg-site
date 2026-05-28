"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShoppingCart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Tenant } from "@/types/tenant";
import { PurchaseRequisitionWorkflowPanel } from "./components/PurchaseRequisitionWorkflowPanel";
import { WorkflowInboxBanner } from "@/components/settings/WorkflowInboxBanner";
import { type SupplierRow } from "./components/SupplierFormDialog";

export default function AdmComprasPage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [assetCategories, setAssetCategories] = useState<Array<{ id: string; name: string }>>([]);
  useEffect(() => {
    if (!canAccessModule("adm_compras") && !authLoading) return;
    api.get<Tenant[]>("/tenants").then(({ data }) => setTenants(Array.isArray(data) ? data : []));
    api.get<SupplierRow[]>("/compras/suppliers").then(({ data }) => setSuppliers(Array.isArray(data) ? data : []));
    api.get<Array<{ id: string; name: string }>>("/patrimonio/asset-categories").then(({ data }) =>
      setAssetCategories(Array.isArray(data) ? data : []),
    );
  }, [canAccessModule, authLoading]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canAccessModule("adm_compras")) {
    router.replace("/403");
    return null;
  }

  return (
    <div className="space-y-6">
      <WorkflowInboxBanner variant="compras" />

      <PurchaseRequisitionWorkflowPanel
        mode="compras"
        tenants={tenants}
        suppliers={suppliers}
        assetCategories={assetCategories}
        defaultTenantId={tenants[0]?.id}
      />

    </div>
  );
}
