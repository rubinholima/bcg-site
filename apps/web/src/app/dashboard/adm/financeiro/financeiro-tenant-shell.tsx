"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Building2, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Tenant } from "@/types/tenant";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const STORAGE_TENANT_KEY = "adm_financeiro_tenant_id";

type Ctx = { tenantId: string; tenant: Tenant | null; tenants: Tenant[] };

const FinanceiroTenantContext = createContext<Ctx>({ tenantId: "", tenant: null, tenants: [] });

export function useFinanceiroTenant() {
  return useContext(FinanceiroTenantContext);
}

const NAV = [
  { href: "/dashboard/adm/financeiro", label: "Visão Geral" },
  { href: "/dashboard/adm/financeiro/pagar", label: "Contas a Pagar" },
  { href: "/dashboard/adm/financeiro/receber", label: "Contas a Receber" },
  { href: "/dashboard/adm/financeiro/contas", label: "Contas Financeiras" },
  { href: "/dashboard/adm/financeiro/contas/fila", label: "Fila por conta" },
  { href: "/dashboard/adm/financeiro/transferencias", label: "Transferências" },
  { href: "/dashboard/adm/financeiro/cartoes", label: "Cartões" },
  { href: "/dashboard/adm/financeiro/delegacoes", label: "Delegações" },
  { href: "/dashboard/adm/financeiro/categorias", label: "Categorias" },
  { href: "/dashboard/adm/financeiro/fornecedores", label: "Fornecedores" },
  { href: "/dashboard/adm/financeiro/relatorios", label: "Relatórios" },
  { href: "/dashboard/adm/financeiro/omie", label: "Integrações / Omie" },
];

export function FinanceiroTenantShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryTenantId = searchParams.get("tenantId") ?? "";
  const { canAccessModule, loading: authLoading } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [tenantId, setTenantId] = useState("");

  const loadTenants = useCallback(async () => {
    setTenantsLoading(true);
    try {
      const { data } = await api.get<Tenant[]>("/tenants");
      const list = Array.isArray(data) ? data : [];
      setTenants(list);
      if (list.length === 0) {
        setTenantId("");
        return;
      }
      const stored =
        typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_TENANT_KEY) : null;
      const fromQuery =
        queryTenantId && list.some((t) => t.id === queryTenantId) ? queryTenantId : null;
      const fallback = stored && list.some((t) => t.id === stored) ? stored : list[0].id;
      setTenantId((prev) => {
        if (fromQuery) return fromQuery;
        return prev && list.some((t) => t.id === prev) ? prev : fallback;
      });
    } catch {
      setTenants([]);
      setTenantId("");
    } finally {
      setTenantsLoading(false);
    }
  }, [queryTenantId]);

  useEffect(() => {
    if (!canAccessModule("adm_financeiro") && !authLoading) return;
    void loadTenants();
  }, [canAccessModule, authLoading, loadTenants]);

  useEffect(() => {
    if (tenantId && typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_TENANT_KEY, tenantId);
    }
  }, [tenantId]);

  useEffect(() => {
    if (!authLoading && !canAccessModule("adm_financeiro")) {
      router.replace("/403");
    }
  }, [authLoading, canAccessModule, router]);

  const tenant = useMemo(() => tenants.find((t) => t.id === tenantId) ?? null, [tenants, tenantId]);

  if (authLoading) {
    return (
      <h1 className="py-12 text-center text-muted-foreground">Carregando...</h1>
    );
  }

  return (
    <FinanceiroTenantContext.Provider value={{ tenantId, tenant, tenants }}>
      <div className="space-y-4">
        <nav className="flex gap-1 overflow-x-auto pb-1">
          {NAV.map((item) => {
            const active =
              item.href === "/dashboard/adm/financeiro"
                ? pathname === item.href
                : pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "shrink-0 rounded-md px-3 py-2 text-sm font-medium",
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/40 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4 shrink-0" />
            {tenant ? (
              <span className="text-foreground">
                {tenant.tradeName || tenant.name}
                {tenant.taxId ? (
                  <span className="ml-2 text-muted-foreground">CNPJ {tenant.taxId}</span>
                ) : null}
              </span>
            ) : (
              <span>Empresa</span>
            )}
          </div>
          {tenantsLoading ? (
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando…
            </span>
          ) : tenants.length > 0 ? (
            <Select value={tenantId} onValueChange={setTenantId}>
              <SelectTrigger className="w-full sm:w-64 text-foreground">
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
          ) : null}
        </div>

        {tenantId ? children : (
          <p className="text-sm text-muted-foreground">Selecione uma empresa para continuar.</p>
        )}
      </div>
    </FinanceiroTenantContext.Provider>
  );
}
