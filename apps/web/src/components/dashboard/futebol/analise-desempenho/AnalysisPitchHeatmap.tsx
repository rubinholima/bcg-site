"use client";

import { cn } from "@/lib/utils";
import {
  ANALYSIS_PITCH_ZONE_KEYS,
  ANALYSIS_PITCH_ZONE_LABELS,
  type AnalysisPitchZoneKey,
} from "@/lib/analysis-pitch-zones";

type Props = {
  counts: Partial<Record<AnalysisPitchZoneKey, number>>;
  className?: string;
  title?: string;
};

function zoneAt(row: number, col: number): AnalysisPitchZoneKey {
  const colKey = col === 0 ? "esq" : col === 1 ? "cent" : "dir";
  const rowKey = row === 0 ? "ultimo" : row === 1 ? "meio" : "primeira";
  return `${colKey}_${rowKey}` as AnalysisPitchZoneKey;
}

export function AnalysisPitchHeatmap({ counts, className, title }: Props) {
  const max = Math.max(1, ...ANALYSIS_PITCH_ZONE_KEYS.map((k) => counts[k] ?? 0));

  return (
    <div className={cn("space-y-2", className)}>
      {title ? <p className="text-sm font-medium">{title}</p> : null}
      <div className="relative aspect-[68/105] w-full max-w-md overflow-hidden rounded-md border border-emerald-900/60 bg-emerald-950/40">
        <div className="absolute inset-x-[8%] top-[6%] bottom-[6%] grid grid-cols-3 grid-rows-3 gap-px">
          {[0, 1, 2].map((row) =>
            [0, 1, 2].map((col) => {
              const zone = zoneAt(row, col);
              const n = counts[zone] ?? 0;
              const intensity = n / max;
              return (
                <div
                  key={zone}
                  className="flex flex-col items-center justify-center border border-white/10 p-1 text-center"
                  style={{
                    backgroundColor: `rgba(251, 191, 36, ${0.08 + intensity * 0.72})`,
                  }}
                  title={ANALYSIS_PITCH_ZONE_LABELS[zone]}
                >
                  <span className="text-lg font-semibold tabular-nums text-amber-100">{n}</span>
                  <span className="text-[8px] leading-tight text-white/60 sm:text-[9px]">
                    {ANALYSIS_PITCH_ZONE_LABELS[zone].split(" · ")[1] ?? ""}
                  </span>
                </div>
              );
            }),
          )}
        </div>
      </div>
    </div>
  );
}
