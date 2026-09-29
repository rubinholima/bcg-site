"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { isFootballKind } from "@/lib/home-data";
import { TryOutHub } from "@/components/dashboard/futebol/TryOutHub";

type Tenant = { id: string; name: string; kind?: { name?: string } };

export default function FutebolTryOutsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canAccessModule, loading: authLoading } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(true);

  const tenantFromUrl = searchParams.get("tenantId") ?? "";

  useEffect(() => {
    if (authLoading) return;
    if (!canAccessModule("futebol_tryouts")) {
      router.replace("/403");
    }
  }, [authLoading, canAccessModule, router]);

  useEffect(() => {
    api
      .get<Tenant[]>("/tenants?clubsOnly=1")
      .then(({ data }) => {
        const list = (Array.isArray(data) ? data : []).filter((t) =>
          isFootballKind(t.kind?.name ?? ""),
        );
        setTenants(list);
      })
      .finally(() => setLoadingTenants(false));
  }, []);

  if (authLoading || !canAccessModule("futebol_tryouts")) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const initialTenantId =
    tenantFromUrl || tenants[0]?.id || "";

  return (
    <div className="space-y-4">
      <Link
        href="/dashboard/futebol"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Depto Futebol
      </Link>
      {loadingTenants || !initialTenantId ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <TryOutHub tenants={tenants} initialTenantId={initialTenantId} />
      )}
    </div>
  );
}
