export const ASSESSMENT_TYPES = [
  { value: 'entrada', label: 'Avaliação de entrada' },
  { value: 'rotina', label: 'Avaliação de rotina' },
] as const;

export const EVALUATOR_ROLES = [
  { value: 'fisiologista', label: 'Fisiologista' },
  { value: 'nutricionista', label: 'Nutricionista' },
  { value: 'preparador_fisico', label: 'Preparador físico' },
] as const;

export const PHYSIOLOGY_PROTOCOLS = [
  { value: 'jackson_pollock_7', label: 'Jackson & Pollock — 7 dobras' },
  { value: 'sloan_weir', label: 'Sloan & Weir — 3 dobras (TR+SI+AB)' },
  { value: 'glick_kelly', label: 'Glick & Kelly — 3 dobras (TR+SI+CX)' },
  { value: 'manual', label: 'Manual (% informado)' },
] as const;

export const COMPOSITION_STATUS_OPTIONS = [
  { value: 'ideal', label: 'Ideal' },
  { value: 'acima', label: 'Acima do ideal' },
  { value: 'abaixo', label: 'Abaixo do ideal' },
] as const;

export const HYDRATION_CONTEXTS = [
  { value: 'treino', label: 'Treino' },
  { value: 'jogo', label: 'Jogo' },
] as const;

export const FISIOLOGIA_REPORT_KINDS = [
  { value: 'geral', label: 'Geral' },
  { value: 'avaliacoes', label: 'Avaliações físicas' },
  { value: 'hidratacao', label: 'Hidratação' },
  { value: 'carga_treino', label: 'Carga — treinos' },
  { value: 'carga_jogo', label: 'Carga — jogos' },
] as const;

export type SkinfoldSites = {
  se?: number | null;
  tr?: number | null;
  pe?: number | null;
  ax?: number | null;
  si?: number | null;
  ab?: number | null;
  cx?: number | null;
};

export type PhysiologyAssessmentRow = {
  id: string;
  tenantId: string;
  playerId: string;
  category: string | null;
  assessmentType: string;
  assessedAt: string;
  evaluatorRole: string | null;
  evaluatorName: string | null;
  ageYears: number | null;
  ageMonths: number | null;
  weight: number | null;
  height: number | null;
  bmi: number | null;
  skinfolds: SkinfoldSites | null;
  protocol: string | null;
  bodyFatPercent: number | null;
  leanMassKg: number | null;
  bodyMassKg: number | null;
  compositionStatus: string | null;
  vo2max: number | null;
  cmjCm: number | null;
  illinoisSec: number | null;
  tTestSec: number | null;
  sprint10m: number | null;
  sprint20m: number | null;
  yoyoDistance: number | null;
  rastPower: number | null;
  mobilityNotes: string | null;
  notes: string | null;
  player?: {
    id: string;
    name: string;
    jerseyNumber: number | null;
    category: string | null;
  };
};

export type PhysiologyHydrationRow = {
  id: string;
  playerId: string;
  recordedAt: string;
  contextType: string;
  weightBefore: number | null;
  weightAfter: number | null;
  status: string | null;
  notes: string | null;
  player?: { id: string; name: string; category: string | null };
};

export type PhysiologyLoadEntryRow = {
  id?: string;
  playerId: string;
  present: boolean;
  rpe?: number | null;
  actualLoad?: number | null;
  trainingMinutes?: number | null;
  gameMinutes?: number | null;
  maxDistanceM?: number | null;
  maxSpeedKmh?: number | null;
  sprintCount?: number | null;
  highIntensityDistanceM?: number | null;
  lowIntensityDistanceM?: number | null;
  sprintDistanceM?: number | null;
  gpsImportLabel?: string | null;
  notes?: string | null;
  player?: { id: string; name: string; jerseyNumber: number | null };
};

export type PhysiologyLoadSessionRow = {
  id: string;
  tenantId: string;
  category: string;
  sessionDate: string;
  sessionType: string;
  period: string | null;
  trainingType: string | null;
  staffName: string | null;
  notes: string | null;
  entries: PhysiologyLoadEntryRow[];
};

