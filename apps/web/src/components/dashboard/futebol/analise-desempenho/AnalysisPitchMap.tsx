"use client";

import { cn } from "@/lib/utils";
import {
  ANALYSIS_PITCH_ZONE_KEYS,
  ANALYSIS_PITCH_ZONE_LABELS,
  type AnalysisPitchZoneKey,
  isValidPitchZoneKey,
  pitchZoneCentroid,
  resolvePitchZoneFromXY,
} from "@/lib/analysis-pitch-zones";

type Point = {
  eventId?: string;
  x: number;
  y: number;
  fieldZoneKey?: string | null;
  label?: string;
};

type Props = {
  points?: Point[];
  selectedZone?: AnalysisPitchZoneKey | null;
  onPickZone?: (zone: AnalysisPitchZoneKey) => void;
  /** Clique livre (legado) — converte para zona 3×3 */
  onPick?: (x: number, y: number) => void;
  className?: string;
  showZoneLabels?: boolean;
};

const ROW_LABELS = ["Último terço", "Zona central", "1ª zona"] as const;
const COL_LABELS = ["Corredor esquerdo", "Corredor central", "Corredor direito"] as const;

function zoneAt(row: number, col: number): AnalysisPitchZoneKey {
  const colKey = col === 0 ? "esq" : col === 1 ? "cent" : "dir";
  const rowKey = row === 0 ? "ultimo" : row === 1 ? "meio" : "primeira";
  return `${colKey}_${rowKey}` as AnalysisPitchZoneKey;
}

export function AnalysisPitchMap({
  points = [],
  selectedZone = null,
  onPickZone,
  onPick,
  className,
  showZoneLabels = true,
}: Props) {
  const interactive = Boolean(onPickZone || onPick);

  function handleZoneClick(zone: AnalysisPitchZoneKey) {
    if (onPickZone) {
      onPickZone(zone);
      return;
    }
    if (onPick) {
      const c = pitchZoneCentroid(zone);
      onPick(c.x, c.y);
    }
  }

  return (
    <div
      className={cn(
        "relative aspect-[68/105] w-full max-w-md overflow-hidden rounded-md border border-emerald-900/60 bg-emerald-950/40",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-[8%] top-[6%] bottom-[6%] rounded-sm border border-white/25" />
      <div className="pointer-events-none absolute left-1/2 top-[6%] bottom-[6%] w-px -translate-x-1/2 bg-white/20" />
      <div className="pointer-events-none absolute inset-x-[8%] top-1/2 h-px -translate-y-1/2 bg-white/15" />

      <div className="absolute inset-x-[8%] top-[6%] bottom-[6%] grid grid-cols-3 grid-rows-3">
        {[0, 1, 2].map((row) =>
          [0, 1, 2].map((col) => {
            const zone = zoneAt(row, col);
            const isSelected = selectedZone === zone;
            return (
              <button
                key={zone}
                type="button"
                disabled={!interactive}
                className={cn(
                  "relative border border-dashed border-white/15 transition-colors",
                  interactive && "cursor-crosshair hover:bg-white/10",
                  isSelected && "bg-amber-500/25 ring-1 ring-amber-400/60",
                )}
                onClick={() => handleZoneClick(zone)}
                title={ANALYSIS_PITCH_ZONE_LABELS[zone]}
              >
                {showZoneLabels ? (
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center p-0.5 text-center text-[9px] leading-tight text-white/50 sm:text-[10px]">
                    {ANALYSIS_PITCH_ZONE_LABELS[zone].replace(" · ", "\n")}
                  </span>
                ) : null}
              </button>
            );
          }),
        )}
      </div>

      {points.map((p, i) => {
        const xy =
          p.fieldZoneKey && isValidPitchZoneKey(p.fieldZoneKey)
            ? pitchZoneCentroid(p.fieldZoneKey)
            : { x: p.x, y: p.y };
        return (
          <span
            key={p.eventId ?? i}
            title={p.label}
            className="pointer-events-none absolute z-10 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400 shadow"
            style={{
              left: `${8 + xy.x * 84}%`,
              top: `${6 + xy.y * 88}%`,
            }}
          />
        );
      })}

      <div className="pointer-events-none absolute -left-1 top-[6%] bottom-[6%] flex flex-col justify-between py-1 text-[8px] text-white/40">
        {ROW_LABELS.map((l) => (
          <span key={l} className="-rotate-90 whitespace-nowrap">
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

export { resolvePitchZoneFromXY, ANALYSIS_PITCH_ZONE_KEYS };
