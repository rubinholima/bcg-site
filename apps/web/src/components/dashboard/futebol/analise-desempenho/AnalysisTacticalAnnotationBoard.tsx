"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  emptyTacticalDocument,
  type TacticalTool,
  type TacticalVectorDocument,
  type TacticalVectorObject,
  uid,
  normalizeCoord,
} from "@/lib/analysis-tactical-vector";

type Props = {
  value: TacticalVectorDocument;
  onChange: (doc: TacticalVectorDocument) => void;
  readOnly?: boolean;
  className?: string;
};

const TOOLS: Array<{ id: TacticalTool; label: string }> = [
  { id: "select", label: "Sel." },
  { id: "freehand", label: "Mão" },
  { id: "arrow", label: "Seta" },
  { id: "line", label: "Linha" },
  { id: "playerOur", label: "Nosso" },
  { id: "playerOpp", label: "Adv." },
  { id: "ball", label: "Bola" },
  { id: "zone", label: "Zona" },
  { id: "text", label: "Texto" },
];

export function AnalysisTacticalAnnotationBoard({ value, onChange, readOnly, className }: Props) {
  const [tool, setTool] = useState<TacticalTool>("select");
  const [color, setColor] = useState("#fbbf24");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [freehand, setFreehand] = useState<Array<{ x: number; y: number }>>([]);
  const [pendingLine, setPendingLine] = useState<{ x: number; y: number } | null>(null);
  const [history, setHistory] = useState<TacticalVectorDocument[]>([]);
  const [redoStack, setRedoStack] = useState<TacticalVectorDocument[]>([]);
  const [clearOpen, setClearOpen] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const objects = value.objects;

  const toNorm = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0.5, y: 0.5 };
    const rect = svg.getBoundingClientRect();
    return {
      x: normalizeCoord((clientX - rect.left) / rect.width),
      y: normalizeCoord((clientY - rect.top) / rect.height),
    };
  }, []);

  const commit = useCallback(
    (next: TacticalVectorDocument) => {
      setHistory((h) => [...h.slice(-40), value]);
      setRedoStack([]);
      onChange(next);
    },
    [onChange, value],
  );

  const undo = () => {
    const prev = history[history.length - 1];
    if (!prev) return;
    setRedoStack((r) => [...r, value]);
    setHistory((h) => h.slice(0, -1));
    onChange(prev);
  };

  const redo = () => {
    const next = redoStack[redoStack.length - 1];
    if (!next) return;
    setHistory((h) => [...h, value]);
    setRedoStack((r) => r.slice(0, -1));
    onChange(next);
  };

  const addObject = (obj: TacticalVectorObject) => {
    commit({ ...value, objects: [...objects, obj] });
  };

  const removeSelected = () => {
    if (!selectedId) return;
    commit({ ...value, objects: objects.filter((o) => o.id !== selectedId) });
    setSelectedId(null);
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (readOnly) return;
    const p = toNorm(e.clientX, e.clientY);
    if (tool === "select") return;
    if (tool === "freehand") {
      setFreehand([p]);
      return;
    }
    if (tool === "arrow" || tool === "line") {
      if (!pendingLine) setPendingLine(p);
      else {
        addObject({
          id: uid(),
          type: tool,
          color,
          strokeWidth: 3,
          x1: pendingLine.x,
          y1: pendingLine.y,
          x2: p.x,
          y2: p.y,
        });
        setPendingLine(null);
      }
      return;
    }
    if (tool === "playerOur" || tool === "playerOpp") {
      const label = window.prompt(tool === "playerOur" ? "Nº/nome (nosso)" : "Nº/nome (adversário)") ?? "";
      addObject({
        id: uid(),
        type: tool,
        x: p.x,
        y: p.y,
        number: label.match(/^\d+/)?.[0],
        label: label.trim() || undefined,
      });
      return;
    }
    if (tool === "ball") {
      addObject({ id: uid(), type: "ball", x: p.x, y: p.y, color: "#ffffff" });
      return;
    }
    if (tool === "zone") {
      addObject({
        id: uid(),
        type: "zone",
        x: p.x - 0.08,
        y: p.y - 0.06,
        w: 0.16,
        h: 0.12,
        color,
        opacity: 0.35,
      });
      return;
    }
    if (tool === "text") {
      const text = window.prompt("Texto")?.trim();
      if (text) addObject({ id: uid(), type: "text", x: p.x, y: p.y, text, color });
    }
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (tool !== "freehand" || freehand.length === 0) return;
    const p = toNorm(e.clientX, e.clientY);
    setFreehand((pts) => [...pts, p]);
  };

  const onPointerUp = () => {
    if (tool === "freehand" && freehand.length > 1) {
      addObject({ id: uid(), type: "freehand", color, strokeWidth: 3, points: freehand });
    }
    setFreehand([]);
  };

  const renderObject = (o: TacticalVectorObject) => {
    const sel = selectedId === o.id;
    if (o.type === "freehand") {
      const d = o.points.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x * 100} ${pt.y * 100}`).join(" ");
      return (
        <path
          key={o.id}
          d={d}
          fill="none"
          stroke={o.color}
          strokeWidth={o.strokeWidth}
          className={cn(sel && "opacity-90")}
          onClick={() => setSelectedId(o.id)}
        />
      );
    }
    if (o.type === "arrow" || o.type === "line") {
      return (
        <line
          key={o.id}
          x1={o.x1 * 100}
          y1={o.y1 * 100}
          x2={o.x2 * 100}
          y2={o.y2 * 100}
          stroke={o.color}
          strokeWidth={o.strokeWidth}
          markerEnd={o.type === "arrow" ? "url(#arrow)" : undefined}
          onClick={() => setSelectedId(o.id)}
        />
      );
    }
    if (o.type === "playerOur" || o.type === "playerOpp") {
      return (
        <g key={o.id} onClick={() => setSelectedId(o.id)} className="cursor-pointer">
          <circle
            cx={o.x * 100}
            cy={o.y * 100}
            r={3.2}
            fill={o.type === "playerOur" ? "#22c55e" : "#ef4444"}
            stroke="#fff"
            strokeWidth={0.4}
          />
          <text x={o.x * 100} y={o.y * 100 + 1} textAnchor="middle" fontSize={2.2} fill="#fff">
            {o.number ?? "•"}
          </text>
        </g>
      );
    }
    if (o.type === "ball") {
      return <circle key={o.id} cx={o.x * 100} cy={o.y * 100} r={1.8} fill={o.color ?? "#fff"} />;
    }
    if (o.type === "zone") {
      return (
        <rect
          key={o.id}
          x={o.x * 100}
          y={o.y * 100}
          width={o.w * 100}
          height={o.h * 100}
          fill={o.color}
          fillOpacity={o.opacity ?? 0.35}
          stroke={o.color}
        />
      );
    }
    if (o.type === "text") {
      return (
        <text key={o.id} x={o.x * 100} y={o.y * 100} fill={o.color} fontSize={o.fontSize ?? 2.5}>
          {o.text}
        </text>
      );
    }
    return null;
  };

  const liveStroke = useMemo(() => {
    if (freehand.length < 2) return null;
    const d = freehand.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x * 100} ${pt.y * 100}`).join(" ");
    return <path d={d} fill="none" stroke={color} strokeWidth={3} />;
  }, [freehand, color]);

  return (
    <div className={cn("space-y-2", className)}>
      {!readOnly ? (
        <div className="flex flex-wrap gap-1">
          {TOOLS.map((t) => (
            <Button
              key={t.id}
              type="button"
              size="sm"
              variant={tool === t.id ? "default" : "outline"}
              onClick={() => {
                setTool(t.id);
                setPendingLine(null);
              }}
            >
              {t.label}
            </Button>
          ))}
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-8 w-10 cursor-pointer rounded border border-border"
            title="Cor"
          />
          <Button type="button" size="sm" variant="ghost" onClick={undo} disabled={!history.length}>
            Desfazer
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={redo} disabled={!redoStack.length}>
            Refazer
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={removeSelected} disabled={!selectedId}>
            Apagar
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setClearOpen(true)}>
            Limpar
          </Button>
        </div>
      ) : null}
      <svg
        ref={svgRef}
        viewBox="0 0 100 68"
        className="w-full rounded-md border border-emerald-900/60 bg-emerald-950/50 touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <defs>
          <marker id="arrow" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
            <path d="M0,0 L4,2 L0,4 Z" fill={color} />
          </marker>
        </defs>
        <rect x="8" y="6" width="84" height="56" fill="none" stroke="#ffffff33" />
        <line x1="50" y1="6" x2="50" y2="62" stroke="#ffffff22" />
        {objects.map(renderObject)}
        {liveStroke}
      </svg>
      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar desenho?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                commit(emptyTacticalDocument());
                setClearOpen(false);
              }}
            >
              Limpar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
