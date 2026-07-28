"use client";

import { cn } from "@/lib/utils";

export type BodyMapHit = {
  regionId: string;
  side?: "E" | "D";
  view: "front" | "back";
  x: number;
  y: number;
};

type Mark = {
  regionId: string;
  side?: string | null;
  view?: string | null;
  x?: number | null;
  y?: number | null;
  label?: string;
};

const FRONT_REGIONS: Array<{
  id: string;
  regionId: string;
  side?: "E" | "D";
  d: string;
  label: string;
}> = [
  { id: "f-cabeca", regionId: "cabeca", d: "M95 8c-18 0-32 14-32 32 0 20 12 36 32 42 20-6 32-22 32-42 0-18-14-32-32-32z", label: "Cabeça" },
  { id: "f-cervical", regionId: "coluna_cervical", d: "M86 78h18v16H86z", label: "Cervical" },
  { id: "f-ombro-e", regionId: "ombro", side: "E", d: "M42 94c-10 2-20 14-22 28l18 8c4-10 12-18 22-22z", label: "Ombro E" },
  { id: "f-ombro-d", regionId: "ombro", side: "D", d: "M148 94c10 2 20 14 22 28l-18 8c-4-10-12-18-22-22z", label: "Ombro D" },
  { id: "f-torax", regionId: "coluna_toracica", d: "M72 96h46v42H72z", label: "Torácica" },
  { id: "f-lombar", regionId: "coluna_lombar", d: "M76 138h38v28H76z", label: "Lombar" },
  { id: "f-braco-e", regionId: "braco", side: "E", d: "M28 122c-8 8-12 22-10 36l16 4c0-12 4-24 12-32z", label: "Braço E" },
  { id: "f-braco-d", regionId: "braco", side: "D", d: "M162 122c8 8 12 22 10 36l-16 4c0-12-4-24-12-32z", label: "Braço D" },
  { id: "f-cotovelo-e", regionId: "cotovelo", side: "E", d: "M18 160h16v14H18z", label: "Cotovelo E" },
  { id: "f-cotovelo-d", regionId: "cotovelo", side: "D", d: "M156 160h16v14h-16z", label: "Cotovelo D" },
  { id: "f-antebraco-e", regionId: "antebraco", side: "E", d: "M14 176c-4 10-4 22 0 32l14-2c-2-10-2-20 2-28z", label: "Antebraço E" },
  { id: "f-antebraco-d", regionId: "antebraco", side: "D", d: "M176 176c4 10 4 22 0 32l-14-2c2-10 2-20-2-28z", label: "Antebraço D" },
  { id: "f-punho-e", regionId: "punho", side: "E", d: "M10 210h14v10H10z", label: "Punho E" },
  { id: "f-punho-d", regionId: "punho", side: "D", d: "M166 210h14v10h-14z", label: "Punho D" },
  { id: "f-mao-e", regionId: "mao", side: "E", d: "M6 220h16v18H6z", label: "Mão E" },
  { id: "f-mao-d", regionId: "mao", side: "D", d: "M168 220h16v18h-16z", label: "Mão D" },
  { id: "f-pelve", regionId: "pelve", d: "M70 166h50v22H70z", label: "Pelve" },
  { id: "f-quadril-e", regionId: "quadril", side: "E", d: "M58 178c-8 4-12 14-10 24l18 2c0-10 4-18 12-22z", label: "Quadril E" },
  { id: "f-quadril-d", regionId: "quadril", side: "D", d: "M132 178c8 4 12 14 10 24l-18 2c0-10-4-18-12-22z", label: "Quadril D" },
  { id: "f-coxa-e", regionId: "coxa", side: "E", d: "M62 202h28v48H62z", label: "Coxa E" },
  { id: "f-coxa-d", regionId: "coxa", side: "D", d: "M100 202h28v48h-28z", label: "Coxa D" },
  { id: "f-joelho-e", regionId: "joelho", side: "E", d: "M66 250h22v16H66z", label: "Joelho E" },
  { id: "f-joelho-d", regionId: "joelho", side: "D", d: "M102 250h22v16h-22z", label: "Joelho D" },
  { id: "f-perna-e", regionId: "perna", side: "E", d: "M68 268h20v46H68z", label: "Perna E" },
  { id: "f-perna-d", regionId: "perna", side: "D", d: "M102 268h20v46h-20z", label: "Perna D" },
  { id: "f-tornozelo-e", regionId: "tornozelo", side: "E", d: "M68 314h20v12H68z", label: "Tornozelo E" },
  { id: "f-tornozelo-d", regionId: "tornozelo", side: "D", d: "M102 314h20v12h-20z", label: "Tornozelo D" },
  { id: "f-pe-e", regionId: "pe", side: "E", d: "M58 326h34v14H58z", label: "Pé E" },
  { id: "f-pe-d", regionId: "pe", side: "D", d: "M98 326h34v14H98z", label: "Pé D" },
];

