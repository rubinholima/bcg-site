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
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import type { CoachCompletedGame } from "@/lib/treinadores-types";

interface Props {
  tenantId: string;
  category?: string;
  game: CoachCompletedGame;
  onSaved: () => void;
}

export function TreinadoresMatchStatsEditor({ tenantId, category, game, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [possessionPct, setPossessionPct] = useState(
    game.possessionPct != null ? String(game.possessionPct) : "",
  );
  const [setPiecesFor, setSetPiecesFor] = useState(
    game.setPiecesFor != null ? String(game.setPiecesFor) : "",
  );
  const [setPiecesAgainst, setSetPiecesAgainst] = useState(
    game.setPiecesAgainst != null ? String(game.setPiecesAgainst) : "",
  );
  const [feedback, setFeedback] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: "",
  });

  const openEditor = () => {
    setPossessionPct(game.possessionPct != null ? String(game.possessionPct) : "");
    setSetPiecesFor(game.setPiecesFor != null ? String(game.setPiecesFor) : "");
    setSetPiecesAgainst(game.setPiecesAgainst != null ? String(game.setPiecesAgainst) : "");
    setOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post("/futebol-treinadores/match-stats", {
        tenantId,
        category: category || null,
        fmfMatchReportId: game.fmfMatchReportId,
        travelLogisticsId: game.travelLogisticsId,
        matchDate: game.matchDate.slice(0, 10),
        opponentName: game.opponentName,
        possessionPct: possessionPct === "" ? null : Number(possessionPct),
        setPiecesFor: setPiecesFor === "" ? null : Number(setPiecesFor),
        setPiecesAgainst: setPiecesAgainst === "" ? null : Number(setPiecesAgainst),
      });
      setOpen(false);
      onSaved();
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

  return (
    <>
      <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={openEditor}>
        <Pencil className="mr-1 h-3.5 w-3.5" />
        Estatísticas
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Estatísticas — {game.opponentName}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Posse (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={possessionPct}
                onChange={(e) => setPossessionPct(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Bolas paradas a favor</Label>
              <Input
                type="number"
                min={0}
                value={setPiecesFor}
                onChange={(e) => setSetPiecesFor(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Bolas paradas contra</Label>
              <Input
                type="number"
                min={0}
                value={setPiecesAgainst}
                onChange={(e) => setSetPiecesAgainst(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
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
      />
    </>
  );
}
