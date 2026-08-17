"use client";

import { useState } from "react";
import { Loader2, Pencil } from "lucide-react";
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
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import { encodeGameKey } from "@/lib/futebol-jogos.types";
import type { CoachCompletedGame } from "@/lib/treinadores-types";
import type { FutebolMatchStatOverride } from "@/lib/futebol-jogos.types";

export interface GameMatchDataEditorProps {
  tenantId: string;
  category?: string;
  game: Pick<
    CoachCompletedGame,
    | "gameKey"
    | "matchDate"
    | "opponentName"
    | "fmfMatchReportId"
    | "travelLogisticsId"
    | "goalsFor"
    | "goalsAgainst"
    | "yellowCards"
    | "redCards"
    | "possessionPct"
    | "setPiecesFor"
    | "setPiecesAgainst"
  >;
  override?: FutebolMatchStatOverride | null;
  saveVia?: "jogos" | "treinadores";
  triggerLabel?: string;
  triggerVariant?: "ghost" | "outline" | "default";
  triggerSize?: "sm" | "default";
  onSaved: () => void;
}

function numToField(value: number | null | undefined): string {
  return value != null ? String(value) : "";
}

function fieldToNum(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : null;
}

function fieldToPct(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function GameMatchDataEditor({
  tenantId,
  category,
  game,
  override,
  saveVia = "jogos",
  triggerLabel = "Placar e estatísticas",
  triggerVariant = "outline",
  triggerSize = "sm",
  onSaved,
}: GameMatchDataEditorProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [goalsFor, setGoalsFor] = useState("");
  const [goalsAgainst, setGoalsAgainst] = useState("");
  const [yellowCards, setYellowCards] = useState("");
  const [redCards, setRedCards] = useState("");
  const [possessionPct, setPossessionPct] = useState("");
  const [setPiecesFor, setSetPiecesFor] = useState("");
  const [setPiecesAgainst, setSetPiecesAgainst] = useState("");
  const [notes, setNotes] = useState("");
  const [feedback, setFeedback] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: "",
  });

  const openEditor = () => {
    setGoalsFor(numToField(override?.goalsFor ?? game.goalsFor));
    setGoalsAgainst(numToField(override?.goalsAgainst ?? game.goalsAgainst));
    setYellowCards(numToField(override?.yellowCards ?? game.yellowCards));
    setRedCards(numToField(override?.redCards ?? game.redCards));
    setPossessionPct(numToField(override?.possessionPct ?? game.possessionPct));
    setSetPiecesFor(numToField(override?.setPiecesFor ?? game.setPiecesFor));
    setSetPiecesAgainst(numToField(override?.setPiecesAgainst ?? game.setPiecesAgainst));
    setNotes(override?.notes ?? "");
    setOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      goalsFor: fieldToNum(goalsFor),
      goalsAgainst: fieldToNum(goalsAgainst),
      yellowCards: fieldToNum(yellowCards),
      redCards: fieldToNum(redCards),
      possessionPct: fieldToPct(possessionPct),
      setPiecesFor: fieldToNum(setPiecesFor),
      setPiecesAgainst: fieldToNum(setPiecesAgainst),
      notes: notes.trim() || null,
    };

    setSaving(true);
    try {
      if (saveVia === "jogos") {
        await api.post(
          `/futebol-jogos/${encodeGameKey(game.gameKey)}/match-stats?tenantId=${encodeURIComponent(tenantId)}`,
          payload,
        );
      } else {
        await api.post("/futebol-treinadores/match-stats", {
          tenantId,
          category: category || null,
          fmfMatchReportId: game.fmfMatchReportId,
          travelLogisticsId: game.travelLogisticsId,
          matchDate: game.matchDate.slice(0, 10),
          opponentName: game.opponentName,
          ...payload,
        });
      }
      setOpen(false);
      onSaved();
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro ao salvar",
        message: e instanceof Error ? e.message : "Não foi possível salvar os dados do jogo.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant={triggerVariant}
        size={triggerSize}
        className={triggerSize === "sm" ? "min-h-[40px]" : "min-h-[44px]"}
        onClick={openEditor}
      >
        <Pencil className="mr-1.5 h-3.5 w-3.5" />
        {triggerLabel}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {game.opponentName} · {game.matchDate.slice(0, 10)}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="match-goals-for">Gols do clube</Label>
                <Input
                  id="match-goals-for"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={goalsFor}
                  onChange={(e) => setGoalsFor(e.target.value)}
                  className="text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="match-goals-against">Gols do adversário</Label>
                <Input
                  id="match-goals-against"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={goalsAgainst}
                  onChange={(e) => setGoalsAgainst(e.target.value)}
                  className="text-foreground"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="match-yellow">Cartões amarelos</Label>
                <Input
                  id="match-yellow"
                  type="number"
                  min={0}
                  value={yellowCards}
                  onChange={(e) => setYellowCards(e.target.value)}
                  className="text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="match-red">Cartões vermelhos</Label>
                <Input
                  id="match-red"
                  type="number"
                  min={0}
                  value={redCards}
                  onChange={(e) => setRedCards(e.target.value)}
                  className="text-foreground"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Posse (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={possessionPct}
                  onChange={(e) => setPossessionPct(e.target.value)}
                  className="text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label>Bolas paradas +</Label>
                <Input
                  type="number"
                  min={0}
                  value={setPiecesFor}
                  onChange={(e) => setSetPiecesFor(e.target.value)}
                  className="text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label>Bolas paradas −</Label>
                <Input
                  type="number"
                  min={0}
                  value={setPiecesAgainst}
                  onChange={(e) => setSetPiecesAgainst(e.target.value)}
                  className="text-foreground"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="match-notes">Observações</Label>
              <Textarea
                id="match-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={saving} className="min-h-[44px]">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(o) => setFeedback((f) => ({ ...f, open: o }))}
        title={feedback.title}
        message={feedback.message}
        variant="error"
      />
    </>
  );
}
