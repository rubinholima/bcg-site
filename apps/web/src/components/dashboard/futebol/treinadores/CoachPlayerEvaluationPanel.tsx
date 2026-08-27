"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect, NativeSelectField } from "@/components/ui/native-select";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import { getCategoryLabel } from "@/lib/fixture-categories";
import { useFixtureCategories } from "@/hooks/useFixtureCategories";
import { getPlayerListDisplayName } from "@/lib/player-display-name";
import type {
  CoachContextResponse,
  CoachPlayerEvaluation,
  CoachPlayerEvaluationStats,
} from "@/lib/treinadores-types";
import {
  COACH_PLAYER_CLASSIFICATION_LABEL,
  COACH_PLAYER_EVALUATION_SCORE_SECTIONS,
  COACH_PLAYER_FINAL_RESULT_OPTIONS,
  COACH_TEAM_PERIOD_KEYS,
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

function ScoreGrid({
  title,
  fields,
  scores,
  readOnly,
  onChange,
}: {
  title: string;
  fields: ReadonlyArray<{ key: string; label: string }>;
  scores: ScoreState;
  readOnly: boolean;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border/60 p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.key} className="space-y-1">
            <Label className="text-xs">{field.label}</Label>
            <Input
              type="number"
              min={0}
              max={5}
              step={0.1}
              disabled={readOnly}
              className="tabular-nums"
              value={scores[field.key] ?? ""}
              onChange={(e) => onChange(field.key, e.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
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
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: "",
  });

  const selectedPlayer = players.find((p) => p.id === playerId);
  const readOnly = status === "concluido";

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
        api.get<{ evaluations: CoachPlayerEvaluation[] }>(
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
      setStats(statsData?.stats ?? null);
      setHistory(Array.isArray(historyData?.evaluations) ? historyData.evaluations : []);
    } catch {
      setStats(null);
      setHistory([]);
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
        <CardHeader>
          <CardTitle>Avaliação individual do jogador</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-1">
              <p className="text-lg font-semibold">{getPlayerListDisplayName(selectedPlayer)}</p>
              <p className="text-sm text-muted-foreground">
                Categoria cadastro: {getCategoryLabel(selectedPlayer.category ?? category ?? "", "pt", fixtureCategories)}
                {" · "}
                Temporada {season}
                {" · "}
                {COACH_TEAM_PERIOD_KEYS.find((p) => p.value === periodKey)?.label}
              </p>
              {computed.percentage != null ? (
                <p className="text-sm">
                  Média {computed.overallAverage?.toFixed(2) ?? "—"} · {computed.percentage.toFixed(2)}% ·{" "}
                  {COACH_PLAYER_CLASSIFICATION_LABEL[computed.classification ?? ""] ?? "—"}
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : playerId && stats ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estatísticas do período</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Stat label="Convocado/listado" value={stats.gamesListed} />
            <Stat label="Jogos disputados" value={stats.gamesPlayed} />
            <Stat label="Como titular" value={stats.gamesStarted} />
            <Stat label="Convocado categoria superior" value={stats.gamesListedHigherCategory} />
            <Stat label="Jogou categoria superior" value={stats.gamesPlayedHigherCategory} />
            <Stat label="Minutos de jogo" value={stats.matchMinutes} />
            <Stat label="Minutos de treino" value={stats.trainingMinutes} />
            <Stat label="Gols" value={stats.goals} />
            <Stat label="Assistências" value={stats.assists} />
          </CardContent>
        </Card>
      ) : null}

      {playerId ? (
        <>
          {COACH_PLAYER_EVALUATION_SCORE_SECTIONS.map((section) => (
            <ScoreGrid
              key={section.title}
              title={section.title}
              fields={section.fields}
              scores={scores}
              readOnly={readOnly}
              onChange={handleScoreChange}
            />
          ))}

          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label>Parecer técnico *</Label>
                <Textarea
                  rows={5}
                  disabled={readOnly}
                  value={technicalAssessment}
                  onChange={(e) => setTechnicalAssessment(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Resultado final *</Label>
                <NativeSelect
                  value={finalResult}
                  disabled={readOnly}
                  onChange={(e) => setFinalResult(e.target.value)}
                >
                  <option value="">Selecione</option>
                  {COACH_PLAYER_FINAL_RESULT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              {!readOnly ? (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" disabled={saving} onClick={() => void handleSave(false)}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar rascunho
                  </Button>
                  <Button type="button" disabled={saving} onClick={() => void handleSave(true)}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Concluir avaliação
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {history.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Histórico na temporada</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {history.map((row) => (
                  <div key={row.id} className="rounded-lg border border-border/60 p-3 text-sm">
                    <p className="font-medium">
                      {COACH_TEAM_PERIOD_KEYS.find((p) => p.value === row.periodKey)?.label}
                      {" · "}
                      {row.status}
                    </p>
                    <p className="text-muted-foreground">
                      Média {row.overallAverage?.toFixed(2) ?? "—"} · {row.percentage?.toFixed(2) ?? "—"}% ·{" "}
                      {COACH_PLAYER_CLASSIFICATION_LABEL[row.classification ?? ""] ?? "—"}
                      {row.finalResult ? ` · ${COACH_PLAYER_FINAL_RESULT_OPTIONS.find((o) => o.value === row.finalResult)?.label ?? row.finalResult}` : ""}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
