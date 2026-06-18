"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, HelpCircle, TabletSmartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { BostonTvHallControlView } from "@/components/boston-tv/BostonTvHallControlView";
import { BC_HALL_CONTROLE_LABEL } from "@/lib/boston-tv-hall";
import {
  getStoredBostonTvTenantId,
  pickBostonTvTenantId,
  setStoredBostonTvTenantId,
} from "@/lib/boston-tv-tenant-storage";

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
    <div className="mx-auto max-w-6xl space-y-6 px-1 sm:px-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Link
            href="/dashboard/marketing/boston-tv"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            BCG TV
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <TabletSmartphone className="h-7 w-7 text-primary" aria-hidden />
              {BC_HALL_CONTROLE_LABEL} (iPad)
            </h1>
            <Link href="/dashboard/manual#boston-tv-controle">
              <Button type="button" variant="outline" size="sm" className="min-h-[40px]">
                <HelpCircle className="mr-2 h-4 w-4" />
                Ajuda
              </Button>
            </Link>
          </div>
        </div>

        <div className="space-y-2 w-full sm:w-auto">
          <Label>Empresa / clube</Label>
          <Select
            value={tenantSelectValue}
            onValueChange={(v) => {
              if (v === "_loading" || v === "_none") return;
              setTenantFilter(v);
            }}
            disabled={tenantsLoading || tenants.length === 0}
          >
            <SelectTrigger className="w-full sm:w-[280px] text-foreground min-h-[44px]">
              <SelectValue placeholder="Selecione a empresa" />
            </SelectTrigger>
            <SelectContent>
              {tenantsLoading ? (
                <SelectItem value="_loading" disabled>
                  Carregando…
                </SelectItem>
              ) : tenants.length === 0 ? (
                <SelectItem value="_none" disabled>
                  Nenhuma empresa
                </SelectItem>
              ) : (
                tenants.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {tenantFilter ? (
        <BostonTvHallControlView tenantId={tenantFilter} />
      ) : (
        <p className="text-sm text-muted-foreground">Selecione a empresa para controlar as telas.</p>
      )}
    </div>
  );
}