export function ageLabel(years: number | null | undefined, months: number | null | undefined): string {
  if (years == null) return '—';
  if (months != null && months > 0) return `${years} anos e ${months} meses`;
  return `${years} anos`;
}

export function defaultReportPeriod(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 90);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(to) };
}

/** @deprecated JSON legado — novos registros usam API /fisiologia/assessments */
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
  if (Array.isArray(phys)) return { profile: {}, records: phys as PhysiologyEntry[] };
  if (phys && typeof phys === 'object' && 'records' in phys) {
    const obj = phys as { profile?: Record<string, unknown>; records?: PhysiologyEntry[] };
    return { profile: obj.profile ?? {}, records: Array.isArray(obj.records) ? obj.records : [] };
  }
  return { profile: {}, records: [] };
}

export type FisiologiaReportKind = (typeof FISIOLOGIA_REPORT_KINDS)[number]['value'];

export type FisiologiaReport = {
  tenant: { id: string; name: string; slug: string };
  kind: FisiologiaReportKind;
  filters: {
    category: string | null;
    playerId: string | null;
    from: string | null;
    to: string | null;
  };
  summary: {
    assessmentCount: number;
    hydrationCount: number;
    loadSessionCount: number;
    loadEntryCount: number;
  };
  assessments: Array<{
    id: string;
    date: string;
    playerName: string;
    jerseyNumber: number | null;
    category: string | null;
    assessmentType: string;
    evaluatorRole: string | null;
    evaluatorName: string | null;
    ageLabel: string | null;
    weight: number | null;
    height: number | null;
    bmi: number | null;
    protocol: string | null;
    bodyFatPercent: number | null;
    leanMassKg: number | null;
    compositionStatus: string | null;
    vo2max: number | null;
    cmjCm: number | null;
    illinoisSec: number | null;
    tTestSec: number | null;
  }>;
  hydrations: Array<{
    id: string;
    date: string;
    playerName: string;
    category: string | null;
    contextType: string;
    weightBefore: number | null;
    weightAfter: number | null;
    status: string | null;
  }>;
  loadSessions: Array<{
    id: string;
    sessionDate: string;
    category: string;
    sessionType: string;
    period: string | null;
    trainingType: string | null;
    staffName: string | null;
    entries: Array<{
      playerName: string;
      present: boolean;
      rpe: number | null;
      trainingMinutes: number | null;
      gameMinutes: number | null;
      maxDistanceM: number | null;
      maxSpeedKmh: number | null;
      sprintCount: number | null;
      highIntensityDistanceM: number | null;
      lowIntensityDistanceM: number | null;
      sprintDistanceM: number | null;
    }>;
  }>;
};

export type PlayerPhysiologyLoadEntry = PhysiologyLoadEntryRow & {
  session: Pick<
    PhysiologyLoadSessionRow,
    'id' | 'sessionDate' | 'sessionType' | 'category' | 'period' | 'trainingType'
  >;
};

export type PlayerPhysiologyContext = {
  id: string;
  name: string;
  jerseyNumber: number | null;
  category: string | null;
  tenantId: string;
  birthDate: string | null;
  physiologyAssessments: PhysiologyAssessmentRow[];
  physiologyHydrations: PhysiologyHydrationRow[];
  physiologyLoadEntries: PlayerPhysiologyLoadEntry[];
  physioSessions?: Array<{
    id: string;
    regionId: string | null;
    disposition: string | null;
    startedAt: string;
  }>;
};

export function assessmentTypeLabel(value: string | null | undefined): string {
  return ASSESSMENT_TYPES.find((t) => t.value === value)?.label ?? value ?? '—';
}

export function evaluatorRoleLabel(value: string | null | undefined): string {
  return EVALUATOR_ROLES.find((r) => r.value === value)?.label ?? value ?? '—';
}

export function reportKindLabel(kind: string): string {
  return FISIOLOGIA_REPORT_KINDS.find((k) => k.value === kind)?.label ?? kind;
}
