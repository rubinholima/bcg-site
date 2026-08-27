"use client";

import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import Image from "next/image";
import {
  Calendar,
  Footprints,
  Loader2,
  Ruler,
  Save,
  Send,
  Star,
  TrendingDown,
  TrendingUp,
  User,
  Weight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelectField } from "@/components/ui/native-select";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import { getCategoryLabel } from "@/lib/fixture-categories";
import { useFixtureCategories } from "@/hooks/useFixtureCategories";
import { getPlayerListDisplayName } from "@/lib/player-display-name";
import { getPublicImageUrl } from "@/lib/media-url";
import { getPositionLabel } from "@/lib/football-positions";
import { computeAgeAtDate } from "@/lib/fisiologia-calculations";
import { cn } from "@/lib/utils";
import type {
  CoachContextPlayer,
  CoachContextResponse,
  CoachPlayerEvaluation,
  CoachPlayerEvaluationStats,
} from "@/lib/treinadores-types";
import {
  COACH_PLAYER_CLASSIFICATION_LABEL,
  COACH_PLAYER_EVALUATION_SCORE_SECTIONS,
  COACH_PLAYER_FINAL_RESULT_OPTIONS,
  COACH_TEAM_PERIOD_KEYS,
  coachPlayerClassificationFromPercentage,
  coachPlayerPercentageFromAverage,
  type CoachTeamReportPeriodKey,
} from "@/lib/treinadores-types";

type ScoreState = Record<string, string>;

interface Props {
  tenantId: string;
  category?: string;
  contextLoading: boolean;
  context: CoachContextResponse | null;
}

function suggestPeriodKey(): CoachTeamReportPeriodKey {
  const month = new Date().getMonth() + 1;
  if (month <= 2) return "fevereiro";
  if (month <= 7) return "julho";
  if (month <= 9) return "setembro";
  return "fim_temporada";
}

function emptyScores(): ScoreState {
  const scores: ScoreState = {};
  for (const section of COACH_PLAYER_EVALUATION_SCORE_SECTIONS) {
    for (const field of section.fields) scores[field.key] = "";
  }
  return scores;
}

function statsFromEvaluation(row: CoachPlayerEvaluation | null): CoachPlayerEvaluationStats | null {
  if (!row) return null;
  return {
    gamesListed: row.gamesListed,
    gamesPlayed: row.gamesPlayed,
    gamesStarted: row.gamesStarted,
    gamesListedHigherCategory: row.gamesListedHigherCategory,
    gamesPlayedHigherCategory: row.gamesPlayedHigherCategory,
    matchMinutes: row.matchMinutes,
    trainingMinutes: row.trainingMinutes,
    goals: row.goals,
    assists: row.assists,
  };
}

function scoresFromEvaluation(row: CoachPlayerEvaluation | null): ScoreState {
  const scores = emptyScores();
  if (!row) return scores;
  for (const section of COACH_PLAYER_EVALUATION_SCORE_SECTIONS) {
    for (const field of section.fields) {
      const value = row[field.key as keyof CoachPlayerEvaluation];
      scores[field.key] = value == null ? "" : String(value);
    }
  }
  return scores;
}

function computeLiveAverage(scores: ScoreState): number | null {
  const values = Object.values(scores)
    .filter((v) => v !== "")
    .map(Number)
    .filter((n) => Number.isFinite(n));
  if (values.length === 0) return null;
  return values.reduce((sum, n) => sum + n, 0) / values.length;
}

function preferredFootLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.toLowerCase();
  if (v === "right" || v === "direito") return "Pé direito";
  if (v === "left" || v === "esquerdo") return "Pé esquerdo";
  if (v === "both" || v === "ambidestro") return "Ambidestro";
  return value;
}

function formatHeightCm(height: number | null | undefined): string | null {
  if (height == null || height <= 0) return null;
  return `${(height / 100).toFixed(2).replace(".", ",")} m`;
}

