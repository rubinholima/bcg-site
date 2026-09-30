import {
  TRYOUT_EVALUATION_DAYS_DEFAULT,
  TRYOUT_WORKFLOW_STAGES,
  type TryoutWorkflowStage,
  isProspectInTryoutWorkflow,
} from './tryout-workflow.constants';
import type { TryoutBilateralTests, TryoutClearanceTestKey } from '../fisioterapia/physio-tryout-clearance.constants';
import { TRYOUT_CLEARANCE_TESTS } from '../fisioterapia/physio-tryout-clearance.constants';

export type TryoutRenewalHistoryEntry = {
  periodStart: string;
  periodEnd: string;
  renewedAt?: string;
  renewedBy?: string;
  earlyApproval?: boolean;
  notes?: string;
};

export function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

export function defaultTryoutPeriodEnd(start: Date): Date {
  return addDays(start, TRYOUT_EVALUATION_DAYS_DEFAULT);
}

export function parseRenewalHistory(raw: unknown): TryoutRenewalHistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x) => x && typeof x === 'object') as TryoutRenewalHistoryEntry[];
}

export function validateTryoutBilateralTestsComplete(tests: unknown): string | null {
  if (!tests || typeof tests !== 'object') {
    return 'Preencha todos os testes bilaterais.';
  }
  const map = tests as TryoutBilateralTests;
  for (const key of TRYOUT_CLEARANCE_TESTS) {
    const side = map[key as TryoutClearanceTestKey];
    if (!side?.right?.outcome || !side?.left?.outcome) {
      return `Informe aprovação/reprovação (D e E) em: ${key}.`;
    }
    if (!side.right.response?.trim() || !side.left.response?.trim()) {
      return `Informe resposta/notas (D e E) em: ${key}.`;
    }
  }
  return null;
}

export function computeEvaluationDurationDays(
  startedAt?: Date | null,
  endedAt?: Date | null,
): number | null {
  if (!startedAt) return null;
  const end = endedAt ?? new Date();
  const ms = end.getTime() - startedAt.getTime();
  if (ms < 0) return 0;
  return Math.round(ms / 86400000);
}

export function resolveTryoutBlockReason(input: {
  prospect: {
    tryoutWorkflowStage?: string | null;
    supervisionDocsValidatedAt?: Date | null;
    tryoutPeriodEndsAt?: Date | null;
    ctScheduleStatus?: string | null;
  };
  physioStatus: 'pendente' | 'aprovado' | 'temporario_nao_liberado' | 'reprovado';
  coachOutcome?: string | null;
  managerDecision?: string | null;
}): string | null {
  const stage = input.prospect.tryoutWorkflowStage;
  if (stage === 'reprovado') return 'Try-out reprovado.';
  if (!input.prospect.supervisionDocsValidatedAt) {
    return 'Supervisão ainda não validou chegada/documentação.';
  }
  if (input.physioStatus === 'pendente') {
    return 'Aguardando liberação da fisioterapia.';
  }
  if (input.physioStatus === 'temporario_nao_liberado') {
    return 'Não liberado — aguardando reavaliação da fisioterapia.';
  }
  if (input.physioStatus === 'reprovado') {
    return 'Liberação fisioterapêutica reprovada.';
  }
  if (stage === 'aguardando_treinador') {
    return 'Aguardando avaliação do treinador.';
  }
  if (stage === 'aguardando_gerencia') {
    return 'Aguardando decisão da gerência de futebol.';
  }
  if (
    input.prospect.tryoutPeriodEndsAt &&
    new Date() > input.prospect.tryoutPeriodEndsAt &&
    stage !== 'aprovado_documentacao' &&
    stage !== 'concluido'
  ) {
    return 'Período de avaliação expirado — renove ou encerre.';
  }
  return null;
}

export function inferTryoutWorkflowStage(prospect: {
  tryoutWorkflowStage?: string | null;
  stage?: string;
  supervisionDocsValidatedAt?: Date | null;
  ctScheduleStatus?: string | null;
  tryoutCompletedAt?: Date | null;
  tryoutRejectedAt?: Date | null;
  managerDecision?: string | null;
  evaluationOutcome?: string | null;
  flowPath?: string | null;
}): TryoutWorkflowStage | null {
  if (prospect.tryoutWorkflowStage && TRYOUT_WORKFLOW_STAGES.includes(prospect.tryoutWorkflowStage as TryoutWorkflowStage)) {
    return prospect.tryoutWorkflowStage as TryoutWorkflowStage;
  }
  if (!isProspectInTryoutWorkflow(prospect)) return null;
  if (prospect.tryoutRejectedAt || prospect.stage === 'recusado') return 'reprovado';
  if (prospect.tryoutCompletedAt || prospect.stage === 'cadastrado') return 'concluido';
  if (prospect.managerDecision === 'aprovado') return 'aprovado_documentacao';
  if (prospect.managerDecision === 'reprovado') return 'reprovado';
  if (prospect.ctScheduleStatus === 'em_avaliacao') return 'em_avaliacao_campo';
  if (prospect.ctScheduleStatus === 'concluido') return 'aguardando_treinador';
  if (!prospect.supervisionDocsValidatedAt) return 'aguardando_supervisao';
  return 'aguardando_fisio';
}