const BACK_REGIONS: Array<{
  id: string;
  regionId: string;
  side?: "E" | "D";
  d: string;
  label: string;
}> = [
  { id: "b-cabeca", regionId: "cabeca", d: "M95 8c-18 0-32 14-32 32 0 20 12 36 32 42 20-6 32-22 32-42 0-18-14-32-32-32z", label: "Cabeça" },
  { id: "b-cervical", regionId: "coluna_cervical", d: "M86 78h18v16H86z", label: "Cervical" },
  { id: "b-ombro-d", regionId: "ombro", side: "D", d: "M42 94c-10 2-20 14-22 28l18 8c4-10 12-18 22-22z", label: "Ombro D" },
  { id: "b-ombro-e", regionId: "ombro", side: "E", d: "M148 94c10 2 20 14 22 28l-18 8c-4-10-12-18-22-22z", label: "Ombro E" },
  { id: "b-torax", regionId: "coluna_toracica", d: "M72 96h46v42H72z", label: "Torácica" },
  { id: "b-lombar", regionId: "coluna_lombar", d: "M76 138h38v28H76z", label: "Lombar" },
  { id: "b-braco-d", regionId: "braco", side: "D", d: "M28 122c-8 8-12 22-10 36l16 4c0-12 4-24 12-32z", label: "Braço D" },
  { id: "b-braco-e", regionId: "braco", side: "E", d: "M162 122c8 8 12 22 10 36l-16 4c0-12-4-24-12-32z", label: "Braço E" },
  { id: "b-cotovelo-d", regionId: "cotovelo", side: "D", d: "M18 160h16v14H18z", label: "Cotovelo D" },
  { id: "b-cotovelo-e", regionId: "cotovelo", side: "E", d: "M156 160h16v14h-16z", label: "Cotovelo E" },
  { id: "b-antebraco-d", regionId: "antebraco", side: "D", d: "M14 176c-4 10-4 22 0 32l14-2c-2-10-2-20 2-28z", label: "Antebraço D" },
  { id: "b-antebraco-e", regionId: "antebraco", side: "E", d: "M176 176c4 10 4 22 0 32l-14-2c2-10 2-20-2-28z", label: "Antebraço E" },
  { id: "b-punho-d", regionId: "punho", side: "D", d: "M10 210h14v10H10z", label: "Punho D" },
  { id: "b-punho-e", regionId: "punho", side: "E", d: "M166 210h14v10h-14z", label: "Punho E" },
  { id: "b-mao-d", regionId: "mao", side: "D", d: "M6 220h16v18H6z", label: "Mão D" },
  { id: "b-mao-e", regionId: "mao", side: "E", d: "M168 220h16v18h-16z", label: "Mão E" },
  { id: "b-pelve", regionId: "pelve", d: "M70 166h50v22H70z", label: "Pelve" },
  { id: "b-quadril-d", regionId: "quadril", side: "D", d: "M58 178c-8 4-12 14-10 24l18 2c0-10 4-18 12-22z", label: "Quadril D" },
  { id: "b-quadril-e", regionId: "quadril", side: "E", d: "M132 178c8 4 12 14 10 24l-18 2c0-10-4-18-12-22z", label: "Quadril E" },
  { id: "b-coxa-d", regionId: "coxa", side: "D", d: "M62 202h28v48H62z", label: "Coxa D" },
  { id: "b-coxa-e", regionId: "coxa", side: "E", d: "M100 202h28v48h-28z", label: "Coxa E" },
  { id: "b-joelho-d", regionId: "joelho", side: "D", d: "M66 250h22v16H66z", label: "Joelho D" },
  { id: "b-joelho-e", regionId: "joelho", side: "E", d: "M102 250h22v16h-22z", label: "Joelho E" },
  { id: "b-perna-d", regionId: "perna", side: "D", d: "M68 268h20v46H68z", label: "Perna D" },
  { id: "b-perna-e", regionId: "perna", side: "E", d: "M102 268h20v46h-20z", label: "Perna E" },
  { id: "b-tornozelo-d", regionId: "tornozelo", side: "D", d: "M68 314h20v12H68z", label: "Tornozelo D" },
  { id: "b-tornozelo-e", regionId: "tornozelo", side: "E", d: "M102 314h20v12h-20z", label: "Tornozelo E" },
  { id: "b-pe-d", regionId: "pe", side: "D", d: "M58 326h34v14H58z", label: "Pé D" },
  { id: "b-pe-e", regionId: "pe", side: "E", d: "M98 326h34v14H98z", label: "Pé E" },
];

