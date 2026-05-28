"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ClipboardList, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Tenant } from "@/types/tenant";
import { PurchaseRequisitionWorkflowPanel } from "@/app/dashboard/adm/compras/components/PurchaseRequisitionWorkflowPanel";

export default function RequisicoesPage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);

  useEffect(() => {
    if (!canAccessModule("requisicoes") && !authLoading) return;
    api.get<Tenant[]>("/tenants").then(({ data }) => setTenants(Array.isArray(data) ? data : []));
  }, [canAccessModule, authLoading]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canAccessModule("requisicoes")) {
    router.replace("/403");
    return null;
  }

  return (
    <div className="space-y-6">
      <PurchaseRequisitionWorkflowPanel
        mode="requester"
        tenants={tenants}
        requestType="compra"
        listTitle="Minhas requisições"
        newButtonLabel="Nova requisição de compra"
        formTitle="Nova requisição de compra"
        defaultTenantId={tenants[0]?.id}
      />
    </div>
  );
}
