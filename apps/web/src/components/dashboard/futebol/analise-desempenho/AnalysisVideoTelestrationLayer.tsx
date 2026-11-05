"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser, Loader2, Pencil, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type Stroke = {
  color: string;
  width: number;
  points: Array<{ x: number; y: number }>;
};

type CanvasProps = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  toolActive: boolean;
  strokes: Stroke[];
  setStrokes: React.Dispatch<React.SetStateAction<Stroke[]>>;
};

export function AnalysisVideoTelestrationCanvas({
  videoRef,
  toolActive,
  strokes,
  setStrokes,
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [current, setCurrent] = useState<Stroke | null>(null);

  const syncCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const rect = video.getBoundingClientRect();
    if (rect.width < 2) return;
    canvas.width = Math.floor(rect.width);
    canvas.height = Math.floor(rect.height);
  }, [videoRef]);

  useEffect(() => {
    syncCanvasSize();
    window.addEventListener("resize", syncCanvasSize);
    return () => window.removeEventListener("resize", syncCanvasSize);
  }, [syncCanvasSize]);

  function redraw(list: Stroke[]) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const s of list) {
      if (s.points.length < 2) continue;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(s.points[0].x * canvas.width, s.points[0].y * canvas.height);
      for (let i = 1; i < s.points.length; i++) {
        ctx.lineTo(s.points[i].x * canvas.width, s.points[i].y * canvas.height);
      }
      ctx.stroke();
    }
  }

  useEffect(() => {
    redraw(current ? [...strokes, current] : strokes);
  }, [strokes, current]);

  function pointerPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  }

  return (
    <canvas
      ref={canvasRef}
      className={cn(
        "absolute inset-0 z-10 h-full w-full",
        toolActive ? "cursor-crosshair" : "pointer-events-none",
      )}
      onPointerDown={(e) => {
        if (!toolActive) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        setDrawing(true);
        setCurrent({ color: "#60a5fa", width: 3, points: [pointerPos(e)] });
      }}
      onPointerMove={(e) => {
        if (!drawing || !current) return;
        setCurrent({ ...current, points: [...current.points, pointerPos(e)] });
      }}
      onPointerUp={() => {
        if (!current) return;
        setDrawing(false);
        setStrokes((prev) => [...prev, current]);
        setCurrent(null);
      }}
    />
  );
}

type ToolbarProps = {
  sessionId: string;
  videoSourceId: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  toolActive: boolean;
  setToolActive: (v: boolean | ((p: boolean) => boolean)) => void;
  strokes: Stroke[];
  setStrokes: React.Dispatch<React.SetStateAction<Stroke[]>>;
};

export function AnalysisVideoTelestrationToolbar({
  sessionId,
  videoSourceId,
  videoRef,
  toolActive,
  setToolActive,
  strokes,
  setStrokes,
}: ToolbarProps) {
  const [saving, setSaving] = useState(false);

  async function saveDrawing() {
    const video = videoRef.current;
    if (!video || strokes.length === 0) return;
    setSaving(true);
    try {
      await api.post(`/performance-analysis/sessions/${sessionId}/video-annotations`, {
        videoSourceId,
        startMs: Math.round(video.currentTime * 1000),
        strokes,
        label: "Telestracao",
      });
      setStrokes([]);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        variant={toolActive ? "default" : "outline"}
        onClick={() => setToolActive((v) => !v)}
      >
        <Pencil className="mr-1 h-4 w-4" />
        Desenhar jogada
      </Button>
      <Button type="button" size="sm" variant="outline" disabled={!strokes.length} onClick={() => setStrokes([])}>
        <Eraser className="mr-1 h-4 w-4" />
        Limpar
      </Button>
      <Button type="button" size="sm" disabled={saving || strokes.length === 0} onClick={() => void saveDrawing()}>
        {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
        Salvar no vídeo
      </Button>
    </div>
  );
}

export type { Stroke as AnalysisVideoStroke };
