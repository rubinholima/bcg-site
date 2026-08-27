"use client";

import { formatDateDayMonYear } from "@/lib/format-date";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, Trophy, Trash2, X } from "lucide-react";
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
import type {
  CreatePhysioGameAttendancePayload,
  PhysioGameAttendance,
  PhysioGameBodyLocationItem,
  PhysioGameProcedureItem,
  PhysioGroupAttendanceRow,
} from "@/types/fisioterapia";
import { filterCategoriesForTenant, getCategoryLabel } from "@/lib/fixture-categories";
import { useFixtureCategories } from "@/hooks/useFixtureCategories";
import { isFootballKind } from "@/lib/home-data";
import {
  formatGameBodyLocationList,
  formatGameProcedureList,
  PHYSIO_GAME_BODY_LOCATION_LABEL,
  PHYSIO_GAME_CARE_CATEGORY_LABEL,
  PHYSIO_GAME_PHASE_LABEL,
  PHYSIO_GAME_PROCEDURE_LABEL,
  PHYSIO_GAME_TREATMENT_REASON_LABEL,
} from "@/lib/physio-game-evaluation-labels";

type Tenant = { id: string; name: string; categories?: string[] | null; kind?: { name?: string } };
type StaffOpt = { id: string; name: string };

const PHASES = Object.keys(PHYSIO_GAME_PHASE_LABEL);
const CARE_CATEGORIES = Object.keys(PHYSIO_GAME_CARE_CATEGORY_LABEL);
const PROCEDURES = Object.keys(PHYSIO_GAME_PROCEDURE_LABEL);
const REASONS = Object.keys(PHYSIO_GAME_TREATMENT_REASON_LABEL);
const BODY_LOCATIONS = Object.keys(PHYSIO_GAME_BODY_LOCATION_LABEL);

type ProcedureRow = PhysioGameProcedureItem & { id: string };
type BodyLocationRow = PhysioGameBodyLocationItem & { id: string };

function newProcedureRow(): ProcedureRow {
  return { id: crypto.randomUUID(), procedureKey: "bandagem_elastica", procedureLabel: "" };
}

function newBodyLocationRow(): BodyLocationRow {
  return { id: crypto.randomUUID(), bodyLocation: "tornozelo", bodyLocationLabel: "" };
}