function centroid(d: string): { x: number; y: number } {
  const nums = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
  if (nums.length < 2) return { x: 95, y: 180 };
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < nums.length - 1; i += 2) {
    xs.push(nums[i]!);
    ys.push(nums[i + 1]!);
  }
  return {
    x: xs.reduce((a, b) => a + b, 0) / xs.length,
    y: ys.reduce((a, b) => a + b, 0) / ys.length,
  };
}

export function PhysioBodyMap({
  view,
  onViewChange,
  selectedRegionId,
  selectedSide,
  marks = [],
  onSelect,
  className,
}: {
  view: "front" | "back";
  onViewChange?: (view: "front" | "back") => void;
  selectedRegionId?: string | null;
  selectedSide?: string | null;
  marks?: Mark[];
  onSelect?: (hit: BodyMapHit) => void;
  className?: string;
}) {
  const regions = view === "front" ? FRONT_REGIONS : BACK_REGIONS;

  return (
    <div className={cn("space-y-3", className)}>
      {onViewChange ? (
        <div className="inline-flex rounded-lg border border-border bg-muted/30 p-1">
          {(["front", "back"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onViewChange(v)}
              className={cn(
                "min-h-[40px] rounded-md px-3 text-sm font-medium",
                view === v ? "bg-background shadow-sm" : "text-muted-foreground",
              )}
            >
              {v === "front" ? "Frente" : "Costas"}
            </button>
          ))}
        </div>
      ) : null}
      <div className="mx-auto w-full max-w-[280px] rounded-xl border border-border bg-zinc-950/40 p-2">
        <svg viewBox="0 0 190 350" className="h-auto w-full" role="img" aria-label="Mapa corporal">
          <ellipse cx="95" cy="175" rx="70" ry="160" fill="#18181b" opacity="0.35" />
          {regions.map((r) => {
            const selected =
              selectedRegionId === r.regionId &&
              (!r.side || !selectedSide || selectedSide === r.side || selectedSide === "bilateral");
            const marked = marks.some(
              (m) =>
                m.regionId === r.regionId &&
                (!r.side || !m.side || m.side === r.side || m.side === "bilateral"),
            );
            return (
              <path
                key={r.id}
                d={r.d}
                aria-label={r.label}
                onClick={() => {
                  const c = centroid(r.d);
                  onSelect?.({
                    regionId: r.regionId,
                    side: r.side,
                    view,
                    x: c.x,
                    y: c.y,
                  });
                }}
                className={cn(
                  "cursor-pointer stroke-zinc-500 transition-colors",
                  selected
                    ? "fill-amber-500/80 stroke-amber-300"
                    : marked
                      ? "fill-rose-500/70 stroke-rose-300"
                      : "fill-zinc-700/80 hover:fill-sky-500/50",
                )}
                strokeWidth={1.2}
              />
            );
          })}
          {marks
            .filter((m) => !m.view || m.view === view)
            .map((m, i) =>
              m.x != null && m.y != null ? (
                <circle
                  key={`${m.regionId}-${i}`}
                  cx={m.x}
                  cy={m.y}
                  r={5}
                  className="fill-rose-400 stroke-white"
                  strokeWidth={1.5}
                />
              ) : null,
            )}
        </svg>
      </div>
    </div>
  );
}
