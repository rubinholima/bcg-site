"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Footprints,
  Loader2,
  Ruler,
  Scale,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { api } from "@/lib/api";
import { computeAgeAtDate } from "@/lib/fisiologia-calculations";
import { getPositionLabel } from "@/lib/football-positions";
import { formatDateDayMonYear } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import type {
  CoachContextPlayer,
  CoachTeamReportPlayerEvaluation,
  CoachTeamReportPlayerHistoryItem,
  CoachTeamReportPlayerSeasonStats,
} from "@/lib/treinadores-types";
import { CoachTeamReportPlayerAvatar } from "./CoachTeamReportPlayerAvatar";
import { CoachTeamReportStarRating } from "./CoachTeamReportStarRating";
import {
  historyStatusLabel,
  historyStatusTone,
  parseStrengthBullets,
} from "./coach-team-report-utils";

export type TeamReportEvaluationRow = CoachTeamReportPlayerEvaluation & {
  name: string;
  jerseyNumber: number | null;
};

function preferredFootShort(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.toLowerCase();
  if (v === "right" || v === "direito") return "Destro";
  if (v === "left" || v === "esquerdo") return "Canhoto";
  if (v === "both" || v === "ambidestro") return "Ambidestro";
  return value;
}

function formatHeightCm(height: number | null | undefined): string | null {
  if (height == null || height <= 0) return null;
  return `${(height / 100).toFixed(2).replace(".", ",")} m`;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player: CoachContextPlayer | null;
  evaluation: TeamReportEvaluationRow | null;
  tenantId: string;
  category?: string;
  periodLabel: string;
  season: number;
  periodEnd: string;
  readOnly: boolean;
  saving: boolean;
  initialEdit?: boolean;
  onSave: (patch: {
    coachFinalRating: number | null;
    individualObservation: string | null;
    playerStrengths: string | null;
  }) => Promise<void>;
}

