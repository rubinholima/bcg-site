"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { BostonTvHallControlView } from "@/components/boston-tv/BostonTvHallControlView";
import {
  getStoredBostonTvTenantId,
  pickBostonTvTenantId,
  setStoredBostonTvTenantId,
} from "@/lib/boston-tv-tenant-storage";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Tenant {
  id: string;
  name: string;
}

export default function BostonTvControleHallPage() {
  const { tenantIds, canAccessModule, loading: authLoading } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [tenantFilter, setTenantFilter] = useState(() => getStoredBostonTvTenantId() ?? "");

  useEffect(() => {
    void (async () => {
      setTenantsLoading(true);
      try {
        const { data } = await api.get<Tenant[]>("/tenants");
        const list = Array.isArray(data) ? data : [];
        setTenants(list);
        setTenantFilter((cur) => pickBostonTvTenantId(list, cur, tenantIds));
      } catch {
        setTenants([]);
      } finally {
        setTenantsLoading(false);
      }
    })();
  }, [tenantIds]);

  useEffect(() => {
    if (tenantFilter) setStoredBostonTvTenantId(tenantFilter);
  }, [tenantFilter]);

  const tenantSelectValue = useMemo(() => {
    if (tenantsLoading) return "_loading";
    if (tenantFilter && tenants.some((t) => t.id === tenantFilter)) return tenantFilter;
    return "_none";
  }, [tenantsLoading, tenantFilter, tenants]);

  if (!canAccessModule("boston_tv") && !authLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p>Você não tem acesso ao módulo BCG TV.</p>
        <Link href="/dashboard">
          <Button variant="link" className="mt-2">
            Voltar ao dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-5rem)] bg-zinc-950 py-4 sm:py-8">
      {/* Só o essencial fora do iPad: empresa (se mais de uma) */}
      {tenants.length > 1 ? (
        <div className="mx-auto mb-4 flex max-w-[900px] justify-end px-3">
          <Select
            value={tenantSelectValue}
            onValueChange={(v) => {
              if (v === "_loading" || v === "_none") return;
              setTenantFilter(v);
            }}
            disabled={tenantsLoading}
          >
            <SelectTrigger className="h-10 w-full max-w-[220px] border-zinc-700 bg-zinc-900 text-foreground sm:w-[220px]">
              <SelectValue placeholder="Empresa" />
            </SelectTrigger>
            <SelectContent>
              {tenants.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {tenantFilter ? (
        <BostonTvHallControlView tenantId={tenantFilter} />
      ) : (
        <p className="text-center text-sm text-zinc-500">Selecione a empresa.</p>
      )}
    </div>
  );
}
