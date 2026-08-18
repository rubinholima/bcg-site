"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Save, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NativeSelect, NativeSelectField } from "@/components/ui/native-select";
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
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";
import { getPlayerListDisplayName } from "@/lib/player-display-name";
import type {
  CoachContextPlayer,
  CoachContextResponse,
  CoachTeamReport,
  CoachTeamReportPeriod,
  CoachTeamReportSummary,
} from "@/lib/treinadores-types";
import { COACH_TEAM_PERIOD_TYPES } from "@/lib/treinadores-types";

type PlayerActionDraft = {
  playerId: string;
  name: string;
  jerseyNumber: number | null;
  actionType: "dispensa" | "promocao";
  reason: string;
};

interface Props {
  tenantId: string;
  category?: string;
  contextLoading: boolean;
  context: CoachContextResponse | null;
  readOnly?: boolean;
  defaultStatusFilter?: "all" | "enviado" | "rascunho";
  showSummary?: boolean;
}

function toIsoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function defaultPeriodRange(type: CoachTeamReportPeriod): { start: string; end: string } {
  const now = new Date();
  if (type === "mensal") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start: toIsoDate(start), end: toIsoDate(end) };
  }
  if (type === "trimestral") {
    const q = Math.floor(now.getMonth() / 3);
    const start = new Date(now.getFullYear(), q * 3, 1);
    const end = new Date(now.getFullYear(), q * 3 + 3, 0);
    return { start: toIsoDate(start), end: toIsoDate(end) };
  }
  return {
    start: `${now.getFullYear()}-01-01`,
    end: `${now.getFullYear()}-12-31`,
  };
}

function periodLabel(report: CoachTeamReport) {
  const type = COACH_TEAM_PERIOD_TYPES.find((p) => p.value === report.periodType)?.label ?? report.periodType;
  if (report.periodStart && report.periodEnd) {
    return `${type} · ${formatDateDayMonYear(new Date(report.periodStart))} – ${formatDateDayMonYear(new Date(report.periodEnd))}`;
  }
  return type;
}

function sortPlayers(players: CoachContextPlayer[]) {
  return [...players].sort((a, b) => {
    const ja = a.jerseyNumber ?? 9999;
    const jb = b.jerseyNumber ?? 9999;
    if (ja !== jb) return ja - jb;
    return a.name.localeCompare(b.name, "pt-BR");
  });
}