export function CoachTeamReportPlayerDetailSheet({
  open,
  onOpenChange,
  player,
  evaluation,
  tenantId,
  category,
  season,
  periodEnd,
  readOnly,
  saving,
  initialEdit = false,
  onSave,
}: Props) {
  const [editMode, setEditMode] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [observation, setObservation] = useState("");
  const [strengths, setStrengths] = useState("");
  const [history, setHistory] = useState<CoachTeamReportPlayerHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const [seasonStats, setSeasonStats] = useState<CoachTeamReportPlayerSeasonStats | null>(null);
  const [seasonLoading, setSeasonLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEditMode(initialEdit && !readOnly);
  }, [open, initialEdit, readOnly]);

  useEffect(() => {
    if (!evaluation) return;
    setRating(evaluation.coachFinalRating);
    setObservation(evaluation.individualObservation ?? "");
    setStrengths(evaluation.playerStrengths ?? "");
  }, [evaluation, open]);

  const loadHistory = useCallback(() => {
    if (!open || !player?.id || !tenantId) return;
    setHistoryLoading(true);
    setHistoryError(false);
    const params = new URLSearchParams({ tenantId });
    if (category) params.set("category", category);
    api
      .get<CoachTeamReportPlayerHistoryItem[]>(
        `/futebol-treinadores/team-reports/player-history/${player.id}?${params}`,
      )
      .then(({ data }) => setHistory(Array.isArray(data) ? data : []))
      .catch(() => {
        setHistory([]);
        setHistoryError(true);
      })
      .finally(() => setHistoryLoading(false));
  }, [open, player?.id, tenantId, category]);

  const loadSeasonStats = useCallback(() => {
    if (!open || !player?.id || !tenantId || !periodEnd) return;
    setSeasonLoading(true);
    const params = new URLSearchParams({
      tenantId,
      season: String(season),
      periodEnd: periodEnd.slice(0, 10),
    });
    api
      .get<{ stats: CoachTeamReportPlayerSeasonStats }>(
        `/futebol-treinadores/team-reports/player-season-stats/${player.id}?${params}`,
      )
      .then(({ data }) => setSeasonStats(data?.stats ?? null))
      .catch(() => setSeasonStats(null))
      .finally(() => setSeasonLoading(false));
  }, [open, player?.id, tenantId, season, periodEnd]);

  useEffect(() => {
    loadHistory();
    loadSeasonStats();
  }, [loadHistory, loadSeasonStats]);

  const strengthBullets = useMemo(() => parseStrengthBullets(strengths), [strengths]);

  if (!player || !evaluation || !open) return null;

  const position = getPositionLabel(player.position ?? undefined);
  const age = computeAgeAtDate(player.birthDate, new Date()).ageYears;
  const height = formatHeightCm(player.height);
  const foot = preferredFootShort(player.preferredFoot);
  const canEdit = !readOnly;

  const handleSave = async () => {
    await onSave({
      coachFinalRating: rating,
      individualObservation: observation.trim() || null,
      playerStrengths: strengths.trim() || null,
    });
    setEditMode(false);
    onOpenChange(false);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 lg:bg-black/20"
        aria-hidden
        onClick={() => onOpenChange(false)}
      />
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border/60 bg-card shadow-2xl"
        role="dialog"
        aria-label="Detalhes do atleta"
      >
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <h2 className="text-base font-semibold">Detalhes do atleta</h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label="Fechar"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <div className="flex gap-4">
            <CoachTeamReportPlayerAvatar name={player.name} photoUrl={player.photoUrl} size="lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <h3 className="text-lg font-bold leading-tight">{player.name}</h3>
              <p className="text-sm text-muted-foreground">
                {[position, evaluation.jerseyNumber != null ? `Camisa ${evaluation.jerseyNumber}` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-medium",
                  player.inTreatment
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                    : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    player.inTreatment ? "bg-amber-400" : "bg-emerald-400",
                  )}
                />
                {player.inTreatment ? "Em tratamento" : "Ativo"}
              </span>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {age != null ? (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {age} anos
                  </span>
                ) : null}
                {height ? (
                  <span className="inline-flex items-center gap-1">
                    <Ruler className="h-3.5 w-3.5" />
                    {height}
                  </span>
                ) : null}
                {player.weight != null && player.weight > 0 ? (
                  <span className="inline-flex items-center gap-1">
                    <Scale className="h-3.5 w-3.5" />
                    {player.weight} kg
                  </span>
                ) : null}
                {foot ? (
                  <span className="inline-flex items-center gap-1">
                    <Footprints className="h-3.5 w-3.5" />
                    {foot}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MetricBox label="Min. jogo" value={evaluation.gamesMinutes} />
            <MetricBox label="Min. treino" value={evaluation.trainingMinutes} />
            <MetricBox
              label="Nota média pós-jogo"
              value={
                evaluation.avgMatchRating != null ? evaluation.avgMatchRating.toFixed(1) : "—"
              }
            />
            <MetricBox
              label="Titularidades"
              value={seasonStats?.gamesStarted ?? (seasonLoading ? "…" : "—")}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Observação do treinador
              </Label>
              {editMode ? (
                <Textarea
                  rows={5}
                  value={observation}
                  placeholder="Análise qualitativa do atleta no mês"
                  onChange={(e) => setObservation(e.target.value)}
                />
              ) : (
                <div className="min-h-[7rem] rounded-md border border-border/60 bg-muted/10 p-3 text-sm text-muted-foreground">
                  {observation.trim() || "—"}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Pontos fortes
              </Label>
              {editMode ? (
                <Textarea
                  rows={5}
                  value={strengths}
                  placeholder="Um ponto por linha"
                  onChange={(e) => setStrengths(e.target.value)}
                />
              ) : strengthBullets.length > 0 ? (
                <ul className="min-h-[7rem] space-y-1.5 rounded-md border border-border/60 bg-muted/10 p-3 text-sm">
                  {strengthBullets.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="min-h-[7rem] rounded-md border border-border/60 bg-muted/10 p-3 text-sm text-muted-foreground">
                  —
                </div>
              )}
            </div>
          </div>

          {editMode ? (
            <div className="space-y-2">
              <Label>Nota individual do treinador</Label>
              <div className="flex flex-wrap items-center gap-3">
                <CoachTeamReportStarRating
                  value={rating}
                  readOnly={false}
                  onChange={(v) => setRating(v)}
                />
                <Input
                  type="number"
                  min={0}
                  max={5}
                  step={0.1}
                  className="h-9 w-24 text-foreground"
                  value={rating ?? ""}
                  onChange={(e) =>
                    setRating(e.target.value === "" ? null : Number(e.target.value))
                  }
                />
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Estatísticas acumuladas na temporada
            </Label>
            {seasonLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <SeasonStat label="Jogos disputados" value={seasonStats?.gamesPlayed ?? 0} />
                <SeasonStat label="Minutos totais" value={seasonStats?.matchMinutes ?? 0} />
                <SeasonStat label="Gols" value={seasonStats?.goals ?? 0} />
                <SeasonStat label="Assistências" value={seasonStats?.assists ?? 0} />
                <SeasonStat label="Convocações" value={seasonStats?.gamesListed ?? 0} />
                <SeasonStat label="Cartões amarelos" value={seasonStats?.yellowCards ?? 0} />
                <SeasonStat label="Cartões vermelhos" value={seasonStats?.redCards ?? 0} />
                <SeasonStat
                  label="Participação em treinos"
                  value={seasonStats?.trainingSessionsCount ?? 0}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Histórico de avaliações
            </Label>
            {historyLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : historyError ? (
              <p className="text-sm text-muted-foreground">Histórico indisponível.</p>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum histórico registrado.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border border-border/60">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Período</TableHead>
                      <TableHead>Nota</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((h) => (
                      <TableRow key={h.periodKey}>
                        <TableCell className="text-sm">{h.periodLabel}</TableCell>
                        <TableCell className="tabular-nums">
                          {h.coachFinalRating != null ? h.coachFinalRating.toFixed(1) : "—"}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "inline-flex rounded-sm border px-2 py-0.5 text-xs font-medium",
                              historyStatusTone(h.status),
                            )}
                          >
                            {historyStatusLabel(h.status)}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {h.date ? formatDateDayMonYear(new Date(h.date)) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 border-t border-border/60 px-5 py-4">
          <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          {canEdit ? (
            editMode ? (
              <Button type="button" className="flex-1" disabled={saving} onClick={() => void handleSave()}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Salvar alterações
              </Button>
            ) : (
              <Button type="button" className="flex-1" onClick={() => setEditMode(true)}>
                Editar avaliação
              </Button>
            )
          ) : null}
        </div>
      </aside>
    </>
  );
}

function MetricBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border/50 bg-muted/10 p-3 text-center">
      <p className="text-lg font-bold tabular-nums">{value}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function SeasonStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border/50 bg-background/60 p-3">
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{label}</p>
    </div>
  );
}
