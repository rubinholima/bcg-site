/**
 * Peso, altura, IMC, % gordura, massa magna: cadastro (Player) + physiology.records + NutritionAssessment.
 * Medições datadas mais recentes por métrica; cadastro manual respeitado até haver medição mais nova.
 */

export interface PhysiologyEntry {
  date?: string;
  evaluator?: string;
  weight?: number;
  height?: number;
  bmi?: number;
  fatPercent?: number;
  leanMass?: number;
  vo2max?: number;
  hrRest?: number;
  hrMax?: number;
  yoyoDistance?: number;
  sprint10m?: number;
  sprint20m?: number;
  rastPower?: number;
  cmjCm?: number;
  illinoisSec?: number;
  tTestSec?: number;
  notes?: string;
}

export interface PhysiologyData {
  profile?: Record<string, unknown>;
  records: PhysiologyEntry[];
}

export function normalizePhysiology(phys: unknown): PhysiologyData {
  if (Array.isArray(phys)) {
    return { profile: {}, records: phys as PhysiologyEntry[] };
  }
  if (phys && typeof phys === 'object' && 'records' in phys) {
    const obj = phys as { profile?: Record<string, unknown>; records?: PhysiologyEntry[] };
    return {
      profile: obj.profile ?? {},
      records: Array.isArray(obj.records) ? obj.records : [],
    };
  }
  return { profile: {}, records: [] };
}

function recordDateMs(dateStr: string | undefined): number | null {
  if (!dateStr?.trim()) return null;
  const ms = Date.parse(`${dateStr.trim()}T12:00:00.000Z`);
  return Number.isNaN(ms) ? null : ms;
}

export interface CadastroMetricsPatch {
  weight?: number | null;
  height?: number | null;
  bmi?: number | null;
  bodyFatPercent?: number | null;
  leanMassKg?: number | null;
}

/** Propaga métricas do cadastro para o registro de fisiologia mais recente (ou cria um registro inicial). */
export function applyCadastroMetricsToLatestPhysiology(
  physiology: unknown,
  patch: CadastroMetricsPatch,
): PhysiologyData {
  const hasW = patch.weight !== undefined && patch.weight !== null;
  const hasH = patch.height !== undefined && patch.height !== null;
  const hasBmi = patch.bmi !== undefined && patch.bmi !== null;
  const hasBf = patch.bodyFatPercent !== undefined && patch.bodyFatPercent !== null;
  const hasLean = patch.leanMassKg !== undefined && patch.leanMassKg !== null;
  if (!hasW && !hasH && !hasBmi && !hasBf && !hasLean) {
    return normalizePhysiology(physiology);
  }

  const { profile, records } = normalizePhysiology(physiology);

  const applyToEntry = (r: PhysiologyEntry): PhysiologyEntry => ({
    ...r,
    ...(hasW && { weight: patch.weight as number }),
    ...(hasH && { height: patch.height as number }),
    ...(hasBmi && { bmi: patch.bmi as number }),
    ...(hasBf && { fatPercent: patch.bodyFatPercent as number }),
    ...(hasLean && { leanMass: patch.leanMassKg as number }),
  });

  if (records.length === 0) {
    const today = new Date().toISOString().slice(0, 10);
    return {
      profile,
      records: [
        applyToEntry({
          date: today,
        }),
      ],
    };
  }

  const dated = records.filter((r) => r.date?.trim());
  let maxDate: string | null = null;
  if (dated.length) {
    maxDate = dated.map((r) => r.date!).reduce((a, b) => (a >= b ? a : b));
  }

  const next = records.map((r, i) => {
    const isTarget = maxDate ? r.date === maxDate : i === records.length - 1;
    if (!isTarget) return r;
    return applyToEntry(r);
  });

  return { profile, records: next };
}

export interface NutritionRow {
  assessedAt: Date;
  weightKg: number;
  heightCm: number | null;
  bmi: number | null;
  bodyFatPercent: number | null;
}

export interface BestMetricInt {
  t: number;
  v: number;
}

export interface BestMetricFloat {
  t: number;
  v: number;
}

function isPositiveFloat(n: number | null | undefined): n is number {
  return n != null && typeof n === 'number' && !Number.isNaN(n) && n > 0;
}

/** Medições mais recentes por métrica (fisiologia com data + nutrição; massa magra só fisiologia). */
export function computeBestSharedMetricsFromSources(
  physiology: unknown,
  nutritionAssessments: NutritionRow[],
): {
  bestWeight: BestMetricInt | null;
  bestHeight: BestMetricInt | null;
  bestBmi: BestMetricFloat | null;
  bestBodyFat: BestMetricFloat | null;
  bestLeanMass: BestMetricFloat | null;
} {
  const { records } = normalizePhysiology(physiology);

  let bestWeight: BestMetricInt | null = null;
  let bestHeight: BestMetricInt | null = null;
  let bestBmi: BestMetricFloat | null = null;
  let bestBodyFat: BestMetricFloat | null = null;
  let bestLeanMass: BestMetricFloat | null = null;

  for (const r of records) {
    const t = recordDateMs(r.date);
    if (t == null) continue;
    if (r.weight != null && r.weight > 0) {
      const v = Math.round(r.weight);
      if (!bestWeight || t > bestWeight.t) bestWeight = { t, v };
    }
    if (r.height != null && r.height > 0) {
      const v = Math.round(r.height);
      if (!bestHeight || t > bestHeight.t) bestHeight = { t, v };
    }
    if (isPositiveFloat(r.bmi)) {
      const v = r.bmi;
      if (!bestBmi || t > bestBmi.t) bestBmi = { t, v };
    }
    if (isPositiveFloat(r.fatPercent)) {
      const v = r.fatPercent;
      if (!bestBodyFat || t > bestBodyFat.t) bestBodyFat = { t, v };
    }
    if (isPositiveFloat(r.leanMass)) {
      const v = r.leanMass;
      if (!bestLeanMass || t > bestLeanMass.t) bestLeanMass = { t, v };
    }
  }

  for (const n of nutritionAssessments) {
    const t = n.assessedAt.getTime();
    if (n.weightKg > 0) {
      const v = Math.round(n.weightKg);
      if (!bestWeight || t > bestWeight.t) bestWeight = { t, v };
    }
    if (n.heightCm != null && n.heightCm > 0) {
      const v = Math.round(n.heightCm);
      if (!bestHeight || t > bestHeight.t) bestHeight = { t, v };
    }
    if (isPositiveFloat(n.bmi)) {
      const v = n.bmi;
      if (!bestBmi || t > bestBmi.t) bestBmi = { t, v };
    }
    if (isPositiveFloat(n.bodyFatPercent)) {
      const v = n.bodyFatPercent;
      if (!bestBodyFat || t > bestBodyFat.t) bestBodyFat = { t, v };
    }
  }

  return { bestWeight, bestHeight, bestBmi, bestBodyFat, bestLeanMass };
}
