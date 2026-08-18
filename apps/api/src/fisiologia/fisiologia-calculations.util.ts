/** Cálculos de fisiologia — alinhados à planilha operacional do clube. */

export type SkinfoldSites = {
  se?: number | null;
  tr?: number | null;
  pe?: number | null;
  ax?: number | null;
  si?: number | null;
  ab?: number | null;
  cx?: number | null;
};

export const PHYSIOLOGY_PROTOCOLS = [
  { value: 'jackson_pollock_7', label: 'Jackson & Pollock — 7 dobras' },
  { value: 'sloan_weir', label: 'Sloan & Weir — 3 dobras (TR+SI+AB)' },
  { value: 'glick_kelly', label: 'Glick & Kelly — 3 dobras (TR+SI+CX)' },
  { value: 'manual', label: 'Manual (% informado)' },
] as const;

export const COMPOSITION_STATUS_LABELS: Record<string, string> = {
  acima: 'Acima do ideal',
  abaixo: 'Abaixo do ideal',
  ideal: 'Ideal',
};

export const HYDRATION_STATUS_LABELS: Record<string, string> = {
  hidratado: 'Hidratado',
  desidratado: 'Desidratado',
  severo: 'Severamente desidratado',
};

export function computeBmi(weightKg: number | null | undefined, heightCm: number | null | undefined): number | null {
  if (weightKg == null || heightCm == null || weightKg <= 0 || heightCm <= 0) return null;
  const h = heightCm / 100;
  return Math.round((weightKg / (h * h)) * 10) / 10;
}

export function computeAgeAtDate(
  birthDate: string | null | undefined,
  at: Date,
): { ageYears: number | null; ageMonths: number | null; ageLabel: string | null } {
  if (!birthDate?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate.trim())) {
    return { ageYears: null, ageMonths: null, ageLabel: null };
  }
  const [y, m, d] = birthDate.trim().split('-').map(Number);
  const birth = new Date(y, m - 1, d);
  if (Number.isNaN(birth.getTime())) return { ageYears: null, ageMonths: null, ageLabel: null };

  let years = at.getFullYear() - birth.getFullYear();
  let months = at.getMonth() - birth.getMonth();
  if (at.getDate() < birth.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) return { ageYears: null, ageMonths: null, ageLabel: null };
  return {
    ageYears: years,
    ageMonths: months,
    ageLabel: months > 0 ? `${years} anos e ${months} meses` : `${years} anos`,
  };
}

function sumSkinfolds(s: SkinfoldSites, keys: Array<keyof SkinfoldSites>): number | null {
  let sum = 0;
  let count = 0;
  for (const k of keys) {
    const v = s[k];
    if (v != null && Number.isFinite(v) && v > 0) {
      sum += v;
      count += 1;
    }
  }
  if (count !== keys.length) return null;
  return sum;
}

/** Densidade corporal → % gordura (Siri). */
function bodyFatFromDensity(density: number): number {
  return Math.round((((4.95 / density) - 4.5) * 100) * 10) / 10;
}

export function computeBodyFatPercent(input: {
  protocol?: string | null;
  skinfolds?: SkinfoldSites | null;
  ageYears?: number | null;
  manualPercent?: number | null;
}): number | null {
  if (input.protocol === 'manual' && input.manualPercent != null && input.manualPercent >= 0) {
    return Math.round(input.manualPercent * 10) / 10;
  }
  const s = input.skinfolds ?? {};
  const age = input.ageYears ?? 18;

  if (input.protocol === 'sloan_weir') {
    const sum3 = sumSkinfolds(s, ['tr', 'si', 'ab']);
    if (sum3 == null) return null;
    const density = 1.10938 - 0.0008267 * sum3 + 0.0000016 * sum3 * sum3 - 0.0002574 * age;
    return bodyFatFromDensity(density);
  }

  if (input.protocol === 'glick_kelly') {
    const sum3 = sumSkinfolds(s, ['tr', 'si', 'cx']);
    if (sum3 == null) return null;
    const density = 1.093 - 0.0008267 * sum3 + 0.0000016 * sum3 * sum3 - 0.0002574 * age;
    return bodyFatFromDensity(density);
  }

  // Jackson & Pollock 7 (SE, TR, PE, AX, SI, AB, CX)
  const sum7 = sumSkinfolds(s, ['se', 'tr', 'pe', 'ax', 'si', 'ab', 'cx']);
  if (sum7 == null) return null;
  const density = 1.112 - 0.00043499 * sum7 + 0.00000055 * sum7 * sum7 - 0.00028826 * age;
  return bodyFatFromDensity(density);
}

export function computeLeanMassKg(
  weightKg: number | null | undefined,
  bodyFatPercent: number | null | undefined,
): number | null {
  if (weightKg == null || bodyFatPercent == null || weightKg <= 0) return null;
  const fatKg = (weightKg * bodyFatPercent) / 100;
  return Math.round((weightKg - fatKg) * 10) / 10;
}

/** Faixas simplificadas por faixa etária (ajustável na planilha). */
export function computeCompositionStatus(
  bodyFatPercent: number | null | undefined,
  ageYears: number | null | undefined,
): 'acima' | 'abaixo' | 'ideal' | null {
  if (bodyFatPercent == null) return null;
  const age = ageYears ?? 18;
  let idealMin = 8;
  let idealMax = 14;
  if (age >= 18) {
    idealMin = 8;
    idealMax = 12;
  } else if (age >= 15) {
    idealMin = 9;
    idealMax = 14;
  } else if (age >= 12) {
    idealMin = 10;
    idealMax = 16;
  }
  if (bodyFatPercent < idealMin) return 'abaixo';
  if (bodyFatPercent > idealMax) return 'acima';
  return 'ideal';
}

export function computeHydrationStatus(
  weightBefore: number | null | undefined,
  weightAfter: number | null | undefined,
): 'hidratado' | 'desidratado' | 'severo' | null {
  if (weightBefore == null || weightAfter == null || weightBefore <= 0) return null;
  const lossPct = ((weightBefore - weightAfter) / weightBefore) * 100;
  if (lossPct < 1) return 'hidratado';
  if (lossPct < 2) return 'desidratado';
  return 'severo';
}

export function protocolLabel(protocol: string | null | undefined): string {
  return PHYSIOLOGY_PROTOCOLS.find((p) => p.value === protocol)?.label ?? protocol ?? '—';
}
