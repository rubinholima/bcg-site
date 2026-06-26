"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CalendarDays, ClipboardList, Loader2, MapPin, Users, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BostonTvDashboardTabs } from "@/components/boston-tv/BostonTvDashboardTabs";
import { api } from "@/lib/api";
import { filterCategoriesForTenant } from "@/lib/fixture-categories";
import { useFixtureCategories } from "@/hooks/useFixtureCategories";
import type { Psychologist } from "@/types/psychologist";
import type { PsychologyAttendanceRow, PsychologySessionType } from "@/types/psychology-session";

type SchedulingTab = "online" | PsychologySessionType | "relatorio_semanal";

type PlayerOption = { id: string; name: string; tenantId?: string; category?: string | null };

type TenantOption = { id: string; name?: string; categories?: string[] | null };

type ActivitySpace = {
  id: string;
  tenantId: string;
  name: string;
  address?: string | null;
};

function spaceLabel(space: ActivitySpace) {
  return space.address?.trim() ? `${space.name} — ${space.address.trim()}` : space.name;
}

export function PsychologySchedulingCard({
  filterClube,
  filterAtleta,
  filterCategoria,
  tenants,
  selectedPlayerName,
  players,
  psychologists,
  meetAvailable,
  meetCreating,
  newDate,
  newTime,
  newNotes,
  newPsychologist,
  onNewDateChange,
  onNewTimeChange,
  onNewNotesChange,
  onNewPsychologistChange,
  onCreateMeet,
  onScheduled,
  showFeedback,
}: {
  filterClube: string;
  filterAtleta: string;
  filterCategoria: string;
  tenants: TenantOption[];
  selectedPlayerName: string;
  players: PlayerOption[];
  psychologists: Psychologist[];
  meetAvailable: boolean | null;
  meetCreating: boolean;
  newDate: string;
  newTime: string;
  newNotes: string;
  newPsychologist: string;
  onNewDateChange: (v: string) => void;
  onNewTimeChange: (v: string) => void;
  onNewNotesChange: (v: string) => void;
  onNewPsychologistChange: (v: string) => void;
  onCreateMeet: () => void;
  onScheduled: () => void;
  showFeedback: (title: string, message: string, variant: "info" | "success" | "warning" | "error") => void;
}) {
  const [tab, setTab] = useState<SchedulingTab>("online");
  const [saving, setSaving] = useState(false);
  const [spaces, setSpaces] = useState<ActivitySpace[]>([]);
  const [spaceId, setSpaceId] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState(filterCategoria);
  const [psychologistId, setPsychologistId] = useState("");
  const [estagiarioId, setEstagiarioId] = useState("");
  const [attendance, setAttendance] = useState<PsychologyAttendanceRow[]>([]);
  const [groupSummary, setGroupSummary] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [categoriesLabel, setCategoriesLabel] = useState("");
  const [activities, setActivities] = useState("");
  const [individualDemands, setIndividualDemands] = useState("");
  const [weeklyDevelopment, setWeeklyDevelopment] = useState("");
  const [identifiedDemands, setIdentifiedDemands] = useState("");
  const [nextWeekPlanning, setNextWeekPlanning] = useState("");
  const [finalSummary, setFinalSummary] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");
  const [noteDialogIdx, setNoteDialogIdx] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  const psychologos = psychologists.filter((p) => (p.staffRole ?? "psicologo") === "psicologo");
  const estagiarios = psychologists.filter((p) => p.staffRole === "estagiario");
  const tenantId = filterClube || players.find((p) => p.id === filterAtleta)?.tenantId || "";
  const selectedTenant = tenants.find((t) => t.id === tenantId);
  const { categories: allFixtureCategories } = useFixtureCategories();
  const clubCategories = useMemo(() => {
    const fromTenant = filterCategoriesForTenant(
      allFixtureCategories,
      selectedTenant?.categories,
    );
    if (selectedTenant?.categories?.length) return fromTenant;
    const inRoster = new Set(
      players
        .filter((p) => p.tenantId === tenantId)
        .map((p) => p.category)
        .filter((v): v is string => Boolean(v)),
    );
    if (inRoster.size === 0) return fromTenant;
    return allFixtureCategories.filter((c) => inRoster.has(c.value));
  }, [allFixtureCategories, selectedTenant?.categories, players, tenantId]);

  const [spacesError, setSpacesError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setCategory("");
      return;
    }
    if (clubCategories.length === 0) return;
    setCategory((prev) => {
      if (prev && clubCategories.some((c) => c.value === prev)) return prev;
      if (filterCategoria && clubCategories.some((c) => c.value === filterCategoria)) {
        return filterCategoria;
      }
      return clubCategories[0]?.value ?? "";
    });
  }, [tenantId, clubCategories, filterCategoria]);

  const reloadSpaces = useCallback(() => {
    if (!tenantId) {
      setSpaces([]);
      setSpaceId("");
      setSpacesError(null);
      return;
    }
    api
      .get<ActivitySpace[]>(`/football-activity-spaces?tenantId=${encodeURIComponent(tenantId)}`)
      .then(({ data }) => {
        setSpaces(Array.isArray(data) ? data : []);
        setSpacesError(null);
      })
      .catch((err: unknown) => {
        setSpaces([]);
        const msg =
          err && typeof err === "object" && "response" in err
            ? (err as { response?: { data?: { message?: string }; status?: number } }).response?.data
                ?.message
            : null;
        const status = (err as { response?: { status?: number } })?.response?.status;
        setSpacesError(
          typeof msg === "string"
            ? msg
            : status === 403
              ? "Sem permissão para listar espaços — verifique o módulo Saúde na API."
              : "Não foi possível carregar os espaços do clube.",
        );
      });
  }, [tenantId]);

  useEffect(() => {
    reloadSpaces();
  }, [reloadSpaces]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") reloadSpaces();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [reloadSpaces]);

  const loadRoster = useCallback(async () => {
    if (!tenantId || !category) {
      setAttendance([]);
      return;
    }
    try {
      const { data } = await api.get<PsychologyAttendanceRow[]>(
        `/psychology-sessions/category-roster?tenantId=${encodeURIComponent(tenantId)}&category=${encodeURIComponent(category)}`,
      );
      setAttendance(
        Array.isArray(data)
          ? data.map((r) => ({
              playerId: r.playerId,
              playerName: r.playerName,
              present: r.present ?? false,
              individualNotes: r.individualNotes,
            }))
          : [],
      );
    } catch {
      setAttendance([]);
    }
  }, [tenantId, category]);

  useEffect(() => {
    if (tab === "grupo") void loadRoster();
  }, [tab, loadRoster]);

  function handleSpaceChange(value: string) {
    const id = value === "none" ? "" : value;
    setSpaceId(id);
    const space = spaces.find((s) => s.id === id);
    setLocation(space ? spaceLabel(space) : "");
  }

  function openNoteDialog(idx: number) {
    setNoteDialogIdx(idx);
    setNoteDraft(attendance[idx]?.individualNotes ?? "");
  }

  function saveNoteDialog() {
    if (noteDialogIdx == null) return;
    setAttendance((prev) => {
      const next = [...prev];
      next[noteDialogIdx] = { ...next[noteDialogIdx], individualNotes: noteDraft.trim() || undefined };
      return next;
    });
    setNoteDialogIdx(null);
    setNoteDraft("");
  }

  const tabs = [
    { id: "online" as const, label: "Online", icon: Video },
    { id: "presencial" as const, label: "Presencial", icon: MapPin },
    { id: "grupo" as const, label: "Grupo", icon: Users },
    { id: "relatorio_semanal" as const, label: "Relatório", icon: ClipboardList },
  ];

  async function saveSession(sessionType: PsychologySessionType, extra?: Record<string, unknown>) {
    if (!tenantId) {
      showFeedback("Atenção", "Selecione o clube no filtro.", "warning");
      return;
    }
    if (!newDate.trim()) {
      showFeedback("Atenção", "Informe a data.", "warning");
      return;
    }
    if (sessionType === "presencial" && !filterAtleta) {
      showFeedback("Atenção", "Selecione o atleta para atendimento presencial.", "warning");
      return;
    }
    if (sessionType === "grupo" && !category) {
      showFeedback("Atenção", "Selecione a categoria do grupo.", "warning");
      return;
    }
    setSaving(true);
    try {
      await api.post("/psychology-sessions", {
        tenantId,
        sessionType,
        date: newDate,
        time: newTime,
        category: sessionType === "grupo" ? category : undefined,
        playerId: sessionType === "presencial" ? filterAtleta : undefined,
        psychologistId: psychologistId || undefined,
        estagiarioId: estagiarioId || undefined,
        location: location.trim() || undefined,
        notes: newNotes.trim() || undefined,
        groupSummary: groupSummary.trim() || undefined,
        attendance: sessionType === "grupo" ? attendance : undefined,
        status: tab === "grupo" ? "completed" : "scheduled",
        ...extra,
      });
      showFeedback(
        "Agendado",
        sessionType === "grupo"
          ? "Sessão em grupo registrada na agenda do clube e presença salva nas fichas."
          : "Atendimento registrado na agenda unificada do clube.",
        "success",
      );
      onScheduled();
      setGroupSummary("");
      setLocation("");
      setSpaceId("");
    } catch (e: unknown) {
      showFeedback("Erro", e instanceof Error ? e.message : "Erro ao salvar.", "error");
    } finally {
      setSaving(false);
    }
  }

  const locationSelect = (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <Label className="text-xs text-muted-foreground">Local</Label>
        <Link
          href={
            tenantId
              ? `/dashboard/cadastros/espacos?tenantId=${encodeURIComponent(tenantId)}`
              : "/dashboard/cadastros/espacos"
          }
          className="text-xs text-primary hover:underline"
        >
          Cadastrar espaços
        </Link>
      </div>
      <Select value={spaceId || "none"} onValueChange={handleSpaceChange}>
        <SelectTrigger className="text-foreground">
          <SelectValue placeholder="Selecione o espaço" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">—</SelectItem>
          {spaces.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {spaceLabel(s)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {spacesError ? (
        <p className="mt-1 text-xs text-destructive">{spacesError}</p>
      ) : tenantId && spaces.length === 0 ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Nenhum espaço cadastrado para este clube.
        </p>
      ) : null}
    </div>
  );

  const noteDialogRow = noteDialogIdx != null ? attendance[noteDialogIdx] : null;

  const allPresent = attendance.length > 0 && attendance.every((r) => r.present === true);
  const somePresent = attendance.some((r) => r.present === true);
  const headerCheckRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = headerCheckRef.current;
    if (el) el.indeterminate = somePresent && !allPresent;
  }, [somePresent, allPresent]);

  function setAllPresent(value: boolean) {
    setAttendance((prev) => prev.map((r) => ({ ...r, present: value })));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-violet-400" />
        <h3 className="text-lg font-semibold">Agenda de atendimentos</h3>
      </div>
      <BostonTvDashboardTabs
        tabs={tabs}
        active={tab}
        onChange={setTab}
        ariaLabel="Tipo de atendimento"
        compact
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs text-muted-foreground">Data</Label>
          <Input
            type="date"
            className="mt-1 text-foreground"
            value={newDate}
            onChange={(e) => onNewDateChange(e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Horário</Label>
          <Input
            type="time"
            className="mt-1 text-foreground"
            value={newTime}
            onChange={(e) => onNewTimeChange(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs text-muted-foreground">Psicóloga(o) / supervisora</Label>
          <Select value={psychologistId || "none"} onValueChange={(v) => setPsychologistId(v === "none" ? "" : v)}>
            <SelectTrigger className="mt-1 text-foreground">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">—</SelectItem>
              {psychologos.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                  {p.crpOrEquivalent ? ` (${p.crpOrEquivalent})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Estagiária(o)</Label>
          <Select value={estagiarioId || "none"} onValueChange={(v) => setEstagiarioId(v === "none" ? "" : v)}>
            <SelectTrigger className="mt-1 text-foreground">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">—</SelectItem>
              {estagiarios.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {tab === "online" && (
        <div className="space-y-3 rounded-lg border border-border/80 bg-muted/20 p-4">
          {!filterAtleta ? (
            <p className="text-sm text-amber-600 dark:text-amber-400">Selecione o atleta no filtro.</p>
          ) : (
            <>
              <p className="text-sm font-medium">{selectedPlayerName}</p>
              <div>
                <Label className="text-xs text-muted-foreground">Psicólogo (lista legada Meet)</Label>
                <Input
                  className="mt-1 text-foreground"
                  value={newPsychologist}
                  onChange={(e) => onNewPsychologistChange(e.target.value)}
                  placeholder="Nome do profissional"
                />
              </div>
              <textarea
                className="w-full min-h-[72px] rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                placeholder="Anotações"
                value={newNotes}
                onChange={(e) => onNewNotesChange(e.target.value)}
              />
              {meetAvailable ? (
                <Button type="button" onClick={onCreateMeet} disabled={meetCreating || !newDate}>
                  {meetCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Video className="mr-2 h-4 w-4" />}
                  Criar no Meet
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">Google Meet não configurado na API.</p>
              )}
            </>
          )}
        </div>
      )}

      {tab === "presencial" && (
        <div className="space-y-3 rounded-lg border border-border/80 bg-muted/20 p-4">
          {!filterAtleta ? (
            <p className="text-sm text-amber-600 dark:text-amber-400">Selecione o atleta no filtro.</p>
          ) : (
            <>
              <p className="text-sm font-medium">{selectedPlayerName}</p>
              {locationSelect}
              <textarea
                className="w-full min-h-[72px] rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                placeholder="Resumo do atendimento"
                value={newNotes}
                onChange={(e) => onNewNotesChange(e.target.value)}
              />
              <Button type="button" disabled={saving} onClick={() => void saveSession("presencial")}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
                Agendar presencial
              </Button>
            </>
          )}
        </div>
      )}

      {tab === "grupo" && (
        <div className="space-y-3 rounded-lg border border-border/80 bg-muted/20 p-4">
          {!tenantId ? (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Selecione o clube no filtro acima para ver as categorias e locais do clube.
            </p>
          ) : null}
          <div>
            <Label className="text-xs text-muted-foreground">Categoria do grupo</Label>
            <Select value={category || "none"} onValueChange={(v) => setCategory(v === "none" ? "" : v)}>
              <SelectTrigger className="mt-1 text-foreground">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {clubCategories.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.labelPT}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {tenantId && clubCategories.length === 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Nenhuma categoria liberada para este clube — configure em Empresas.
              </p>
            ) : null}
          </div>
          {locationSelect}
          <textarea
            className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            placeholder="Resumo geral do atendimento em grupo"
            value={groupSummary}
            onChange={(e) => setGroupSummary(e.target.value)}
          />
          {attendance.length > 0 ? (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">Chamada de presença</CardTitle>
                    <CardDescription>
                      {attendance.length} atleta{attendance.length > 1 ? "s" : ""} na categoria
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-[36px] shrink-0"
                    onClick={() => setAllPresent(!allPresent)}
                  >
                    {allPresent ? "Desmarcar todos" : "Marcar todos presentes"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="max-h-[320px] overflow-y-auto p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-14">
                        <div className="flex items-center gap-2">
                          <input
                            ref={headerCheckRef}
                            type="checkbox"
                            checked={allPresent}
                            onChange={(e) => setAllPresent(e.target.checked)}
                            className="h-4 w-4 shrink-0"
                            aria-label="Marcar todos presentes"
                          />
                          <span>Presente</span>
                        </div>
                      </TableHead>
                      <TableHead>Atleta</TableHead>
                      <TableHead className="w-16 text-center">Obs.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance.map((row, idx) => (
                      <TableRow key={row.playerId}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={row.present === true}
                            onChange={(e) => {
                              setAttendance((prev) => {
                                const next = [...prev];
                                next[idx] = { ...next[idx], present: e.target.checked };
                                return next;
                              });
                            }}
                            className="h-4 w-4"
                            aria-label={`Presença de ${row.playerName ?? "atleta"}`}
                          />
                        </TableCell>
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => openNoteDialog(idx)}
                            className="font-medium hover:underline"
                          >
                            {row.playerName ?? "—"}
                          </button>
                        </TableCell>
                        <TableCell className="text-center">
                          {row.individualNotes?.trim() ? (
                            <button
                              type="button"
                              onClick={() => openNoteDialog(idx)}
                              className="text-xs font-medium text-violet-400 hover:underline"
                            >
                              Ver
                            </button>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : category && tenantId ? (
            <p className="text-sm text-muted-foreground">Nenhum atleta nesta categoria.</p>
          ) : null}
          <Button type="button" disabled={saving || !category} onClick={() => void saveSession("grupo")}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
            Registrar sessão em grupo
          </Button>
        </div>
      )}

      {tab === "relatorio_semanal" && (
        <div className="space-y-3 rounded-lg border border-border/80 bg-muted/20 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs text-muted-foreground">Período — início</Label>
              <Input type="date" className="mt-1 text-foreground" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Período — fim</Label>
              <Input type="date" className="mt-1 text-foreground" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </div>
          </div>
          <Input
            className="text-foreground"
            placeholder="Categorias acompanhadas (ex.: Sub-13 / Sub-14)"
            value={categoriesLabel}
            onChange={(e) => setCategoriesLabel(e.target.value)}
          />
          {[
            { label: "Atividades realizadas", value: activities, set: setActivities },
            { label: "Demandas individuais (comissão)", value: individualDemands, set: setIndividualDemands },
            { label: "Desenvolvimento observado na semana", value: weeklyDevelopment, set: setWeeklyDevelopment },
            { label: "Demandas identificadas", value: identifiedDemands, set: setIdentifiedDemands },
            { label: "Planejamento próxima semana", value: nextWeekPlanning, set: setNextWeekPlanning },
            { label: "Resumo final", value: finalSummary, set: setFinalSummary },
            { label: "Observações gerais", value: generalNotes, set: setGeneralNotes },
          ].map((field) => (
            <div key={field.label}>
              <Label className="text-xs text-muted-foreground">{field.label}</Label>
              <textarea
                className="mt-1 w-full min-h-[72px] rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={field.value}
                onChange={(e) => field.set(e.target.value)}
              />
            </div>
          ))}
          <Button
            type="button"
            disabled={saving}
            onClick={() =>
              void saveSession("relatorio_semanal", {
                periodStart,
                periodEnd,
                categoriesLabel,
                activities,
                individualDemands,
                weeklyDevelopment,
                identifiedDemands,
                nextWeekPlanning,
                finalSummary,
                generalNotes,
                status: "completed",
              })
            }
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardList className="mr-2 h-4 w-4" />}
            Salvar relatório semanal
          </Button>
        </div>
      )}

      <Dialog open={noteDialogIdx != null} onOpenChange={(open) => !open && setNoteDialogIdx(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{noteDialogRow?.playerName ?? "Observação"}</DialogTitle>
          </DialogHeader>
          <textarea
            className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            placeholder="Observação individual"
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            autoFocus
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setNoteDialogIdx(null)}>
              Cancelar
            </Button>
            <Button type="button" onClick={saveNoteDialog}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
