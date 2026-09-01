"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Stethoscope } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { MedicalDeparture } from "@/types/medical-departure";
import {
  MEDICAL_DEPARTURE_CARE_TYPE_LABEL,
  MEDICAL_DEPARTURE_CARE_TYPE_OPTIONS,
  MEDICAL_DEPARTURE_STATUS_LABEL,
  MEDICAL_DEPARTURE_STATUS_OPTIONS,
  MEDICAL_DEPARTURE_TRANSPORT_LABEL,
  MEDICAL_DEPARTURE_TRANSPORT_OPTIONS,
  formatMedicalDepartureDateTime,
} from "@/lib/medical-departure-labels";
import { cn } from "@/lib/utils";
import { isFootballKind } from "@/lib/home-data";
import { filterCategoriesForTenant, getCategoryLabel } from "@/lib/fixture-categories";
import { useFixtureCategories } from "@/hooks/useFixtureCategories";

type Tenant = { id: string; name: string; categories?: string[] | null; kind?: { name?: string } };
type PlayerOpt = { id: string; name: string; category?: string | null };

export default function MedicoSaidasPage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();
  const { categories: allCats } = useFixtureCategories();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [players, setPlayers] = useState<PlayerOpt[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [category, setCategory] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [careType, setCareType] = useState("");
  const [transportMode, setTransportMode] = useState("");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rows, setRows] = useState<MedicalDeparture[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!canAccessModule("saude")) router.replace("/403");
  }, [authLoading, canAccessModule, router]);

  useEffect(() => {
    api.get<Tenant[]>("/tenants?clubsOnly=1").then(({ data }) => {
      setTenants((Array.isArray(data) ? data : []).filter((t) => isFootballKind(t.kind?.name ?? "")));
    });
  }, []);

  useEffect(() => {
    if (!tenantId) {
      setPlayers([]);
      return;
    }
    const params = new URLSearchParams({ tenantId });
    if (category) params.set("category", category);
    api
      .get<PlayerOpt[]>(`/players?${params}`)
      .then(({ data }) => setPlayers(Array.isArray(data) ? data : []))
      .catch(() => setPlayers([]));
  }, [tenantId, category]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tenantId) params.set("tenantId", tenantId);
      if (category) params.set("category", category);
      if (playerId) params.set("playerId", playerId);
      if (careType) params.set("careType", careType);
      if (transportMode) params.set("transportMode", transportMode);
      if (status) params.set("status", status);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const { data } = await api.get<MedicalDeparture[]>(`/medical-departures?${params}`);
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, category, playerId, careType, transportMode, status, from, to]);

  useEffect(() => {
    if (authLoading || !canAccessModule("saude")) return;
    void load();
  }, [authLoading, canAccessModule, load]);

  const categoriesForClub = useMemo(() => {
    const t = tenants.find((x) => x.id === tenantId);
    return filterCategoriesForTenant(allCats, t?.categories);
  }, [tenants, tenantId, allCats]);

  if (authLoading || !canAccessModule("saude")) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Stethoscope className="h-8 w-8" />
            Saídas do CT
          </h1>
        </div>
        <Button asChild className="min-h-[44px]">
          <Link href="/dashboard/medico/saidas/novo">
            <Plus className="mr-2 h-4 w-4" />
            Registrar saída
          </Link>
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <NativeSelect className="min-h-[44px] text-foreground" value={tenantId} onChange={(e) => setTenantId(e.target.value)}>
          <option value="">Todos os clubes</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </NativeSelect>
        <NativeSelect className="min-h-[44px] text-foreground" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Todas categorias</option>
          {categoriesForClub.map((c) => (
            <option key={c.value} value={c.value}>{getCategoryLabel(c.value, "pt", allCats)}</option>
          ))}
        </NativeSelect>
        <NativeSelect className="min-h-[44px] text-foreground" value={playerId} onChange={(e) => setPlayerId(e.target.value)} disabled={!tenantId}>
          <option value="">Todos atletas</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </NativeSelect>
        <NativeSelect className="min-h-[44px] text-foreground" value={status} onChange={(e) => setStatus(e.target.value)}>
          {MEDICAL_DEPARTURE_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </NativeSelect>
        <NativeSelect className="min-h-[44px] text-foreground" value={careType} onChange={(e) => setCareType(e.target.value)}>
          <option value="">Todos atendimentos</option>
          {MEDICAL_DEPARTURE_CARE_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </NativeSelect>
        <NativeSelect className="min-h-[44px] text-foreground" value={transportMode} onChange={(e) => setTransportMode(e.target.value)}>
          <option value="">Todos transportes</option>
          {MEDICAL_DEPARTURE_TRANSPORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </NativeSelect>
        <Input type="date" className="min-h-[44px] text-foreground" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input type="date" className="min-h-[44px] text-foreground" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{loading ? "Carregando…" : `${rows.length} saída(s)`}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma saída neste filtro.</p>
          ) : (
            rows.map((r) => (
              <Link
                key={r.id}
                href={`/dashboard/medico/saidas/${r.id}`}
                className={cn(
                  "block rounded-lg border p-3 transition-colors hover:bg-muted/40",
                  r.status === "programada" || r.status === "em_atendimento"
                    ? "border-amber-500/40"
                    : "border-border/60",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold">{r.player?.name ?? "Atleta"}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatMedicalDepartureDateTime(r.departedAt)}
                      {r.tenant?.name ? ` · ${r.tenant.name}` : ""}
                      {r.category ? ` · ${getCategoryLabel(r.category, "pt", allCats)}` : ""}
                    </p>
                    <p className="mt-1 text-sm">
                      {MEDICAL_DEPARTURE_CARE_TYPE_LABEL[r.careType]} · {r.destination}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {MEDICAL_DEPARTURE_TRANSPORT_LABEL[r.transportMode]}
                      {r.companionName ? ` · ${r.companionName}` : ""}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      r.status === "programada" || r.status === "em_atendimento"
                        ? "bg-amber-500 text-amber-950"
                        : r.status === "retornou"
                          ? "bg-emerald-600 text-white"
                          : "bg-zinc-600 text-white",
                    )}
                  >
                    {MEDICAL_DEPARTURE_STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
