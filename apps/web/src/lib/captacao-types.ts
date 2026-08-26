/** Estágios do pipeline de captação */
export const SCOUTING_STAGES = [
  { value: 'identificado', label: 'Identificado' },
  { value: 'em_observacao', label: 'Em observação' },
  { value: 'prioridade', label: 'Prioridade' },
  { value: 'tryout', label: 'Try-out' },
  { value: 'negociacao', label: 'Negociação' },
  { value: 'aprovado', label: 'Aprovado pelo supervisor' },
  { value: 'cadastrado', label: 'Atleta do clube (cadastro)' },
  { value: 'recusado', label: 'Recusado' },
  { value: 'arquivado', label: 'Arquivado' },
] as const;

export const SCOUTING_LEGAL_STATUS = [
  { value: 'pendente', label: 'Jurídico pendente' },
  { value: 'em_andamento', label: 'Contratos em andamento' },
  { value: 'concluido', label: 'Parte legal concluída' },
] as const;

/** Estágios em que o prospect ainda está só na captação (não virou atleta) */
export const CAPTACAO_ONLY_STAGES = [
  'identificado',
  'em_observacao',
  'prioridade',
  'tryout',
  'negociacao',
] as const;

export const SCOUTING_EVALUATION_OUTCOMES = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'para_teste', label: 'Para teste / try-out' },
] as const;

export type ScoutingEvaluationOutcome = (typeof SCOUTING_EVALUATION_OUTCOMES)[number]['value'];

export const SCOUTING_RATING_SCALE = { min: 0, max: 10, step: 0.5 } as const;

export const SCOUTING_PRIORITIES = [
  { value: 'alta', label: 'Alta' },
  { value: 'media', label: 'Média' },
  { value: 'baixa', label: 'Baixa' },
] as const;

export const SCOUTING_SOURCES = [
  { value: 'jogo', label: 'Jogo observado' },
  { value: 'indicacao', label: 'Indicação' },
  { value: 'video', label: 'Vídeo / plataforma' },
  { value: 'plataforma', label: 'Wyscout / Instat / Footlink' },
  { value: 'torneio', label: 'Torneio / peneira' },
  { value: 'rede', label: 'Rede / scouting digital' },
  { value: 'outro', label: 'Outro' },
] as const;

export const COMPETITION_LEVELS = [
  { value: 'profissional', label: 'Profissional' },
  { value: 'serie_a', label: 'Série A' },
  { value: 'serie_b', label: 'Série B' },
  { value: 'serie_c', label: 'Série C / D' },
  { value: 'estadual', label: 'Estadual' },
  { value: 'base', label: 'Base / categorias de formação' },
  { value: 'amador', label: 'Amador' },
  { value: 'internacional', label: 'Internacional' },
] as const;

export const CONTRACT_SITUATIONS = [
  { value: 'livre', label: 'Livre / sem clube' },
  { value: 'contrato', label: 'Sob contrato' },
  { value: 'emprestimo', label: 'Emprestado' },
  { value: 'fim_contrato', label: 'Fim de contrato próximo' },
  { value: 'desconhecido', label: 'Desconhecido' },
] as const;

export const RECOMMENDATIONS = [
  { value: 'contratar', label: 'Contratar / avançar' },
  { value: 'continuar', label: 'Continuar observando' },
  { value: 'descartar', label: 'Descartar' },
] as const;

export const OBSERVATION_TYPES = [
  { value: 'ao_vivo', label: 'Ao vivo' },
  { value: 'video', label: 'Vídeo' },
  { value: 'dados', label: 'Dados / estatísticas' },
] as const;

/** Dimensões do relatório (padrão scout profissional) */
export const REPORT_DIMENSIONS = {
  technical: {
    label: 'Técnica',
    areas: [
      { key: 'firstTouch', label: 'Primeiro toque / controle' },
      { key: 'passing', label: 'Passe curto/longo' },
      { key: 'dribbling', label: 'Drible / 1x1' },
      { key: 'shooting', label: 'Finalização' },
      { key: 'crossing', label: 'Cruzamento / bola parada' },
    ],
  },
  tactical: {
    label: 'Tática',
    areas: [
      { key: 'positioning', label: 'Posicionamento' },
      { key: 'decisions', label: 'Tomada de decisão' },
      { key: 'offBall', label: 'Movimentação sem bola' },
      { key: 'pressing', label: 'Pressão / trabalho defensivo' },
      { key: 'structure', label: 'Leitura de jogo' },
    ],
  },
  physical: {
    label: 'Física',
    areas: [
      { key: 'pace', label: 'Velocidade / explosão' },
      { key: 'strength', label: 'Força / duelos' },
      { key: 'agility', label: 'Agilidade / equilíbrio' },
      { key: 'stamina', label: 'Resistência / ritmo' },
    ],
  },
  mental: {
    label: 'Cognitivo',
    areas: [
      { key: 'concentration', label: 'Concentração / foco' },
      { key: 'competitiveness', label: 'Competitividade' },
      { key: 'confidence', label: 'Confiança / tomada de risco' },
      { key: 'coachability', label: 'Aprendizado / coachability' },
      { key: 'leadership', label: 'Leitura de jogo / comunicação' },
    ],
  },
} as const;

