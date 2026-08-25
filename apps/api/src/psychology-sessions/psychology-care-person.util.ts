import {
  isArchivedSportsSituation,
  isLoanedSportsSituation,
  normalizeSportsSituation,
} from '../common/sports-situation.util';

export type PsychologyPersonType = 'player' | 'employee' | 'staff';
export type PsychologyPersonClassification = 'elenco' | 'emprestado' | 'funcionario';

export type PsychologyCarePersonDto = {
  personType: PsychologyPersonType;
  personId: string;
  key: string;
  name: string;
  classification: PsychologyPersonClassification;
  classificationLabel: string;
  tenantId: string;
  category?: string | null;
  roleLabel?: string | null;
  photoUrl?: string | null;
  email?: string | null;
};

const CLASSIFICATION_LABEL: Record<PsychologyPersonClassification, string> = {
  elenco: 'Elenco',
  emprestado: 'Emprestado',
  funcionario: 'Funcionário',
};

export function psychologyPersonKey(
  personType: PsychologyPersonType,
  personId: string,
): string {
  return `${personType}:${personId}`;
}

export function parsePsychologyPersonKey(
  key: string,
): { personType: PsychologyPersonType; personId: string } | null {
  const trimmed = key.trim();
  const match = /^(player|employee|staff):(.+)$/.exec(trimmed);
  if (!match) return null;
  return {
    personType: match[1] as PsychologyPersonType,
    personId: match[2]!,
  };
}

export function psychologyClassificationLabel(
  classification: PsychologyPersonClassification,
): string {
  return CLASSIFICATION_LABEL[classification];
}

export function playerPsychologyClassification(
  registrationProfile: unknown,
): PsychologyPersonClassification {
  if (!registrationProfile || typeof registrationProfile !== 'object' || Array.isArray(registrationProfile)) {
    return 'elenco';
  }
  const sports = (registrationProfile as Record<string, unknown>).sports;
  if (!sports || typeof sports !== 'object' || Array.isArray(sports)) return 'elenco';
  const situation = normalizeSportsSituation(
    typeof (sports as Record<string, unknown>).situation === 'string'
      ? ((sports as Record<string, unknown>).situation as string)
      : undefined,
  );
  return isLoanedSportsSituation(situation) ? 'emprestado' : 'elenco';
}

export function isPsychologyEligiblePlayer(registrationProfile: unknown): boolean {
  if (!registrationProfile || typeof registrationProfile !== 'object' || Array.isArray(registrationProfile)) {
    return true;
  }
  const sports = (registrationProfile as Record<string, unknown>).sports;
  if (!sports || typeof sports !== 'object' || Array.isArray(sports)) return true;
  const situation = normalizeSportsSituation(
    typeof (sports as Record<string, unknown>).situation === 'string'
      ? ((sports as Record<string, unknown>).situation as string)
      : undefined,
  );
  return !isArchivedSportsSituation(situation);
}

const STAFF_ROLE_LABEL: Record<string, string> = {
  tecnico: 'Técnico',
  auxiliar_tecnico: 'Auxiliar técnico',
  treinador_goleiros: 'Treinador de goleiros',
  preparador_fisico: 'Preparador físico',
  medico: 'Médico',
  fisioterapeuta: 'Fisioterapeuta',
  fisiologista: 'Fisiologista',
  psicologo: 'Psicólogo',
  nutricionista: 'Nutricionista',
  analista_desempenho: 'Analista de desempenho',
  scout: 'Scout',
  massagista: 'Massagista',
  enfermeiro: 'Enfermeiro',
  outro: 'Comissão',
};

export function staffRoleLabel(role: string | null | undefined): string {
  const key = role?.trim();
  if (!key) return 'Comissão';
  return STAFF_ROLE_LABEL[key] ?? 'Comissão';
}
