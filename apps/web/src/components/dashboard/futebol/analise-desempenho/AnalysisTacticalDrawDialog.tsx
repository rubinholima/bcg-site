"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { AnalysisTacticalAnnotationBoard } from "./AnalysisTacticalAnnotationBoard";
import {
  emptyTacticalDocument,
  legacyStrokesToVector,
  type TacticalVectorDocument,
} from "@/lib/analysis-tactical-vector";
import { FeedbackModal } from "@/components/ui/feedback-modal";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sessionId: string;
  videoSourceId: string;
  startMs: number;
  endMs?: number | null;
  analysisEventId?: string | null;
  analysisClipId?: string | null;
  annotationId?: string | null;
  onSaved?: () => void;
};

export function AnalysisTacticalDrawDialog({
  open,
  onOpenChange,
  sessionId,
  videoSourceId,
  startMs,
  endMs,
  analysisEventId,
  analysisClipId,
  annotationId,
  onSaved,
}: Props) {
  const [doc, setDoc] = useState<TacticalVectorDocument>(emptyTacticalDocument());
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    if (!annotationId) {
      setDoc(emptyTacticalDocument());
      return;
    }
    void api
      .get(`/performance-analysis/sessions/${sessionId}/video-annotations?videoSourceId=${videoSourceId}`)
      .then(({ data }) => {
        const rows = Array.isArray(data) ? data : [];
        const row = rows.find((r: { id: string }) => r.id === annotationId);
        if (row?.vectorJson) setDoc(row.vectorJson as TacticalVectorDocument);
        else if (row?.strokes) setDoc(legacyStrokesToVector(row.strokes));
        else setDoc(emptyTacticalDocument());
      })
      .catch(() => setDoc(emptyTacticalDocument()));
  }, [open, annotationId, sessionId, videoSourceId]);

  async function save() {
    setSaving(true);
    try {
      const strokes = doc.objects
        .filter((o) => o.type === "freehand")
        .map((o) => ({
          color: o.color,
          width: o.strokeWidth,
          points: o.points,
        }));
      if (annotationId) {
        await api.patch(`/performance-analysis/video-annotations/${annotationId}`, {
          vectorJson: doc,
          strokes,
          schemaVersion: doc.schemaVersion,
        });
      } else {
        await api.post(`/performance-analysis/sessions/${sessionId}/video-annotations`, {
          videoSourceId,
          startMs,
          endMs: endMs ?? null,
          analysisEventId: analysisEventId ?? null,
          analysisClipId: analysisClipId ?? null,
          strokes,
          vectorJson: doc,
          schemaVersion: doc.schemaVersion,
          label: analysisEventId ? "Jogada" : "Desenho tático",
        });
      }
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      setFeedback({
        title: "Erro ao salvar",
        message: err instanceof Error ? err.message : "Falha ao salvar desenho.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
  <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Desenho tático</DialogTitle>
          </DialogHeader>
          <AnalysisTacticalAnnotationBoard value={doc} onChange={setDoc} />
          <Button type="button" disabled={saving} onClick={() => void save()}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar desenho
          </Button>
        </DialogContent>
      </Dialog>
      <FeedbackModal
        open={Boolean(feedback)}
        onOpenChange={() => setFeedback(null)}
        title={feedback?.title ?? ""}
        message={feedback?.message ?? ""}
      />
    </>
  );
}
