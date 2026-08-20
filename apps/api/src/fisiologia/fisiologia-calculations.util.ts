/** Cálculos de fisiologia — alinhados às planilhas operacionais do clube. */

export type SkinfoldSites = {
  se?: number | null;
  tr?: number | null;
  pe?: number | null;
  ax?: number | null;
  si?: number | null;
  ab?: number | null;
  cx?: number | null;
};

export type PhysiologyProtocolValue =
  | 'jackson_pollock_7'
  | 'jackson_pollock_3'
  | 'faulkner_4'
  | 'guedes_3'
  | 'sloan_weir'
  | 'glick_kelly'
  | 'manual';

export const PHYSIOLOGY_PROTOCOLS: Array<{
  value: PhysiologyProtocolValue;
  label: string;
}> = [
  { value: 'jackson_pollock_7', label: 'Jackson & Pollock — 7 dobras' },
  { value: 'jackson_pollock_3', label: 'Jackson & Pollock — 3 dobras (PE+AB+CX)' },
  { value: 'faulkner_4', label: 'Faulkner — 4 dobras (TR+SE+SI+AB)' },
  { value: 'guedes_3', label: 'Guedes — 3 dobras masculino (TR+SI+AB)' },
  { value: 'sloan_weir', label: 'Sloan & Weir — 3 dobras (TR+SI+AB)' },
  { value: 'glick_kelly', label: 'Glick & Kelly — 3 dobras (TR+SI+CX)' },
  { value: 'manual', label: 'Manual (% informado)' },
];

/** Sites exigidos por protocolo (SE = subescapular = SB nas planilhas Faulkner). */
export const PROTOCOL_SKINFOLD_KEYS: Record<
  Exclude<PhysiologyProtocolValue, 'manual'>,
  Array<keyof SkinfoldSites>
> = {
  jackson_pollock_7: ['se', 'tr', 'pe', 'ax', 'si', 'ab', 'cx'],
  jackson_pollock_3: ['pe', 'ab', 'cx'],
  faulkner_4: ['tr', 'se', 'si', 'ab'],
  guedes_3: ['tr', 'si', 'ab'],
  sloan_weir: ['tr', 'si', 'ab'],
  glick_kelly: ['tr', 'si', 'cx'],
};

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

export function skinfoldKeysForProtocol(protocol?: string | null): Array<keyof SkinfoldSites> {
  if (!protocol || protocol === 'manual') return [];
  return PROTOCOL_SKINFOLD_KEYS[protocol as Exclude<PhysiologyProtocolValue, 'manual'>] ?? [
    'se',
    'tr',
    'pe',
    'ax',
    'si',
    'ab',
    'cx',
  ];
}

/** Densidade corporal → % gordura (Siri). */
function bodyFatFromDensity(density: number): number {
  if (!Number.isFinite(density) || density <= 0) return NaN;
  return Math.round((((4.95 / density) - 4.5) * 100) * 10) / 10;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function computeBodyFatPercent(input: {
  protocol?: string | null;
  skinfolds?: SkinfoldSites | null;
  ageYears?: number | null;
  manualPercent?: number | null;
}): number | null {
  if (input.protocol === 'manual' && input.manualPercent != null && input.manualPercent >= 0) {
    return round1(input.manualPercent);
  }
  const s = input.skinfolds ?? {};
  const age = input.ageYears ?? 18;
  const protocol = input.protocol ?? 'jackson_pollock_7';

  // Faulkner 1968 — 4 dobras (TR + SB/SE + SI + AB). %G direto (sem densidade).
  if (protocol === 'faulkner_4') {
    const sum4 = sumSkinfolds(s, PROTOCOL_SKINFOLD_KEYS.faulkner_4);
    if (sum4 == null) return null;
    return round1(sum4 * 0.153 + 5.783);
  }

  // Guedes 1985 — masculino 3 dobras (TR + SI + AB) + Siri.
  if (protocol === 'guedes_3') {
    const sum3 = sumSkinfolds(s, PROTOCOL_SKINFOLD_KEYS.guedes_3);
    if (sum3 == null || sum3 <= 0) return null;
    const density = 1.17136 - 0.06706 * Math.log10(sum3);
    const pct = bodyFatFromDensity(density);
    return Number.isFinite(pct) ? pct : null;
  }

  // Jackson & Pollock 3 — masculino (PE/PT + AB + CX) + Siri.
  if (protocol === 'jackson_pollock_3') {
    const x1 = sumSkinfolds(s, PROTOCOL_SKINFOLD_KEYS.jackson_pollock_3);
    if (x1 == null) return null;
    const density = 1.10938 - 0.0008267 * x1 + 0.0000016 * x1 * x1 - 0.0002574 * age;
    const pct = bodyFatFromDensity(density);
    return Number.isFinite(pct) ? pct : null;
  }

  if (protocol === 'sloan_weir') {
    const sum3 = sumSkinfolds(s, PROTOCOL_SKINFOLD_KEYS.sloan_weir);
    if (sum3 == null) return null;
    const density = 1.10938 - 0.0008267 * sum3 + 0.0000016 * sum3 * sum3 - 0.0002574 * age;
    const pct = bodyFatFromDensity(density);
    return Number.isFinite(pct) ? pct : null;
  }

  if (protocol === 'glick_kelly') {
    const sum3 = sumSkinfolds(s, PROTOCOL_SKINFOLD_KEYS.glick_kelly);
    if (sum3 == null) return null;
    const density = 1.093 - 0.0008267 * sum3 + 0.0000016 * sum3 * sum3 - 0.0002574 * age;
    const pct = bodyFatFromDensity(density);
    return Number.isFinite(pct) ? pct : null;
  }

  // Jackson & Pollock 7 — masculino (SE, TR, PE, AX, SI, AB, CX) + Siri.
  const sum7 = sumSkinfolds(s, PROTOCOL_SKINFOLD_KEYS.jackson_pollock_7);
  if (sum7 == null) return null;
  const density = 1.112 - 0.00043499 * sum7 + 0.00000055 * sum7 * sum7 - 0.00028826 * age;
  const pct = bodyFatFromDensity(density);
  return Number.isFinite(pct) ? pct : null;
}

export function computeLeanMassKg(
  weightKg: number | null | undefined,
  bodyFatPercent: number | null | undefined,
): number | null {
  if (weightKg == null || bodyFatPercent == null || weightKg <= 0) return null;
  const fatKg = (weightKg * bodyFatPercent) / 100;
  return round1(weightKg - fatKg);
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
