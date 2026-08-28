"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { getCategoryLabel } from "@/lib/fixture-categories";
import { getPositionLabel } from "@/lib/football-positions";
import { useFixtureCategories } from "@/hooks/useFixtureCategories";
import { formatDateDayMonYear } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import type {
  CoachContextPlayer,
  CoachTeamReportPlayerEvaluation,
  CoachTeamReportPlayerHistoryItem,
} from "@/lib/treinadores-types";
import { CoachTeamReportPlayerAvatar } from "./CoachTeamReportPlayerAvatar";
import { scoreBadgeTone } from "./coach-team-report-utils";

export type TeamReportEvaluationRow = CoachTeamReportPlayerEvaluation & {
  name: string;
  jerseyNumber: number | null;
};

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

function TeamReportStarRating({
  value,
  readOnly,
  onChange,
}: {
  value: number | null;
  readOnly: boolean;
  onChange: (value: number | null) => void;
}) {
  const num = value ?? 0;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          aria-label={`Nota ${star}`}
          className={cn("rounded p-0.5", readOnly ? "cursor-default" : "hover:bg-muted/60")}
          onClick={() => onChange(star)}
        >
          <Star
            className={cn(
              "h-5 w-5",
              star <= num ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40",
            )}
          />
        </button>
      ))}
    </div>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player: CoachContextPlayer | null;
  evaluation: TeamReportEvaluationRow | null;
  tenantId: string;
  category?: string;
  periodLabel: string;
  readOnly: boolean;
  saving: boolean;
  onSave: (patch: {
    coachFinalRating: number | null;
    individualObservation: string | null;
    playerStrengths: string | null;
  }) => Promise<void>;
}

export function CoachTeamReportPlayerDetailDialog({
  open,
  onOpenChange,
  player,
  evaluation,
  tenantId,
  category,
  periodLabel,
  readOnly,
  saving,
  onSave,
}: Props) {
  const { categories } = useFixtureCategories();
  const [rating, setRating] = useState<number | null>(null);
  const [observation, setObservation] = useState("");
  const [strengths, setStrengths] = useState("");
  const [history, setHistory] = useState<CoachTeamReportPlayerHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(false);

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

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const specs = useMemo(() => {
    if (!player) return [];
    const age = computeAgeAtDate(player.birthDate, new Date()).ageYears;
    const items: Array<{ label: string; value: string }> = [];
    if (player.category) {
      items.push({ label: "Categoria", value: getCategoryLabel(player.category, "pt", categories) });
    }
    const pos = getPositionLabel(player.position ?? undefined);
    if (pos) items.push({ label: "Posição", value: pos });
    if (player.jerseyNumber != null) items.push({ label: "Número", value: String(player.jerseyNumber) });
    if (age != null) {
      items.push({
        label: "Idade",
        value: player.birthDate
          ? `${age} anos (${formatDateDayMonYear(new Date(player.birthDate))})`
          : `${age} anos`,
      });
    }
    const height = formatHeightCm(player.height);
    if (height) items.push({ label: "Altura", value: height });
    if (player.weight != null && player.weight > 0) items.push({ label: "Peso", value: `${player.weight} kg` });
    const foot = preferredFootLabel(player.preferredFoot);
    if (foot) items.push({ label: "Pé", value: foot });
    return items;
  }, [player, categories]);

  if (!player || !evaluation) return null;

  const handleSave = async () => {
    await onSave({
      coachFinalRating: rating,
      individualObservation: observation.trim() || null,
      playerStrengths: strengths.trim() || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(52rem,calc(100vw-1rem))] max-h-[calc(100vh-1rem)] sm:max-w-none">
        <DialogHeader>
          <DialogTitle className="sr-only">{player.name}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <CoachTeamReportPlayerAvatar name={player.name} photoUrl={player.photoUrl} size="lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <h3 className="text-xl font-semibold leading-tight">{player.name}</h3>
            {specs.length > 0 ? (
              <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {specs.map((s) => (
                  <div key={s.label} className="flex gap-1.5">
                    <dt className="text-muted-foreground">{s.label}:</dt>
                    <dd className="font-medium">{s.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/10 p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Desempenho mensal · {periodLabel}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatBox label="Min. jogo" value={evaluation.gamesMinutes} />
            <StatBox label="Min. treino" value={evaluation.trainingMinutes} />
            <StatBox
              label="Nota mensal"
              value={rating != null ? rating.toFixed(1) : "—"}
              badge={rating}
            />
            {evaluation.gamesCount > 0 ? (
              <StatBox label="Jogos" value={evaluation.gamesCount} />
            ) : null}
            {evaluation.avgMatchRating != null ? (
              <StatBox label="Média pós-jogo" value={evaluation.avgMatchRating.toFixed(1)} />
            ) : null}
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nota individual do treinador</Label>
            <div className="flex flex-wrap items-center gap-3">
              <TeamReportStarRating
                value={rating}
                readOnly={readOnly}
                onChange={(v) => setRating(v)}
              />
              {!readOnly ? (
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
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observação individual</Label>
            <Textarea
              rows={4}
              value={observation}
              disabled={readOnly}
              placeholder="Análise qualitativa do atleta no mês"
              onChange={(e) => setObservation(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Pontos fortes</Label>
            <Textarea
              rows={3}
              value={strengths}
              disabled={readOnly}
              placeholder="Principais qualidades observadas"
              onChange={(e) => setStrengths(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Histórico de avaliações (relatório da equipe)</Label>
          {historyLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : historyError ? (
            <p className="text-sm text-muted-foreground">Histórico indisponível no momento.</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum histórico mensal registrado.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border/60">
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
                      <TableCell>{h.periodLabel}</TableCell>
                      <TableCell>{h.coachFinalRating ?? "—"}</TableCell>
                      <TableCell className="capitalize">{h.status}</TableCell>
                      <TableCell>
                        {h.date ? formatDateDayMonYear(new Date(h.date)) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {readOnly ? "Fechar" : "Cancelar"}
          </Button>
          {!readOnly ? (
            <Button type="button" disabled={saving} onClick={() => void handleSave()}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar alterações
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatBox({
  label,
  value,
  badge,
}: {
  label: string;
  value: string | number;
  badge?: number | null;
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-background/60 p-3 text-center">
      <p
        className={cn(
          "text-lg font-bold tabular-nums",
          badge != null ? scoreBadgeTone(badge).split(" ").slice(2).join(" ") : "",
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
