"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Tenant } from "@/types/tenant";

const SELECT_CLASS =
  "rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground w-full min-w-0 sm:w-auto min-h-[40px]";

export function InfrastructureTenantFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (tenantId: string) => void;
}) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  useEffect(() => {
    api
      .get<Tenant[]>("/tenants")
      .then(({ data }) => setTenants(Array.isArray(data) ? data : []))
      .catch(() => setTenants([]));
  }, []);
  return (
    <select
      className={SELECT_CLASS}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Filtrar empresa"
    >
      <option value="">Todas as empresas</option>
      {tenants.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </select>
  );
}

export function useInfraAccess() {
  const router = useRouter();
  const { canAccessModule, loading } = useAuth();
  const allowed = canAccessModule("infraestrutura");
  useEffect(() => {
    if (!loading && !allowed) router.replace("/403");
  }, [allowed, loading, router]);
  return { allowed, loading };
}