/** Alias UI — dimensão cognitiva mapeia para `mental` na API */
export const COGNITIVE_DIMENSION_KEY = 'mental';

export type ScoutingStage = (typeof SCOUTING_STAGES)[number]['value'];
export type ScoutingPriority = (typeof SCOUTING_PRIORITIES)[number]['value'];

export interface DimensionEval {
  rating?: number;
  notes?: string;
}

export interface Scout {
  id: string;
  tenantId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  regions?: string[] | null;
  categories?: string[] | null;
  specialties?: string[] | null;
  licenseInfo?: string | null;
  active: boolean;
  notes?: string | null;
  activeProspectsCount?: number;
  reportsCount?: number;
  lastLatitude?: number | null;
  lastLongitude?: number | null;
  lastLocationLabel?: string | null;
  lastLocationAt?: string | null;
  isTracking?: boolean;
  trackingStartedAt?: string | null;
  locationStatus?: ScoutLocationStatus;
  tenant?: { id: string; name: string; slug: string };
  technicalStaff?: { id: string; name: string; role: string } | null;
}

export type ScoutLocationStatus = 'live' | 'recent' | 'offline';

export interface ScoutMapMarker {
  id: string;
  name: string;
  tenantId: string;
  lastLatitude: number | null;
  lastLongitude: number | null;
  lastLocationLabel: string | null;
  lastLocationAt: string | null;
  isTracking: boolean;
  trackingStartedAt: string | null;
  activeProspectsCount: number;
  locationStatus: ScoutLocationStatus;
  regions?: string[] | null;
}

export interface ScoutTrailPoint {
  lat: number;
  lng: number;
  at: string;
  label?: string | null;
}

export interface CaptacaoMapData {
  scouts: ScoutMapMarker[];
  trails: Record<string, ScoutTrailPoint[]>;
  updatedAt: string;
}

export interface ScoutLocationPing {
  id: string;
  latitude: number;
  longitude: number;
  label?: string | null;
  source: string;
  accuracy?: number | null;
  createdAt: string;
}

export function labelForLocationStatus(status: ScoutLocationStatus): string {
  switch (status) {
    case 'live':
      return 'Ao vivo';
    case 'recent':
      return 'Recente';
    default:
      return 'Offline';
  }
}

export function locationStatusClass(status: ScoutLocationStatus): string {
  switch (status) {
    case 'live':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    case 'recent':
      return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
    default:
      return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
  }
}

export interface ScoutDetail extends Scout {
  prospects?: ScoutingProspect[];
  reports?: ScoutingReport[];
}

export interface ScoutingProspect {
  id: string;
  tenantId: string;
  name: string;
  stage: string;
  priority: string;
  position?: string | null;
  birthDate?: string | null;
  nationality?: string | null;
  currentClub?: string | null;
  competition?: string | null;
  competitionLevel?: string | null;
  contractSituation?: string | null;
  contractEndDate?: string | null;
  preferredFoot?: string | null;
  height?: number | null;
  weight?: number | null;
  agentName?: string | null;
  agentPhone?: string | null;
  agentEmail?: string | null;
  source?: string | null;
  sourceDetails?: string | null;
  targetCategory?: string | null;
  overallRating?: number | null;
  technicalRating?: number | null;
  tacticalRating?: number | null;
  physicalRating?: number | null;
  cognitiveRating?: number | null;
  evaluationOutcome?: ScoutingEvaluationOutcome | null;
  descriptiveObservation?: string | null;
  recommendation?: string | null;
  strengths?: string | null;
  weaknesses?: string | null;
  risks?: string | null;
  notes?: string | null;
  observationCount: number;
  lastObservedAt?: string | null;
  scoutId?: string | null;
  scout?: { id: string; name: string; phone?: string | null; email?: string | null } | null;
  playerId?: string | null;
  player?: { id: string; name: string; photoUrl?: string | null } | null;
  supervisorApprovedAt?: string | null;
  supervisorApprovedBy?: string | null;
  supervisorNotes?: string | null;
  legalStatus?: string | null;
  reports?: ScoutingReportDetail[];
  _count?: { reports: number };
}

