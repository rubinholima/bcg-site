"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { getCategoryLabel } from "@/lib/fixture-categories";

export interface NutritionAssessmentRow {
  id: string;
  playerId: string;
  assessedAt: string;
  weightKg: number;
  heightCm: number | null;
  bmi: number | null;
  bodyFatPercent: number | null;
  notes: string | null;
  player?: { id: string; name: string; jerseyNumber: number | null; category?: string | null };
}

interface PlayerOption {
  id: string;
  name: string;
  jerseyNumber: number | null;
  category?: string | null;
  weight?: number | null;
  height?: number | null;
}

interface NutritionAssessmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  players: PlayerOption[];
  edit?: NutritionAssessmentRow | null;
  onSuccess: () => void;
}

export function NutritionAssessmentFormDialog({
  open,
  onOpenChange,
  players,
  edit,
  onSuccess,
}: NutritionAssessmentFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const [playerId, setPlayerId] = useState("");
  const [assessedAt, setAssessedAt] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [bmi, setBmi] = useState("");
  const [bodyFatPercent, setBodyFatPercent] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    if (edit) {
      setPlayerId(edit.playerId);
      setAssessedAt(edit.assessedAt.slice(0, 10));
      setWeightKg(String(edit.weightKg));
      setHeightCm(edit.heightCm != null ? String(edit.heightCm) : "");
      setBmi(edit.bmi != null ? String(edit.bmi) : "");
      setBodyFatPercent(edit.bodyFatPercent != null ? String(edit.bodyFatPercent) : "");
      setNotes(edit.notes ?? "");
    } else {
      setPlayerId(players[0]?.id ?? "");
      setAssessedAt(new Date().toISOString().slice(0, 10));
      setWeightKg("");
      setHeightCm("");
      setBmi("");
      setBodyFatPercent("");
      setNotes("");
    }
  }, [open, edit, players]);

  useEffect(() => {
    if (open && !edit && playerId && !weightKg && !heightCm) {
      const p = players.find((x) => x.id === playerId);
      if (p?.weight != null) setWeightKg(String(p.weight));
      if (p?.height != null) setHeightCm(String(p.height));
    }
  }, [open, edit, playerId, players, weightKg, heightCm]);

  const handlePlayerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setPlayerId(id);
    if (!edit) {
      const p = players.find((x) => x.id === id);
      if (p?.weight != null) setWeightKg(String(p.weight));
      else setWeightKg("");
      if (p?.height != null) setHeightCm(String(p.height));
      else setHeightCm("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerId?.trim() || !assessedAt || !weightKg) return;
    const w = parseFloat(weightKg);
    if (isNaN(w) || w <= 0) return;
    setSaving(true);
    try {
      if (edit) {
        await api.patch(`/nutricao/nutrition-assessments/${edit.id}`, {
          assessedAt: `${assessedAt}T12:00:00.000Z`,
          weightKg: w,
          heightCm: heightCm ? parseFloat(heightCm) : undefined,
          bmi: bmi ? parseFloat(bmi) : undefined,
          bodyFatPercent: bodyFatPercent ? parseFloat(bodyFatPercent) : undefined,
          notes: notes.trim() || undefined,
        });
      } else {
        await api.post("/nutricao/nutrition-assessments", {
          playerId,
          assessedAt: `${assessedAt}T12:00:00.000Z`,
          weightKg: w,
          heightCm: heightCm ? parseFloat(heightCm) : undefined,
          bmi: bmi ? parseFloat(bmi) : undefined,
          bodyFatPercent: bodyFatPercent ? parseFloat(bodyFatPercent) : undefined,
          notes: notes.trim() || undefined,
        });
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{edit ? "Editar avaliação" : "Nova avaliação nutricional"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Jogador *</Label>
              <select
                required
                disabled={!!edit}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={playerId}
                onChange={handlePlayerChange}
              >
                <option value="">Selecione</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.jerseyNumber != null ? `#${p.jerseyNumber}` : ""}
                    {p.category ? ` • ${getCategoryLabel(p.category, "pt")}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="na-date">Data *</Label>
              <Input
                id="na-date"
                type="date"
                required
                className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                value={assessedAt}
                onChange={(e) => setAssessedAt(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Peso e estatura podem vir do cadastro do jogador. IMC e % gordura costumam ser do departamento médico/fisiologia.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="na-weight">Peso (kg) *</Label>
                <Input
                  id="na-weight"
                  type="number"
                  step="0.1"
                  min={0}
                  required
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="na-height">Estatura (cm)</Label>
                <Input
                  id="na-height"
                  type="number"
                  min={0}
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="na-bmi">IMC</Label>
                <Input
                  id="na-bmi"
                  type="number"
                  step="0.01"
                  min={0}
                  value={bmi}
                  onChange={(e) => setBmi(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="na-fat">% Gordura</Label>
                <Input
                  id="na-fat"
                  type="number"
                  step="0.1"
                  min={0}
                  value={bodyFatPercent}
                  onChange={(e) => setBodyFatPercent(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="na-notes">Observações</Label>
              <textarea
                id="na-notes"
                className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {edit ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
