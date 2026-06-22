"use client";

import { useCallback, useEffect, useState } from "react";
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
import { DashboardDeptTabs } from "@/components/dashboard/DashboardDeptHeader";
import { api } from "@/lib/api";
import { FIXTURE_CATEGORIES } from "@/lib/fixture-categories";
import type { Psychologist } from "@/types/psychologist";
import type { PsychologyAttendanceRow, PsychologySessionType } from "@/types/psychology-session";

type SchedulingTab = "online" | PsychologySessionType | "relatorio_semanal";

type PlayerOption = { id: string; name: string; tenantId?: string; category?: string | null };

export function PsychologySchedulingCard({
  filterClube,
  filterAtleta,
  filterCategoria,
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

  const psychologos = psychologists.filter((p) => (p.staffRole ?? "psicologo") === "psicologo");
  const estagiarios = psychologists.filter((p) => p.staffRole === "estagiario");
  const tenantId = filterClube || players.find((p) => p.id === filterAtleta)?.tenantId || "";

  useEffect(() => {
    if (filterCategoria) setCategory(filterCategoria);
  }, [filterCategoria]);

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
          ? data.map((r) => ({ ...r, present: r.present ?? false }))
          : [],
      );
    } catch {
      setAttendance([]);
    }
  }, [tenantId, category]);

  useEffect(() => {
    if (tab === "grupo") void loadRoster();
  }, [tab, loadRoster]);

  const tabs = [
    { id: "online" as const, label: "Online (Meet)", icon: Video },
    { id: "presencial" as const, label: "Presencial", icon: MapPin },
    { id: "grupo" as const, label: "Grupo / categoria", icon: Users },
    { id: "relatorio_semanal" as const, label: "Relatório semanal", icon: ClipboardList },
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
    } catch (e: unknown) {
      showFeedback("Erro", e instanceof Error ? e.message : "Erro ao salvar.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-violet-400" />
        <h3 className="text-lg font-semibold">Agenda de atendimentos</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Online, presencial, grupo por categoria ou relatório semanal — tudo na mesma agenda do clube
        (integrada à agenda geral de compromissos).
      </p>
      <DashboardDeptTabs tabs={tabs} active={tab} onChange={setTab} />

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
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Selecione um atleta no filtro para agendar consulta online.
            </p>
          ) : (
            <>
              <p className="text-sm">
                Atleta: <strong>{selectedPlayerName}</strong>
              </p>
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
                placeholder="Anotações (opcional)"
                value={newNotes}
                onChange={(e) => onNewNotesChange(e.target.value)}
              />
              {meetAvailable ? (
                <Button type="button" onClick={onCreateMeet} disabled={meetCreating || !newDate}>
                  {meetCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Video className="mr-2 h-4 w-4" />}
                  Criar no Meet
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Google Meet não configurado na API (GOOGLE_CALENDAR_*).
                </p>
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
              <p className="text-sm">
                Atendimento individual: <strong>{selectedPlayerName}</strong>
              </p>
              <div>
                <Label className="text-xs text-muted-foreground">Local</Label>
                <Input
                  className="mt-1 text-foreground"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Sala, CT, endereço…"
                />
              </div>
              <textarea
                className="w-full min-h-[72px] rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                placeholder="Resumo / observações do atendimento"
                value={newNotes}
                onChange={(e) => onNewNotesChange(e.target.value)}
              />
              <Button
                type="button"
                disabled={saving}
                onClick={() => void saveSession("presencial")}
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
                Agendar presencial
              </Button>
            </>
          )}
        </div>
      )}

      {tab === "grupo" && (
        <div className="space-y-3 rounded-lg border border-border/80 bg-muted/20 p-4">
          <div>
            <Label className="text-xs text-muted-foreground">Categoria do grupo</Label>
            <Select value={category || "none"} onValueChange={(v) => setCategory(v === "none" ? "" : v)}>
              <SelectTrigger className="mt-1 text-foreground">
                <SelectValue placeholder="Categoria" />
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
            <Label className="text-xs text-muted-foreground">Local</Label>
            <Input
              className="mt-1 text-foreground"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <textarea
            className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            placeholder="Resumo geral do atendimento em grupo"
            value={groupSummary}
            onChange={(e) => setGroupSummary(e.target.value)}
          />
          {attendance.length > 0 ? (
            <div className="max-h-[280px] space-y-2 overflow-y-auto rounded-md border border-border p-2">
              <p className="text-xs font-medium text-muted-foreground">Chamada de presença</p>
              {attendance.map((row, idx) => (
                <div key={row.playerId} className="rounded-md border border-border/60 bg-background p-2 text-sm">
                  <label className="flex items-center gap-2 font-medium">
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
                    />
                    {row.playerName ?? row.playerId}
                  </label>
                  <textarea
                    className="mt-2 w-full min-h-[48px] rounded border border-input bg-background px-2 py-1 text-xs text-foreground"
                    placeholder="Observação individual (opcional)"
                    value={row.individualNotes ?? ""}
                    onChange={(e) => {
                      setAttendance((prev) => {
                        const next = [...prev];
                        next[idx] = { ...next[idx], individualNotes: e.target.value };
                        return next;
                      });
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Selecione clube e categoria para carregar os atletas.</p>
          )}
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
    </div>
  );
}