export interface ScoutingReport {
  id: string;
  reportDate: string;
  recommendation: string;
  overallRating?: number | null;
  technicalRating?: number | null;
  tacticalRating?: number | null;
  physicalRating?: number | null;
  cognitiveRating?: number | null;
  evaluationOutcome?: ScoutingEvaluationOutcome | null;
  matchName?: string | null;
  matchDate?: string | null;
  competition?: string | null;
  minutesObserved?: number | null;
  positionPlayed?: string | null;
  observationType?: string | null;
  strengths?: string | null;
  weaknesses?: string | null;
  risks?: string | null;
  scoutNotes?: string | null;
  technical?: Record<string, DimensionEval> | null;
  tactical?: Record<string, DimensionEval> | null;
  physical?: Record<string, DimensionEval> | null;
  mental?: Record<string, DimensionEval> | null;
  prospect?: Partial<ScoutingProspect>;
  scout?: { id: string; name: string; phone?: string | null };
}

export type ScoutingReportDetail = ScoutingReport;

export interface SchedulerNotification {
  phone: string;
  message: string;
  whatsappUrl: string;
}

export function labelForEvaluationOutcome(value: string): string {
  return SCOUTING_EVALUATION_OUTCOMES.find((o) => o.value === value)?.label ?? value;
}

export function formatScoutingRating(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${value.toFixed(1)}/10`;
}

export interface CaptacaoStats {
  activeProspects: number;
  totalScouts: number;
  totalReports: number;
  byStage: Record<string, number>;
  byPriority: Record<string, number>;
}

export function labelForLegalStatus(value: string): string {
  return SCOUTING_LEGAL_STATUS.find((s) => s.value === value)?.label ?? value;
}

export function labelForStage(value: string): string {
  return SCOUTING_STAGES.find((s) => s.value === value)?.label ?? value;
}

export function labelForPriority(value: string): string {
  return SCOUTING_PRIORITIES.find((p) => p.value === value)?.label ?? value;
}

export function labelForRecommendation(value: string): string {
  return RECOMMENDATIONS.find((r) => r.value === value)?.label ?? value;
}

export function stageBadgeClass(stage: string): string {
  switch (stage) {
    case 'prioridade':
    case 'tryout':
      return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    case 'negociacao':
    case 'aprovado':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    case 'cadastrado':
      return 'bg-violet-500/20 text-violet-300 border-violet-500/30';
    case 'recusado':
    case 'arquivado':
      return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
    default:
      return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
  }
}

export function priorityBadgeClass(priority: string): string {
  if (priority === 'alta') return 'bg-red-500/20 text-red-300 border-red-500/30';
  if (priority === 'baixa') return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
  return 'bg-amber-500/15 text-amber-200 border-amber-500/25';
}

export type DimensionFormState = Record<
  string,
  Record<string, { rating: string; notes: string }>
>;

export function emptyDimensionEvals(): DimensionFormState {
  const result: DimensionFormState = {};
  for (const [dimKey, dim] of Object.entries(REPORT_DIMENSIONS)) {
    result[dimKey] = {};
    for (const area of dim.areas) {
      result[dimKey][area.key] = { rating: '', notes: '' };
    }
  }
  return result;
}

export function buildReportDimensions(evals: DimensionFormState): {
  technical?: Record<string, DimensionEval>;
  tactical?: Record<string, DimensionEval>;
  physical?: Record<string, DimensionEval>;
  mental?: Record<string, DimensionEval>;
} {
  const result: {
    technical?: Record<string, DimensionEval>;
    tactical?: Record<string, DimensionEval>;
    physical?: Record<string, DimensionEval>;
    mental?: Record<string, DimensionEval>;
  } = {};

  for (const dimKey of ['technical', 'tactical', 'physical', 'mental'] as const) {
    const areas = evals[dimKey];
    if (!areas) continue;
    const dimOut: Record<string, DimensionEval> = {};
    for (const [areaKey, val] of Object.entries(areas)) {
      if (val.rating || val.notes.trim()) {
        dimOut[areaKey] = {
          ...(val.rating ? { rating: Number(val.rating) } : {}),
          ...(val.notes.trim() ? { notes: val.notes.trim() } : {}),
        };
      }
    }
    if (Object.keys(dimOut).length) result[dimKey] = dimOut;
  }
  return result;
}
