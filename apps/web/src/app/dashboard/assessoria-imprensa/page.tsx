"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, Newspaper } from "lucide-react";
import type { Tenant } from "@/types/tenant";
import { AssessoriaImprensaPanel } from "@/components/dashboard/AssessoriaImprensaPanel";
import { getImprensaPageHref } from "@/lib/imprensa-display";
import {
  DashboardDeptHeader,
  DashboardDeptToolbarAside,
} from "@/components/dashboard/DashboardDeptHeader";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AssessoriaImprensaPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/tenants", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (cancelled) return;
        const arr = Array.isArray(data) ? (data as Tenant[]) : [];
        setTenants(arr);
        if (arr.length === 1) setTenantId(arr[0]!.id);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = useMemo(() => tenants.find((t) => t.id === tenantId), [tenants, tenantId]);
  const publicHref = selected?.slug ? getImprensaPageHref(selected.slug) : null;

  return (
    <>
      <DashboardDeptHeader
        section="Imprensa"
        sectionIcon={Newspaper}
        title="Central editorial"
        description="Press releases, jornalistas, fotos de jogos, códigos de acesso e links para fotógrafos."
        stats={[
          { value: tenants.length, label: "Clubes" },
          { value: selected ? 1 : 0, label: "Selecionado" },
        ]}
        toolbar={
          <>
            <div className="relative flex-1">
              {loading ? (
                <div className="flex min-h-[44px] items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando clubes…
                </div>
              ) : tenants.length === 0 ? (
                <div className="flex min-h-[44px] items-center rounded-md border border-input bg-background px-3 text-sm text-muted-foreground">
                  Nenhum clube cadastrado.
                </div>
              ) : (
                <Select value={tenantId || undefined} onValueChange={setTenantId}>
                  <SelectTrigger className="min-h-[44px] w-full">
                    <SelectValue placeholder="Selecione o clube / empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name ?? t.slug}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {publicHref ? (
              <DashboardDeptToolbarAside>
                <Button variant="outline" className="min-h-[44px] gap-2" asChild>
                  <a href={publicHref} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Ver página pública
                  </a>
                </Button>
              </DashboardDeptToolbarAside>
            ) : null}
          </>
        }
      />

      {selected?.slug ? (
        <AssessoriaImprensaPanel tenantId={selected.id} clubSlug={selected.slug} clubName={selected.name ?? selected.slug} />
      ) : !loading && tenants.length > 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center">
          <Newspaper className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">Selecione um clube acima para gerenciar a imprensa.</p>
        </div>
      ) : null}
    </>
  );
}
