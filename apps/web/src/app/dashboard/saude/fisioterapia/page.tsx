"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, Loader2, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { PhysioBodyMap } from "@/components/dashboard/fisioterapia/PhysioBodyMap";
import type { PhysioSession } from "@/types/fisioterapia";
import { cn } from "@/lib/utils";
import { isFootballKind } from "@/lib/home-data";

type Tenant = { id: string; name: string; kind?: { name?: string } };

const STATUS_LABEL: Record<string, string> = {
  active: "Em tratamento",
  completed: "Alta",
  cancelled: "Cancelado",
};

export default function FisioterapiaPage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [status, setStatus] = useState("active");
  const [sessions, setSessions] = useState<PhysioSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!canAccessModule("saude")) router.replace("/403");
  }, [authLoading, canAccessModule, router]);

  useEffect(() => {
    api.get<Tenant[]>("/tenants?clubsOnly=1").then(({ data }) => {
      const list = (Array.isArray(data) ? data : []).filter((t) => isFootballKind(t.kind?.name ?? ""));
      setTenants(list);
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tenantId) params.set("tenantId", tenantId);
      if (status) params.set("status", status);
      const { data } = await api.get<PhysioSession[]>(`/fisioterapia/sessions?${params}`);
      setSessions(Array.isArray(data) ? data : []);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, status]);

  useEffect(() => {
    if (authLoading || !canAccessModule("saude")) return;
    void load();
  }, [authLoading, canAccessModule, load]);

  if (authLoading || !canAccessModule("saude")) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeMarks = sessions
    .filter((s) => s.status === "active")
    .map((s) => ({
      regionId: s.regionId,
      side: s.side,
      view: s.bodyMapView,
      x: s.bodyMapX,
      y: s.bodyMapY,
      label: s.diagnosisLabel ?? undefined,
    }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Activity className="h-8 w-8" />
            Fisioterapia
          </h1>
          <p className="mt-1 text-muted-foreground">Atendimentos, mapa corporal e evolução até a alta.</p>
        </div>
        <Button asChild className="min-h-[44px]">
          <Link href="/dashboard/saude/fisioterapia/novo">
            <Plus className="mr-2 h-4 w-4" />
            Novo atendimento
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <NativeSelect
          className="min-h-[44px] w-full sm:w-[220px]"
          value={tenantId}
          onChange={(e) => setTenantId(e.target.value)}
        >
          <option value="">Todos os clubes</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </NativeSelect>
        <NativeSelect
          className="min-h-[44px] w-full sm:w-[180px]"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="active">Em tratamento</option>
          <option value="completed">Alta</option>
          <option value="cancelled">Cancelados</option>
          <option value="all">Todos</option>
        </NativeSelect>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Mapa — ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <PhysioBodyMap view="front" marks={activeMarks} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {loading ? "Carregando…" : `${sessions.length} atendimento(s)`}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
              </div>
            ) : sessions.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhum atendimento neste filtro.</p>
            ) : (
              sessions.map((s) => (
                <Link
                  key={s.id}
                  href={`/dashboard/saude/fisioterapia/${s.id}`}
                  className={cn(
                    "block rounded-lg border p-3 transition-colors hover:bg-muted/40",
                    s.status === "active" ? "border-amber-500/40" : "border-border/60",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold">{s.player?.name ?? "Atleta"}</p>
                      <p className="text-sm text-muted-foreground">
                        {s.tenant?.name}
                        {s.category ? ` · ${s.category}` : ""}
                      </p>
                      <p className="mt-1 text-sm">
                        {s.region?.namePt ?? s.regionId}
                        {s.side === "E" ? " E" : s.side === "D" ? " D" : ""}
                        {s.diagnosisLabel ? ` · ${s.diagnosisLabel}` : ""}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        s.status === "active"
                          ? "bg-amber-500 text-amber-950"
                          : s.status === "completed"
                            ? "bg-emerald-600 text-white"
                            : "bg-zinc-600 text-white",
                      )}
                    >
                      {STATUS_LABEL[s.status] ?? s.status}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
