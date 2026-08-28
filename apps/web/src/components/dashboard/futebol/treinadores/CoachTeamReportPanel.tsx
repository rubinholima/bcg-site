"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Loader2, MoreHorizontal, Pencil, Plus, Save, Send, Trash2 } from "lucide-react";
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
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";
import { getCategoryLabel } from "@/lib/fixture-categories";
import { useFixtureCategories } from "@/hooks/useFixtureCategories";
import { getPlayerListDisplayName } from "@/lib/player-display-name";
import { getPositionLabel } from "@/lib/football-positions";
import { cn } from "@/lib/utils";
import type {
  CoachContextPlayer,
  CoachContextResponse,
  CoachPromotionCandidate,
  CoachTeamEvaluationDraft,
  CoachTeamMonthlyReportStatus,
  CoachTeamReport,
  CoachTeamReportSummary,
} from "@/lib/treinadores-types";
import {
  CoachTeamReportPlayerDetailSheet,
  type TeamReportEvaluationRow,
} from "./CoachTeamReportPlayerDetailSheet";
import {
  CoachTeamReportPromotionPicker,
  type PromotionSelection,
} from "./CoachTeamReportPromotionPicker";
import { CoachTeamReportPlayerAvatar } from "./CoachTeamReportPlayerAvatar";
import { CoachTeamReportStarRating } from "./CoachTeamReportStarRating";
import { exportTeamReportEvaluationsExcel } from "./coach-team-report-export";
import {
  MONTHLY_KEY_RE,
  TEAM_REPORT_PAGE_SIZE,
  computeDeadlineInfo,
  monthlyPeriodLabel,
  monthlyStatusLabel,
  monthlyStatusTone,
  periodLabel,
  scoreBadgeTone,
  suggestMonthlyPeriodKey,
  truncateText,
  type TeamReportTab,
} from "./coach-team-report-utils";

