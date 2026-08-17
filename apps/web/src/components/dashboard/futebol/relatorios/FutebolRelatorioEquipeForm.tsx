"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useCategoriesForTenant } from "@/hooks/useFixtureCategories";
import type { CoachContextResponse } from "@/lib/treinadores-types";
import { CoachTeamReportPanel } from "@/components/dashboard/futebol/treinadores/CoachTeamReportPanel";

interface Tenant {
  id: string;
  name: string;
  categories?: string[] | null;
}

function FutebolRelatorioEquipeFormInner() {
  const searchParams = useSearchParams();
  const { canAccessModule } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState(searchParams.get("tenantId") ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [context, setContext] = useState<CoachContextResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedTenant = tenants.find((t) => t.id === tenantId);
  const { categories: categoriesForDropdown } = useCategoriesForTenant(selectedTenant?.categories);
  const canEdit = canAccessModule("futebol_treinadores");

  useEffect(() => {
    api.get<Tenant[]>("/tenants?clubsOnly=1").then(({ data }) => {
      setTenants(Array.isArray(data) ? data : []);
    });
  }, []);

  useEffect(() => {
    if (!tenantId) {
      setContext(null);
      return;
    }
    setLoading(true);
    const params = new URLSearchParams({ tenantId });
    if (category) params.set("category", category);
    api
      .get<CoachContextResponse>(`/futebol-treinadores/context?${params}`)
      .then(({ data }) => setContext(data))
      .catch(() => setContext(null))
      .finally(() => setLoading(false));
  }, [tenantId, category]);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="min-w-[200px] flex-1 space-y-2">
              <Label className="text-sm text-muted-foreground">Clube</Label>
              <Select value={tenantId} onValueChange={(v) => setTenantId(v)}>
                <SelectTrigger className="text-foreground">
                  <SelectValue placeholder="Selecione o clube…" />
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
            <div className="min-w-[180px] flex-1 space-y-2">
              <Label className="text-sm text-muted-foreground">Categoria</Label>
              <Select
                value={category || "__all__"}
                onValueChange={(v) => setCategory(v === "__all__" ? "" : v)}
                disabled={!tenantId}
              >
                <SelectTrigger className="text-foreground">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas</SelectItem>
                  {categoriesForDropdown.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.labelPT}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {!tenantId ? (
        <p className="text-sm text-muted-foreground">Selecione um clube para continuar.</p>
      ) : (
        <CoachTeamReportPanel
          tenantId={tenantId}
          category={category || undefined}
          contextLoading={loading}
          context={context}
          readOnly={!canEdit}
          defaultStatusFilter={canEdit ? "all" : "enviado"}
          showSummary
        />
      )}
    </div>
  );
}

export function FutebolRelatorioEquipeForm() {
  return (
    <Suspense fallback={<Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />}>
      <FutebolRelatorioEquipeFormInner />
    </Suspense>
  );
}
