/** Modelo vetorial unificado — coordenadas normalizadas 0–1 */

export const TACTICAL_VECTOR_SCHEMA_VERSION = 1;

export type TacticalTool =
  | "select"
  | "freehand"
  | "arrow"
  | "line"
  | "playerOur"
  | "playerOpp"
  | "ball"
  | "zone"
  | "text";

export type TacticalVectorObject =
  | {
      id: string;
      type: "freehand";
      color: string;
      strokeWidth: number;
      points: Array<{ x: number; y: number }>;
    }
  | {
      id: string;
      type: "arrow" | "line";
      color: string;
      strokeWidth: number;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    }
  | {
      id: string;
      type: "playerOur" | "playerOpp";
      x: number;
      y: number;
      number?: string;
      label?: string;
      playerId?: string | null;
      opponentPlayerId?: string | null;
    }
  | {
      id: string;
      type: "ball";
      x: number;
      y: number;
      color?: string;
    }
  | {
      id: string;
      type: "zone";
      x: number;
      y: number;
      w: number;
      h: number;
      color: string;
      opacity?: number;
    }
  | {
      id: string;
      type: "text";
      x: number;
      y: number;
      text: string;
      color: string;
      fontSize?: number;
    };

export type TacticalVectorDocument = {
  schemaVersion: number;
  objects: TacticalVectorObject[];
};

export function emptyTacticalDocument(): TacticalVectorDocument {
  return { schemaVersion: TACTICAL_VECTOR_SCHEMA_VERSION, objects: [] };
}

export function legacyStrokesToVector(
  strokes: Array<{ color: string; width: number; points: Array<{ x: number; y: number }> }>,
): TacticalVectorDocument {
  const objects: TacticalVectorObject[] = strokes.map((s, i) => ({
    id: `legacy-${i}`,
    type: "freehand",
    color: s.color,
    strokeWidth: s.width,
    points: s.points,
  }));
  return { schemaVersion: TACTICAL_VECTOR_SCHEMA_VERSION, objects };
}

export function normalizeCoord(v: number): number {
  return Math.min(1, Math.max(0, v));
}

export function uid(): string {
  return `tv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
