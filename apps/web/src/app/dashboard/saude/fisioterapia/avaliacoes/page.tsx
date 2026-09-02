"use client";

import { formatDateDayMonYear } from "@/lib/format-date";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ClipboardCheck, Loader2, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import type {
  CreatePhysioPlayerEvaluationBatchPayload,
  PhysioEvaluationTest,
  PhysioGroupAttendanceRow,
  PhysioPlayerEvaluation,
} from "@/types/fisioterapia";
import { filterCategoriesForTenant, getCategoryLabel } from "@/lib/fixture-categories";
import { useFixtureCategories } from "@/hooks/useFixtureCategories";
import { isFootballKind } from "@/lib/home-data";
import {
  labelFromMap,
  PHYSIO_EVAL_BODY_LOCATION_LABEL,
  PHYSIO_EVAL_CONTEXT_LABEL,
  PHYSIO_EVAL_OUTCOME_LABEL,
  PHYSIO_EVAL_TEST_TYPE_LABEL,
} from "@/lib/physio-game-evaluation-labels";
import {
  PHYSIO_PERIODIC_PROTOCOL_LABEL,
  PHYSIO_PROTOCOL_CLASSIFICATION_LABEL,
} from "@/lib/physio-periodic-labels";
import {
  PhysioPeriodicProtocolBlock,
  periodicEntriesToTests,
  type PeriodicProtocolEntry,
} from "@/components/dashboard/fisioterapia/PhysioPeriodicProtocolBlock";

type Tenant = { id: string; name: string; categories?: string[] | null; kind?: { name?: string } };
type StaffOpt = { id: string; name: string };

const CONTEXTS = Object.keys(PHYSIO_EVAL_CONTEXT_LABEL);
const TEST_TYPES = Object.keys(PHYSIO_EVAL_TEST_TYPE_LABEL);
const BODY_LOCATIONS = Object.keys(PHYSIO_EVAL_BODY_LOCATION_LABEL);
const OUTCOMES = Object.keys(PHYSIO_EVAL_OUTCOME_LABEL);

const emptyTest = (): PhysioEvaluationTest => ({
  testType: "forca",
  bodyLocation: "quadriceps",
  score: "",
  notes: "",
});

