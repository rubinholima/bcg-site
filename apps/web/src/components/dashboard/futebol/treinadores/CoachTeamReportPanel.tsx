"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
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
import { getPublicImageUrl } from "@/lib/media-url";
import { getPlayerListDisplayName } from "@/lib/player-display-name";
import type {
  CoachContextPlayer,
  CoachContextResponse,
  CoachPromotionCandidate,
  CoachTeamEvaluationDraft,
  CoachTeamMonthlyReportStatus,
  CoachTeamReport,
  CoachTeamReportPlayerEvaluation,
  CoachTeamReportSummary,
} from "@/lib/treinadores-types";
import { COACH_TEAM_PERIOD_KEYS } from "@/lib/treinadores-types";

type PlayerActionDraft = {
  playerId: string;
  name: string;
  jerseyNumber: number | null;
  category: string | null;
  photoUrl: string | null;
  actionType: "dispensa" | "promocao";
  reason: string;
};

type EvaluationRow = CoachTeamReportPlayerEvaluation & {
  name: string;
  jerseyNumber: number | null;
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

const MONTHLY_KEY_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function suggestMonthlyPeriodKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthlyPeriodLabel(periodKey: string): string {
  if (!MONTHLY_KEY_RE.test(periodKey)) return periodKey;
  const [year, month] = periodKey.split("-");
  const names = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  return `${names[Number(month) - 1] ?? month} ${year}`;
}

function periodLabel(report: CoachTeamReport) {
  if (report.periodKey && MONTHLY_KEY_RE.test(report.periodKey)) {
    return monthlyPeriodLabel(report.periodKey);
  }
  if (report.periodKey) {
    const keyLabel =
      COACH_TEAM_PERIOD_KEYS.find((p) => p.value === report.periodKey)?.label ?? report.periodKey;
    const season = report.season ? ` ${report.season}` : "";
    if (report.periodStart && report.periodEnd) {
      return `${keyLabel}${season} · ${formatDateDayMonYear(new Date(report.periodStart))} – ${formatDateDayMonYear(new Date(report.periodEnd))}`;
    }
    return `${keyLabel}${season}`;
  }
  if (report.periodStart && report.periodEnd) {
    return `${formatDateDayMonYear(new Date(report.periodStart))} – ${formatDateDayMonYear(new Date(report.periodEnd))}`;
  }
  return report.periodType;
}

function monthlyStatusLabel(status: CoachTeamMonthlyReportStatus) {
  switch (status) {
    case "enviado":
      return "enviado";
    case "rascunho":
      return "rascunho";
    case "atrasado":
      return "atrasado";
    default:
      return "pendente";
  }
}

function monthlyStatusTone(status: CoachTeamMonthlyReportStatus) {
  switch (status) {
    case "enviado":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
    case "rascunho":
      return "border-amber-500/40 bg-amber-500/10 text-amber-200";
    case "atrasado":
      return "border-red-500/40 bg-red-500/10 text-red-300";
    default:
      return "border-border/60 bg-muted/30 text-muted-foreground";
  }
}

function draftToRows(draft: CoachTeamEvaluationDraft): EvaluationRow[] {
  return draft.players.map((p) => ({
    playerId: p.playerId,
    name: p.name,
    jerseyNumber: p.jerseyNumber,
    gamesCount: p.gamesCount,
    gamesMinutes: p.gamesMinutes,
    trainingMinutes: p.trainingMinutes,
    avgMatchRating: p.avgMatchRating,
    coachFinalRating: p.coachFinalRating,
    individualObservation: p.individualObservation ?? null,
    playerStrengths: p.playerStrengths ?? null,
  }));
}

function evaluationsFromReport(data: CoachTeamReport, players: CoachContextPlayer[]): EvaluationRow[] {
  const byId = new Map(players.map((p) => [p.id, p]));
  return data.playerEvaluations.map((ev) => {
    const p = ev.player ?? byId.get(ev.playerId);
    return {
      ...ev,
      name: p
        ? getPlayerListDisplayName({
            name: p.name,
            registrationProfile: p.registrationProfile,
          })
        : ev.player?.name ?? "—",
      jerseyNumber: p?.jerseyNumber ?? ev.player?.jerseyNumber ?? null,
    };
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
  const currentYear = new Date().getFullYear();
  const [reports, setReports] = useState<CoachTeamReport[]>([]);
  const [summary, setSummary] = useState<CoachTeamReportSummary | null>(null);
  const [promotionCandidates, setPromotionCandidates] = useState<CoachPromotionCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [periodKey, setPeriodKey] = useState(suggestMonthlyPeriodKey());
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [generalDescription, setGeneralDescription] = useState("");
  const [weakPoints, setWeakPoints] = useState("");
  const [status, setStatus] = useState<"rascunho" | "enviado">("rascunho");
  const [playerEvaluations, setPlayerEvaluations] = useState<EvaluationRow[]>([]);
  const [playerActions, setPlayerActions] = useState<PlayerActionDraft[]>([]);
  const [statusFilter, setStatusFilter] = useState(defaultStatusFilter);
  const [feedback, setFeedback] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: "",
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const players = useMemo(() => context?.players ?? [], [context?.players]);
  const season = useMemo(() => {
    if (MONTHLY_KEY_RE.test(periodKey)) return Number(periodKey.split("-")[0]);
    return currentYear;
  }, [periodKey, currentYear]);

  const dispensaOptions = useMemo(
    () =>
      players.map((p) => ({
        value: p.id,
        label: `${p.jerseyNumber != null ? `#${p.jerseyNumber} ` : ""}${getPlayerListDisplayName(p)}`,
      })),
    [players],
  );

  const promocaoOptions = useMemo(
    () =>
      promotionCandidates.map((p) => ({
        value: p.id,
        label: `${p.categoryLabel ?? p.category ?? "?"} · ${p.name}`,
      })),
    [promotionCandidates],
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
    if (!tenantId) return;
    const params = new URLSearchParams({ tenantId });
    if (category) params.set("category", category);
    api
      .get<CoachTeamReportSummary>(`/futebol-treinadores/team-reports/summary?${params}`)
      .then(({ data }) => setSummary(data))
      .catch(() => setSummary(null));
  }, [tenantId, category]);

  const loadPromotionCandidates = useCallback(() => {
    if (!tenantId || !category) {
      setPromotionCandidates([]);
      return;
    }
    const params = new URLSearchParams({ tenantId, category });
    api
      .get<CoachPromotionCandidate[]>(`/futebol-treinadores/team-reports/promotion-candidates?${params}`)
      .then(({ data }) => setPromotionCandidates(Array.isArray(data) ? data : []))
      .catch(() => setPromotionCandidates([]));
  }, [tenantId, category]);

  const loadEvaluationDraft = useCallback(
    (opts?: { reportId?: string; nextPeriodKey?: string }) => {
      if (!tenantId || readOnly) return;
      const pk = opts?.nextPeriodKey ?? periodKey;
      if (!MONTHLY_KEY_RE.test(pk)) return;
      setDraftLoading(true);
      const params = new URLSearchParams({ tenantId, periodKey: pk });
      if (category) params.set("category", category);
      if (opts?.reportId) params.set("reportId", opts.reportId);
      api
        .get<CoachTeamEvaluationDraft>(`/futebol-treinadores/team-reports/evaluation-draft?${params}`)
        .then(({ data }) => {
          if (!data) return;
          setPeriodStart(data.periodStart);
          setPeriodEnd(data.periodEnd);
          setPlayerEvaluations((prev) => {
            const rows = draftToRows(data);
            if (prev.length === 0) return rows;
            return rows.map((row) => {
              const existing = prev.find((p) => p.playerId === row.playerId);
              return {
                ...row,
                coachFinalRating: existing?.coachFinalRating ?? row.coachFinalRating,
                individualObservation: existing?.individualObservation ?? row.individualObservation,
                playerStrengths: existing?.playerStrengths ?? row.playerStrengths,
              };
            });
          });
        })
        .catch(() => {
          /* mantém linhas atuais */
        })
        .finally(() => setDraftLoading(false));
    },
    [tenantId, category, periodKey, readOnly],
  );

  useEffect(() => {
    loadReports();
    loadSummary();
    loadPromotionCandidates();
  }, [loadReports, loadSummary, loadPromotionCandidates]);

  const resetForm = () => {
    const pk = suggestMonthlyPeriodKey();
    setSelectedId("");
    setPeriodKey(pk);
    setGeneralDescription("");
    setWeakPoints("");
    setStatus("rascunho");
    setPlayerActions([]);
    setPlayerEvaluations([]);
    loadEvaluationDraft({ nextPeriodKey: pk });
  };

  useEffect(() => {
    if (!selectedId) return;
    api.get<CoachTeamReport>(`/futebol-treinadores/team-reports/${selectedId}`).then(({ data }) => {
      if (!data) return;
      setPeriodKey(data.periodKey ?? suggestMonthlyPeriodKey());
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
          category: a.player?.category ?? null,
          photoUrl: null,
          actionType: a.actionType,
          reason: a.reason ?? "",
        })),
      );
      if (data.playerEvaluations.length > 0) {
        setPlayerEvaluations(evaluationsFromReport(data, players));
      }
      if (data.periodKey && MONTHLY_KEY_RE.test(data.periodKey)) {
        loadEvaluationDraft({ reportId: data.id, nextPeriodKey: data.periodKey });
      }
    });
  }, [selectedId, players, loadEvaluationDraft]);

  useEffect(() => {
    if (selectedId || readOnly || !tenantId) return;
    if (MONTHLY_KEY_RE.test(periodKey)) loadEvaluationDraft();
  }, [selectedId, tenantId, category, periodKey, readOnly, loadEvaluationDraft]);

  const handlePeriodKeyChange = (value: string) => {
    setPeriodKey(value);
    const existing = reports.find(
      (r) => r.periodKey === value && r.periodType === "mensal" && r.status !== "enviado",
    );
    if (existing) setSelectedId(existing.id);
    else {
      setSelectedId("");
      setPlayerEvaluations([]);
    }
  };

  const addAction = (actionType: "dispensa" | "promocao") => {
    if (actionType === "dispensa") {
      const first = players.find((p) => !playerActions.some((a) => a.playerId === p.id));
      if (!first) return;
      setPlayerActions((prev) => [
        ...prev,
        {
          playerId: first.id,
          name: getPlayerListDisplayName(first),
          jerseyNumber: first.jerseyNumber,
          category: first.category,
          photoUrl: null,
          actionType,
          reason: "",
        },
      ]);
      return;
    }
    const first = promotionCandidates.find((p) => !playerActions.some((a) => a.playerId === p.id));
    if (!first) return;
    setPlayerActions((prev) => [
      ...prev,
      {
        playerId: first.id,
        name: first.name,
        jerseyNumber: first.jerseyNumber,
        category: first.category,
        photoUrl: first.photoUrl,
        actionType,
        reason: "",
      },
    ]);
  };

  const validateSubmit = () => {
    if (!generalDescription.trim()) {
      return "A descrição do período é obrigatória.";
    }
    return null;
  };

  const handleSave = async (submit = false) => {
    if (!tenantId || readOnly) return;
    if (submit) {
      const err = validateSubmit();
      if (err) {
        setFeedback({ open: true, title: "Campos obrigatórios", message: err });
        return;
      }
    }
    setSaving(true);
    try {
      const payload = {
        id: selectedId || undefined,
        tenantId,
        category: category || null,
        periodType: "mensal" as const,
        season,
        periodKey,
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
        playerEvaluations: playerEvaluations.map((e) => ({
          playerId: e.playerId,
          gamesCount: e.gamesCount,
          gamesMinutes: e.gamesMinutes,
          trainingMinutes: e.trainingMinutes,
          avgMatchRating: e.avgMatchRating,
          coachFinalRating: e.coachFinalRating,
          individualObservation: e.individualObservation || null,
          playerStrengths: e.playerStrengths || null,
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
          ? "Relatório da equipe enviado ao diretor de futebol."
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
  const monthlyStatus = summary?.monthlyPeriods ?? [];

  const renderActionTable = (rows: PlayerActionDraft[], actionType: "dispensa" | "promocao") => {
    const indices = playerActions
      .map((a, i) => (a.actionType === actionType ? i : -1))
      .filter((i) => i >= 0);
    const options = actionType === "dispensa" ? dispensaOptions : promocaoOptions;

    return (
      <div className="overflow-x-auto rounded-lg border border-border/60">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14 text-center">#</TableHead>
              {actionType === "promocao" ? <TableHead className="w-12" /> : null}
              <TableHead>Atleta</TableHead>
              {actionType === "promocao" ? <TableHead>Categoria</TableHead> : null}
              <TableHead>{actionType === "promocao" ? "Motivo / observação" : "Motivo"}</TableHead>
              {!readOnly ? <TableHead className="w-12" /> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={readOnly ? (actionType === "promocao" ? 4 : 3) : actionType === "promocao" ? 5 : 4}
                  className="text-muted-foreground text-sm"
                >
                  Nenhuma indicação.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, rowIdx) => {
                const idx = indices[rowIdx];
                const candidate = promotionCandidates.find((p) => p.id === row.playerId);
                const photoUrl = candidate?.photoUrl ? getPublicImageUrl(candidate.photoUrl) : null;
                return (
                  <TableRow key={`${actionType}-${row.playerId}-${idx}`}>
                    <TableCell className="text-center tabular-nums font-medium">
                      {row.jerseyNumber ?? "—"}
                    </TableCell>
                    {actionType === "promocao" ? (
                      <TableCell>
                        {photoUrl ? (
                          <Image
                            src={photoUrl}
                            alt=""
                            width={32}
                            height={32}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                    ) : null}
                    <TableCell>
                      {readOnly ? (
                        row.name
                      ) : (
                        <NativeSelectField
                          value={row.playerId}
                          onChange={(e) => {
                            if (actionType === "dispensa") {
                              const player = players.find((p) => p.id === e.target.value);
                              if (!player) return;
                              const next = [...playerActions];
                              next[idx] = {
                                ...next[idx],
                                playerId: player.id,
                                name: getPlayerListDisplayName(player),
                                jerseyNumber: player.jerseyNumber,
                                category: player.category,
                                photoUrl: null,
                              };
                              setPlayerActions(next);
                              return;
                            }
                            const promo = promotionCandidates.find((p) => p.id === e.target.value);
                            if (!promo) return;
                            const next = [...playerActions];
                            next[idx] = {
                              ...next[idx],
                              playerId: promo.id,
                              name: promo.name,
                              jerseyNumber: promo.jerseyNumber,
                              category: promo.category,
                              photoUrl: promo.photoUrl,
                            };
                            setPlayerActions(next);
                          }}
                          options={options}
                        />
                      )}
                    </TableCell>
                    {actionType === "promocao" ? (
                      <TableCell className="text-sm text-muted-foreground">
                        {candidate?.categoryLabel ?? row.category ?? "—"}
                      </TableCell>
                    ) : null}
                    <TableCell>
                      {readOnly ? (
                        row.reason || "—"
                      ) : (
                        <Input
                          value={row.reason}
                          placeholder={actionType === "promocao" ? "Motivo da recomendação" : "Motivo"}
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

      {monthlyStatus.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {monthlyStatus.map((m) => (
            <button
              key={m.periodKey}
              type="button"
              className={`rounded-full border px-3 py-1 text-xs font-medium ${monthlyStatusTone(m.status)}`}
              onClick={() => {
                if (m.reportId) setSelectedId(m.reportId);
                else {
                  setSelectedId("");
                  setPeriodKey(m.periodKey);
                }
              }}
            >
              {monthlyPeriodLabel(m.periodKey)}: {monthlyStatusLabel(m.status)}
            </button>
          ))}
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>Mês</Label>
                {readOnly || status === "enviado" || !MONTHLY_KEY_RE.test(periodKey) ? (
                  <p className="text-sm">
                    {MONTHLY_KEY_RE.test(periodKey)
                      ? monthlyPeriodLabel(periodKey)
                      : periodLabel({
                          periodKey,
                          periodType: "trimestral",
                          season,
                          periodStart,
                          periodEnd,
                        } as CoachTeamReport)}
                  </p>
                ) : (
                  <Input
                    type="month"
                    className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                    value={periodKey}
                    onChange={(e) => handlePeriodKeyChange(e.target.value)}
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label>Início</Label>
                <Input
                  type="date"
                  className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                  value={periodStart}
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label>Fim</Label>
                <Input
                  type="date"
                  className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                  value={periodEnd}
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label>Temporada</Label>
                <Input type="number" value={season} disabled />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição do período *</Label>
              <Textarea
                rows={4}
                value={generalDescription}
                disabled={readOnly || status === "enviado"}
                placeholder="Obrigatória ao enviar"
                onChange={(e) => setGeneralDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Pontos fracos</Label>
              <Textarea
                rows={3}
                value={weakPoints}
                disabled={readOnly || status === "enviado"}
                onChange={(e) => setWeakPoints(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Atletas</Label>
                {draftLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
              </div>
              <div className="overflow-x-auto rounded-lg border border-border/60">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead>Atleta</TableHead>
                      <TableHead className="text-right">Min. jogo</TableHead>
                      <TableHead className="text-right">Min. treino</TableHead>
                      <TableHead className="w-24">Nota</TableHead>
                      <TableHead className="min-w-[180px]">Observação</TableHead>
                      <TableHead className="min-w-[160px]">Pontos fortes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {playerEvaluations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-muted-foreground text-sm">
                          {draftLoading
                            ? "Carregando estatísticas…"
                            : "Nenhum atleta convocado neste mês."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      playerEvaluations.map((row, idx) => (
                        <TableRow key={row.playerId}>
                          <TableCell className="text-center tabular-nums">{row.jerseyNumber ?? "—"}</TableCell>
                          <TableCell className="font-medium">{row.name}</TableCell>
                          <TableCell className="text-right tabular-nums">{row.gamesMinutes}</TableCell>
                          <TableCell className="text-right tabular-nums">{row.trainingMinutes}</TableCell>
                          <TableCell>
                            {readOnly || status === "enviado" ? (
                              row.coachFinalRating ?? "—"
                            ) : (
                              <Input
                                type="number"
                                min={0}
                                max={5}
                                step={0.1}
                                className="h-9"
                                value={row.coachFinalRating ?? ""}
                                onChange={(e) => {
                                  const val = e.target.value === "" ? null : Number(e.target.value);
                                  setPlayerEvaluations((prev) => {
                                    const next = [...prev];
                                    next[idx] = { ...next[idx], coachFinalRating: val };
                                    return next;
                                  });
                                }}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            {readOnly || status === "enviado" ? (
                              row.individualObservation || "—"
                            ) : (
                              <Textarea
                                rows={2}
                                className="min-h-[60px] text-sm"
                                value={row.individualObservation ?? ""}
                                onChange={(e) => {
                                  setPlayerEvaluations((prev) => {
                                    const next = [...prev];
                                    next[idx] = { ...next[idx], individualObservation: e.target.value };
                                    return next;
                                  });
                                }}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            {readOnly || status === "enviado" ? (
                              row.playerStrengths || "—"
                            ) : (
                              <Textarea
                                rows={2}
                                className="min-h-[60px] text-sm"
                                value={row.playerStrengths ?? ""}
                                onChange={(e) => {
                                  setPlayerEvaluations((prev) => {
                                    const next = [...prev];
                                    next[idx] = { ...next[idx], playerStrengths: e.target.value };
                                    return next;
                                  });
                                }}
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Dispensas</Label>
                {!readOnly && status !== "enviado" ? (
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
                <Label>Recomendações de subida (treinar com a categoria)</Label>
                {!readOnly && status !== "enviado" ? (
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

            {!readOnly && status !== "enviado" ? (
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => void handleSave(false)} disabled={saving}>
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
