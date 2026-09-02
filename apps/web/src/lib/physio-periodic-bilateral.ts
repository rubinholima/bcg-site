export type BilateralClassification = "aprovado" | "aceitavel" | "reprovado";

export type BilateralPairResult = {
  rightValue: number;
  leftValue: number;
  absDiff: number;
  pctDiff: number;
  pctDisplay: string;
  classification: BilateralClassification;
};

/** diff % = abs(right-left) / max(abs(right),abs(left)) * 100 */
export function pctDifference(a: number, b: number): number {
  const max = Math.max(Math.abs(a), Math.abs(b));
  if (max === 0) return 0;
  return (Math.abs(a - b) / max) * 100;
}

export function formatPctDisplay(pct: number): string {
  return pct.toFixed(1);
}

export function classifyYBalanceDirection(diffPct: number): BilateralClassification {
  if (diffPct <= 10) return "aprovado";
  if (diffPct <= 12) return "aceitavel";
  return "reprovado";
}

export function classifyHopTestDirection(diffPct: number): BilateralClassification {
  return classifyYBalanceDirection(diffPct);
}

export function classifyPerimetryDirection(diffPct: number): BilateralClassification {
  if (diffPct <= 10) return "aprovado";
  if (diffPct <= 15) return "aceitavel";
  return "reprovado";
}

export function buildBilateralPair(
  right: number,
  left: number,
  classify: (pct: number) => BilateralClassification,
): BilateralPairResult {
  const absDiff = Math.abs(right - left);
  const pctDiff = pctDifference(right, left);
  return {
    rightValue: Math.round(right * 10) / 10,
    leftValue: Math.round(left * 10) / 10,
    absDiff: Math.round(absDiff * 10) / 10,
    pctDiff,
    pctDisplay: formatPctDisplay(pctDiff),
    classification: classify(pctDiff),
  };
}

export function computeYBalanceBilateral(payload: Record<string, unknown>) {
  const right = payload.right as { frontal?: number; lateral?: number; cruzado?: number } | undefined;
  const left = payload.left as { frontal?: number; lateral?: number; cruzado?: number } | undefined;
  if (!right || !left) return null;

  const dirs = [
    { key: "frontal", label: "Frontal" },
    { key: "lateral", label: "Lateral" },
    { key: "cruzado", label: "Cruzado" },
  ] as const;

  const rows: { key: string; label: string; result: BilateralPairResult }[] = [];
  for (const dir of dirs) {
    const r = right[dir.key];
    const l = left[dir.key];
    if (r == null || l == null || !Number.isFinite(r) || !Number.isFinite(l)) continue;
    rows.push({
      key: dir.key,
      label: dir.label,
      result: buildBilateralPair(r, l, classifyYBalanceDirection),
    });
  }
  if (rows.length === 0) return null;
  return rows;
}

export function computeHopTestBilateral(payload: Record<string, unknown>) {
  const rightJumps = payload.rightJumps as number[] | undefined;
  const leftJumps = payload.leftJumps as number[] | undefined;
  if (!rightJumps?.length || !leftJumps?.length) return null;

  const rightBest = Math.max(...rightJumps.filter((n) => Number.isFinite(n)));
  const leftBest = Math.max(...leftJumps.filter((n) => Number.isFinite(n)));
  if (!Number.isFinite(rightBest) || !Number.isFinite(leftBest)) return null;

  const result = buildBilateralPair(rightBest, leftBest, classifyHopTestDirection);
  return { rightBest, leftBest, result };
}

export function computePerimetriaBilateral(payload: Record<string, unknown>) {
  const right = payload.right as { proximal?: number; medial?: number; distal?: number } | undefined;
  const left = payload.left as { proximal?: number; medial?: number; distal?: number } | undefined;
  if (!right || !left) return null;

  const pairs = [
    { key: "proximal", label: "Proximal" },
    { key: "medial", label: "Medial" },
    { key: "distal", label: "Distal" },
  ] as const;

  const rows: { key: string; label: string; result: BilateralPairResult }[] = [];
  for (const pair of pairs) {
    const r = right[pair.key];
    const l = left[pair.key];
    if (r == null || l == null || !Number.isFinite(r) || !Number.isFinite(l)) continue;
    rows.push({
      key: pair.key,
      label: pair.label,
      result: buildBilateralPair(r, l, classifyPerimetryDirection),
    });
  }

  const calfRight = payload.calfRight as number | undefined;
  const calfLeft = payload.calfLeft as number | undefined;
  if (
    calfRight != null &&
    calfLeft != null &&
    Number.isFinite(calfRight) &&
    Number.isFinite(calfLeft)
  ) {
    rows.push({
      key: "panturrilha",
      label: "Panturrilha",
      result: buildBilateralPair(calfRight, calfLeft, classifyPerimetryDirection),
    });
  }

  if (rows.length === 0) return null;
  return rows;
}
