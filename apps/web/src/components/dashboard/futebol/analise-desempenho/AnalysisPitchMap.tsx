"use client";

import { cn } from "@/lib/utils";

type Point = { eventId?: string; x: number; y: number; label?: string };

type Props = {
  points?: Point[];
  onPick?: (x: number, y: number) => void;
  className?: string;
};

export function AnalysisPitchMap({ points = [], onPick, className }: Props) {
  return (
    <button
      type="button"
      className={cn(
        "relative aspect-[68/105] w-full max-w-md overflow-hidden rounded-md border border-emerald-900/60 bg-emerald-950/40",
        onPick ? "cursor-crosshair" : "cursor-default",
        className,
      )}
      onClick={(e) => {
        if (!onPick) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        onPick(Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y)));
      }}
    >
      <div className="pointer-events-none absolute inset-x-[12%] top-[8%] bottom-[8%] rounded-sm border border-white/20" />
      <div className="pointer-events-none absolute left-1/2 top-[8%] bottom-[8%] w-px -translate-x-1/2 bg-white/15" />
      <div className="pointer-events-none absolute left-[12%] right-[12%] top-1/2 h-px -translate-y-1/2 bg-white/15" />
      {points.map((p, i) => (
        <span
          key={p.eventId ?? i}
          title={p.label}
          className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400 shadow"
          style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
        />
      ))}
    </button>
  );
}
