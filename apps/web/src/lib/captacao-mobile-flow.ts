/** Passos do fluxo mobile de captação */
export const CAPTACAO_MOBILE_STEPS = [
  { id: 'cadastro', label: 'Cadastro' },
  { id: 'responsavel', label: 'Responsável' },
  { id: 'contexto', label: 'Contexto' },
  { id: 'avaliacao', label: 'Avaliação' },
  { id: 'fluxo', label: 'Encaminhamento' },
  { id: 'resumo', label: 'Resumo' },
] as const;

export type CaptacaoMobileStepId = (typeof CAPTACAO_MOBILE_STEPS)[number]['id'];

export const CAPTACAO_MOBILE_RATING_SCALE = { min: 0, max: 5, step: 1 } as const;

export const CAPTACAO_FLOW_PATH_OPTIONS = [
  {
    value: 'tryout',
    label: 'Try-out no CT',
    description: 'Propor data de avaliação — supervisor confirma.',
  },
  {
    value: 'integracao_direta',
    label: 'Integração direta',
    description: 'Avaliação completa enviada ao gerente de futebol.',
  },
] as const;

export type CaptacaoMobileFormState = {
  tenantId: string;
  scoutId: string;
  name: string;
  birthDate: string;
  position: string;
  targetCategory: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string;
  guardianAddress: string;
  source: string;
  sourceDetails: string;
  currentClub: string;
  agentName: string;
  agentPhone: string;
  priority: string;
  needsLodging: '' | 'sim' | 'nao';
  technicalRating: number | null;
  tacticalRating: number | null;
  physicalRating: number | null;
  cognitiveRating: number | null;
  descriptiveObservation: string;
  flowPath: 'tryout' | 'integracao_direta';
  proposedCtDate: string;
  proposedCtTime: string;
};

export const EMPTY_CAPTACAO_MOBILE_FORM: CaptacaoMobileFormState = {
  tenantId: '',
  scoutId: '',
  name: '',
  birthDate: '',
  position: '',
  targetCategory: '',
  guardianName: '',
  guardianPhone: '',
  guardianEmail: '',
  guardianAddress: '',
  source: 'jogo',
  sourceDetails: '',
  currentClub: '',
  agentName: '',
  agentPhone: '',
  priority: 'media',
  needsLodging: '',
  technicalRating: null,
  tacticalRating: null,
  physicalRating: null,
  cognitiveRating: null,
  descriptiveObservation: '',
  flowPath: 'tryout',
  proposedCtDate: '',
  proposedCtTime: '09:00',
};

export function captacaoMobileProgressLabel(prospect: {
  flowPath?: string | null;
  managerDecision?: string | null;
  proposedCtAt?: string | null;
  ctScheduleStatus?: string | null;
  stage?: string;
}): string[] {
  const steps = ['Cadastro', 'Avaliação'];
  if (prospect.flowPath === 'integracao_direta') {
    steps.push('Gerente');
    if (prospect.managerDecision === 'aprovado') steps.push('Integração');
    return steps;
  }
  steps.push('Data CT', 'Supervisor', 'CT');
  if (prospect.ctScheduleStatus === 'agendado') steps[steps.length - 2] = 'Supervisor ✓';
  return steps;
}

export function formatMobileRating(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${value}/5`;
}
