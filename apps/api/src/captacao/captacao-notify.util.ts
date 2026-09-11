import {
  buildSchedulerNotificationMessage,
  buildWhatsAppNotifyUrl,
} from './captacao-scouting.util';
import { CAPTACAO_SCHEDULER_PHONE } from './captacao.constants';

/** Destinatário operacional padrão — sobrescrevível via CAPTACAO_MANAGER_EMAIL. */
export const CAPTACAO_MANAGER_EMAIL_DEFAULT = 'gerente@bostoncityfc.com';

/** Resolve e-mail operacional do gerente (Captação + try-out). */
export function resolveCaptacaoManagerEmail(): string {
  return process.env.CAPTACAO_MANAGER_EMAIL?.trim() || CAPTACAO_MANAGER_EMAIL_DEFAULT;
}

/** Resolve WhatsApp operacional de agendamento (não é contato do agente/atleta). */
export function resolveCaptacaoOperationalWhatsAppPhone(): string {
  return process.env.CAPTACAO_SCHEDULER_PHONE?.trim() || CAPTACAO_SCHEDULER_PHONE;
}

export function buildOperationalSchedulerNotification(input: {
  prospect: {
    name: string;
    position?: string | null;
    currentClub?: string | null;
    targetCategory?: string | null;
    priority?: string | null;
    evaluationOutcome?: string | null;
    agentPhone?: string | null;
  };
  scoutName?: string | null;
  overallRating?: number | null;
  technicalRating?: number | null;
  tacticalRating?: number | null;
  physicalRating?: number | null;
  cognitiveRating?: number | null;
  matchName?: string | null;
  recommendation?: string | null;
  prospectId: string;
}) {
  const message = buildSchedulerNotificationMessage({
    prospectName: input.prospect.name,
    position: input.prospect.position,
    currentClub: input.prospect.currentClub,
    targetCategory: input.prospect.targetCategory,
    priority: input.prospect.priority,
    evaluationOutcome: input.prospect.evaluationOutcome,
    scoutName: input.scoutName,
    overallRating: input.overallRating,
    technicalRating: input.technicalRating,
    tacticalRating: input.tacticalRating,
    physicalRating: input.physicalRating,
    cognitiveRating: input.cognitiveRating,
    matchName: input.matchName,
    recommendation: input.recommendation,
    dashboardUrl: `/dashboard/futebol/captacao/prospects/${input.prospectId}`,
  });
  const operationalPhone = resolveCaptacaoOperationalWhatsAppPhone();
  const agentPhone = input.prospect.agentPhone?.trim() || null;
  return {
    phone: operationalPhone,
    agentPhone,
    message,
    whatsappUrl: buildWhatsAppNotifyUrl(message, operationalPhone),
  };
}
