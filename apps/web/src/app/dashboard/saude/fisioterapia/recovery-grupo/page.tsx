"use client";

import { formatDateDayMonYear } from "@/lib/format-date";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Users } from "lucide-react";
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
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type {
  CreatePhysioGroupSessionPayload,
  PhysioGroupAttendanceRow,
  PhysioGroupSession,
} from "@/types/fisioterapia";
import { filterCategoriesForTenant, getCategoryLabel } from "@/lib/fixture-categories";
import { useFixtureCategories } from "@/hooks/useFixtureCategories";
import { isFootballKind } from "@/lib/home-data";

type Tenant = { id: string; name: string; categories?: string[] | null; kind?: { name?: string } };
type StaffOpt = { id: string; name: string };

export default function PhysioGroupRecoveryPage() {
  const { canAccessModule, loading: authLoading } = useAuth();
  const { categories: allCats } = useFixtureCategories();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [category, setCategory] = useState("");
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [staffId, setStaffId] = useState("");
  const [staffList, setStaffList] = useState<StaffOpt[]>([]);
  const [attendance, setAttendance] = useState<PhysioGroupAttendanceRow[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [sessions, setSessions] = useState<PhysioGroupSession[]>([]);
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

  const loadSessions = useCallback(async () => {
    setLoadingList(true);
    try {
      const params = new URLSearchParams();
      if (tenantId) params.set("tenantId", tenantId);
      if (category) params.set("category", category);
      const { data } = await api.get<PhysioGroupSession[]>(`/fisioterapia/group-sessions?${params}`);
      setSessions(Array.isArray(data) ? data : []);
    } catch {
      setSessions([]);
    } finally {
      setLoadingList(false);
    }
  }, [tenantId, category]);

  useEffect(() => {
    if (authLoading || !canAccessModule("saude")) return;
    void loadSessions();
  }, [authLoading, canAccessModule, loadSessions]);

  useEffect(() => {
    if (!tenantId || !category) {
      setAttendance([]);
      return;
    }
    setLoadingRoster(true);
    api
      .get<PhysioGroupAttendanceRow[]>(
        `/fisioterapia/group-sessions/category-roster?tenantId=${encodeURIComponent(tenantId)}&category=${encodeURIComponent(category)}`,
      )
      .then(({ data }) => setAttendance(Array.isArray(data) ? data : []))
      .catch(() => setAttendance([]))
      .finally(() => setLoadingRoster(false));
  }, [tenantId, category]);

  useEffect(() => {
    if (category && !categoriesForClub.some((c) => c.value === category)) {
      setCategory("");
    }
  }, [category, categoriesForClub]);

  const selectedCount = attendance.filter((a) => a.present).length;
  const selectedStaff = staffList.find((s) => s.id === staffId);

  const togglePlayer = (playerId: string) => {
    setAttendance((prev) =>
      prev.map((row) =>
        row.playerId === playerId ? { ...row, present: !row.present } : row,
      ),
    );
  };

  const selectAll = () => {
    setAttendance((prev) => prev.map((row) => ({ ...row, present: true })));
  };

  const clearAll = () => {
    setAttendance((prev) => prev.map((row) => ({ ...row, present: false })));
  };

  const handleSave = async () => {
    if (!tenantId || !category || !sessionDate.trim()) {
      setFeedback({
        open: true,
        title: "Campos obrigatórios",
        message: "Informe clube, categoria e data da sessão.",
        variant: "warning",
      });
      return;
    }
    if (selectedCount === 0) {
      setFeedback({
        open: true,
        title: "Participantes",
        message: "Marque ao menos um atleta que participou do recovery.",
        variant: "warning",
      });
      return;
    }
    setSaving(true);
    try {
      const payload: CreatePhysioGroupSessionPayload = {
        tenantId,
        category,
        sessionDate,
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        staffId: staffId || undefined,
        staffName: selectedStaff?.name || undefined,
        attendance,
      };
      await api.post("/fisioterapia/group-sessions", payload);
      setDescription("");
      setLocation("");
      setFeedback({
        open: true,
        title: "Recovery registrado",
        message: "Sessão em grupo salva. O status dos atletas não foi alterado.",
        variant: "success",
      });
      await loadSessions();
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
          : null;
      setFeedback({
        open: true,
        title: "Erro",
        message: Array.isArray(msg) ? msg.join(", ") : typeof msg === "string" ? msg : "Não foi possível salvar.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/fisioterapia/group-sessions/${encodeURIComponent(deleteId)}`);
      setDeleteId(null);
      await loadSessions();
      setFeedback({
        open: true,
        title: "Removido",
        message: "Registro de recovery excluído.",
        variant: "success",
      });
    } catch {
      setFeedback({
        open: true,
        title: "Erro",
        message: "Não foi possível excluir.",
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
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/saude/fisioterapia"
          className="mb-2 inline-block text-sm text-muted-foreground hover:text-foreground"
        >
          ← Atendimentos
        </Link>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Users className="h-8 w-8" />
          Recovery em grupo
        </h1>
        <p className="mt-1 text-muted-foreground">
          Recuperação pós-jogo — marque quem jogou. Não altera status de lesionado.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Nova sessão</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="grid gap-1.5">
              <Label>Clube *</Label>
              <NativeSelect value={tenantId} onChange={(e) => setTenantId(e.target.value)}>
                <option value="">Selecione…</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-1.5">
              <Label>Categoria *</Label>
              <NativeSelect
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={!tenantId}
              >
                <option value="">Selecione…</option>
                {categoriesForClub.map((c) => (
                  <option key={c.value} value={c.value}>
                    {getCategoryLabel(c.value, "pt", allCats)}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-1.5">
              <Label>Data *</Label>
              <Input
                type="date"
                className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Fisioterapeuta</Label>
              <NativeSelect value={staffId} onChange={(e) => setStaffId(e.target.value)} disabled={!tenantId}>
                <option value="">Opcional</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </NativeSelect>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Local (opcional)</Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ex.: vestiário, sala de recovery…"
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Descrição da sessão</Label>
            <textarea
              className="min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Protocolo aplicado, observações gerais…"
            />
          </div>

          <div className="rounded-lg border border-border/70 p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <Label className="text-sm">
                Atletas participantes ({selectedCount} de {attendance.length})
              </Label>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={selectAll} disabled={!attendance.length}>
                  Marcar todos
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={clearAll} disabled={!attendance.length}>
                  Limpar
                </Button>
              </div>
            </div>
            {loadingRoster ? (
              <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando elenco…
              </div>
            ) : !tenantId || !category ? (
              <p className="py-4 text-sm text-muted-foreground">Selecione clube e categoria.</p>
            ) : attendance.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">Nenhum atleta ativo nesta categoria.</p>
            ) : (
              <ul className="grid max-h-64 gap-1 overflow-y-auto sm:grid-cols-2">
                {attendance.map((row) => (
                  <li key={row.playerId}>
                    <label className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-md px-2 text-sm hover:bg-muted/40">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-primary"
                        checked={Boolean(row.present)}
                        onChange={() => togglePlayer(row.playerId)}
                      />
                      <span>{row.playerName ?? row.playerId}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Button type="button" className="min-h-[44px] w-full sm:w-auto" disabled={saving} onClick={() => void handleSave()}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar recovery
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Histórico</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loadingList ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum recovery registrado neste filtro.</p>
          ) : (
            sessions.map((s) => {
              const participants = (s.attendance ?? []).filter((a) => a.present);
              return (
                <div key={s.id} className="rounded-lg border border-border/60 p-3 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">
                        {formatDateDayMonYear(`${s.sessionDate}T12:00:00`)}
                        {" · "}
                        {getCategoryLabel(s.category, "pt", allCats)}
                      </p>
                      <p className="text-muted-foreground">{s.tenant?.name}</p>
                      <p className="mt-1">
                        {participants.length} atleta(s)
                        {s.staffName ? ` · ${s.staffName}` : ""}
                        {s.location ? ` · ${s.location}` : ""}
                      </p>
                      {s.description ? (
                        <p className="mt-2 whitespace-pre-wrap text-foreground/90">{s.description}</p>
                      ) : null}
                      {participants.length > 0 ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {participants.map((p) => p.playerName).filter(Boolean).join(", ")}
                        </p>
                      ) : null}
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setDeleteId(s.id)}>
                      Excluir
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
        variant={feedback.variant}
      />

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir recovery?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O registro da sessão em grupo será removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