export function CoachTeamReportPanel({
  tenantId,
  category,
  contextLoading,
  context,
  readOnly = false,
  defaultStatusFilter = "all",
  showSummary = false,
}: Props) {
  const [reports, setReports] = useState<CoachTeamReport[]>([]);
  const [summary, setSummary] = useState<CoachTeamReportSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [periodType, setPeriodType] = useState<CoachTeamReportPeriod>("mensal");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [generalDescription, setGeneralDescription] = useState("");
  const [weakPoints, setWeakPoints] = useState("");
  const [status, setStatus] = useState<"rascunho" | "enviado">("rascunho");
  const [playerActions, setPlayerActions] = useState<PlayerActionDraft[]>([]);
  const [statusFilter, setStatusFilter] = useState(defaultStatusFilter);
  const [feedback, setFeedback] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: "",
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const players = useMemo(() => sortPlayers(context?.players ?? []), [context?.players]);

  const playerOptions = useMemo(
    () =>
      players.map((p) => ({
        value: p.id,
        label: `${p.jerseyNumber != null ? `#${p.jerseyNumber} ` : ""}${getPlayerListDisplayName(p)}`,
      })),
    [players],
  );

  const loadReports = useCallback(() => {
    if (!tenantId) return;
    setLoading(true);
    const params = new URLSearchParams({ tenantId });
    if (category) params.set("category", category);
    if (statusFilter !== "all") params.set("status", statusFilter);
    api
      .get<CoachTeamReport[]>(`/futebol-treinadores/team-reports?${params}`)
      .then(({ data }) => setReports(Array.isArray(data) ? data : []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, [tenantId, category, statusFilter]);

  const loadSummary = useCallback(() => {
    if (!tenantId || !showSummary) return;
    const params = new URLSearchParams({ tenantId });
    if (category) params.set("category", category);
    api
      .get<CoachTeamReportSummary>(`/futebol-treinadores/team-reports/summary?${params}`)
      .then(({ data }) => setSummary(data))
      .catch(() => setSummary(null));
  }, [tenantId, category, showSummary]);

  useEffect(() => {
    loadReports();
    loadSummary();
  }, [loadReports, loadSummary]);

  const resetForm = () => {
    const range = defaultPeriodRange("mensal");
    setSelectedId("");
    setPeriodType("mensal");
    setPeriodStart(range.start);
    setPeriodEnd(range.end);
    setGeneralDescription("");
    setWeakPoints("");
    setStatus("rascunho");
    setPlayerActions([]);
  };

  useEffect(() => {
    if (!selectedId) {
      const range = defaultPeriodRange(periodType);
      if (!periodStart) setPeriodStart(range.start);
      if (!periodEnd) setPeriodEnd(range.end);
      return;
    }
    api.get<CoachTeamReport>(`/futebol-treinadores/team-reports/${selectedId}`).then(({ data }) => {
      if (!data) return;
      setPeriodType(data.periodType);
      setPeriodStart(data.periodStart ? data.periodStart.slice(0, 10) : "");
      setPeriodEnd(data.periodEnd ? data.periodEnd.slice(0, 10) : "");
      setGeneralDescription(data.generalDescription ?? "");
      setWeakPoints(data.weakPoints ?? "");
      setStatus(data.status);
      setPlayerActions(
        data.playerActions.map((a) => ({
          playerId: a.playerId,
          name: a.player
            ? getPlayerListDisplayName({
                name: a.player.name,
                registrationProfile: a.player.registrationProfile,
              })
            : "",
          jerseyNumber: a.player?.jerseyNumber ?? null,
          actionType: a.actionType,
          reason: a.reason ?? "",
        })),
      );
    });
  }, [selectedId]);

  const handlePeriodTypeChange = (value: CoachTeamReportPeriod) => {
    setPeriodType(value);
    const range = defaultPeriodRange(value);
    setPeriodStart(range.start);
    setPeriodEnd(range.end);
  };

  const addAction = (actionType: "dispensa" | "promocao") => {
    const first = players.find((p) => !playerActions.some((a) => a.playerId === p.id));
    if (!first) return;
    setPlayerActions((prev) => [
      ...prev,
      {
        playerId: first.id,
        name: getPlayerListDisplayName(first),
        jerseyNumber: first.jerseyNumber,
        actionType,
        reason: "",
      },
    ]);
  };

  const handleSave = async (submit = false) => {
    if (!tenantId || readOnly) return;
    setSaving(true);
    try {
      const payload = {
        id: selectedId || undefined,
        tenantId,
        category: category || null,
        periodType,
        periodStart: periodStart || null,
        periodEnd: periodEnd || null,
        generalDescription,
        weakPoints,
        status: submit ? "enviado" : status === "enviado" ? "enviado" : "rascunho",
        playerActions: playerActions
          .filter((a) => a.playerId)
          .map((a) => ({
            playerId: a.playerId,
            actionType: a.actionType,
            reason: a.reason || null,
          })),
      };
      const { data } = await api.post<CoachTeamReport>("/futebol-treinadores/team-reports", payload);
      if (data?.id) setSelectedId(data.id);
      if (submit && data?.id) {
        await api.post(`/futebol-treinadores/team-reports/${data.id}/submit`);
      }
      loadReports();
      loadSummary();
      setFeedback({
        open: true,
        title: submit ? "Enviado" : "Salvo",
        message: submit
          ? "Relatório enviado ao diretor de futebol."
          : "Relatório da equipe salvo.",
      });
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível salvar.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId || readOnly) return;
    try {
      await api.delete(`/futebol-treinadores/team-reports/${deleteId}`);
      if (selectedId === deleteId) resetForm();
      loadReports();
      loadSummary();
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível excluir.",
      });
    } finally {
      setDeleteId(null);
    }
  };

  const dispensas = playerActions.filter((a) => a.actionType === "dispensa");
  const promocoes = playerActions.filter((a) => a.actionType === "promocao");

  const renderActionTable = (rows: PlayerActionDraft[], actionType: "dispensa" | "promocao") => {
    const indices = playerActions
      .map((a, i) => (a.actionType === actionType ? i : -1))
      .filter((i) => i >= 0);

    return (
      <div className="overflow-x-auto rounded-lg border border-border/60">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14 text-center">#</TableHead>
              <TableHead>Atleta</TableHead>
              <TableHead>Motivo</TableHead>
              {!readOnly ? <TableHead className="w-12" /> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={readOnly ? 3 : 4} className="text-muted-foreground text-sm">
                  Nenhuma indicação.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, rowIdx) => {
                const idx = indices[rowIdx];
                return (
                  <TableRow key={`${actionType}-${row.playerId}-${idx}`}>
                    <TableCell className="text-center tabular-nums font-medium">
                      {row.jerseyNumber ?? "—"}
                    </TableCell>
                    <TableCell>
                      {readOnly ? (
                        row.name
                      ) : (
                        <NativeSelectField
                          value={row.playerId}
                          onChange={(e) => {
                            const player = players.find((p) => p.id === e.target.value);
                            if (!player) return;
                            const next = [...playerActions];
                            next[idx] = {
                              ...next[idx],
                              playerId: player.id,
                              name: getPlayerListDisplayName(player),
                              jerseyNumber: player.jerseyNumber,
                            };
                            setPlayerActions(next);
                          }}
                          options={playerOptions}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {readOnly ? (
                        row.reason || "—"
                      ) : (
                        <Input
                          value={row.reason}
                          placeholder="Motivo"
                          onChange={(e) => {
                            const next = [...playerActions];
                            next[idx] = { ...next[idx], reason: e.target.value };
                            setPlayerActions(next);
                          }}
                        />
                      )}
                    </TableCell>
                    {!readOnly ? (
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive"
                          onClick={() =>
                            setPlayerActions((prev) => prev.filter((_, i) => i !== idx))
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  if (contextLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showSummary && summary ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-semibold">{summary.enviados}</div>
              <div className="text-sm text-muted-foreground">Enviados</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-semibold">{summary.rascunhos}</div>
              <div className="text-sm text-muted-foreground">Rascunhos</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-semibold">{summary.dispensasIndicadas}</div>
              <div className="text-sm text-muted-foreground">Dispensas indicadas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-semibold">{summary.promocoesIndicadas}</div>
              <div className="text-sm text-muted-foreground">Promoções indicadas</div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">Relatórios</CardTitle>
            {!readOnly ? (
              <Button type="button" size="sm" variant="outline" onClick={resetForm}>
                <Plus className="mr-1 h-4 w-4" />
                Novo
              </Button>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-3">
            <NativeSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            >
              <option value="all">Todos</option>
              <option value="enviado">Enviados</option>
              <option value="rascunho">Rascunhos</option>
            </NativeSelect>
            {loading ? (
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
            ) : reports.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum relatório ainda.</p>
            ) : (
              reports.map((r) => (
                <div
                  key={r.id}
                  className={`rounded-lg border p-3 text-sm ${selectedId === r.id ? "border-primary bg-primary/5" : "border-border/60"}`}
                >
                  <button type="button" className="w-full text-left" onClick={() => setSelectedId(r.id)}>
                    <div className="font-medium">{periodLabel(r)}</div>
                    <div className="text-muted-foreground capitalize">{r.status}</div>
                  </button>
                  {!readOnly && r.status === "rascunho" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-8 text-destructive"
                      onClick={() => setDeleteId(r.id)}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Excluir
                    </Button>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Relatório da equipe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Período</Label>
                {readOnly ? (
                  <p className="text-sm">{COACH_TEAM_PERIOD_TYPES.find((p) => p.value === periodType)?.label}</p>
                ) : (
                  <NativeSelectField
                    value={periodType}
                    onChange={(e) => handlePeriodTypeChange(e.target.value as CoachTeamReportPeriod)}
                    options={COACH_TEAM_PERIOD_TYPES.map((p) => ({ value: p.value, label: p.label }))}
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label>Início</Label>
                <Input
                  type="date"
                  className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                  value={periodStart}
                  disabled={readOnly}
                  onChange={(e) => setPeriodStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Fim</Label>
                <Input
                  type="date"
                  className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                  value={periodEnd}
                  disabled={readOnly}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição geral</Label>
              <Textarea
                rows={4}
                value={generalDescription}
                disabled={readOnly}
                onChange={(e) => setGeneralDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Pontos fracos</Label>
              <Textarea
                rows={3}
                value={weakPoints}
                disabled={readOnly}
                onChange={(e) => setWeakPoints(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Dispensas</Label>
                {!readOnly ? (
                  <Button type="button" size="sm" variant="outline" onClick={() => addAction("dispensa")}>
                    <Plus className="mr-1 h-4 w-4" />
                    Atleta
                  </Button>
                ) : null}
              </div>
              {renderActionTable(dispensas, "dispensa")}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Promoções</Label>
                {!readOnly ? (
                  <Button type="button" size="sm" variant="outline" onClick={() => addAction("promocao")}>
                    <Plus className="mr-1 h-4 w-4" />
                    Atleta
                  </Button>
                ) : null}
              </div>
              {renderActionTable(promocoes, "promocao")}
            </div>

            {readOnly && status === "enviado" && selectedId ? (
              <p className="text-sm text-muted-foreground">
                Relatório enviado
                {reports.find((r) => r.id === selectedId)?.sentAt
                  ? ` em ${formatDateDayMonYear(new Date(reports.find((r) => r.id === selectedId)!.sentAt!))}`
                  : ""}
                .
              </p>
            ) : null}

            {!readOnly ? (
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => void handleSave(false)} disabled={saving || status === "enviado"}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Salvar rascunho
                </Button>
                <Button
                  type="button"
                  variant="default"
                  className="bg-[#C8102E] hover:bg-[#C8102E]/90"
                  onClick={() => void handleSave(true)}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Enviar ao diretor
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir relatório?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
