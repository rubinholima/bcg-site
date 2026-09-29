import { captacaoProspectProfileUrl } from '../captacao/captacao-scouting.util';
import { resolveCaptacaoManagerEmail } from '../captacao/captacao-notify.util';
import { TRYOUT_REFERRAL_SOURCE_LABELS, type TryoutReferralSource } from './tryout-workflow.constants';

export function resolveTryoutSupervisionEmail(): string {
  return (
    process.env.TRYOUT_SUPERVISION_EMAIL?.trim() ||
    process.env.CAPTACAO_SUPERVISION_EMAIL?.trim() ||
    resolveCaptacaoManagerEmail()
  );
}

export function resolveTryoutFisiologiaEmail(): string {
  return (
    process.env.TRYOUT_FISIOLOGIA_EMAIL?.trim() ||
    process.env.FISIOLOGIA_NOTIFY_EMAIL?.trim() ||
    resolveCaptacaoManagerEmail()
  );
}

export function buildTryoutManagerDossierText(input: {
  prospectId: string;
  tenantId: string;
  name: string;
  targetCategory?: string | null;
  arrivalReferralSource?: string | null;
  sourceDetails?: string | null;
  physioOutcome?: string | null;
  physioStaff?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  renewalCount?: number;
  coachTechnical?: number;
  coachPhysical?: number;
  coachTactical?: number;
  coachCognitive?: number;
  coachObservation?: string | null;
  coachOutcome?: string | null;
}): { subject: string; text: string } {
  const profileUrl = captacaoProspectProfileUrl(input.prospectId, input.tenantId);
  const sourceLabel =
    input.arrivalReferralSource &&
    TRYOUT_REFERRAL_SOURCE_LABELS[input.arrivalReferralSource as TryoutReferralSource]
      ? TRYOUT_REFERRAL_SOURCE_LABELS[input.arrivalReferralSource as TryoutReferralSource]
      : input.arrivalReferralSource ?? '—';

  const subject = `Try Out — dossiê para gerência: ${input.name}`;
  const text = [
    'Decisão de gerência necessária — Try Out',
    '',
    `Atleta: ${input.name}`,
    input.targetCategory ? `Categoria alvo: ${input.targetCategory}` : null,
    `Origem: ${sourceLabel}${input.sourceDetails ? ` (${input.sourceDetails})` : ''}`,
    '',
    '— Fisioterapia —',
    input.physioOutcome ? `Resultado: ${input.physioOutcome}` : 'Resultado: —',
    input.physioStaff ? `Avaliador: ${input.physioStaff}` : null,
    '',
    '— Período de avaliação —',
    input.periodStart ? `Início: ${input.periodStart}` : null,
    input.periodEnd ? `Fim: ${input.periodEnd}` : null,
    input.renewalCount != null ? `Renovações: ${input.renewalCount}` : null,
    '',
    '— Treinador (campo) —',
    input.coachOutcome ? `Decisão: ${input.coachOutcome}` : null,
    input.coachTechnical != null
      ? `Notas T/F/Ta/C: ${input.coachTechnical}/${input.coachPhysical}/${input.coachTactical}/${input.coachCognitive}`
      : null,
    input.coachObservation ? `Observação:\n${input.coachObservation}` : null,
    '',
    `Ficha completa: ${profileUrl}`,
    '',
    'Boston City Group — Try Out',
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, text };
}
