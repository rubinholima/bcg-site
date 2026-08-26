import {
  CAPTACAO_SCHEDULER_PHONE,
  type ScoutingEvaluationOutcome,
} from './captacao.constants';

type DimensionJson = Record<string, { rating?: number; notes?: string }> | null | undefined;

export function averageDimensionRating(dim: DimensionJson): number | null {
  if (!dim || typeof dim !== 'object') return null;
  const ratings = Object.values(dim)
    .map((v) => v?.rating)
    .filter((r): r is number => r != null && Number.isFinite(r));
  if (ratings.length === 0) return null;
  return Math.round((ratings.reduce((s, n) => s + n, 0) / ratings.length) * 10) / 10;
}

export function computeReportDimensionRatings(input: {
  technical?: DimensionJson;
  tactical?: DimensionJson;
  physical?: DimensionJson;
  mental?: DimensionJson;
  cognitive?: DimensionJson;
}) {
  const cognitiveSource = input.cognitive ?? input.mental;
  return {
    technicalRating: averageDimensionRating(input.technical),
    tacticalRating: averageDimensionRating(input.tactical),
    physicalRating: averageDimensionRating(input.physical),
    cognitiveRating: averageDimensionRating(cognitiveSource),
  };
}

export function buildSchedulerNotificationMessage(input: {
  prospectName: string;
  position?: string | null;
  currentClub?: string | null;
  targetCategory?: string | null;
  priority?: string | null;
  evaluationOutcome?: string | null;
  scoutName?: string | null;
  overallRating?: number | null;
  technicalRating?: number | null;
  tacticalRating?: number | null;
  physicalRating?: number | null;
  cognitiveRating?: number | null;
  matchName?: string | null;
  recommendation?: string | null;
  dashboardUrl?: string;
}): string {
  const lines = [
    'BCG Captação — novo atleta para observação/avaliação',
    '',
    `Atleta: ${input.prospectName}`,
    input.position ? `Posição: ${input.position}` : null,
    input.currentClub ? `Clube: ${input.currentClub}` : null,
    input.targetCategory ? `Categoria alvo: ${input.targetCategory}` : null,
    input.priority ? `Prioridade: ${input.priority}` : null,
    input.evaluationOutcome && input.evaluationOutcome !== 'pendente'
      ? `Encaminhamento: ${input.evaluationOutcome === 'aprovado' ? 'Aprovado' : 'Para teste'}`
      : null,
    input.scoutName ? `Captador: ${input.scoutName}` : null,
    input.matchName ? `Jogo: ${input.matchName}` : null,
    input.overallRating != null ? `Nota geral: ${input.overallRating}/10` : null,
    input.technicalRating != null ? `Técnico: ${input.technicalRating}/10` : null,
    input.tacticalRating != null ? `Tático: ${input.tacticalRating}/10` : null,
    input.physicalRating != null ? `Físico: ${input.physicalRating}/10` : null,
    input.cognitiveRating != null ? `Cognitivo: ${input.cognitiveRating}/10` : null,
    input.recommendation ? `Recomendação: ${input.recommendation}` : null,
    input.dashboardUrl ? `Abrir: ${input.dashboardUrl}` : null,
    '',
    'Agendar avaliação no dashboard de captação.',
  ].filter(Boolean);

  return lines.join('\n');
}

export function buildWhatsAppNotifyUrl(message: string, phone = CAPTACAO_SCHEDULER_PHONE): string {
  let normalized = phone.replace(/\D/g, '');
  if (normalized.length <= 11 && !normalized.startsWith('55')) {
    normalized = `55${normalized}`;
  }
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function resolveStageFromOutcome(
  outcome: ScoutingEvaluationOutcome | null | undefined,
  currentStage: string,
): string {
  if (outcome === 'aprovado' && ['identificado', 'em_observacao', 'prioridade'].includes(currentStage)) {
    return 'prioridade';
  }
  if (outcome === 'para_teste' && ['identificado', 'em_observacao', 'prioridade'].includes(currentStage)) {
    return 'tryout';
  }
  return currentStage;
}

export function mergeDescriptiveObservation(input: {
  scoutNotes?: string | null;
  strengths?: string | null;
  weaknesses?: string | null;
  risks?: string | null;
}): string | null {
  const parts = [
    input.scoutNotes?.trim(),
    input.strengths?.trim() ? `Pontos fortes: ${input.strengths.trim()}` : null,
    input.weaknesses?.trim() ? `Pontos a melhorar: ${input.weaknesses.trim()}` : null,
    input.risks?.trim() ? `Riscos: ${input.risks.trim()}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join('\n\n') : null;
}
