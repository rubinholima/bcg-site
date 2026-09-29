export const TRYOUT_REFERRAL_SOURCES = [
  { value: 'agente', label: 'Agente / representante' },
  { value: 'clube_parceiro', label: 'Clube parceiro' },
  { value: 'escola_parceira', label: 'Escola de futebol parceira' },
  { value: 'boston_academy', label: 'Boston Academy' },
  { value: 'captacao', label: 'Captação / scouting' },
  { value: 'indicacao_parceira', label: 'Indicação parceira' },
  { value: 'outro', label: 'Outro' },
] as const;

export const TRYOUT_WORKFLOW_STAGES = [
  { value: 'aguardando_supervisao', label: 'Aguardando supervisão' },
  { value: 'aguardando_fisio', label: 'Aguardando fisioterapia' },
  { value: 'liberado_campo', label: 'Liberado para campo' },
  { value: 'em_avaliacao_campo', label: 'Em avaliação de campo' },
  { value: 'aguardando_treinador', label: 'Aguardando treinador' },
  { value: 'aguardando_gerencia', label: 'Aguardando gerência' },
  { value: 'aprovado_documentacao', label: 'Aprovado — documentação' },
  { value: 'reprovado', label: 'Reprovado' },
  { value: 'concluido', label: 'Concluído (elenco)' },
] as const;

export const TRYOUT_REG_STATUSES = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'concluido', label: 'Concluído' },
] as const;

export const TRYOUT_FEDERATION_STATUSES = [
  { value: 'na', label: 'N/A' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'concluido', label: 'Concluído' },
] as const;

export type TryoutHubItem = {
  id: string;
  name: string;
  targetCategory?: string | null;
  arrivalReferralSource?: string | null;
  tryoutEffectiveStage?: string | null;
  tryoutBlockReason?: string | null;
  tryoutPeriodStartedAt?: string | null;
  tryoutPeriodEndsAt?: string | null;
  tryoutRenewalCount?: number;
  physioClearanceStatus?: string;
  canStartCtFieldEvaluation?: boolean;
  ctScheduleStatus?: string | null;
  managerDecision?: string | null;
  scout?: { id: string; name: string } | null;
};

export type TryoutHubResponse = {
  items: TryoutHubItem[];
  byStage: Record<string, number>;
  total: number;
};

export type TryoutReporting = {
  total: number;
  approved: number;
  rejected: number;
  underEvaluation: number;
  averageEvaluationDurationDays: number | null;
  totalWeeklyRenewals: number;
  byReferralSource: Record<string, number>;
  byWorkflowStage: Record<string, number>;
};

export function labelTryoutStage(stage?: string | null): string {
  const hit = TRYOUT_WORKFLOW_STAGES.find((s) => s.value === stage);
  return hit?.label ?? stage ?? '—';
}

export function labelTryoutSource(source?: string | null): string {
  const hit = TRYOUT_REFERRAL_SOURCES.find((s) => s.value === source);
  return hit?.label ?? source ?? '—';
}

export function tryoutStageBadgeClass(stage?: string | null): string {
  switch (stage) {
    case 'reprovado':
      return 'bg-red-500/20 text-red-300 border-red-500/40';
    case 'concluido':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    case 'aguardando_gerencia':
    case 'aprovado_documentacao':
      return 'bg-violet-500/20 text-violet-300 border-violet-500/40';
    case 'aguardando_fisio':
      return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
    case 'em_avaliacao_campo':
      return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    default:
      return 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30';
  }
}
