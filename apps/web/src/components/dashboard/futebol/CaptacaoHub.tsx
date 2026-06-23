"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ClipboardList,
  Eye,
  Loader2,
  Plus,
  Star,
  UserPlus,
  Users,
  Map,
  CheckCircle2,
  UserCheck,
  Scale,
} from "lucide-react";
import {
  DashboardDeptHeader,
  DashboardDeptSearch,
  DashboardDeptSection,
  DashboardDeptTabs,
  DashboardDeptToolbarAside,
} from "@/components/dashboard/DashboardDeptHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { FIXTURE_CATEGORIES } from "@/lib/fixture-categories";
import { FootballPositionSelect } from "@/components/dashboard/players/FootballPositionSelect";
import { getPositionLabel } from "@/lib/football-positions";
import {
  type CaptacaoStats,
  type Scout,
  type ScoutDetail,
  type ScoutingProspect,
  type ScoutingReport,
  type DimensionFormState,
  SCOUTING_STAGES,
  SCOUTING_PRIORITIES,
  SCOUTING_SOURCES,
  COMPETITION_LEVELS,
  CONTRACT_SITUATIONS,
  RECOMMENDATIONS,
  OBSERVATION_TYPES,
  REPORT_DIMENSIONS,
  emptyDimensionEvals,
  buildReportDimensions,
  labelForStage,
  labelForPriority,
  labelForRecommendation,
  labelForLocationStatus,
  locationStatusClass,
  labelForLegalStatus,
  CAPTACAO_ONLY_STAGES,
  stageBadgeClass,
  priorityBadgeClass,
  type CaptacaoMapData,
} from "@/lib/captacao-types";
import { CaptacaoFieldMode } from "@/components/dashboard/futebol/CaptacaoFieldMode";
import { getCurrentPosition, isGeolocationAvailable } from "@/lib/scout-geolocation";

