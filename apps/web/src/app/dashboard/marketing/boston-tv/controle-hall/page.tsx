"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
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
      <div className="flex h-[100dvh] flex-col items-center justify-center bg-zinc-950 text-zinc-400">
        <p>Você não tem acesso ao módulo BCG TV.</p>
        <Link href="/dashboard/marketing/boston-tv">
          <Button variant="link" className="mt-2 text-violet-300">
            Voltar
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-zinc-950 text-white">
      <header
        className="shrink-0 border-b border-zinc-800/80"
        style={{
          paddingTop: "max(0.5rem, env(safe-area-inset-top))",
          paddingBottom: "0.5rem",
          paddingLeft: "max(0.75rem, env(safe-area-inset-left))",
          paddingRight: "max(0.75rem, env(safe-area-inset-right))",
        }}
      >
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
          <Link href="/dashboard/marketing/boston-tv" className="shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-[44px] px-2 text-zinc-200 hover:bg-zinc-800 hover:text-white sm:px-3"
            >
              <ChevronLeft className="mr-0.5 h-5 w-5" />
              Voltar
            </Button>
          </Link>
          {tenants.length > 1 ? (
            <Select
              value={tenantSelectValue}
              onValueChange={(v) => {
                if (v === "_loading" || v === "_none") return;
                setTenantFilter(v);
              }}
              disabled={tenantsLoading}
            >
              <SelectTrigger className="h-10 w-full max-w-[min(100%,16rem)] border-zinc-700 bg-zinc-900 text-foreground text-sm sm:max-w-[18rem]">
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
          ) : (
            <span className="truncate text-right text-xs text-zinc-500 sm:text-sm">
              {tenants.find((t) => t.id === tenantFilter)?.name ?? "Controle Hall"}
            </span>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden">
        {tenantFilter ? (
          <BostonTvHallControlView tenantId={tenantFilter} />
        ) : (
          <p className="flex h-full items-center justify-center text-sm text-zinc-500">
            Selecione a empresa.
          </p>
        )}
      </div>
    </div>
  );
}