function previousPeriodEvaluation(
  periodKey: CoachTeamReportPeriodKey,
  historyByPeriod: Map<string, CoachPlayerEvaluation>,
): CoachPlayerEvaluation | null {
  const order = COACH_TEAM_PERIOD_KEYS.map((p) => p.value);
  const idx = order.indexOf(periodKey);
  if (idx <= 0) return null;
  for (let i = idx - 1; i >= 0; i -= 1) {
    const row = historyByPeriod.get(order[i]!);
    if (row?.status === "concluido" && row.overallAverage != null) return row;
  }
  return null;
}

function StarScoreRow({
  label,
  value,
  readOnly,
  onChange,
}: {
  label: string;
  value: string;
  readOnly: boolean;
  onChange: (value: string) => void;
}) {
  const num = value === "" ? 0 : Number(value);
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/40 py-2 last:border-0">
      <span className="min-w-0 flex-1 text-sm leading-snug">{label}</span>
      <div className="flex shrink-0 items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            aria-label={`${label}: ${star} estrelas`}
            className={cn(
              "rounded p-0.5 transition-colors",
              readOnly ? "cursor-default" : "hover:bg-muted/60",
            )}
            onClick={() => onChange(String(star))}
          >
            <Star
              className={cn(
                "h-4 w-4",
                star <= num ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40",
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function ParticipationStat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number | string;
  suffix?: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-center">
      <p className="text-2xl font-bold tabular-nums text-foreground">
        {value}
        {suffix ? <span className="text-base font-semibold">{suffix}</span> : null}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function PlayerSpec({
  icon: Icon,
  label,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {label}
    </span>
  );
}

export function CoachPlayerEvaluationPanel({
  tenantId,
  category,
  contextLoading,
  context,
}: Props) {
  const { categories: fixtureCategories } = useFixtureCategories();
  const currentYear = new Date().getFullYear();
  const players = useMemo(() => context?.players ?? [], [context?.players]);

  const [season, setSeason] = useState(currentYear);
  const [periodKey, setPeriodKey] = useState<CoachTeamReportPeriodKey>(suggestPeriodKey());
  const [playerId, setPlayerId] = useState("");
  const [evaluationId, setEvaluationId] = useState("");
  const [status, setStatus] = useState<"pendente" | "rascunho" | "concluido">("pendente");
  const [stats, setStats] = useState<CoachPlayerEvaluationStats | null>(null);
  const [scores, setScores] = useState<ScoreState>(() => emptyScores());
  const [technicalAssessment, setTechnicalAssessment] = useState("");
  const [finalResult, setFinalResult] = useState("");
  const [computed, setComputed] = useState<{
    overallAverage: number | null;
    percentage: number | null;
    classification: string | null;
  }>({ overallAverage: null, percentage: null, classification: null });
  const [history, setHistory] = useState<CoachPlayerEvaluation[]>([]);
  const [periodicAverage, setPeriodicAverage] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: "",
  });

  const selectedPlayer = players.find((p) => p.id === playerId);
  const readOnly = status === "concluido";

  const playerPhotoUrl = useMemo(() => {
    const raw =
      selectedPlayer?.photoUrl ??
      history.find((row) => row.playerId === playerId)?.player?.photoUrl ??
      null;
    return raw ? getPublicImageUrl(raw) : null;
  }, [selectedPlayer?.photoUrl, history, playerId]);

  const historyByPeriod = useMemo(() => {
    const map = new Map<string, CoachPlayerEvaluation>();
    for (const row of history) map.set(row.periodKey, row);
    return map;
  }, [history]);

  const liveAverage = useMemo(() => computeLiveAverage(scores), [scores]);
  const displayAverage = computed.overallAverage ?? liveAverage;
  const displayPercentage =
    computed.percentage ?? coachPlayerPercentageFromAverage(displayAverage);
  const displayClassification =
    computed.classification ??
    (displayPercentage != null ? coachPlayerClassificationFromPercentage(displayPercentage) : null);

  const consolidatedPercentage = coachPlayerPercentageFromAverage(periodicAverage);
  const consolidatedClassification =
    consolidatedPercentage != null
      ? coachPlayerClassificationFromPercentage(consolidatedPercentage)
      : null;

  const prevEval = useMemo(
    () => previousPeriodEvaluation(periodKey, historyByPeriod),
    [periodKey, historyByPeriod],
  );
  const evolution =
    displayAverage != null && prevEval?.overallAverage != null
      ? displayAverage - prevEval.overallAverage
      : null;

  const playerOptions = useMemo(
    () =>
      players.map((p) => ({
        value: p.id,
        label: `${p.jerseyNumber != null ? `#${p.jerseyNumber} ` : ""}${getPlayerListDisplayName(p)}`,
      })),
    [players],
  );

  const loadExisting = useCallback(async () => {
    if (!tenantId || !category || !playerId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tenantId,
        category,
        season: String(season),
        periodKey,
        playerId,
      });
      const [{ data: list }, { data: statsData }, { data: historyData }] = await Promise.all([
        api.get<CoachPlayerEvaluation[]>(`/futebol-treinadores/player-evaluations?${params}`),
        api.get<{ stats: CoachPlayerEvaluationStats }>(
          `/futebol-treinadores/player-evaluations/stats?tenantId=${tenantId}&playerId=${playerId}&season=${season}&periodKey=${periodKey}`,
        ),
        api.get<{ evaluations: CoachPlayerEvaluation[]; periodicAverage: number | null }>(
          `/futebol-treinadores/player-evaluations/history/${playerId}?season=${season}`,
        ),
      ]);
      const existing = Array.isArray(list) ? list[0] : null;
      setEvaluationId(existing?.id ?? "");
      setStatus(existing?.status ?? "pendente");
      setScores(scoresFromEvaluation(existing ?? null));
      setTechnicalAssessment(existing?.technicalAssessment ?? "");
      setFinalResult(existing?.finalResult ?? "");
      setComputed({
        overallAverage: existing?.overallAverage ?? null,
        percentage: existing?.percentage ?? null,
        classification: existing?.classification ?? null,
      });
      if (existing?.status === "concluido") {
        setStats(statsFromEvaluation(existing));
      } else {
        setStats(statsData?.stats ?? null);
      }
      setHistory(Array.isArray(historyData?.evaluations) ? historyData.evaluations : []);
      setPeriodicAverage(
        typeof historyData?.periodicAverage === "number" ? historyData.periodicAverage : null,
      );
    } catch {
      setStats(null);
      setHistory([]);
      setPeriodicAverage(null);
    } finally {
      setLoading(false);
    }
  }, [tenantId, category, playerId, season, periodKey]);

  useEffect(() => {
    if (!playerId) {
      setEvaluationId("");
      setStatus("pendente");
      setScores(emptyScores());
      setTechnicalAssessment("");
      setFinalResult("");
      setStats(null);
      setHistory([]);
      setPeriodicAverage(null);
      return;
    }
    void loadExisting();
  }, [playerId, loadExisting]);

  useEffect(() => {
    if (players.length === 1 && !playerId) setPlayerId(players[0]!.id);
  }, [players, playerId]);

  const handleScoreChange = (key: string, value: string) => {
    setScores((prev) => ({ ...prev, [key]: value }));
  };

  const buildPayloadScores = () =>
    Object.fromEntries(
      Object.entries(scores).map(([key, value]) => [key, value === "" ? null : Number(value)]),
    );

  const handleSave = async (submit = false) => {
    if (!tenantId || !category || !playerId) {
      setFeedback({
        open: true,
        title: "Campos obrigatórios",
        message: "Selecione categoria e atleta.",
      });
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post<CoachPlayerEvaluation>("/futebol-treinadores/player-evaluations", {
        id: evaluationId || undefined,
        tenantId,
        playerId,
        category,
        season,
        periodKey,
        technicalAssessment,
        finalResult: finalResult || null,
        submit,
        scores: buildPayloadScores(),
      });
      if (data) {
        setEvaluationId(data.id);
        setStatus(data.status);
        setComputed({
          overallAverage: data.overallAverage,
          percentage: data.percentage,
          classification: data.classification,
        });
        setStats({
          gamesListed: data.gamesListed,
          gamesPlayed: data.gamesPlayed,
          gamesStarted: data.gamesStarted,
          gamesListedHigherCategory: data.gamesListedHigherCategory,
          gamesPlayedHigherCategory: data.gamesPlayedHigherCategory,
          matchMinutes: data.matchMinutes,
          trainingMinutes: data.trainingMinutes,
          goals: data.goals,
          assists: data.assists,
        });
      }
      setFeedback({
        open: true,
        title: submit ? "Avaliação concluída" : "Rascunho salvo",
        message: submit
          ? "A avaliação individual foi registrada."
          : "O rascunho foi salvo.",
      });
      void loadExisting();
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

  if (contextLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>Temporada</Label>
            <Input
              type="number"
              min={2000}
              max={2100}
              value={season}
              disabled={readOnly}
              onChange={(e) => setSeason(Number(e.target.value) || currentYear)}
            />
          </div>
          <div className="space-y-2">
            <Label>Período</Label>
            <NativeSelectField
              value={periodKey}
              disabled={readOnly}
              onChange={(e) => setPeriodKey(e.target.value as CoachTeamReportPeriodKey)}
              options={COACH_TEAM_PERIOD_KEYS.map((p) => ({ value: p.value, label: p.label }))}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Atleta</Label>
            <NativeSelectField
              value={playerId}
              disabled={readOnly}
              onChange={(e) => setPlayerId(e.target.value)}
              placeholder="Selecione o atleta"
              options={playerOptions}
            />
          </div>
        </CardContent>
      </Card>

      {selectedPlayer ? (
        <>
          {!readOnly ? (
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" disabled={saving} onClick={() => void handleSave(false)}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salvar rascunho
              </Button>
              <Button type="button" disabled={saving} onClick={() => void handleSave(true)}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Finalizar avaliação
              </Button>
            </div>
          ) : null}

          <PlayerHeroCard
            player={selectedPlayer}
            photoUrl={playerPhotoUrl}
            tenantName={context?.tenant.name}
            category={category}
            season={season}
            periodKey={periodKey}
            fixtureCategories={fixtureCategories}
            consolidatedPercentage={consolidatedPercentage}
            consolidatedClassification={consolidatedClassification}
            periodicAverage={periodicAverage}
            historyByPeriod={historyByPeriod}
            currentStatus={status}
            loading={loading}
          />

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Avaliação por competência</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 lg:grid-cols-2">
                    {COACH_PLAYER_EVALUATION_SCORE_SECTIONS.map((section) => (
                      <div
                        key={section.title}
                        className="rounded-xl border border-border/60 bg-muted/10 p-4"
                      >
                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">
                          {section.title}
                        </h3>
                        <div>
                          {section.fields.map((field) => (
                            <StarScoreRow
                              key={field.key}
                              label={field.label}
                              value={scores[field.key] ?? ""}
                              readOnly={readOnly}
                              onChange={(v) => handleScoreChange(field.key, v)}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Média geral</p>
                      <p className="text-xl font-bold tabular-nums">
                        {displayAverage?.toFixed(2) ?? "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Nível</p>
                      <p className="text-sm font-semibold">
                        {displayClassification
                          ? COACH_PLAYER_CLASSIFICATION_LABEL[displayClassification] ?? "—"
                          : "—"}
                      </p>
                      {displayPercentage != null ? (
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {displayPercentage.toFixed(1)}%
                        </p>
                      ) : null}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Evolução</p>
                      {evolution != null ? (
                        <p
                          className={cn(
                            "flex items-center gap-1 text-sm font-semibold tabular-nums",
                            evolution >= 0 ? "text-emerald-500" : "text-rose-400",
                          )}
                        >
                          {evolution >= 0 ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
                          {evolution >= 0 ? "+" : ""}
                          {evolution.toFixed(2)} vs período anterior
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">—</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Parecer técnico</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    rows={5}
                    disabled={readOnly}
                    placeholder="Descreva o desempenho geral do atleta no período…"
                    value={technicalAssessment}
                    onChange={(e) => setTechnicalAssessment(e.target.value)}
                  />
                </CardContent>
              </Card>

              {stats ? (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Desempenho acumulado na temporada</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-4 text-xs text-muted-foreground">
                      Dados automáticos acumulados do início da temporada até{" "}
                      {COACH_TEAM_PERIOD_KEYS.find((p) => p.value === periodKey)?.label} / {season}.
                    </p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
                      <ParticipationStat label="Jogos disputados" value={stats.gamesPlayed} />
                      <ParticipationStat label="Minutos jogados" value={stats.matchMinutes} />
                      <ParticipationStat label="Titularidades" value={stats.gamesStarted} />
                      <ParticipationStat label="Gols" value={stats.goals} />
                      <ParticipationStat label="Assistências" value={stats.assists} />
                      <ParticipationStat label="Convocações" value={stats.gamesListed} />
                      <ParticipationStat label="Minutos de treino" value={stats.trainingMinutes} />
                      <ParticipationStat
                        label="Convocações cat. superior"
                        value={stats.gamesListedHigherCategory}
                      />
                      <ParticipationStat
                        label="Jogos cat. superior"
                        value={stats.gamesPlayedHigherCategory}
                      />
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Avaliação final</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {displayClassification ? (
                    <span className="inline-flex rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-400">
                      {COACH_PLAYER_CLASSIFICATION_LABEL[displayClassification] ?? displayClassification}
                      {displayPercentage != null ? ` · ${displayPercentage.toFixed(1)}%` : ""}
                    </span>
                  ) : null}
                  <fieldset className="space-y-2" disabled={readOnly}>
                    <legend className="text-sm font-medium">Recomendação *</legend>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {COACH_PLAYER_FINAL_RESULT_OPTIONS.map((opt) => (
                        <label
                          key={opt.value}
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                            finalResult === opt.value
                              ? "border-primary bg-primary/10"
                              : "border-border/60 hover:bg-muted/40",
                            readOnly && "cursor-default",
                          )}
                        >
                          <input
                            type="radio"
                            name="finalResult"
                            value={opt.value}
                            checked={finalResult === opt.value}
                            disabled={readOnly}
                            className="accent-primary"
                            onChange={() => setFinalResult(opt.value)}
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </CardContent>
              </Card>
            </>
          )}
        </>
      ) : null}

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
      />
    </div>
  );
}

function PlayerHeroCard({
  player,
  photoUrl,
  tenantName,
  category,
  season,
  periodKey,
  fixtureCategories,
  consolidatedPercentage,
  consolidatedClassification,
  periodicAverage,
  historyByPeriod,
  currentStatus,
  loading,
}: {
  player: CoachContextPlayer;
  photoUrl: string | null;
  tenantName?: string;
  category?: string;
  season: number;
  periodKey: CoachTeamReportPeriodKey;
  fixtureCategories: ReturnType<typeof useFixtureCategories>["categories"];
  consolidatedPercentage: number | null;
  consolidatedClassification: string | null;
  periodicAverage: number | null;
  historyByPeriod: Map<string, CoachPlayerEvaluation>;
  currentStatus: string;
  loading: boolean;
}) {
  const ageYears = computeAgeAtDate(player.birthDate, new Date()).ageYears;
  const positionLabel = getPositionLabel(player.position ?? undefined) || null;
  const footLabel = preferredFootLabel(player.preferredFoot);
  const heightLabel = formatHeightCm(player.height);
  const weightLabel = player.weight != null && player.weight > 0 ? `${player.weight} kg` : null;
  const periodLabel = COACH_TEAM_PERIOD_KEYS.find((p) => p.value === periodKey)?.label;

  return (
    <Card className="overflow-hidden border-primary/20">
      <CardContent className="p-0">
        <div className="flex flex-col lg:flex-row">
          <div className="relative mx-auto aspect-[3/4] w-full max-w-[220px] shrink-0 bg-muted lg:mx-0 lg:max-w-[200px]">
            {photoUrl ? (
              <Image
                src={photoUrl}
                alt={getPlayerListDisplayName(player)}
                fill
                className="object-cover object-[center_15%]"
                sizes="220px"
                priority
              />
            ) : (
              <div className="flex h-full min-h-[240px] items-center justify-center text-muted-foreground">
                <User className="h-16 w-16" />
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-4 p-5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold">{getPlayerListDisplayName(player)}</h2>
                {player.jerseyNumber != null ? (
                  <span className="rounded-md border border-border px-2 py-0.5 text-xs font-medium">
                    #{player.jerseyNumber}
                  </span>
                ) : null}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {positionLabel ? <PlayerSpec icon={Footprints} label={positionLabel} /> : null}
                {ageYears != null ? <PlayerSpec icon={Calendar} label={`${ageYears} anos`} /> : null}
                {heightLabel ? <PlayerSpec icon={Ruler} label={heightLabel} /> : null}
                {weightLabel ? <PlayerSpec icon={Weight} label={weightLabel} /> : null}
                {footLabel ? <PlayerSpec icon={Footprints} label={footLabel} /> : null}
              </div>
            </div>

            <div className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
              <MetaField
                label="Categoria"
                value={getCategoryLabel(player.category ?? category ?? "", "pt", fixtureCategories)}
              />
              <MetaField label="Clube" value={tenantName ?? "—"} />
              <MetaField label="Período" value={`${periodLabel ?? "—"} / ${season}`} />
              <MetaField label="Data" value={new Date().toLocaleDateString("pt-BR")} />
            </div>

            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-xl border border-border/60 bg-muted/15 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Consolidado na temporada
                  </p>
                  {consolidatedPercentage != null ? (
                    <>
                      <p className="mt-1 text-2xl font-bold tabular-nums text-primary">
                        {consolidatedPercentage.toFixed(1)}%
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Média {periodicAverage?.toFixed(2) ?? "—"} ·{" "}
                        {COACH_PLAYER_CLASSIFICATION_LABEL[consolidatedClassification ?? ""] ?? "—"}
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">Sem avaliações concluídas.</p>
                  )}
                </div>

                <div className="rounded-xl border border-border/60 bg-muted/15 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Períodos anteriores
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {COACH_TEAM_PERIOD_KEYS.map((period) => {
                      const row = historyByPeriod.get(period.value);
                      const isCurrent = period.value === periodKey;
                      const pct =
                        row?.percentage ?? coachPlayerPercentageFromAverage(row?.overallAverage ?? null);
                      return (
                        <div
                          key={period.value}
                          className={cn(
                            "flex items-center justify-between gap-2 text-sm",
                            isCurrent && "font-medium text-primary",
                          )}
                        >
                          <span>{period.label}</span>
                          {row?.status === "concluido" && pct != null ? (
                            <span className="tabular-nums text-muted-foreground">
                              {pct.toFixed(0)}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              {isCurrent && currentStatus !== "pendente"
                                ? currentStatus === "concluido"
                                  ? "Concluído"
                                  : "Em andamento"
                                : row?.status === "rascunho"
                                  ? "Rascunho"
                                  : "—"}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
