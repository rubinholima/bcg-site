/** Estado operacional mínimo derivado do prontuário — sem diagnóstico clínico. */

export type MedicalOperationalStatus = 'available' | 'restricted' | 'unavailable';

export type MedicalOperationalSnapshot = {
  status: MedicalOperationalStatus;
  summary: string;
  until: Date | null;
};

function formatUntil(until: Date | null): string {
  if (!until) return '';
  const d = until.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  return d ? ` Previsão: ${d}.` : '';
}

export function computeMedicalOperationalState(input: {
  restrictTraining: boolean;
  restrictMatch: boolean;
  rtpDecision?: string | null;
  returnForecastAt?: Date | null;
  medicalRtpReleasedAt?: Date | null;
}): MedicalOperationalSnapshot {
  const rtp = input.rtpDecision?.trim() || null;
  const until = input.returnForecastAt ?? input.medicalRtpReleasedAt ?? null;
  const untilSuffix = formatUntil(until);

  if (input.restrictMatch && input.restrictTraining) {
    return {
      status: 'unavailable',
      summary: `Indisponível para treino e jogo (decisão médica).${untilSuffix}`,
      until,
    };
  }
  if (input.restrictMatch) {
    return {
      status: 'restricted',
      summary: `Restrito — sem participação em jogo (decisão médica).${untilSuffix}`,
      until,
    };
  }
  if (input.restrictTraining) {
    return {
      status: 'restricted',
      summary: `Restrito — sem treino (decisão médica).${untilSuffix}`,
      until,
    };
  }
  if (rtp === 'restrito') {
    return {
      status: 'unavailable',
      summary: `Indisponível — retorno ao play (RTP) pendente.${untilSuffix}`,
      until,
    };
  }
  if (rtp === 'liberado_parcial') {
    return {
      status: 'available',
      summary: 'Liberado para retorno progressivo (RTP).',
      until: input.medicalRtpReleasedAt ?? until,
    };
  }
  if (rtp === 'liberado') {
    return {
      status: 'available',
      summary: 'Liberado para atividades (decisão médica).',
      until: input.medicalRtpReleasedAt ?? until,
    };
  }

  return {
    status: 'available',
    summary: 'Sem restrição operacional médica registrada.',
    until: null,
  };
}