export default function PhysioGameAttendancePage() {
  const { canAccessModule, loading: authLoading } = useAuth();
  const { categories: allCats } = useFixtureCategories();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [category, setCategory] = useState("");
  const [gameDate, setGameDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [phase, setPhase] = useState("pre_jogo");
  const [playerId, setPlayerId] = useState("");
  const [careCategory, setCareCategory] = useState("preparo_preventivo");
  const [procedures, setProcedures] = useState<ProcedureRow[]>(() => [newProcedureRow()]);
  const [bodyLocations, setBodyLocations] = useState<BodyLocationRow[]>(() => [newBodyLocationRow()]);
  const [treatmentReason, setTreatmentReason] = useState("proteger");
  const [notes, setNotes] = useState("");
  const [staffId, setStaffId] = useState("");
  const [staffList, setStaffList] = useState<StaffOpt[]>([]);
  const [roster, setRoster] = useState<PhysioGroupAttendanceRow[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [rows, setRows] = useState<PhysioGameAttendance[]>([]);
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
      setPlayerId("");
      return;
    }
    setLoadingRoster(true);
    api
      .get<PhysioGroupAttendanceRow[]>(
        `/fisioterapia/group-sessions/category-roster?tenantId=${encodeURIComponent(tenantId)}&category=${encodeURIComponent(category)}`,
      )
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : [];
        setRoster(list);
        setPlayerId((prev) => (list.some((p) => p.playerId === prev) ? prev : list[0]?.playerId ?? ""));
      })
      .catch(() => setRoster([]))
      .finally(() => setLoadingRoster(false));
  }, [tenantId, category]);

  const loadRows = useCallback(async () => {
    setLoadingList(true);
    try {
      const params = new URLSearchParams();
      if (tenantId) params.set("tenantId", tenantId);
      if (category) params.set("category", category);
      if (gameDate) params.set("gameDate", gameDate);
      const { data } = await api.get<PhysioGameAttendance[]>(`/fisioterapia/game-attendances?${params}`);
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoadingList(false);
    }
  }, [tenantId, category, gameDate]);

  useEffect(() => {
    if (authLoading || !canAccessModule("saude")) return;
    void loadRows();
  }, [authLoading, canAccessModule, loadRows]);

  useEffect(() => {
    if (category && !categoriesForClub.some((c) => c.value === category)) setCategory("");
  }, [category, categoriesForClub]);

  const handleSave = async () => {
    if (!tenantId || !category || !gameDate || !playerId) {
      setFeedback({
        open: true,
        title: "Campos obrigatórios",
        message: "Informe clube, categoria, data e atleta.",
        variant: "warning",
      });
      return;
    }
    if (careCategory === "tratamento" && !treatmentReason) {
      setFeedback({
        open: true,
        title: "Motivo obrigatório",
        message: "Informe o motivo do tratamento.",
        variant: "warning",
      });
      return;
    }
    for (const item of procedures) {
      if (!item.procedureKey) {
        setFeedback({
          open: true,
          title: "Procedimento",
          message: "Selecione todos os procedimentos.",
          variant: "warning",
        });
        return;
      }
      if (item.procedureKey === "outro" && !item.procedureLabel?.trim()) {
        setFeedback({
          open: true,
          title: "Procedimento",
          message: "Descreva o procedimento quando selecionar Outro.",
          variant: "warning",
        });
        return;
      }
    }
    for (const item of bodyLocations) {
      if (!item.bodyLocation) {
        setFeedback({
          open: true,
          title: "Local",
          message: "Selecione todos os locais.",
          variant: "warning",
        });
        return;
      }
      if (item.bodyLocation === "outro" && !item.bodyLocationLabel?.trim()) {
        setFeedback({
          open: true,
          title: "Local",
          message: "Especifique o local quando selecionar Outro.",
          variant: "warning",
        });
        return;
      }
    }

    const payload: CreatePhysioGameAttendancePayload = {
      tenantId,
      playerId,
      category,
      gameDate,
      phase,
      careCategory,
      procedures: procedures.map(({ procedureKey, procedureLabel }) => ({
        procedureKey,
        procedureLabel: procedureKey === "outro" ? procedureLabel?.trim() : undefined,
      })),
      bodyLocations: bodyLocations.map(({ bodyLocation, bodyLocationLabel }) => ({
        bodyLocation,
        bodyLocationLabel: bodyLocation === "outro" ? bodyLocationLabel?.trim() : undefined,
      })),
      staffId: staffId || undefined,
      staffName: selectedStaff?.name,
      notes: notes.trim() || undefined,
    };
    if (careCategory === "tratamento") payload.treatmentReason = treatmentReason;

    setSaving(true);
    try {
      await api.post("/fisioterapia/game-attendances", payload);
      setNotes("");
      setProcedures([newProcedureRow()]);
      setBodyLocations([newBodyLocationRow()]);
      await loadRows();
      setFeedback({
        open: true,
        title: "Atendimento registrado",
        message: "O atendimento de jogo foi salvo.",
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
      await api.delete(`/fisioterapia/game-attendances/${deleteId}`);
      setDeleteId(null);
      await loadRows();
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
          <Trophy className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">Atendimento de jogo</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Novo atendimento</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
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
            <Label>Data do jogo *</Label>
            <Input
              type="date"
              className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
              value={gameDate}
              onChange={(e) => setGameDate(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Fase *</Label>
            <NativeSelect value={phase} onChange={(e) => setPhase(e.target.value)}>
              {PHASES.map((p) => (
                <option key={p} value={p}>{PHYSIO_GAME_PHASE_LABEL[p]}</option>
              ))}
            </NativeSelect>
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label>Atleta *</Label>
            <NativeSelect
              value={playerId}
              onChange={(e) => setPlayerId(e.target.value)}
              disabled={loadingRoster || roster.length === 0}
            >
              <option value="">{loadingRoster ? "Carregando…" : "Selecione"}</option>
              {roster.map((p) => (
                <option key={p.playerId} value={p.playerId}>{p.playerName}</option>
              ))}
            </NativeSelect>
          </div>
          <div className="grid gap-2">
            <Label>Tipo *</Label>
            <NativeSelect value={careCategory} onChange={(e) => setCareCategory(e.target.value)}>
              {CARE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{PHYSIO_GAME_CARE_CATEGORY_LABEL[c]}</option>
              ))}
            </NativeSelect>
          </div>
          {careCategory === "tratamento" ? (
            <div className="grid gap-2 sm:col-span-2">
              <Label>Motivo do tratamento *</Label>
              <NativeSelect value={treatmentReason} onChange={(e) => setTreatmentReason(e.target.value)}>
                {REASONS.map((r) => (
                  <option key={r} value={r}>{PHYSIO_GAME_TREATMENT_REASON_LABEL[r]}</option>
                ))}
              </NativeSelect>
            </div>
          ) : null}
          <div className="space-y-3 sm:col-span-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Procedimentos *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-[44px]"
                onClick={() => setProcedures((prev) => [...prev, newProcedureRow()])}
              >
                <Plus className="mr-1 h-4 w-4" />
                Adicionar
              </Button>
            </div>
            {procedures.map((item, index) => (
              <div key={item.id} className="grid gap-2 rounded-lg border border-border/60 p-3 sm:grid-cols-2">
                <div className="flex items-center justify-between sm:col-span-2">
                  <span className="text-xs text-muted-foreground">Procedimento {index + 1}</span>
                  {procedures.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-destructive"
                      onClick={() => setProcedures((prev) => prev.filter((p) => p.id !== item.id))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <NativeSelect
                    value={item.procedureKey}
                    onChange={(e) =>
                      setProcedures((prev) =>
                        prev.map((p) =>
                          p.id === item.id
                            ? { ...p, procedureKey: e.target.value, procedureLabel: "" }
                            : p,
                        ),
                      )
                    }
                  >
                    {PROCEDURES.map((p) => (
                      <option key={p} value={p}>{PHYSIO_GAME_PROCEDURE_LABEL[p]}</option>
                    ))}
                  </NativeSelect>
                </div>
                {item.procedureKey === "outro" ? (
                  <div className="grid gap-2 sm:col-span-2">
                    <Label>Descreva o procedimento *</Label>
                    <Input
                      value={item.procedureLabel ?? ""}
                      onChange={(e) =>
                        setProcedures((prev) =>
                          prev.map((p) =>
                            p.id === item.id ? { ...p, procedureLabel: e.target.value } : p,
                          ),
                        )
                      }
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <div className="space-y-3 sm:col-span-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Locais *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-[44px]"
                onClick={() => setBodyLocations((prev) => [...prev, newBodyLocationRow()])}
              >
                <Plus className="mr-1 h-4 w-4" />
                Adicionar
              </Button>
            </div>
            {bodyLocations.map((item, index) => (
              <div key={item.id} className="grid gap-2 rounded-lg border border-border/60 p-3 sm:grid-cols-2">
                <div className="flex items-center justify-between sm:col-span-2">
                  <span className="text-xs text-muted-foreground">Local {index + 1}</span>
                  {bodyLocations.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-destructive"
                      onClick={() => setBodyLocations((prev) => prev.filter((l) => l.id !== item.id))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
                <NativeSelect
                  value={item.bodyLocation}
                  onChange={(e) =>
                    setBodyLocations((prev) =>
                      prev.map((l) =>
                        l.id === item.id
                          ? { ...l, bodyLocation: e.target.value, bodyLocationLabel: "" }
                          : l,
                      ),
                    )
                  }
                >
                  {BODY_LOCATIONS.map((l) => (
                    <option key={l} value={l}>{PHYSIO_GAME_BODY_LOCATION_LABEL[l]}</option>
                  ))}
                </NativeSelect>
                {item.bodyLocation === "outro" ? (
                  <div className="grid gap-2">
                    <Label>Especifique o local *</Label>
                    <Input
                      value={item.bodyLocationLabel ?? ""}
                      onChange={(e) =>
                        setBodyLocations((prev) =>
                          prev.map((l) =>
                            l.id === item.id ? { ...l, bodyLocationLabel: e.target.value } : l,
                          ),
                        )
                      }
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <div className="grid gap-2">
            <Label>Fisioterapeuta</Label>
            <NativeSelect value={staffId} onChange={(e) => setStaffId(e.target.value)}>
              <option value="">—</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </NativeSelect>
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label>Observações</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Button onClick={() => void handleSave()} disabled={saving} className="min-h-[44px] w-full sm:w-auto">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Registrar atendimento
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Atendimentos do dia</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingList ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Nenhum atendimento nesta data.</p>
          ) : (
            <div className="space-y-3">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-col gap-2 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">{row.player?.name ?? "—"}</p>
                    <p className="text-muted-foreground">
                      {PHYSIO_GAME_PHASE_LABEL[row.phase] ?? row.phase}
                      {" · "}
                      {PHYSIO_GAME_CARE_CATEGORY_LABEL[row.careCategory] ?? row.careCategory}
                    </p>
                    <p>
                      {formatGameProcedureList(
                        row.procedures?.length
                          ? row.procedures
                          : [{ procedureKey: row.procedureKey, procedureLabel: row.procedureLabel }],
                      )}
                      {" · "}
                      {formatGameBodyLocationList(
                        row.bodyLocations?.length
                          ? row.bodyLocations
                          : [{ bodyLocation: row.bodyLocation, bodyLocationLabel: row.bodyLocationLabel }],
                      )}
                    </p>
                    {row.treatmentReason ? (
                      <p className="text-muted-foreground">
                        Motivo: {PHYSIO_GAME_TREATMENT_REASON_LABEL[row.treatmentReason] ?? row.treatmentReason}
                      </p>
                    ) : null}
                    {row.notes ? <p className="text-muted-foreground">{row.notes}</p> : null}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 shrink-0 text-destructive"
                    onClick={() => setDeleteId(row.id)}
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
            <AlertDialogTitle>Excluir atendimento?</AlertDialogTitle>
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