const CaptacaoScoutMap = dynamic(
  () =>
    import("@/components/dashboard/futebol/CaptacaoScoutMap").then((m) => ({
      default: m.CaptacaoScoutMap,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[420px] items-center justify-center rounded-xl border border-border">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  },
);

interface Tenant {
  id: string;
  name: string;
}

const EMPTY_PROSPECT = {
  name: "",
  position: "",
  birthDate: "",
  nationality: "Brasil",
  currentClub: "",
  competition: "",
  competitionLevel: "",
  contractSituation: "",
  agentName: "",
  agentPhone: "",
  source: "jogo",
  sourceDetails: "",
  targetCategory: "",
  priority: "media",
  stage: "identificado",
  scoutId: "",
  notes: "",
};

const CAPTACAO_MAIN_TABS = [
  { id: "pipeline", label: "Pipeline", icon: Eye },
  { id: "mapa", label: "Mapa GPS", icon: Map },
  { id: "captadores", label: "Captadores", icon: Users },
  { id: "relatorios", label: "Relatórios", icon: ClipboardList },
] as const;

type CaptacaoMainTab = (typeof CAPTACAO_MAIN_TABS)[number]["id"];

export function CaptacaoHub() {
  const { canAccessModule, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const tenantId = searchParams.get("tenantId") ?? "";

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [stats, setStats] = useState<CaptacaoStats | null>(null);
  const [scouts, setScouts] = useState<Scout[]>([]);
  const [prospects, setProspects] = useState<ScoutingProspect[]>([]);
  const [reports, setReports] = useState<ScoutingReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("pipeline");
  const [filterStage, setFilterStage] = useState("");
  const [filterScout, setFilterScout] = useState("");
  const [search, setSearch] = useState("");
  const [selectedScoutId, setSelectedScoutId] = useState<string | null>(null);
  const [scoutDetail, setScoutDetail] = useState<ScoutDetail | null>(null);
  const [loadingScoutDetail, setLoadingScoutDetail] = useState(false);
  const [mapData, setMapData] = useState<CaptacaoMapData | null>(null);
  const [mapScoutId, setMapScoutId] = useState<string | null>(null);

  const [scoutForm, setScoutForm] = useState({
    name: "",
    email: "",
    phone: "",
    regions: "",
    categories: "",
    specialties: "",
    licenseInfo: "",
    notes: "",
  });
  const [prospectForm, setProspectForm] = useState({ ...EMPTY_PROSPECT });
  const [reportForm, setReportForm] = useState({
    prospectId: "",
    scoutId: "",
    matchName: "",
    matchDate: "",
    competition: "",
    minutesObserved: "",
    positionPlayed: "",
    observationType: "ao_vivo",
    recommendation: "continuar",
    overallRating: "3",
    strengths: "",
    weaknesses: "",
    risks: "",
    scoutNotes: "",
  });
  const [dimensionEvals, setDimensionEvals] = useState<DimensionFormState>(() =>
    emptyDimensionEvals(),
  );

  const effectiveTenantId = tenantId || tenants[0]?.id || "";

  const loadAll = useCallback(async () => {
    if (!canAccessModule("futebol_captacao")) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (effectiveTenantId) params.set("tenantId", effectiveTenantId);
      if (filterStage) params.set("stage", filterStage);
      if (filterScout) params.set("scoutId", filterScout);
      if (search.trim()) params.set("search", search.trim());
      const qs = params.toString();
      const suffix = qs ? `?${qs}` : "";

      const scoutParams = new URLSearchParams(params);
      scoutParams.set("active", "true");
      const [statsRes, scoutsRes, prospectsRes, reportsRes] = await Promise.all([
        api.get<CaptacaoStats>(`/captacao/stats${suffix}`),
        api.get<Scout[]>(`/captacao/scouts?${scoutParams.toString()}`),
        api.get<ScoutingProspect[]>(`/captacao/prospects${suffix}`),
        api.get<ScoutingReport[]>(`/captacao/reports${suffix}`),
      ]);
      setStats(statsRes.data);
      setScouts(scoutsRes.data ?? []);
      setProspects(prospectsRes.data ?? []);
      setReports(reportsRes.data ?? []);
    } catch {
      setError("Não foi possível carregar os dados de captação.");
    } finally {
      setLoading(false);
    }
  }, [canAccessModule, effectiveTenantId, filterStage, filterScout, search]);

  const loadMapData = useCallback(async () => {
    if (!canAccessModule("futebol_captacao")) return;
    try {
      const q = effectiveTenantId ? `?tenantId=${effectiveTenantId}` : "";
      const { data } = await api.get<CaptacaoMapData>(`/captacao/map${q}`);
      setMapData(data);
    } catch {
      /* mapa opcional */
    }
  }, [canAccessModule, effectiveTenantId]);

  useEffect(() => {
    api.get<Tenant[]>("/tenants?clubsOnly=1").then(({ data }) => {
      setTenants(Array.isArray(data) ? data : []);
    });
  }, []);

  useEffect(() => {
    if (!authLoading && canAccessModule("futebol_captacao")) {
      void loadAll();
    }
  }, [authLoading, canAccessModule, loadAll]);

  useEffect(() => {
    if (tab === "mapa") {
      void loadMapData();
      const id = setInterval(() => void loadMapData(), 30_000);
      return () => clearInterval(id);
    }
  }, [tab, loadMapData]);

  const loadScoutDetail = useCallback(async (scoutId: string) => {
    setSelectedScoutId(scoutId);
    setLoadingScoutDetail(true);
    setScoutDetail(null);
    try {
      const { data } = await api.get<ScoutDetail>(`/captacao/scouts/${scoutId}`);
      setScoutDetail(data);
    } catch {
      setError("Não foi possível carregar o histórico do captador.");
      setSelectedScoutId(null);
    } finally {
      setLoadingScoutDetail(false);
    }
  }, []);

  const pipelineColumns = useMemo(() => {
    const active = SCOUTING_STAGES.filter((s) =>
      (CAPTACAO_ONLY_STAGES as readonly string[]).includes(s.value),
    );
    return active.map((col) => ({
      ...col,
      items: prospects.filter((p) => p.stage === col.value),
    }));
  }, [prospects]);

  const approvedProspects = useMemo(
    () => prospects.filter((p) => p.stage === "aprovado"),
    [prospects],
  );

  const clubAthletes = useMemo(
    () => prospects.filter((p) => p.stage === "cadastrado"),
    [prospects],
  );

  const mainTabActive: CaptacaoMainTab =
    tab === "novo-prospect"
      ? "pipeline"
      : tab === "novo-relatorio"
        ? "relatorios"
        : tab === "novo-captador"
          ? "captadores"
          : CAPTACAO_MAIN_TABS.some((t) => t.id === tab)
            ? (tab as CaptacaoMainTab)
            : "pipeline";

  const headerStats = useMemo(
    () => [
      { value: stats?.activeProspects ?? 0, label: "Prospects" },
      { value: stats?.totalScouts ?? 0, label: "Captadores" },
      { value: stats?.totalReports ?? 0, label: "Relatórios" },
      { value: stats?.byPriority?.alta ?? 0, label: "Prioridade alta" },
    ],
    [stats],
  );

  function handleMainTabChange(id: CaptacaoMainTab) {
    setTab(id);
    if (id !== "captadores") {
      setSelectedScoutId(null);
      setScoutDetail(null);
    }
  }

  const manualStageOptions = SCOUTING_STAGES.filter(
    (s) => s.value !== "aprovado" && s.value !== "cadastrado",
  );

  async function handleCreateScout(e: React.FormEvent) {
    e.preventDefault();
    if (!effectiveTenantId) return;
    setSaving(true);
    setError(null);
    try {
      await api.post("/captacao/scouts", {
        tenantId: effectiveTenantId,
        name: scoutForm.name,
        email: scoutForm.email || undefined,
        phone: scoutForm.phone || undefined,
        regions: scoutForm.regions
          ? scoutForm.regions.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined,
        categories: scoutForm.categories
          ? scoutForm.categories.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined,
        specialties: scoutForm.specialties
          ? scoutForm.specialties.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined,
        licenseInfo: scoutForm.licenseInfo || undefined,
        notes: scoutForm.notes || undefined,
      });
      setScoutForm({
        name: "",
        email: "",
        phone: "",
        regions: "",
        categories: "",
        specialties: "",
        licenseInfo: "",
        notes: "",
      });
      setTab("captadores");
      await loadAll();
    } catch {
      setError("Erro ao cadastrar captador.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateProspect(e: React.FormEvent) {
    e.preventDefault();
    if (!effectiveTenantId) return;
    setSaving(true);
    setError(null);
    try {
      await api.post("/captacao/prospects", {
        tenantId: effectiveTenantId,
        ...prospectForm,
        scoutId: prospectForm.scoutId || undefined,
      });
      setProspectForm({ ...EMPTY_PROSPECT });
      setTab("pipeline");
      await loadAll();
    } catch {
      setError("Erro ao cadastrar prospect.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateReport(e: React.FormEvent) {
    e.preventDefault();
    if (!effectiveTenantId) return;
    setSaving(true);
    setError(null);
    try {
      const dimensions = buildReportDimensions(dimensionEvals);
      let geo: { latitude: number; longitude: number; reverseGeocode: boolean } | undefined;
      if (isGeolocationAvailable()) {
        try {
          const pos = await getCurrentPosition();
          geo = {
            latitude: pos.latitude,
            longitude: pos.longitude,
            reverseGeocode: true,
          };
        } catch {
          /* relatório sem GPS se usuário negar */
        }
      }
      await api.post("/captacao/reports", {
        tenantId: effectiveTenantId,
        prospectId: reportForm.prospectId,
        scoutId: reportForm.scoutId,
        matchName: reportForm.matchName || undefined,
        matchDate: reportForm.matchDate || undefined,
        competition: reportForm.competition || undefined,
        minutesObserved: reportForm.minutesObserved
          ? Number(reportForm.minutesObserved)
          : undefined,
        positionPlayed: reportForm.positionPlayed || undefined,
        observationType: reportForm.observationType,
        recommendation: reportForm.recommendation,
        overallRating: Number(reportForm.overallRating),
        ...dimensions,
        ...geo,
        strengths: reportForm.strengths || undefined,
        weaknesses: reportForm.weaknesses || undefined,
        risks: reportForm.risks || undefined,
        scoutNotes: reportForm.scoutNotes || undefined,
      });
      setReportForm({
        prospectId: "",
        scoutId: "",
        matchName: "",
        matchDate: "",
        competition: "",
        minutesObserved: "",
        positionPlayed: "",
        observationType: "ao_vivo",
        recommendation: "continuar",
        overallRating: "3",
        strengths: "",
        weaknesses: "",
        risks: "",
        scoutNotes: "",
      });
      setDimensionEvals(emptyDimensionEvals());
      setTab("relatorios");
      await loadAll();
      await loadMapData();
    } catch {
      setError("Erro ao salvar relatório.");
    } finally {
      setSaving(false);
    }
  }

  async function updateProspectStage(id: string, stage: string) {
    try {
      await api.patch(`/captacao/prospects/${id}`, { stage });
      await loadAll();
    } catch {
      setError("Erro ao atualizar estágio.");
    }
  }

  async function approveProspect(id: string) {
    try {
      await api.post(`/captacao/prospects/${id}/approve`, {});
      await loadAll();
    } catch {
      setError("Erro na aprovação do supervisor.");
    }
  }

  async function promoteProspect(id: string) {
    try {
      const { data } = await api.post<{
        player: { id: string; name: string };
        created: boolean;
      }>(`/captacao/prospects/${id}/promote`, {});
      await loadAll();
      if (data?.player?.id) {
        window.open(
          `/dashboard/cadastros/jogadores/${data.player.id}/edit`,
          "_blank",
        );
      }
    } catch {
      setError("Erro ao gerar cadastro de atleta. Confirme aprovação do supervisor.");
    }
  }

  function renderProspectActions(p: ScoutingProspect) {
    const canApprove = ["tryout", "negociacao", "prioridade"].includes(p.stage);
    return (
      <div className="mt-2 flex flex-wrap gap-1">
        {canApprove && !p.playerId && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-7 text-[10px] uppercase"
            onClick={() => void approveProspect(p.id)}
          >
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Aprovar supervisor
          </Button>
        )}
        {p.stage === "aprovado" && !p.playerId && (
          <Button
            type="button"
            size="sm"
            className="h-7 text-[10px] uppercase"
            onClick={() => void promoteProspect(p.id)}
          >
            <UserCheck className="mr-1 h-3 w-3" />
            Cadastrar no clube
          </Button>
        )}
        {p.playerId && (
          <Link
            href={`/dashboard/cadastros/jogadores/${p.playerId}/edit`}
            className="inline-flex h-7 items-center rounded-md border border-border px-2 text-[10px] uppercase hover:bg-muted/50"
          >
            Ficha do atleta
          </Link>
        )}
        {p.stage === "cadastrado" && p.playerId && (
          <Link
            href={`/dashboard/juridico/${p.playerId}`}
            className="inline-flex h-7 items-center rounded-md border border-violet-500/30 px-2 text-[10px] uppercase text-violet-300 hover:bg-violet-500/10"
          >
            <Scale className="mr-1 h-3 w-3" />
            Jurídico
          </Link>
        )}
      </div>
    );
  }

  if (authLoading || !canAccessModule("futebol_captacao")) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <DashboardDeptHeader
        section="Depto Futebol"
        sectionIcon={UserPlus}
        title="Captação"
        description="Prospects, captadores e relatórios de scouting — separado do cadastro oficial."
        backHref="/dashboard/futebol"
        stats={headerStats}
        toolbar={
          <div className="flex w-full flex-col gap-3">
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end">
              <div className="w-full sm:w-[min(220px,100%)] shrink-0">
                <Label className="mb-1.5 block text-xs text-muted-foreground">Clube</Label>
                <Select
                  value={effectiveTenantId || "none"}
                  onValueChange={(v) => {
                    const params = new URLSearchParams(searchParams.toString());
                    if (v === "none") params.delete("tenantId");
                    else params.set("tenantId", v);
                    window.history.replaceState(null, "", `?${params.toString()}`);
                    window.location.reload();
                  }}
                >
                  <SelectTrigger className="min-h-[44px] text-foreground">
                    <SelectValue placeholder="Selecione o clube" />
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
              <DashboardDeptSearch
                value={search}
                onChange={setSearch}
                placeholder="Buscar atleta ou clube…"
                className="min-w-0"
              />
              <Button
                type="button"
                variant="secondary"
                className="min-h-[44px] shrink-0"
                onClick={() => void loadAll()}
              >
                Filtrar
              </Button>
            </div>
            <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center">
              <div className="min-w-0 flex-1">
                <DashboardDeptTabs
                  tabs={[...CAPTACAO_MAIN_TABS]}
                  active={mainTabActive}
                  onChange={handleMainTabChange}
                />
              </div>
              <DashboardDeptToolbarAside>
                {tab === "novo-prospect" ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-[44px]"
                    onClick={() => setTab("pipeline")}
                  >
                    Voltar ao pipeline
                  </Button>
                ) : tab === "novo-relatorio" ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-[44px]"
                    onClick={() => setTab("relatorios")}
                  >
                    Voltar aos relatórios
                  </Button>
                ) : tab === "novo-captador" ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-[44px]"
                    onClick={() => setTab("captadores")}
                  >
                    Voltar aos captadores
                  </Button>
                ) : mainTabActive === "pipeline" ? (
                  <Button
                    type="button"
                    className="min-h-[44px]"
                    onClick={() => setTab("novo-prospect")}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Novo prospect
                  </Button>
                ) : mainTabActive === "relatorios" ? (
                  <Button
                    type="button"
                    className="min-h-[44px]"
                    onClick={() => setTab("novo-relatorio")}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Novo relatório
                  </Button>
                ) : mainTabActive === "captadores" ? (
                  <Button
                    type="button"
                    className="min-h-[44px]"
                    onClick={() => setTab("novo-captador")}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Novo captador
                  </Button>
                ) : null}
              </DashboardDeptToolbarAside>
            </div>
          </div>
        }
      />

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {tab === "pipeline" && (
            <DashboardDeptSection
              title="Pipeline"
              description="Prospects por estágio — da identificação até try-out e negociação."
              aside={
                <div className="flex flex-wrap gap-2">
                  <Select
                    value={filterStage || "all"}
                    onValueChange={(v) => setFilterStage(v === "all" ? "" : v)}
                  >
                    <SelectTrigger className="min-h-[44px] w-[min(180px,100%)] text-foreground">
                      <SelectValue placeholder="Estágio" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos estágios</SelectItem>
                      {SCOUTING_STAGES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={filterScout || "all"}
                    onValueChange={(v) => setFilterScout(v === "all" ? "" : v)}
                  >
                    <SelectTrigger className="min-h-[44px] w-[min(200px,100%)] text-foreground">
                      <SelectValue placeholder="Captador" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos captadores</SelectItem>
                      {scouts.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              }
            >
              <div className="hidden gap-3 overflow-x-auto pb-2 lg:flex">
                {pipelineColumns.map((col) => (
                  <div
                    key={col.value}
                    className="min-w-[220px] flex-1 rounded-lg border border-border bg-card/50 p-3"
                  >
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      {col.label} ({col.items.length})
                    </p>
                    <div className="space-y-2">
                      {col.items.map((p) => (
                        <div
                          key={p.id}
                          className="rounded-md border border-border bg-background p-2 text-sm"
                        >
                          <p className="font-semibold">{p.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {getPositionLabel(p.position) || "—"} · {p.currentClub ?? "Sem clube"}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            <span
                              className={`rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase ${priorityBadgeClass(p.priority)}`}
                            >
                              {labelForPriority(p.priority)}
                            </span>
                            {p.overallRating != null && (
                              <span className="flex items-center gap-0.5 text-[10px] text-amber-400">
                                <Star className="h-3 w-3 fill-current" />
                                {p.overallRating.toFixed(1)}
                              </span>
                            )}
                          </div>
                          {p.scout && (
                            <p className="mt-1 text-[10px] text-muted-foreground">
                              Captador: {p.scout.name}
                            </p>
                          )}
                          <Select
                            value={p.stage}
                            onValueChange={(v) => updateProspectStage(p.id, v)}
                          >
                            <SelectTrigger className="mt-2 h-8 text-xs text-foreground">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {manualStageOptions.map((s) => (
                                <SelectItem key={s.value} value={s.value}>
                                  {s.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {renderProspectActions(p)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {(approvedProspects.length > 0 || clubAthletes.length > 0) && (
                <div className="grid gap-4 lg:grid-cols-2">
                  {approvedProspects.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">
                          Aguardando cadastro no clube ({approvedProspects.length})
                        </CardTitle>
                        <CardDescription>
                          Aprovados pelo supervisor — falta gerar a ficha em Cadastros.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {approvedProspects.map((p) => (
                          <div
                            key={p.id}
                            className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm"
                          >
                            <p className="font-semibold">{p.name}</p>
                            {p.supervisorApprovedBy && (
                              <p className="text-xs text-muted-foreground">
                                Aprovado por {p.supervisorApprovedBy}
                                {p.supervisorApprovedAt &&
                                  ` · ${new Date(p.supervisorApprovedAt).toLocaleDateString("pt-BR")}`}
                              </p>
                            )}
                            {renderProspectActions(p)}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                  {clubAthletes.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">
                          Atletas do clube ({clubAthletes.length})
                        </CardTitle>
                        <CardDescription>
                          Cadastro gerado — concluir parte legal no Jurídico.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {clubAthletes.map((p) => (
                          <div
                            key={p.id}
                            className="rounded-md border border-violet-500/30 bg-violet-500/5 p-3 text-sm"
                          >
                            <p className="font-semibold">{p.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {p.legalStatus
                                ? labelForLegalStatus(p.legalStatus)
                                : "Jurídico pendente"}
                            </p>
                            {renderProspectActions(p)}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              <Card className="lg:hidden">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Atleta</TableHead>
                        <TableHead>Estágio</TableHead>
                        <TableHead>Captador</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {prospects.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>
                            <p className="font-medium">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.currentClub}</p>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`rounded border px-2 py-0.5 text-xs uppercase ${stageBadgeClass(p.stage)}`}
                            >
                              {labelForStage(p.stage)}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">{p.scout?.name ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </DashboardDeptSection>
          )}

          {tab === "mapa" && (
            <DashboardDeptSection
              title="Mapa GPS"
              description="Rastreamento em campo e radar dos captadores."
            >
            <div className="space-y-4">
              <CaptacaoFieldMode
                scouts={scouts}
                onUpdated={() => {
                  void loadMapData();
                  void loadAll();
                }}
              />

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Map className="h-5 w-5" />
                    Radar de captadores
                  </CardTitle>
                  <CardDescription>
                    Posição ao vivo, trilha dos últimos 7 dias e raio de cobertura quando o
                    rastreamento está ativo. Verde = GPS ao vivo · Azul = visto nas últimas 24h.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {mapData ? (
                    <>
                      <CaptacaoScoutMap
                        data={mapData}
                        selectedScoutId={mapScoutId}
                        onSelectScout={(id) => {
                          setMapScoutId(id);
                          void loadScoutDetail(id);
                        }}
                        height={380}
                      />
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {mapData.scouts
                          .filter((s) => s.lastLatitude != null)
                          .map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                setMapScoutId(s.id);
                                void loadScoutDetail(s.id);
                                setTab("captadores");
                              }}
                              className={`rounded-lg border p-3 text-left text-sm transition-colors hover:bg-muted/40 ${
                                mapScoutId === s.id ? "border-primary bg-muted/30" : "border-border"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold">{s.name}</span>
                                <span
                                  className={`rounded border px-1.5 py-0.5 text-[10px] uppercase ${locationStatusClass(s.locationStatus)}`}
                                >
                                  {labelForLocationStatus(s.locationStatus)}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                                {s.lastLocationLabel ?? "Sem endereço"}
                              </p>
                            </button>
                          ))}
                        {mapData.scouts.filter((s) => s.lastLatitude != null).length === 0 && (
                          <p className="col-span-full text-sm text-muted-foreground">
                            Nenhum captador com GPS ainda. Use o modo campo acima (ideal no celular).
                          </p>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Atualizado:{" "}
                        {new Date(mapData.updatedAt).toLocaleTimeString("pt-BR")} · refresh a cada
                        30s
                      </p>
                    </>
                  ) : (
                    <div className="flex h-[200px] items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            </DashboardDeptSection>
          )}

          {tab === "captadores" && (
            <DashboardDeptSection
              title="Captadores"
              description="Clique em um captador para ver carteira ativa e histórico de relatórios."
            >
            <div className="space-y-4">
              <Card>
                <CardContent className="overflow-x-auto p-0 sm:p-6 sm:pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>GPS</TableHead>
                        <TableHead>Regiões</TableHead>
                        <TableHead>Categorias</TableHead>
                        <TableHead>Ativos</TableHead>
                        <TableHead>Relatórios</TableHead>
                        <TableHead>Contato</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scouts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground">
                            Nenhum captador cadastrado.
                          </TableCell>
                        </TableRow>
                      ) : (
                        scouts.map((s) => (
                          <TableRow
                            key={s.id}
                            className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                              selectedScoutId === s.id ? "bg-muted/40" : ""
                            }`}
                            onClick={() => void loadScoutDetail(s.id)}
                          >
                            <TableCell className="font-medium">{s.name}</TableCell>
                            <TableCell>
                              {s.locationStatus ? (
                                <span
                                  className={`rounded border px-1.5 py-0.5 text-[10px] uppercase ${locationStatusClass(s.locationStatus)}`}
                                >
                                  {labelForLocationStatus(s.locationStatus)}
                                </span>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell className="max-w-[120px] text-sm">
                              {(s.regions as string[] | null)?.join(", ") ?? "—"}
                            </TableCell>
                            <TableCell className="max-w-[120px] text-sm">
                              {(s.categories as string[] | null)?.join(", ") ?? "—"}
                            </TableCell>
                            <TableCell>{s.activeProspectsCount ?? 0}</TableCell>
                            <TableCell>{s.reportsCount ?? 0}</TableCell>
                            <TableCell className="text-sm">
                              {s.phone ?? s.email ?? "—"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {selectedScoutId && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {loadingScoutDetail ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Carregando...
                        </span>
                      ) : (
                        scoutDetail?.name ?? "Captador"
                      )}
                    </CardTitle>
                    {scoutDetail && (
                      <CardDescription className="space-y-1">
                        <span className="block">
                          {(scoutDetail.regions as string[] | null)?.join(" · ") || "Sem regiões"}
                          {(scoutDetail.specialties as string[] | null)?.length
                            ? ` · Foco: ${(scoutDetail.specialties as string[]).join(", ")}`
                            : ""}
                        </span>
                        {scoutDetail.licenseInfo && (
                          <span className="block">Licença: {scoutDetail.licenseInfo}</span>
                        )}
                        {scoutDetail.lastLocationLabel && (
                          <span className="block">
                            Última posição: {scoutDetail.lastLocationLabel}
                            {scoutDetail.lastLocationAt &&
                              ` · ${new Date(scoutDetail.lastLocationAt).toLocaleString("pt-BR")}`}
                          </span>
                        )}
                      </CardDescription>
                    )}
                  </CardHeader>
                  {scoutDetail && !loadingScoutDetail && (
                    <CardContent className="space-y-6">
                      <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          Carteira ativa — quem está captando ({scoutDetail.prospects?.length ?? 0})
                        </p>
                        {scoutDetail.prospects?.length ? (
                          <div className="space-y-2">
                            {scoutDetail.prospects.map((p) => (
                              <div
                                key={p.id}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background p-3 text-sm"
                              >
                                <div>
                                  <p className="font-semibold">{p.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {getPositionLabel(p.position) || "—"} · {p.currentClub ?? "Sem clube"}
                                  </p>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  <span
                                    className={`rounded border px-2 py-0.5 text-[10px] uppercase ${stageBadgeClass(p.stage)}`}
                                  >
                                    {labelForStage(p.stage)}
                                  </span>
                                  <span
                                    className={`rounded border px-2 py-0.5 text-[10px] uppercase ${priorityBadgeClass(p.priority)}`}
                                  >
                                    {labelForPriority(p.priority)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Nenhum prospect ativo na carteira.
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          Histórico de relatórios ({scoutDetail.reports?.length ?? 0})
                        </p>
                        {scoutDetail.reports?.length ? (
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Data</TableHead>
                                  <TableHead>Atleta</TableHead>
                                  <TableHead>Nota</TableHead>
                                  <TableHead>Recomendação</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {scoutDetail.reports.map((r) => (
                                  <TableRow key={r.id}>
                                    <TableCell className="text-sm">
                                      {new Date(r.reportDate).toLocaleDateString("pt-BR")}
                                    </TableCell>
                                    <TableCell>
                                      <p className="font-medium">{r.prospect?.name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {getPositionLabel(r.prospect?.position) || "—"}
                                      </p>
                                    </TableCell>
                                    <TableCell>{r.overallRating?.toFixed(1) ?? "—"}</TableCell>
                                    <TableCell className="text-xs uppercase">
                                      {labelForRecommendation(r.recommendation)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Ainda sem relatórios registrados.
                          </p>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              )}
            </div>
            </DashboardDeptSection>
          )}

          {tab === "relatorios" && (
            <DashboardDeptSection
              title="Relatórios"
              description="Observações de jogo e avaliações dos captadores."
            >
              <Card>
                <CardContent className="overflow-x-auto p-0 sm:p-6 sm:pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Atleta</TableHead>
                        <TableHead>Captador</TableHead>
                        <TableHead>Nota</TableHead>
                        <TableHead>Recomendação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            Nenhum relatório ainda.
                          </TableCell>
                        </TableRow>
                      ) : (
                        reports.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="text-sm">
                              {new Date(r.reportDate).toLocaleDateString("pt-BR")}
                            </TableCell>
                            <TableCell>
                              <p className="font-medium">{r.prospect?.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {r.prospect?.currentClub}
                              </p>
                            </TableCell>
                            <TableCell>{r.scout?.name}</TableCell>
                            <TableCell>{r.overallRating?.toFixed(1) ?? "—"}</TableCell>
                            <TableCell className="text-sm uppercase">
                              {labelForRecommendation(r.recommendation)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </DashboardDeptSection>
          )}

          {tab === "novo-prospect" && (
            <DashboardDeptSection
              title="Novo prospect"
              description="Dados mínimos de scouting — cadastro completo só após aprovação do supervisor."
            >
              <Card>
                <CardContent className="pt-6">
                  <form onSubmit={handleCreateProspect} className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Label>Nome completo *</Label>
                      <Input
                        required
                        className="text-foreground"
                        value={prospectForm.name}
                        onChange={(e) =>
                          setProspectForm((f) => ({ ...f, name: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Posição</Label>
                      <FootballPositionSelect
                        value={prospectForm.position || null}
                        onValueChange={(v) =>
                          setProspectForm((f) => ({
                            ...f,
                            position: v,
                          }))
                        }
                        placeholder="Posição"
                        showEmptyOption
                        emptyValue="none"
                        emptyLabel="—"
                        triggerClassName="text-foreground"
                      />
                    </div>
                    <div>
                      <Label>Data nascimento</Label>
                      <Input
                        type="date"
                        className="text-foreground"
                        value={prospectForm.birthDate}
                        onChange={(e) =>
                          setProspectForm((f) => ({ ...f, birthDate: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Clube atual</Label>
                      <Input
                        className="text-foreground"
                        value={prospectForm.currentClub}
                        onChange={(e) =>
                          setProspectForm((f) => ({ ...f, currentClub: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Competição / campeonato</Label>
                      <Input
                        className="text-foreground"
                        value={prospectForm.competition}
                        onChange={(e) =>
                          setProspectForm((f) => ({ ...f, competition: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Nível</Label>
                      <Select
                        value={prospectForm.competitionLevel || "none"}
                        onValueChange={(v) =>
                          setProspectForm((f) => ({
                            ...f,
                            competitionLevel: v === "none" ? "" : v,
                          }))
                        }
                      >
                        <SelectTrigger className="text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          {COMPETITION_LEVELS.map((l) => (
                            <SelectItem key={l.value} value={l.value}>
                              {l.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Situação contratual</Label>
                      <Select
                        value={prospectForm.contractSituation || "none"}
                        onValueChange={(v) =>
                          setProspectForm((f) => ({
                            ...f,
                            contractSituation: v === "none" ? "" : v,
                          }))
                        }
                      >
                        <SelectTrigger className="text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          {CONTRACT_SITUATIONS.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Agente / representante</Label>
                      <Input
                        className="text-foreground"
                        value={prospectForm.agentName}
                        onChange={(e) =>
                          setProspectForm((f) => ({ ...f, agentName: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Telefone agente</Label>
                      <Input
                        className="text-foreground"
                        value={prospectForm.agentPhone}
                        onChange={(e) =>
                          setProspectForm((f) => ({ ...f, agentPhone: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Origem</Label>
                      <Select
                        value={prospectForm.source}
                        onValueChange={(v) =>
                          setProspectForm((f) => ({ ...f, source: v }))
                        }
                      >
                        <SelectTrigger className="text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SCOUTING_SOURCES.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Captador responsável</Label>
                      <Select
                        value={prospectForm.scoutId || "none"}
                        onValueChange={(v) =>
                          setProspectForm((f) => ({
                            ...f,
                            scoutId: v === "none" ? "" : v,
                          }))
                        }
                      >
                        <SelectTrigger className="text-foreground">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          {scouts.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Categoria alvo no clube</Label>
                      <Select
                        value={prospectForm.targetCategory || "none"}
                        onValueChange={(v) =>
                          setProspectForm((f) => ({
                            ...f,
                            targetCategory: v === "none" ? "" : v,
                          }))
                        }
                      >
                        <SelectTrigger className="text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          {FIXTURE_CATEGORIES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.labelPT}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Prioridade</Label>
                      <Select
                        value={prospectForm.priority}
                        onValueChange={(v) =>
                          setProspectForm((f) => ({ ...f, priority: v }))
                        }
                      >
                        <SelectTrigger className="text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SCOUTING_PRIORITIES.map((p) => (
                            <SelectItem key={p.value} value={p.value}>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Detalhes da origem / contexto</Label>
                      <Textarea
                        className="text-foreground"
                        value={prospectForm.sourceDetails}
                        onChange={(e) =>
                          setProspectForm((f) => ({ ...f, sourceDetails: e.target.value }))
                        }
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Button type="submit" disabled={saving || !effectiveTenantId}>
                        {saving ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="mr-2 h-4 w-4" />
                        )}
                        Cadastrar prospect
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </DashboardDeptSection>
          )}

          {tab === "novo-relatorio" && (
            <DashboardDeptSection
              title="Novo relatório"
              description="Contexto do jogo e recomendação clara. O GPS é anexado automaticamente ao salvar, se permitido."
            >
              <Card>
                <CardContent className="pt-6">
                  <form onSubmit={handleCreateReport} className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label>Prospect *</Label>
                      <Select
                        required
                        value={reportForm.prospectId || "none"}
                        onValueChange={(v) =>
                          setReportForm((f) => ({
                            ...f,
                            prospectId: v === "none" ? "" : v,
                          }))
                        }
                      >
                        <SelectTrigger className="text-foreground">
                          <SelectValue placeholder="Atleta" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Selecione</SelectItem>
                          {prospects.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Captador *</Label>
                      <Select
                        required
                        value={reportForm.scoutId || "none"}
                        onValueChange={(v) =>
                          setReportForm((f) => ({
                            ...f,
                            scoutId: v === "none" ? "" : v,
                          }))
                        }
                      >
                        <SelectTrigger className="text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Selecione</SelectItem>
                          {scouts.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Jogo observado</Label>
                      <Input
                        className="text-foreground"
                        value={reportForm.matchName}
                        onChange={(e) =>
                          setReportForm((f) => ({ ...f, matchName: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Data do jogo</Label>
                      <Input
                        type="date"
                        className="text-foreground"
                        value={reportForm.matchDate}
                        onChange={(e) =>
                          setReportForm((f) => ({ ...f, matchDate: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Minutos observados</Label>
                      <Input
                        type="number"
                        min={1}
                        max={120}
                        className="text-foreground"
                        value={reportForm.minutesObserved}
                        onChange={(e) =>
                          setReportForm((f) => ({ ...f, minutesObserved: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Tipo</Label>
                      <Select
                        value={reportForm.observationType}
                        onValueChange={(v) =>
                          setReportForm((f) => ({ ...f, observationType: v }))
                        }
                      >
                        <SelectTrigger className="text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {OBSERVATION_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Nota geral (1–5)</Label>
                      <Select
                        value={reportForm.overallRating}
                        onValueChange={(v) =>
                          setReportForm((f) => ({ ...f, overallRating: v }))
                        }
                      >
                        <SelectTrigger className="text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Recomendação *</Label>
                      <Select
                        value={reportForm.recommendation}
                        onValueChange={(v) =>
                          setReportForm((f) => ({ ...f, recommendation: v }))
                        }
                      >
                        <SelectTrigger className="text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RECOMMENDATIONS.map((r) => (
                            <SelectItem key={r.value} value={r.value}>
                              {r.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Pontos fortes</Label>
                      <Textarea
                        className="text-foreground"
                        placeholder="Máx. 3–4 bullets objetivos"
                        value={reportForm.strengths}
                        onChange={(e) =>
                          setReportForm((f) => ({ ...f, strengths: e.target.value }))
                        }
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <p className="mb-3 text-sm font-semibold text-foreground">
                        Avaliação por dimensão (nota 1–5)
                      </p>
                      <div className="space-y-4">
                        {Object.entries(REPORT_DIMENSIONS).map(([dimKey, dim]) => (
                          <div
                            key={dimKey}
                            className="rounded-lg border border-border bg-card/30 p-3"
                          >
                            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                              {dim.label}
                            </p>
                            <div className="grid gap-3 sm:grid-cols-2">
                              {dim.areas.map((area) => (
                                <div key={area.key} className="space-y-1">
                                  <Label className="text-xs">{area.label}</Label>
                                  <div className="flex gap-2">
                                    <Select
                                      value={dimensionEvals[dimKey]?.[area.key]?.rating || "none"}
                                      onValueChange={(v) =>
                                        setDimensionEvals((prev) => ({
                                          ...prev,
                                          [dimKey]: {
                                            ...prev[dimKey],
                                            [area.key]: {
                                              ...prev[dimKey]?.[area.key],
                                              rating: v === "none" ? "" : v,
                                            },
                                          },
                                        }))
                                      }
                                    >
                                      <SelectTrigger className="h-9 w-20 text-foreground">
                                        <SelectValue placeholder="Nota" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">—</SelectItem>
                                        {[1, 2, 3, 4, 5].map((n) => (
                                          <SelectItem key={n} value={String(n)}>
                                            {n}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Input
                                      placeholder="Obs. rápida"
                                      className="h-9 flex-1 text-foreground text-xs"
                                      value={dimensionEvals[dimKey]?.[area.key]?.notes ?? ""}
                                      onChange={(e) =>
                                        setDimensionEvals((prev) => ({
                                          ...prev,
                                          [dimKey]: {
                                            ...prev[dimKey],
                                            [area.key]: {
                                              ...prev[dimKey]?.[area.key],
                                              notes: e.target.value,
                                            },
                                          },
                                        }))
                                      }
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Pontos a melhorar / riscos</Label>
                      <Textarea
                        className="text-foreground"
                        value={reportForm.weaknesses}
                        onChange={(e) =>
                          setReportForm((f) => ({ ...f, weaknesses: e.target.value }))
                        }
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Notas do captador</Label>
                      <Textarea
                        className="text-foreground"
                        value={reportForm.scoutNotes}
                        onChange={(e) =>
                          setReportForm((f) => ({ ...f, scoutNotes: e.target.value }))
                        }
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Button type="submit" disabled={saving || !effectiveTenantId}>
                        {saving ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="mr-2 h-4 w-4" />
                        )}
                        Salvar relatório
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </DashboardDeptSection>
          )}

          {tab === "novo-captador" && (
            <DashboardDeptSection
              title="Novo captador"
              description="Regiões, categorias e foco — histórico gerado pelos relatórios e prospects vinculados."
            >
              <Card>
                <CardContent className="pt-6">
                  <form onSubmit={handleCreateScout} className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Label>Nome *</Label>
                      <Input
                        required
                        className="text-foreground"
                        value={scoutForm.name}
                        onChange={(e) =>
                          setScoutForm((f) => ({ ...f, name: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label>E-mail</Label>
                      <Input
                        type="email"
                        className="text-foreground"
                        value={scoutForm.email}
                        onChange={(e) =>
                          setScoutForm((f) => ({ ...f, email: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Celular</Label>
                      <Input
                        className="text-foreground"
                        value={scoutForm.phone}
                        onChange={(e) =>
                          setScoutForm((f) => ({ ...f, phone: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Regiões (vírgula)</Label>
                      <Input
                        placeholder="SP, MG, Sul..."
                        className="text-foreground"
                        value={scoutForm.regions}
                        onChange={(e) =>
                          setScoutForm((f) => ({ ...f, regions: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Categorias (vírgula)</Label>
                      <Input
                        placeholder="sub17, sub20..."
                        className="text-foreground"
                        value={scoutForm.categories}
                        onChange={(e) =>
                          setScoutForm((f) => ({ ...f, categories: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Posições foco (vírgula)</Label>
                      <Input
                        placeholder="CM, W, CB..."
                        className="text-foreground"
                        value={scoutForm.specialties}
                        onChange={(e) =>
                          setScoutForm((f) => ({ ...f, specialties: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Licença / certificação</Label>
                      <Input
                        className="text-foreground"
                        value={scoutForm.licenseInfo}
                        onChange={(e) =>
                          setScoutForm((f) => ({ ...f, licenseInfo: e.target.value }))
                        }
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Observações</Label>
                      <Textarea
                        className="text-foreground"
                        value={scoutForm.notes}
                        onChange={(e) =>
                          setScoutForm((f) => ({ ...f, notes: e.target.value }))
                        }
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Button type="submit" disabled={saving || !effectiveTenantId}>
                        {saving ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="mr-2 h-4 w-4" />
                        )}
                        Cadastrar captador
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </DashboardDeptSection>
          )}
        </>
      )}
    </>
  );
}
