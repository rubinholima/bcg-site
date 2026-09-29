"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";
import { getPlayerListDisplayName } from "@/lib/player-display-name";
import type { CoachTrainingSession } from "@/lib/treinadores-types";
import type { PrepContextResponse } from "./PrepFisicaContextPanel";

type EntryDraft = {
  playerId: string;
  name: string;
  available: boolean;
  rating: string;
  notes: string;
};

interface Props {
  tenantId: string;
  category?: string;
  context: PrepContextResponse | null;
}

export function PrepFisicaAvaliarTab({ tenantId, category, context }: Props) {
  const [sessions, setSessions] = useState<CoachTrainingSession[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [entries, setEntries] = useState<EntryDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: "",
  });

  useEffect(() => {
    if (!tenantId) return;
    const params = new URLSearchParams({ tenantId });
    if (category) params.set("category", category);
    api
      .get<CoachTrainingSession[]>(`/prep-fisica/training-sessions?${params}`)
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : [];
        setSessions(list);
        if (!selectedId && list[0]) setSelectedId(list[0].id);
      })
      .catch(() => setSessions([]));
  }, [tenantId, category]);

  useEffect(() => {
    if (!selectedId) return;
    api.get<CoachTrainingSession>(`/prep-fisica/training-sessions/${selectedId}`).then(({ data }) => {
      if (!data) return;
      const byId = new Map(data.playerEntries.map((e) => [e.playerId, e]));
      setEntries(
        (context?.players ?? []).map((p) => {
          const row = byId.get(p.id);
          return {
            playerId: p.id,
            name: getPlayerListDisplayName(p),
            available: row?.available ?? true,
            rating: row?.rating != null ? String(row.rating) : "",
            notes: row?.notes ?? "",
          };
        }),
      );
    });
  }, [selectedId, context?.players]);

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await api.patch(`/prep-fisica/training-sessions/${selectedId}/player-entries`, {
        tenantId,
        playerEntries: entries.map((e) => ({
          playerId: e.playerId,
          available: e.available,
          unavailableReason: e.available ? null : "Indisponível",
          rating: e.rating === "" ? null : Number(e.rating),
          notes: e.notes || null,
        })),
      });
      setFeedback({ open: true, title: "Salvo", message: "Avaliações atualizadas." });
    } catch (err) {
      setFeedback({
        open: true,
        title: "Erro",
        message: err instanceof Error ? err.message : "Não foi possível salvar.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sessões</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sessions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedId(s.id)}
              className={`w-full rounded-lg border p-3 text-left text-sm ${selectedId === s.id ? "border-primary bg-primary/5" : "border-border/60"}`}
            >
              {formatDateDayMonYear(new Date(`${s.sessionDate}T12:00:00`))}
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Desempenho 0–5</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {entries.map((e, i) => (
            <div key={e.playerId} className="grid gap-3 rounded-lg border border-border/60 p-3 sm:grid-cols-[1fr_100px]">
              <div>
                <p className="font-medium">{e.name}</p>
                <Label className="mt-2 flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={e.available}
                    onChange={(ev) =>
                      setEntries((prev) => {
                        const next = [...prev];
                        next[i] = { ...e, available: ev.target.checked };
                        return next;
                      })
                    }
                  />
                  Presente / disponível
                </Label>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nota</Label>
                <Input
                  type="number"
                  min={0}
                  max={5}
                  step={0.5}
                  value={e.rating}
                  onChange={(ev) =>
                    setEntries((prev) => {
                      const next = [...prev];
                      next[i] = { ...e, rating: ev.target.value };
                      return next;
                    })
                  }
                />
              </div>
            </div>
          ))}
          <Button type="button" onClick={handleSave} disabled={saving || !selectedId}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar avaliações
          </Button>
        </CardContent>
      </Card>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
        variant={feedback.title === "Erro" ? "error" : "success"}
      />
    </div>
  );
}