export default function PhysioEvaluationsPage() {
  const { canAccessModule, loading: authLoading } = useAuth();
  const { categories: allCats } = useFixtureCategories();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [category, setCategory] = useState("");
  const [context, setContext] = useState("pre_temporada");
  const [evaluatedAt, setEvaluatedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [staffId, setStaffId] = useState("");
  const [staffList, setStaffList] = useState<StaffOpt[]>([]);
  const [roster, setRoster] = useState<PhysioGroupAttendanceRow[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(() => new Set());
  const [usePeriodicProtocols, setUsePeriodicProtocols] = useState(true);
  const [protocolEntries, setProtocolEntries] = useState<PeriodicProtocolEntry[]>([]);
  const [tests, setTests] = useState<PhysioEvaluationTest[]>([emptyTest()]);
  const [rating, setRating] = useState("");
  const [finalObservations, setFinalObservations] = useState("");
  const [outcome, setOutcome] = useState("");
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [evaluations, setEvaluations] = useState<PhysioPlayerEvaluation[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: "info" | "success" | "warning" | "error";
  }>({ open: false, title: "", message: "", variant: "info" });

  const selectedTenant = tenants.find((t) => t.id === tenantId);
  const categoriesForClub = useMemo(
    () => filterCategoriesForTenant(allCats, selectedTenant?.categories),
    [allCats, selectedTenant?.categories],
  );
  const selectedStaff = staffList.find((s) => s.id === staffId);

  useEffect(() => {
    api.get<Tenant[]>("/tenants?clubsOnly=1").then(({ data }) => {
      setTenants((Array.isArray(data) ? data : []).filter((t) => isFootballKind(t.kind?.name ?? "")));
    });
  }, []);

  useEffect(() => {
    if (!tenantId) {
      setStaffList([]);
      return;
    }
    api
      .get<StaffOpt[]>(`/medical-staff?tenantId=${encodeURIComponent(tenantId)}&role=fisioterapeuta`)
      .then(({ data }) => setStaffList(Array.isArray(data) ? data : []))
      .catch(() => setStaffList([]));
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId || !category) {
      setRoster([]);
      setSelectedPlayers(new Set());
      return;
    }
    setLoadingRoster(true);
    api
      .get<PhysioGroupAttendanceRow[]>(
        `/fisioterapia/group-sessions/category-roster?tenantId=${encodeURIComponent(tenantId)}&category=${encodeURIComponent(category)}`,
      )
      .then(({ data }) => setRoster(Array.isArray(data) ? data : []))
      .catch(() => setRoster([]))
      .finally(() => setLoadingRoster(false));
  }, [tenantId, category]);

  const loadEvaluations = useCallback(async () => {
    setLoadingList(true);
    try {
      const params = new URLSearchParams();
      if (tenantId) params.set("tenantId", tenantId);
      if (category) params.set("category", category);
      if (context) params.set("context", context);
      const { data } = await api.get<PhysioPlayerEvaluation[]>(`/fisioterapia/evaluations?${params}`);
      setEvaluations(Array.isArray(data) ? data : []);
    } catch {
      setEvaluations([]);
    } finally {
      setLoadingList(false);
    }
  }, [tenantId, category, context]);

  useEffect(() => {
    if (authLoading || !canAccessModule("saude")) return;
    void loadEvaluations();
  }, [authLoading, canAccessModule, loadEvaluations]);

  useEffect(() => {
    if (category && !categoriesForClub.some((c) => c.value === category)) setCategory("");
  }, [category, categoriesForClub]);

  useEffect(() => {
    if (!usePeriodicProtocols) return;
    setSelectedPlayers((prev) => {
      if (prev.size <= 1) return prev;
      return new Set([[...prev][0]]);
    });
  }, [usePeriodicProtocols]);

  const togglePlayer = (id: string) => {
    if (usePeriodicProtocols) {
      setSelectedPlayers(new Set([id]));
      return;
    }
    setSelectedPlayers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllPlayers = () => setSelectedPlayers(new Set(roster.map((p) => p.playerId)));
  const clearPlayers = () => setSelectedPlayers(new Set());

  const updateTest = (index: number, patch: Partial<PhysioEvaluationTest>) => {
    setTests((prev) => prev.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  };

  const addTest = () => setTests((prev) => [...prev, emptyTest()]);
  const removeTest = (index: number) => setTests((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));

  const buildTestsPayload = () => {
    if (usePeriodicProtocols) return periodicEntriesToTests(protocolEntries);
    return tests.map((t) => {
      const row: PhysioEvaluationTest = {
        testType: t.testType,
        bodyLocation: t.bodyLocation,
        score: t.score?.trim() || undefined,
        notes: t.notes?.trim() || undefined,
      };
      if (t.testType === "outro" && t.testTypeLabel?.trim()) row.testTypeLabel = t.testTypeLabel.trim();
      if (t.bodyLocation === "outro" && t.bodyLocationLabel?.trim()) {
        row.bodyLocationLabel = t.bodyLocationLabel.trim();
      }
      return row;
    });
  };

  const singleSelectedPlayerId =
    selectedPlayers.size === 1 ? [...selectedPlayers][0] : undefined;

  const handleSave = async () => {
    if (!tenantId || !category || selectedPlayers.size === 0) {
      setFeedback({
        open: true,
        title: "Campos obrigatórios",
        message: usePeriodicProtocols
          ? "Informe clube, categoria e exatamente um atleta."
          : "Informe clube, categoria e ao menos um atleta.",
        variant: "warning",
      });
      return;
    }
    if (usePeriodicProtocols && selectedPlayers.size !== 1) {
      setFeedback({
        open: true,
        title: "Atleta",
        message: "A avaliação periódica permite apenas um atleta por registro.",
        variant: "warning",
      });
      return;
    }
    if (usePeriodicProtocols) {
      if (protocolEntries.length === 0) {
        setFeedback({
          open: true,
          title: "Protocolos",
          message: "Adicione ao menos um protocolo periódico.",
          variant: "warning",
        });
        return;
      }
    } else for (const t of tests) {
      if (t.testType === "outro" && !t.testTypeLabel?.trim()) {
        setFeedback({
          open: true,
          title: "Tipo de teste",
          message: "Descreva o tipo de teste quando selecionar Outro.",
          variant: "warning",
        });
        return;
      }
      if (t.bodyLocation === "outro" && !t.bodyLocationLabel?.trim()) {
        setFeedback({
          open: true,
          title: "Local",
          message: "Informe o local quando selecionar Outro.",
          variant: "warning",
        });
        return;
      }
    }

    const payload: CreatePhysioPlayerEvaluationBatchPayload = {
      tenantId,
      category,
      playerIds: [...selectedPlayers],
      context,
      evaluatedAt: `${evaluatedAt}T12:00:00.000Z`,
      tests: buildTestsPayload(),
      finalObservations: finalObservations.trim() || undefined,
      outcome: outcome || undefined,
      rating: rating.trim() ? Number(rating) : undefined,
      staffId: staffId || undefined,
      staffName: selectedStaff?.name,
    };

    setSaving(true);
    try {
      const { data } = await api.post<{ created: number }>("/fisioterapia/evaluations/batch", payload);
      setFinalObservations("");
      setOutcome("");
      setRating("");
      setSelectedPlayers(new Set());
      setProtocolEntries([]);
      setTests([emptyTest()]);
      await loadEvaluations();
      setFeedback({
        open: true,
        title: "Avaliações registradas",
        message: `${data?.created ?? selectedPlayers.size} avaliação(ões) salva(s).`,
        variant: "success",
      });
    } catch (err) {
      setFeedback({
        open: true,
        title: "Erro",
        message: err instanceof Error ? err.message : "Não foi possível salvar.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/fisioterapia/evaluations/${deleteId}`);
      setDeleteId(null);
      await loadEvaluations();
    } catch (err) {
      setFeedback({
        open: true,
        title: "Erro",
        message: err instanceof Error ? err.message : "Não foi possível excluir.",
        variant: "error",
      });
    }
  };

  if (authLoading || !canAccessModule("saude")) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="min-h-[44px] min-w-[44px]">
          <Link href="/dashboard/saude/fisioterapia">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">Avaliações fisioterapêuticas</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nova avaliação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Clube *</Label>
              <NativeSelect value={tenantId} onChange={(e) => setTenantId(e.target.value)}>
                <option value="">Selecione</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-2">
              <Label>Categoria *</Label>
              <NativeSelect value={category} onChange={(e) => setCategory(e.target.value)} disabled={!tenantId}>
                <option value="">Selecione</option>
                {categoriesForClub.map((c) => (
                  <option key={c.value} value={c.value}>{getCategoryLabel(c.value, "pt")}</option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-2">
              <Label>Contexto *</Label>
              <NativeSelect value={context} onChange={(e) => setContext(e.target.value)}>
                {CONTEXTS.map((c) => (
                  <option key={c} value={c}>{PHYSIO_EVAL_CONTEXT_LABEL[c]}</option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-2">
              <Label>Data *</Label>
              <Input
                type="date"
                className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                value={evaluatedAt}
                onChange={(e) => setEvaluatedAt(e.target.value)}
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label>Fisioterapeuta</Label>
              <NativeSelect value={staffId} onChange={(e) => setStaffId(e.target.value)}>
                <option value="">—</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </NativeSelect>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>{usePeriodicProtocols ? "Atleta *" : "Atletas em avaliação *"}</Label>
              {!usePeriodicProtocols ? (
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={selectAllPlayers} disabled={!roster.length}>
                    Marcar todos
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={clearPlayers} disabled={!selectedPlayers.size}>
                    Limpar
                  </Button>
                </div>
              ) : null}
            </div>
            {loadingRoster ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : roster.length === 0 ? (
              <p className="text-sm text-muted-foreground">Selecione clube e categoria.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {roster.map((p) => {
                  const active = selectedPlayers.has(p.playerId);
                  return (
                    <button
                      key={p.playerId}
                      type="button"
                      onClick={() => togglePlayer(p.playerId)}
                      className={cn(
                        "min-h-[44px] rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                        active
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-muted/20 text-muted-foreground hover:bg-muted/40",
                      )}
                    >
                      {p.playerName}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Label>Modo de avaliação</Label>
              <NativeSelect
                value={usePeriodicProtocols ? "periodic" : "legacy"}
                onChange={(e) => setUsePeriodicProtocols(e.target.value === "periodic")}
              >
                <option value="periodic">Protocolos periódicos</option>
                <option value="legacy">Testes legados</option>
              </NativeSelect>
            </div>
            {usePeriodicProtocols ? (
              <PhysioPeriodicProtocolBlock
                entries={protocolEntries}
                onChange={setProtocolEntries}
                singlePlayerId={singleSelectedPlayerId}
              />
            ) : (
              <>
            <div className="flex items-center justify-between gap-2">
              <Label>Testes *</Label>
              <Button type="button" variant="outline" size="sm" onClick={addTest}>
                <Plus className="mr-1 h-4 w-4" />
                Teste
              </Button>
            </div>
            {tests.map((test, index) => (
              <div key={index} className="grid gap-3 rounded-lg border border-border/60 p-3 sm:grid-cols-2">
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">Tipo</Label>
                  <NativeSelect
                    value={test.testType}
                    onChange={(e) => updateTest(index, { testType: e.target.value })}
                  >
                    {TEST_TYPES.map((t) => (
                      <option key={t} value={t}>{PHYSIO_EVAL_TEST_TYPE_LABEL[t]}</option>
                    ))}
                  </NativeSelect>
                </div>
                {test.testType === "outro" ? (
                  <div className="grid gap-1">
                    <Label className="text-xs text-muted-foreground">Descreva o teste</Label>
                    <Input
                      value={test.testTypeLabel ?? ""}
                      onChange={(e) => updateTest(index, { testTypeLabel: e.target.value })}
                    />
                  </div>
                ) : null}
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">Local</Label>
                  <NativeSelect
                    value={test.bodyLocation}
                    onChange={(e) => updateTest(index, { bodyLocation: e.target.value })}
                  >
                    {BODY_LOCATIONS.map((l) => (
                      <option key={l} value={l}>{PHYSIO_EVAL_BODY_LOCATION_LABEL[l]}</option>
                    ))}
                  </NativeSelect>
                </div>
                {test.bodyLocation === "outro" ? (
                  <div className="grid gap-1">
                    <Label className="text-xs text-muted-foreground">Especifique o local</Label>
                    <Input
                      value={test.bodyLocationLabel ?? ""}
                      onChange={(e) => updateTest(index, { bodyLocationLabel: e.target.value })}
                    />
                  </div>
                ) : null}
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">Nota</Label>
                  <Input
                    value={test.score ?? ""}
                    onChange={(e) => updateTest(index, { score: e.target.value })}
                    placeholder="0–10 ou valor"
                  />
                </div>
                <div className="grid gap-1 sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">Observações do teste</Label>
                  <Input
                    value={test.notes ?? ""}
                    onChange={(e) => updateTest(index, { notes: e.target.value })}
                  />
                </div>
                {tests.length > 1 ? (
                  <div className="sm:col-span-2">
                    <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => removeTest(index)}>
                      <Trash2 className="mr-1 h-4 w-4" />
                      Remover teste
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
              </>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Nota geral (0–10)</Label>
              <Input
                type="number"
                min={0}
                max={10}
                step="0.1"
                value={rating}
                onChange={(e) => setRating(e.target.value)}
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label>Observações finais</Label>
              <Input value={finalObservations} onChange={(e) => setFinalObservations(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Resultado</Label>
              <NativeSelect value={outcome} onChange={(e) => setOutcome(e.target.value)}>
                <option value="">Pendente</option>
                {OUTCOMES.map((o) => (
                  <option key={o} value={o}>{PHYSIO_EVAL_OUTCOME_LABEL[o]}</option>
                ))}
              </NativeSelect>
            </div>
          </div>

          <Button onClick={() => void handleSave()} disabled={saving} className="min-h-[44px] w-full sm:w-auto">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {usePeriodicProtocols ? "Salvar avaliação" : "Salvar avaliações"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingList ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : evaluations.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Nenhuma avaliação encontrada.</p>
          ) : (
            <div className="space-y-3">
              {evaluations.map((ev) => (
                <div
                  key={ev.id}
                  className="flex flex-col gap-2 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">{ev.player?.name ?? "—"}</p>
                    <p className="text-muted-foreground">
                      {PHYSIO_EVAL_CONTEXT_LABEL[ev.context] ?? ev.context}
                      {" · "}
                      {formatDateDayMonYear(ev.evaluatedAt)}
                    </p>
                    {ev.tests.map((t, i) => (
                      <p key={i}>
                        {t.protocol
                          ? PHYSIO_PERIODIC_PROTOCOL_LABEL[t.protocol] ?? t.protocol
                          : labelFromMap(PHYSIO_EVAL_TEST_TYPE_LABEL, t.testType, t.testTypeLabel)}
                        {!t.protocol ? (
                          <>
                            {" · "}
                            {labelFromMap(PHYSIO_EVAL_BODY_LOCATION_LABEL, t.bodyLocation, t.bodyLocationLabel)}
                          </>
                        ) : null}
                        {t.classification
                          ? ` · ${PHYSIO_PROTOCOL_CLASSIFICATION_LABEL[t.classification] ?? t.classification}`
                          : t.score
                            ? ` · ${t.score}`
                            : ""}
                      </p>
                    ))}
                    {ev.rating != null ? (
                      <p className="text-muted-foreground">Nota geral: {ev.rating}</p>
                    ) : null}
                    {ev.finalObservations ? (
                      <p className="text-muted-foreground">{ev.finalObservations}</p>
                    ) : null}
                    {ev.outcome ? (
                      <p className={ev.outcome === "reprovado" ? "text-destructive" : "text-emerald-400"}>
                        {PHYSIO_EVAL_OUTCOME_LABEL[ev.outcome] ?? ev.outcome}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 shrink-0 text-destructive"
                    onClick={() => setDeleteId(ev.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir avaliação?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
        variant={feedback.variant}
      />
    </div>
  );
}
