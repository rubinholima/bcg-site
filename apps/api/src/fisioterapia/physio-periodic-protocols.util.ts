export const PHYSIO_PERIODIC_PROTOCOLS = [
  'y_balance',
  't_test',
  'stop_down',
  'hop_test',
  'perimetria',
  'agachamento_bastao',
  'forca_kinology',
] as const;

export type PhysioPeriodicProtocol = (typeof PHYSIO_PERIODIC_PROTOCOLS)[number];

export type ProtocolClassification =
  | 'aprovado'
  | 'aceitavel'
  | 'reprovado'
  | 'medio'
  | 'ruim'
  | 'bom'
  | 'razoavel';

export function pctDifference(a: number, b: number): number {
  const max = Math.max(Math.abs(a), Math.abs(b));
  if (max === 0) return 0;
  return (Math.abs(a - b) / max) * 100;
}

export function classifyYBalanceDirection(diffPct: number): ProtocolClassification {
  if (diffPct <= 10) return 'aprovado';
  if (diffPct <= 12.5) return 'aceitavel';
  return 'reprovado';
}

export function classifyYBalance(input: {
  right: { frontal: number; lateral: number; cruzado: number };
  left: { frontal: number; lateral: number; cruzado: number };
}) {
  const directions = ['frontal', 'lateral', 'cruzado'] as const;
  const differences: Record<string, number> = {};
  const classifications: Record<string, ProtocolClassification> = {};
  for (const dir of directions) {
    const diff = pctDifference(input.right[dir], input.left[dir]);
    differences[dir] = Math.round(diff * 10) / 10;
    classifications[dir] = classifyYBalanceDirection(diff);
  }
  const overall = worstClassification(Object.values(classifications), [
    'aprovado',
    'aceitavel',
    'reprovado',
  ]);
  return { differences, classifications, overall };
}

export function classifyTTest(seconds: number): ProtocolClassification {
  if (seconds <= 10) return 'aprovado';
  if (seconds <= 13) return 'aceitavel';
  return 'reprovado';
}

export function classifyStopDown(score: number): ProtocolClassification {
  if (score <= 1) return 'aprovado';
  if (score === 2) return 'medio';
  return 'ruim';
}

export function classifyStopDownProtocol(input: { frontal: number; lateral: number }) {
  const frontal = classifyStopDown(input.frontal);
  const lateral = classifyStopDown(input.lateral);
  const overall = worstClassification([frontal, lateral], ['aprovado', 'medio', 'ruim']);
  return { frontal, lateral, overall };
}

export function classifyHopTest(input: {
  rightJumps: [number, number, number];
  leftJumps: [number, number, number];
}) {
  const rightBest = Math.max(...input.rightJumps);
  const leftBest = Math.max(...input.leftJumps);
  const diffPct = pctDifference(rightBest, leftBest);
  let overall: ProtocolClassification;
  if (diffPct <= 10) overall = 'aceitavel';
  else if (diffPct <= 12) overall = 'ruim';
  else overall = 'reprovado';
  return {
    rightBest,
    leftBest,
    diffPct: Math.round(diffPct * 10) / 10,
    overall,
  };
}

export function classifyPerimetryPair(right: number, left: number): ProtocolClassification {
  const diff = pctDifference(right, left);
  if (diff <= 10) return 'bom';
  if (diff <= 15) return 'razoavel';
  return 'reprovado';
}

export function classifyPerimetria(input: {
  right: { proximal: number; medial: number; distal: number };
  left: { proximal: number; medial: number; distal: number };
  calfRight: number;
  calfLeft: number;
}) {
  const pairs: { key: string; classification: ProtocolClassification; diffPct: number }[] = [
    {
      key: 'proximal',
      diffPct: pctDifference(input.right.proximal, input.left.proximal),
      classification: classifyPerimetryPair(input.right.proximal, input.left.proximal),
    },
    {
      key: 'medial',
      diffPct: pctDifference(input.right.medial, input.left.medial),
      classification: classifyPerimetryPair(input.right.medial, input.left.medial),
    },
    {
      key: 'distal',
      diffPct: pctDifference(input.right.distal, input.left.distal),
      classification: classifyPerimetryPair(input.right.distal, input.left.distal),
    },
    {
      key: 'panturrilha',
      diffPct: pctDifference(input.calfRight, input.calfLeft),
      classification: classifyPerimetryPair(input.calfRight, input.calfLeft),
    },
  ].map((p) => ({ ...p, diffPct: Math.round(p.diffPct * 10) / 10 }));

  const overall = worstClassification(
    pairs.map((p) => p.classification),
    ['bom', 'razoavel', 'reprovado'],
  );
  return { pairs, overall };
}

export function classifyAgachamentoBastao(approved: boolean): ProtocolClassification {
  return approved ? 'aprovado' : 'reprovado';
}

function worstClassification<T extends string>(values: T[], order: T[]): T {
  let worst = order[0];
  for (const v of values) {
    if (order.indexOf(v) > order.indexOf(worst)) worst = v;
  }
  return worst;
}

export function buildProtocolResult(
  protocol: PhysioPeriodicProtocol,
  payload: Record<string, unknown>,
): { payload: Record<string, unknown>; classification: ProtocolClassification; score: string } {
  switch (protocol) {
    case 'y_balance': {
      const result = classifyYBalance(payload as Parameters<typeof classifyYBalance>[0]);
      return {
        payload: { ...payload, computed: result },
        classification: result.overall,
        score: `${result.overall} (máx ${Math.max(...Object.values(result.differences)).toFixed(1)}%)`,
      };
    }
    case 't_test': {
      const seconds = Number(payload.seconds);
      const classification = classifyTTest(seconds);
      return {
        payload: { ...payload, seconds, classification },
        classification,
        score: `${seconds}s — ${classification}`,
      };
    }
    case 'stop_down': {
      const result = classifyStopDownProtocol(payload as Parameters<typeof classifyStopDownProtocol>[0]);
      return {
        payload: { ...payload, computed: result },
        classification: result.overall,
        score: `F:${payload.frontal} L:${payload.lateral} — ${result.overall}`,
      };
    }
    case 'hop_test': {
      const result = classifyHopTest(payload as Parameters<typeof classifyHopTest>[0]);
      return {
        payload: { ...payload, computed: result },
        classification: result.overall,
        score: `${result.diffPct}% — ${result.overall}`,
      };
    }
    case 'perimetria': {
      const result = classifyPerimetria(payload as Parameters<typeof classifyPerimetria>[0]);
      return {
        payload: { ...payload, computed: result },
        classification: result.overall,
        score: `${result.overall}`,
      };
    }
    case 'agachamento_bastao': {
      const approved = Boolean(payload.approved);
      const classification = classifyAgachamentoBastao(approved);
      return {
        payload: { approved, classification },
        classification,
        score: classification,
      };
    }
    case 'forca_kinology':
      return {
        payload,
        classification: 'aprovado',
        score: payload.pdfName ? String(payload.pdfName) : 'PDF anexado',
      };
    default:
      return { payload, classification: 'aprovado', score: '' };
  }
}

export function resolvePhysioClearanceOperationalStatus(
  latest: { outcome: string } | null | undefined,
): 'pendente' | 'aprovado' | 'reprovado' {
  if (!latest) return 'pendente';
  if (latest.outcome === 'aprovado') return 'aprovado';
  if (latest.outcome === 'reprovado') return 'reprovado';
  return 'pendente';
}

export function canStartCtFieldEvaluation(
  status: 'pendente' | 'aprovado' | 'reprovado',
): boolean {
  return status === 'aprovado';
}
