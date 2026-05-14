"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Tenant } from "@/types/tenant";
import { FinanceiroLancamentosPanel } from "./financeiro-lancamentos-panel";

const STORAGE_TENANT_KEY = "adm_financeiro_tenant_id";

export default function AdmFinanceiroPage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [tenantId, setTenantId] = useState("");

  const loadTenants = useCallback(async () => {
    setTenantsLoading(true);
    try {
      const { data } = await api.get<Tenant[]>("/tenants");
      const listTen = Array.isArray(data) ? data : [];
      setTenants(listTen);
      if (listTen.length === 0) {
        setTenantId("");
        return;
      }
      const stored =
        typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_TENANT_KEY) : null;
      const fallback = stored && listTen.some((t) => t.id === stored) ? stored : listTen[0].id;
      setTenantId((prev) => (prev && listTen.some((t) => t.id === prev) ? prev : fallback));
    } catch {
      setTenants([]);
      setTenantId("");
    } finally {
      setTenantsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canAccessModule("adm_financeiro") && !authLoading) return;
    void loadTenants();
  }, [canAccessModule, authLoading, loadTenants]);

  useEffect(() => {
    if (tenantId && typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_TENANT_KEY, tenantId);
    }
  }, [tenantId]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!canAccessModule("adm_financeiro")) {
    router.replace("/403");
    return null;
  }

  const selectedTenant = tenants.find((t) => t.id === tenantId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
          <p className="text-muted-foreground">
            Contas a pagar e a receber por empresa. Visão consolidada Omie fica na área da Diretoria.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-2">
            <Building2 className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" />
            <div>
              <CardTitle className="text-lg">Empresa</CardTitle>
              <CardDescription>Selecione a empresa para lançamentos e resumos.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {tenantsLoading ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando empresas...
            </p>
          ) : tenants.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma empresa.{" "}
              <Link href="/dashboard/empresas" className="text-primary underline underline-offset-2">
                Cadastre uma empresa
              </Link>
              .
            </p>
          ) : (
            <div className="flex flex-col gap-3 sm:max-w-md">
              <label htmlFor="financeiro-tenant" className="text-sm font-medium text-foreground">
                Empresa ativa
              </label>
              <Select value={tenantId} onValueChange={(v) => setTenantId(v)}>
                <SelectTrigger id="financeiro-tenant" className="w-full text-foreground">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTenant && (
                <p className="text-xs text-muted-foreground">
                  Relatórios e totais Omie por empresa: módulo <strong className="font-medium">Diretoria</strong>.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {tenantId ? <FinanceiroLancamentosPanel tenantId={tenantId} /> : null}
    </div>
  );
}
