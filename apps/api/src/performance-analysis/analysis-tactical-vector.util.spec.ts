const TACTICAL_VECTOR_SCHEMA_VERSION = 1;

// Espelho para testes na API (evita import cross-app em CI)
type Pt = { x: number; y: number };
function legacyStrokesToVectorApi(strokes: Array<{ color: string; width: number; points: Pt[] }>) {
  return {
    schemaVersion: TACTICAL_VECTOR_SCHEMA_VERSION,
    objects: strokes.map((s, i) => ({
      id: `legacy-${i}`,
      type: 'freehand' as const,
      color: s.color,
      strokeWidth: s.width,
      points: s.points,
    })),
  };
}

function normalizeCoordApi(v: number) {
  return Math.min(1, Math.max(0, v));
}

describe('tactical vector', () => {
  it('preserva freehand legado', () => {
    const doc = legacyStrokesToVectorApi([{ color: '#fff', width: 2, points: [{ x: 0.1, y: 0.2 }] }]);
    expect(doc.objects).toHaveLength(1);
    expect(doc.objects[0].type).toBe('freehand');
  });

  it('normaliza coordenadas', () => {
    expect(normalizeCoordApi(1.5)).toBe(1);
    expect(normalizeCoordApi(-0.2)).toBe(0);
    expect(legacyStrokesToVectorApi([]).schemaVersion).toBe(1);
    expect(normalizeCoordApi(0.5)).toBe(0.5);
  });
});