type PlayerActionDraft = {
  playerId: string;
  name: string;
  jerseyNumber: number | null;
  category: string | null;
  photoUrl: string | null;
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

const TABS: Array<{ id: TeamReportTab; label: string }> = [
  { id: "visao-geral", label: "Visão geral" },
  { id: "avaliacoes", label: "Avaliações dos atletas" },
  { id: "acoes", label: "Ações da equipe" },
  { id: "historico", label: "Histórico" },
];

function draftToRows(draft: CoachTeamEvaluationDraft): TeamReportEvaluationRow[] {
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

function evaluationsFromReport(
  data: CoachTeamReport,
  players: CoachContextPlayer[],
): TeamReportEvaluationRow[] {
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
  const { categories: fixtureCategories } = useFixtureCategories();
  const currentYear = new Date().getFullYear();
  const [activeTab, setActiveTab] = useState<TeamReportTab>("avaliacoes");
  const [reports, setReports] = useState<CoachTeamReport[]>([]);
  const [summary, setSummary] = useState<CoachTeamReportSummary | null>(null);
  const [promotionCandidates, setPromotionCandidates] = useState<CoachPromotionCandidate[]>([]);
  const [promotionLoading, setPromotionLoading] = useState(false);
  const [promotionLoadError, setPromotionLoadError] = useState<string | null>(null);
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
  const [playerEvaluations, setPlayerEvaluations] = useState<TeamReportEvaluationRow[]>([]);
  const [playerActions, setPlayerActions] = useState<PlayerActionDraft[]>([]);
  const [statusFilter, setStatusFilter] = useState(defaultStatusFilter);
  const [detailPlayerId, setDetailPlayerId] = useState<string | null>(null);
  const [detailEditMode, setDetailEditMode] = useState(false);
  const [evaluationsPage, setEvaluationsPage] = useState(1);
  const [promotionPickerOpen, setPromotionPickerOpen] = useState(false);
  const [dispensaSearch, setDispensaSearch] = useState("");
  const [feedback, setFeedback] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: "",
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const players = useMemo(() => context?.players ?? [], [context?.players]);
  const playersById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  const season = useMemo(() => {
    if (MONTHLY_KEY_RE.test(periodKey)) return Number(periodKey.split("-")[0]);
    return currentYear;
  }, [periodKey, currentYear]);

  const categoryLabel = category
    ? getCategoryLabel(category, "pt", fixtureCategories)
    : "Todas";

  const currentMonthlyChipStatus = useMemo((): CoachTeamMonthlyReportStatus => {
    const fromSummary = summary?.monthlyPeriods?.find((m) => m.periodKey === periodKey)?.status;
    if (fromSummary) return fromSummary;
    if (status === "enviado") return "enviado";
    return "rascunho";
  }, [summary, periodKey, status]);

  const deadline = useMemo(
    () => computeDeadlineInfo(periodEnd, status),
    [periodEnd, status],
  );

  const reportSummary = useMemo(() => {
    const rated = playerEvaluations.filter((e) => e.coachFinalRating != null);
    const avg =
      rated.length > 0
        ? rated.reduce((sum, e) => sum + (e.coachFinalRating ?? 0), 0) / rated.length
        : null;
    return {
      athletes: playerEvaluations.length,
      matchMinutes: playerEvaluations.reduce((s, e) => s + e.gamesMinutes, 0),
      trainingMinutes: playerEvaluations.reduce((s, e) => s + e.trainingMinutes, 0),
      avgScore: avg,
      promotions: playerActions.filter((a) => a.actionType === "promocao").length,
    };
  }, [playerEvaluations, playerActions]);

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
      setPromotionLoadError(null);
      setPromotionLoading(false);
      return;
    }
    setPromotionLoading(true);
    setPromotionLoadError(null);
    const params = new URLSearchParams({ tenantId, category });
    api
      .get<CoachPromotionCandidate[]>(`/futebol-treinadores/team-reports/promotion-candidates?${params}`)
      .then(({ data }) => setPromotionCandidates(Array.isArray(data) ? data : []))
      .catch((e) => {
        setPromotionCandidates([]);
        setPromotionLoadError(
          e instanceof Error ? e.message : "Não foi possível carregar candidatos.",
        );
      })
      .finally(() => setPromotionLoading(false));
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
        data.playerActions.map((a) => {
          const ctxPlayer = playersById.get(a.playerId);
          const promo = promotionCandidates.find((p) => p.id === a.playerId);
          return {
            playerId: a.playerId,
            name: a.player
              ? getPlayerListDisplayName({
                  name: a.player.name,
                  registrationProfile: a.player.registrationProfile,
                })
              : ctxPlayer?.name ?? "",
            jerseyNumber: a.player?.jerseyNumber ?? ctxPlayer?.jerseyNumber ?? null,
            category: a.player?.category ?? ctxPlayer?.category ?? promo?.category ?? null,
            photoUrl: ctxPlayer?.photoUrl ?? promo?.photoUrl ?? null,
            actionType: a.actionType,
            reason: a.reason ?? "",
          };
        }),
      );
      if (data.playerEvaluations.length > 0) {
        setPlayerEvaluations(evaluationsFromReport(data, players));
      }
      if (data.periodKey && MONTHLY_KEY_RE.test(data.periodKey)) {
        loadEvaluationDraft({ reportId: data.id, nextPeriodKey: data.periodKey });
      }
    });
  }, [selectedId, players, playersById, loadEvaluationDraft]);

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

  const validateSubmit = () => {
    if (!generalDescription.trim()) {
      return "A descrição do período é obrigatória.";
    }
    return null;
  };

  const handleSave = async (
    submit = false,
    overrides?: { playerEvaluations?: TeamReportEvaluationRow[] },
  ) => {
    if (!tenantId || readOnly) return false;
    if (submit) {
      const err = validateSubmit();
      if (err) {
        setFeedback({ open: true, title: "Campos obrigatórios", message: err });
        return false;
      }
    }
    const evaluationsToSave = overrides?.playerEvaluations ?? playerEvaluations;
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
        playerEvaluations: evaluationsToSave.map((e) => ({
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
        setStatus("enviado");
      }
      if (overrides?.playerEvaluations) {
        setPlayerEvaluations(overrides.playerEvaluations);
      }
      loadReports();
      loadSummary();
      if (submit) {
        setFeedback({
          open: true,
          title: "Enviado",
          message: "Relatório da equipe enviado ao diretor de futebol.",
        });
      }
      return true;
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível salvar.",
      });
      return false;
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

  const handlePlayerDetailSave = async (patch: {
    coachFinalRating: number | null;
    individualObservation: string | null;
    playerStrengths: string | null;
  }) => {
    if (!detailPlayerId) return;
    const nextEvaluations = playerEvaluations.map((row) =>
      row.playerId === detailPlayerId
        ? {
            ...row,
            coachFinalRating: patch.coachFinalRating,
            individualObservation: patch.individualObservation,
            playerStrengths: patch.playerStrengths,
          }
        : row,
    );
    const ok = await handleSave(false, { playerEvaluations: nextEvaluations });
    if (ok) {
      setFeedback({ open: true, title: "Salvo", message: "Avaliação do atleta atualizada." });
    }
  };

  const promotionSelections: PromotionSelection[] = useMemo(
    () =>
      playerActions
        .filter((a) => a.actionType === "promocao")
        .map((a) => {
          const promo = promotionCandidates.find((p) => p.id === a.playerId);
          return {
            playerId: a.playerId,
            name: a.name,
            jerseyNumber: a.jerseyNumber,
            category: a.category,
            categoryLabel: promo?.categoryLabel ?? null,
            photoUrl: a.photoUrl ?? promo?.photoUrl ?? null,
            reason: a.reason,
          };
        }),
    [playerActions, promotionCandidates],
  );

  const dispensas = playerActions.filter((a) => a.actionType === "dispensa");
  const locked = readOnly || status === "enviado";

  const filteredDispensaPlayers = useMemo(() => {
    const q = dispensaSearch.trim().toLowerCase();
    const used = new Set(dispensas.map((d) => d.playerId));
    return players.filter((p) => {
      if (used.has(p.id)) return false;
      if (!q) return true;
      return getPlayerListDisplayName(p).toLowerCase().includes(q);
    });
  }, [players, dispensaSearch, dispensas]);

  const detailPlayer = detailPlayerId ? playersById.get(detailPlayerId) ?? null : null;
  const detailEvaluation =
    detailPlayerId != null
      ? playerEvaluations.find((e) => e.playerId === detailPlayerId) ?? null
      : null;

  const evaluationsPageCount = Math.max(
    1,
    Math.ceil(playerEvaluations.length / TEAM_REPORT_PAGE_SIZE),
  );

  const paginatedEvaluations = useMemo(() => {
    const start = (evaluationsPage - 1) * TEAM_REPORT_PAGE_SIZE;
    return playerEvaluations.slice(start, start + TEAM_REPORT_PAGE_SIZE);
  }, [playerEvaluations, evaluationsPage]);

  useEffect(() => {
    setEvaluationsPage(1);
  }, [periodKey, playerEvaluations.length]);

  const openPlayerDetail = (playerId: string, edit = false) => {
    setDetailEditMode(edit);
    setDetailPlayerId(playerId);
  };

  if (contextLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[1400px] space-y-6 transition-[padding] duration-200",
        detailPlayerId != null && "lg:pr-[min(28rem,calc(100vw-2rem))]",
      )}
    >
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

      <div className="rounded-xl border border-border/60 bg-card/40 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">Relatório da Equipe</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Acompanhe o desempenho da equipe e registre avaliações mensais dos atletas.
            </p>
          </div>
          {deadline ? (
            <div
              className={cn(
                "shrink-0 rounded-none border px-4 py-3 text-sm",
                deadline.tone === "sent" && "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
                deadline.tone === "overdue" && "border-red-500/40 bg-red-500/10 text-red-300",
                deadline.tone === "pending" && "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
              )}
            >
              <p className="font-semibold">{deadline.label}</p>
              {"sublabel" in deadline && deadline.sublabel ? (
                <p className="mt-0.5 text-xs opacity-90">{deadline.sublabel}</p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Categoria</Label>
            <p className="text-sm font-medium">{categoryLabel}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Mês / Período</Label>
            {locked || !MONTHLY_KEY_RE.test(periodKey) ? (
              <p className="text-sm font-medium">
                {MONTHLY_KEY_RE.test(periodKey) ? monthlyPeriodLabel(periodKey) : periodKey}
              </p>
            ) : (
              <Input
                type="month"
                className="h-9 text-foreground [&::-webkit-datetime-edit]:text-foreground"
                value={periodKey}
                onChange={(e) => handlePeriodKeyChange(e.target.value)}
              />
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <span
              className={cn(
                "inline-flex rounded-sm border px-3 py-1 text-xs font-medium capitalize",
                monthlyStatusTone(currentMonthlyChipStatus),
              )}
            >
              {monthlyStatusLabel(currentMonthlyChipStatus)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-0 border-b border-border/60">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={cn(
              "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "visao-geral" ? (
        <>
          <Card className="border-primary/20 bg-muted/10">
            <CardContent className="grid gap-4 py-5 sm:grid-cols-2 lg:grid-cols-5">
              <SummaryStat label="Atletas avaliados" value={reportSummary.athletes} />
              <SummaryStat label="Minutos de jogo" value={reportSummary.matchMinutes} />
              <SummaryStat label="Minutos de treino" value={reportSummary.trainingMinutes} />
              <SummaryStat
                label="Nota média da equipe"
                value={reportSummary.avgScore != null ? reportSummary.avgScore.toFixed(1) : "—"}
              />
              <SummaryStat label="Indicações de subida" value={reportSummary.promotions} />
            </CardContent>
          </Card>
          <Card>
          <CardHeader>
            <CardTitle className="text-base">Visão geral do período</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Início do período</Label>
                <Input type="date" value={periodStart} disabled className="text-foreground" />
              </div>
              <div className="space-y-2">
                <Label>Fim do período</Label>
                <Input type="date" value={periodEnd} disabled className="text-foreground" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição geral do período *</Label>
              <Textarea
                rows={5}
                value={generalDescription}
                disabled={locked}
                placeholder="Obrigatória ao enviar"
                onChange={(e) => setGeneralDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Análise / pontos fracos</Label>
              <Textarea
                rows={4}
                value={weakPoints}
                disabled={locked}
                onChange={(e) => setWeakPoints(e.target.value)}
              />
            </div>
            {!locked ? (
              <div className="flex flex-wrap gap-2 pt-2">
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
        </>
      ) : null}

      {activeTab === "avaliacoes" ? (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 pb-4">
            <div>
              <CardTitle className="text-base">Avaliações dos atletas</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {MONTHLY_KEY_RE.test(periodKey) ? monthlyPeriodLabel(periodKey) : periodKey}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {draftLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={playerEvaluations.length === 0}
                onClick={() =>
                  exportTeamReportEvaluationsExcel(
                    playerEvaluations,
                    MONTHLY_KEY_RE.test(periodKey) ? monthlyPeriodLabel(periodKey) : periodKey,
                    periodKey,
                  )
                }
              >
                Exportar Excel
              </Button>
              {!locked ? (
                <Button type="button" size="sm" disabled={saving} onClick={() => void handleSave(false)}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Salvar relatório
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-center">#</TableHead>
                    <TableHead>Atleta</TableHead>
                    <TableHead className="text-right">Min. jogo</TableHead>
                    <TableHead className="text-right">Min. treino</TableHead>
                    <TableHead className="w-28 text-center">Nota</TableHead>
                    <TableHead className="min-w-[140px]">Observação</TableHead>
                    <TableHead className="w-28 text-center">Ações</TableHead>
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
                    paginatedEvaluations.map((row, idx) => {
                      const globalIndex = (evaluationsPage - 1) * TEAM_REPORT_PAGE_SIZE + idx;
                      const ctxPlayer = playersById.get(row.playerId);
                      const photoUrl = ctxPlayer?.photoUrl ?? null;
                      const position = ctxPlayer?.position
                        ? getPositionLabel(ctxPlayer.position)
                        : null;
                      return (
                        <TableRow key={row.playerId}>
                          <TableCell className="text-center tabular-nums text-muted-foreground">
                            {globalIndex + 1}
                          </TableCell>
                          <TableCell>
                            <button
                              type="button"
                              className="flex min-w-[180px] items-center gap-3 text-left hover:opacity-90"
                              onClick={() => openPlayerDetail(row.playerId)}
                            >
                              <CoachTeamReportPlayerAvatar
                                name={row.name}
                                photoUrl={photoUrl}
                                size="sm"
                              />
                              <div className="min-w-0">
                                <p className="truncate font-medium">{row.name}</p>
                                {position ? (
                                  <p className="truncate text-xs text-muted-foreground">{position}</p>
                                ) : null}
                              </div>
                            </button>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{row.gamesMinutes}</TableCell>
                          <TableCell className="text-right tabular-nums">{row.trainingMinutes}</TableCell>
                          <TableCell>
                            <div className="flex flex-col items-center gap-1">
                              <span
                                className={cn(
                                  "inline-flex min-w-[3rem] justify-center rounded-sm border px-2 py-0.5 text-sm font-semibold tabular-nums",
                                  scoreBadgeTone(row.coachFinalRating),
                                )}
                              >
                                {row.coachFinalRating != null ? row.coachFinalRating.toFixed(1) : "—"}
                              </span>
                              <CoachTeamReportStarRating value={row.coachFinalRating} size="sm" />
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[220px] text-sm text-muted-foreground">
                            {truncateText(row.individualObservation)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-0.5">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 rounded-full p-0"
                                aria-label="Ver detalhes"
                                onClick={() => openPlayerDetail(row.playerId)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {!locked ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 rounded-full p-0"
                                  aria-label="Editar avaliação"
                                  onClick={() => openPlayerDetail(row.playerId, true)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              ) : null}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 rounded-full p-0"
                                aria-label="Mais opções"
                                onClick={() => openPlayerDetail(row.playerId)}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            {playerEvaluations.length > TEAM_REPORT_PAGE_SIZE ? (
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Mostrando {(evaluationsPage - 1) * TEAM_REPORT_PAGE_SIZE + 1} a{" "}
                  {Math.min(evaluationsPage * TEAM_REPORT_PAGE_SIZE, playerEvaluations.length)} de{" "}
                  {playerEvaluations.length} atletas
                </p>
                <div className="flex flex-wrap items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={evaluationsPage <= 1}
                    onClick={() => setEvaluationsPage((p) => Math.max(1, p - 1))}
                  >
                    Anterior
                  </Button>
                  {Array.from({ length: evaluationsPageCount }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      type="button"
                      variant={page === evaluationsPage ? "default" : "outline"}
                      size="sm"
                      className="min-w-9"
                      onClick={() => setEvaluationsPage(page)}
                    >
                      {page}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={evaluationsPage >= evaluationsPageCount}
                    onClick={() => setEvaluationsPage((p) => Math.min(evaluationsPageCount, p + 1))}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "acoes" ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base">Indicação de subida</CardTitle>
              {!locked ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (!category) {
                      setFeedback({
                        open: true,
                        title: "Categoria obrigatória",
                        message: "Selecione uma categoria para visualizar atletas elegíveis.",
                      });
                      return;
                    }
                    setPromotionPickerOpen(true);
                  }}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Indicar
                </Button>
              ) : null}
            </CardHeader>
            <CardContent>
              {!category ? (
                <p className="text-sm text-muted-foreground">
                  Selecione uma categoria para visualizar atletas elegíveis.
                </p>
              ) : promotionSelections.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma indicação registrada.</p>
              ) : (
                <div className="space-y-3">
                  {promotionSelections.map((s) => (
                    <div
                      key={s.playerId}
                      className="flex items-start gap-3 rounded-lg border border-border/60 p-3"
                    >
                      <CoachTeamReportPlayerAvatar name={s.name} photoUrl={s.photoUrl} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.categoryLabel ??
                            (s.category ? getCategoryLabel(s.category, "pt", fixtureCategories) : "—")}
                        </p>
                        {s.reason ? (
                          <p className="mt-1 text-sm text-muted-foreground">{s.reason}</p>
                        ) : null}
                      </div>
                      {!locked ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 shrink-0 p-0 text-destructive"
                          onClick={() =>
                            setPlayerActions((prev) =>
                              prev.filter(
                                (a) => !(a.actionType === "promocao" && a.playerId === s.playerId),
                              ),
                            )
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dispensa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!locked ? (
                <>
                  <div className="space-y-2">
                    <Label>Buscar atleta da categoria</Label>
                    <Input
                      value={dispensaSearch}
                      placeholder="Nome do atleta…"
                      onChange={(e) => setDispensaSearch(e.target.value)}
                    />
                  </div>
                  <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border/60 p-2">
                    {filteredDispensaPlayers.length === 0 ? (
                      <p className="py-4 text-center text-sm text-muted-foreground">
                        Nenhum atleta disponível.
                      </p>
                    ) : (
                      filteredDispensaPlayers.slice(0, 20).map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/30"
                        >
                          <CoachTeamReportPlayerAvatar
                            name={getPlayerListDisplayName(p)}
                            photoUrl={p.photoUrl}
                            size="sm"
                          />
                          <p className="min-w-0 flex-1 truncate text-sm font-medium">
                            {getPlayerListDisplayName(p)}
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setPlayerActions((prev) => [
                                ...prev,
                                {
                                  playerId: p.id,
                                  name: getPlayerListDisplayName(p),
                                  jerseyNumber: p.jerseyNumber,
                                  category: p.category,
                                  photoUrl: p.photoUrl ?? null,
                                  actionType: "dispensa",
                                  reason: "",
                                },
                              ])
                            }
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : null}

              <div className="space-y-2">
                <Label>Indicações de dispensa</Label>
                {dispensas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma dispensa indicada.</p>
                ) : (
                  dispensas.map((d) => (
                    <div
                      key={d.playerId}
                      className="flex items-start gap-3 rounded-lg border border-border/60 p-3"
                    >
                      <CoachTeamReportPlayerAvatar name={d.name} photoUrl={d.photoUrl} size="sm" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <p className="font-medium">{d.name}</p>
                        {!locked ? (
                          <Input
                            value={d.reason}
                            placeholder="Motivo da dispensa"
                            onChange={(e) =>
                              setPlayerActions((prev) =>
                                prev.map((a) =>
                                  a.playerId === d.playerId && a.actionType === "dispensa"
                                    ? { ...a, reason: e.target.value }
                                    : a,
                                ),
                              )
                            }
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground">{d.reason || "—"}</p>
                        )}
                      </div>
                      {!locked ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 shrink-0 p-0 text-destructive"
                          onClick={() =>
                            setPlayerActions((prev) =>
                              prev.filter(
                                (a) => !(a.actionType === "dispensa" && a.playerId === d.playerId),
                              ),
                            )
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeTab === "historico" ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
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
                    className={cn(
                      "rounded-lg border p-3 text-sm",
                      selectedId === r.id ? "border-primary bg-primary/5" : "border-border/60",
                    )}
                  >
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => setSelectedId(r.id)}
                    >
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
            <CardContent className="pt-6">
              {selectedId ? (
                <p className="text-sm text-muted-foreground">
                  Relatório selecionado. Use as abas Visão geral, Avaliações e Ações para editar o
                  período{" "}
                  {MONTHLY_KEY_RE.test(periodKey) ? monthlyPeriodLabel(periodKey) : periodKey}.
                  {status === "enviado" && reports.find((r) => r.id === selectedId)?.sentAt
                    ? ` Enviado em ${formatDateDayMonYear(new Date(reports.find((r) => r.id === selectedId)!.sentAt!))}.`
                    : ""}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Selecione um relatório na lista ou altere o mês no cabeçalho para abrir um
                  período.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <CoachTeamReportPlayerDetailSheet
        open={detailPlayerId != null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailPlayerId(null);
            setDetailEditMode(false);
          }
        }}
        player={detailPlayer}
        evaluation={detailEvaluation}
        tenantId={tenantId}
        category={category}
        periodLabel={MONTHLY_KEY_RE.test(periodKey) ? monthlyPeriodLabel(periodKey) : periodKey}
        season={season}
        periodEnd={periodEnd}
        readOnly={locked}
        saving={saving}
        initialEdit={detailEditMode}
        onSave={handlePlayerDetailSave}
      />

      <CoachTeamReportPromotionPicker
        open={promotionPickerOpen}
        onOpenChange={setPromotionPickerOpen}
        categorySelected={!!category}
        candidates={promotionCandidates}
        loading={promotionLoading}
        loadError={promotionLoadError}
        selections={promotionSelections}
        readOnly={locked}
        onAdd={(c) => {
          if (playerActions.some((a) => a.playerId === c.id && a.actionType === "promocao")) return;
          setPlayerActions((prev) => [
            ...prev,
            {
              playerId: c.id,
              name: c.name,
              jerseyNumber: c.jerseyNumber,
              category: c.category,
              photoUrl: c.photoUrl,
              actionType: "promocao",
              reason: "",
            },
          ]);
        }}
        onRemove={(playerId) =>
          setPlayerActions((prev) =>
            prev.filter((a) => !(a.actionType === "promocao" && a.playerId === playerId)),
          )
        }
        onReasonChange={(playerId, reason) =>
          setPlayerActions((prev) =>
            prev.map((a) =>
              a.playerId === playerId && a.actionType === "promocao" ? { ...a, reason } : a,
            ),
          )
        }
      />

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

function SummaryStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center sm:text-left">
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
