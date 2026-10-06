"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export type TacticalBoardElement =
  | { id: string; type: "player"; x: number; y: number; label: string; number?: string }
  | { id: string; type: "arrow"; x1: number; y1: number; x2: number; y2: number }
  | { id: string; type: "zone"; x: number; y: number; w: number; h: number; label?: string }
  | { id: string; type: "text"; x: number; y: number; text: string };

export type TacticalBoardState = { elements: TacticalBoardElement[] };

type Props = {
  value: TacticalBoardState;
  onChange: (next: TacticalBoardState) => void;
  readOnly?: boolean;
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function PreMatchTacticalBoard({ value, onChange, readOnly = false }: Props) {
  const [tool, setTool] = useState<"player" | "arrow" | "zone" | "text">("player");
  const [pendingArrow, setPendingArrow] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const toNorm = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0.5, y: 0.5 };
    const rect = svg.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)),
    };
  }, []);

  const push = useCallback(
    (el: TacticalBoardElement) => {
      onChange({ elements: [...value.elements, el] });
    },
    [onChange, value.elements],
  );

  const undo = () => {
    onChange({ elements: value.elements.slice(0, -1) });
  };

  const onPitchClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (readOnly) return;
    const { x, y } = toNorm(e.clientX, e.clientY);
    if (tool === "player") {
      push({ id: uid(), type: "player", x, y, label: "?", number: "" });
      return;
    }
    if (tool === "text") {
      push({ id: uid(), type: "text", x, y, text: "Anotação" });
      return;
    }
    if (tool === "zone") {
      push({ id: uid(), type: "zone", x: x - 0.08, y: y - 0.06, w: 0.16, h: 0.12, label: "" });
      return;
    }
    if (tool === "arrow") {
      if (!pendingArrow) {
        setPendingArrow({ x, y });
      } else {
        push({
          id: uid(),
          type: "arrow",
          x1: pendingArrow.x,
          y1: pendingArrow.y,
          x2: x,
          y2: y,
        });
        setPendingArrow(null);
      }
    }
  };

  const w = 100;
  const h = 140;

  return (
    <div className="space-y-2">
      {!readOnly ? (
        <div className="flex flex-wrap gap-2">
          {(["player", "arrow", "zone", "text"] as const).map((t) => (
            <Button
              key={t}
              type="button"
              size="sm"
              variant={tool === t ? "default" : "outline"}
              onClick={() => {
                setTool(t);
                setPendingArrow(null);
              }}
            >
              {t === "player" ? "Jogador" : t === "arrow" ? "Seta" : t === "zone" ? "Zona" : "Texto"}
            </Button>
          ))}
          <Button type="button" size="sm" variant="ghost" onClick={undo} disabled={value.elements.length === 0}>
            Desfazer
          </Button>
        </div>
      ) : null}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${w} ${h}`}
        className="w-full max-w-lg touch-none rounded-md border border-emerald-800/50 bg-emerald-950/40"
        onClick={onPitchClick}
        role="img"
        aria-label="Campo tático"
      >
        <rect x={2} y={2} width={w - 4} height={h - 4} fill="#14532d" stroke="#166534" strokeWidth={0.5} />
        <line x1={w / 2} y1={2} x2={w / 2} y2={h - 2} stroke="#22c55e" strokeOpacity={0.35} />
        <circle cx={w / 2} cy={h / 2} r={12} fill="none" stroke="#22c55e" strokeOpacity={0.35} />
        {value.elements.map((el) => {
          if (el.type === "player") {
            return (
              <g key={el.id}>
                <circle cx={el.x * w} cy={el.y * h} r={4} fill="#a78bfa" />
                <text x={el.x * w} y={el.y * h - 5} textAnchor="middle" fontSize={4} fill="#fff">
                  {el.number || el.label}
                </text>
              </g>
            );
          }
          if (el.type === "arrow") {
            return (
              <line
                key={el.id}
                x1={el.x1 * w}
                y1={el.y1 * h}
                x2={el.x2 * w}
                y2={el.y2 * h}
                stroke="#fbbf24"
                strokeWidth={0.8}
                markerEnd="url(#arrowhead)"
              />
            );
          }
          if (el.type === "zone") {
            return (
              <rect
                key={el.id}
                x={el.x * w}
                y={el.y * h}
                width={el.w * w}
                height={el.h * h}
                fill="#fbbf24"
                fillOpacity={0.15}
                stroke="#fbbf24"
                strokeOpacity={0.5}
              />
            );
          }
          return (
            <text key={el.id} x={el.x * w} y={el.y * h} fontSize={3.5} fill="#e2e8f0">
              {el.text}
            </text>
          );
        })}
        <defs>
          <marker id="arrowhead" markerWidth={4} markerHeight={4} refX={2} refY={2} orient="auto">
            <polygon points="0 0, 4 2, 0 4" fill="#fbbf24" />
          </marker>
        </defs>
      </svg>
    </div>
  );
}
