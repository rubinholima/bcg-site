import {
  CT_SCHEDULE_STATUSES,
  type CtScheduleStatus,
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

export function buildWhatsAppNotifyUrl(message: string, phone?: string | null): string | null {
  const raw = phone?.trim();
  if (!raw) return null;
  let normalized = raw.replace(/\D/g, '');
  if (!normalized) return null;
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

export function buildManagerApprovalEmailText(input: {
  prospectName: string;
  position?: string | null;
  currentClub?: string | null;
  targetCategory?: string | null;
  scoutName?: string | null;
  overallRating?: number | null;
  technicalRating?: number | null;
  tacticalRating?: number | null;
  physicalRating?: number | null;
  cognitiveRating?: number | null;
  needsLodging?: boolean | null;
  presentationDate?: string | null;
  profileUrl: string;
}): { subject: string; text: string } {
  const lodgingLine =
    input.needsLodging === true
      ? 'Precisa de alojamento: Sim'
      : input.needsLodging === false
        ? `Precisa de alojamento: Não${input.presentationDate ? ` · Apresentação: ${input.presentationDate.split('-').reverse().join('/')}` : ''}`
        : null;

  const text = [
    'Olá,',
    '',
    'Um atleta foi encaminhado como APROVADO na captação e aguarda sua confirmação no dashboard.',
    '',
    `Atleta: ${input.prospectName}`,
    input.position ? `Posição: ${input.position}` : null,
    input.currentClub ? `Clube atual: ${input.currentClub}` : null,
    input.targetCategory ? `Categoria alvo: ${input.targetCategory}` : null,
    input.scoutName ? `Captador: ${input.scoutName}` : null,
    input.overallRating != null ? `Nota geral: ${input.overallRating}/10` : null,
    input.technicalRating != null ? `Técnico: ${input.technicalRating}/10` : null,
    input.tacticalRating != null ? `Tático: ${input.tacticalRating}/10` : null,
    input.physicalRating != null ? `Físico: ${input.physicalRating}/10` : null,
    input.cognitiveRating != null ? `Cognitivo: ${input.cognitiveRating}/10` : null,
    lodgingLine,
    '',
    `Abrir ficha e aprovar ou recusar: ${input.profileUrl}`,
    '',
    'Boston City Group — Captação',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    subject: `Captação — aprovar atleta: ${input.prospectName}`,
    text,
  };
}

function publicAppOrigin(): string {
  return (
    process.env.PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    'https://www.bostoncitygroup.biz'
  ).replace(/\/$/, '');
}

export function captacaoProspectProfileUrl(prospectId: string, tenantId?: string): string {
  const qs = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
  return `${publicAppOrigin()}/dashboard/futebol/captacao/prospects/${prospectId}${qs}`;
}

type RatingSlice = {
  overallRating?: number | null;
  technicalRating?: number | null;
  tacticalRating?: number | null;
  physicalRating?: number | null;
  cognitiveRating?: number | null;
};

type ObservationSlice = RatingSlice & {
  scoutNotes?: string | null;
  strengths?: string | null;
  weaknesses?: string | null;
  risks?: string | null;
};

export function resolveEffectiveRatings(
  prospect: RatingSlice,
  latestReport?: RatingSlice | null,
): RatingSlice {
  return {
    overallRating: prospect.overallRating ?? latestReport?.overallRating ?? null,
    technicalRating: prospect.technicalRating ?? latestReport?.technicalRating ?? null,
    tacticalRating: prospect.tacticalRating ?? latestReport?.tacticalRating ?? null,
    physicalRating: prospect.physicalRating ?? latestReport?.physicalRating ?? null,
    cognitiveRating: prospect.cognitiveRating ?? latestReport?.cognitiveRating ?? null,
  };
}

export function resolveProspectObservation(
  prospect: {
    descriptiveObservation?: string | null;
    notes?: string | null;
    strengths?: string | null;
    weaknesses?: string | null;
    risks?: string | null;
  },
  latestReport?: ObservationSlice | null,
): string | null {
  if (prospect.descriptiveObservation?.trim()) {
    return prospect.descriptiveObservation.trim();
  }
  const fromProspect = mergeDescriptiveObservation({
    scoutNotes: prospect.notes,
    strengths: prospect.strengths,
    weaknesses: prospect.weaknesses,
    risks: prospect.risks,
  });
  if (fromProspect) return fromProspect;
  if (!latestReport) return null;
  return mergeDescriptiveObservation({
    scoutNotes: latestReport.scoutNotes,
    strengths: latestReport.strengths,
    weaknesses: latestReport.weaknesses,
    risks: latestReport.risks,
  });
}

export function resolveProspectContact(prospect: {
  agentName?: string | null;
  agentPhone?: string | null;
  agentEmail?: string | null;
}) {
  const contactPhone = prospect.agentPhone?.trim() || null;
  const contactEmail = prospect.agentEmail?.trim() || null;
  const contactName = prospect.agentName?.trim() || null;
  let contactLabel: string | null = null;
  if (contactName) contactLabel = 'Agente / representante';
  else if (contactPhone) contactLabel = 'Telefone';
  else if (contactEmail) contactLabel = 'E-mail';
  return { contactPhone, contactEmail, contactName, contactLabel };
}

export function isProspectInCtQueue(prospect: {
  stage: string;
  evaluationOutcome?: string | null;
  ctScheduleStatus?: string | null;
}): boolean {
  if (['recusado', 'arquivado'].includes(prospect.stage)) return false;
  if (prospect.ctScheduleStatus === 'concluido') return false;
  if (
    prospect.ctScheduleStatus &&
    CT_SCHEDULE_STATUSES.includes(prospect.ctScheduleStatus as CtScheduleStatus) &&
    prospect.ctScheduleStatus !== 'concluido'
  ) {
    return true;
  }
  if (prospect.stage === 'tryout') return true;
  if (
    prospect.evaluationOutcome === 'para_teste' ||
    prospect.evaluationOutcome === 'aprovado'
  ) {
    return true;
  }
  return false;
}

export function resolveEffectiveCtScheduleStatus(prospect: {
  ctScheduleStatus?: string | null;
  stage: string;
  evaluationOutcome?: string | null;
}): CtScheduleStatus | null {
  if (!isProspectInCtQueue(prospect)) {
    return (prospect.ctScheduleStatus as CtScheduleStatus | null) ?? null;
  }
  if (
    prospect.ctScheduleStatus &&
    CT_SCHEDULE_STATUSES.includes(prospect.ctScheduleStatus as CtScheduleStatus)
  ) {
    return prospect.ctScheduleStatus as CtScheduleStatus;
  }
  return 'nao_agendado';
}

export function enrichProspectDisplay<
  T extends {
    stage: string;
    evaluationOutcome?: string | null;
    ctScheduleStatus?: string | null;
    descriptiveObservation?: string | null;
    notes?: string | null;
    strengths?: string | null;
    weaknesses?: string | null;
    risks?: string | null;
    agentName?: string | null;
    agentPhone?: string | null;
    agentEmail?: string | null;
    overallRating?: number | null;
    technicalRating?: number | null;
    tacticalRating?: number | null;
    physicalRating?: number | null;
    cognitiveRating?: number | null;
    reports?: ObservationSlice[];
  },
>(prospect: T) {
  const latestReport = prospect.reports?.[0] ?? null;
  const effectiveRatings = resolveEffectiveRatings(prospect, latestReport);
  const observationText = resolveProspectObservation(prospect, latestReport);
  const contact = resolveProspectContact(prospect);
  const effectiveCtScheduleStatus = resolveEffectiveCtScheduleStatus(prospect);
  const inCtQueue = isProspectInCtQueue(prospect);
  return {
    ...prospect,
    ...effectiveRatings,
    observationText,
    ...contact,
    effectiveCtScheduleStatus,
    inCtQueue,
    latestReportId: latestReport ? (latestReport as { id?: string }).id ?? null : null,
  };
}
