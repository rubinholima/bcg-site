import type { Player } from '@prisma/client';

export const SOCIAL_PEDAGOGY_TRIGGER_TYPES = [
  'horario_treino',
  'convocacao',
  'inicio_letivo',
  'manual',
] as const;

export const SOCIAL_PEDAGOGY_CASE_STATUSES = [
  'coleta',
  'agenda',
  'comunicacao',
  'documentos',
  'concluido',
] as const;

export const SOCIAL_PEDAGOGY_DOCUMENT_TYPES = [
  'matricula',
  'boletim',
  'frequencia',
  'dispensa',
  'comprovante',
  'parecer',
  'outro',
] as const;

export type ContactValidationResult = {
  ok: boolean;
  issues: string[];
  checkedAt: string;
};

type ProfileShape = {
  address?: { main?: { street?: string; city?: string; zipCode?: string; phone?: string }; local?: { street?: string } };
  extras?: { schoolName?: string; schoolGrade?: string; educationLevel?: string; schoolPeriod?: string[] };
};

export function parseRegistrationProfile(raw: unknown): ProfileShape {
  if (!raw || typeof raw !== 'object') return {};
  return raw as ProfileShape;
}

export function validatePlayerContacts(
  player: Pick<
    Player,
    | 'contactPhone'
    | 'contactEmail'
    | 'emergencyContactName'
    | 'emergencyContactPhone'
    | 'emergencyContactEmail'
    | 'registrationProfile'
  >,
  guardians: Array<{ name: string; phone?: string | null; email?: string | null; isPrimary?: boolean }>,
): ContactValidationResult {
  const profile = parseRegistrationProfile(player.registrationProfile);
  const issues: string[] = [];

  const hasAddress =
    Boolean(profile.address?.main?.street?.trim()) || Boolean(profile.address?.local?.street?.trim());
  if (!hasAddress) issues.push('Endereço do atleta');

  const hasGuardianContact =
    guardians.some((g) => Boolean(g.phone?.trim() || g.email?.trim())) ||
    Boolean(player.emergencyContactPhone?.trim() || player.emergencyContactEmail?.trim());
  if (!hasGuardianContact) issues.push('Contato de responsável');

  const hasGuardianName =
    guardians.some((g) => Boolean(g.name?.trim())) ||
    Boolean(player.emergencyContactName?.trim());
  if (!hasGuardianName) issues.push('Nome do responsável');

  if (!profile.extras?.schoolName?.trim()) issues.push('Escola do atleta');

  if (!player.contactPhone?.trim() && !profile.address?.main?.phone?.trim()) {
    issues.push('Telefone do atleta');
  }

  return {
    ok: issues.length === 0,
    issues,
    checkedAt: new Date().toISOString(),
  };
}

export function triggerTypeLabel(type: string): string {
  const map: Record<string, string> = {
    horario_treino: 'Mudança de horário de treino',
    convocacao: 'Convocação (jogo/viagem)',
    inicio_letivo: 'Início do período letivo',
    manual: 'Manual',
  };
  return map[type] ?? type;
}

export function caseStatusLabel(status: string): string {
  const map: Record<string, string> = {
    coleta: '1 — Coleta de dados',
    agenda: '2 — Cruzamento com agenda',
    comunicacao: '3 — Comunicação escola',
    documentos: '4 — Documentos escolares',
    concluido: 'Concluído',
  };
  return map[status] ?? status;
}

export function documentTypeLabel(type: string): string {
  const map: Record<string, string> = {
    matricula: 'Comprovante de matrícula',
    boletim: 'Boletim',
    frequencia: 'Frequência escolar',
    dispensa: 'Dispensa / autorização',
    comprovante: 'Comprovante',
    parecer: 'Parecer pedagógico',
    outro: 'Outro',
  };
  return map[type] ?? type;
}

export function nextCaseStatus(current: string): string | null {
  const flow = ['coleta', 'agenda', 'comunicacao', 'documentos', 'concluido'];
  const idx = flow.indexOf(current);
  if (idx < 0 || idx >= flow.length - 1) return null;
  return flow[idx + 1];
}

export function buildDefaultSchoolNotification(params: {
  tenantName: string;
  playerName: string;
  schoolName: string;
  grade?: string | null;
  periodLabel?: string | null;
  events: Array<{ date: string; title: string; type?: string; time?: string | null }>;
  guardianName?: string | null;
}): string {
  const lines = params.events
    .map((e) => {
      const time = e.time ? ` (${e.time})` : '';
      return `- ${e.date}${time}: ${e.title}${e.type ? ` [${e.type}]` : ''}`;
    })
    .join('\n');

  return `Prezados(as),

Encaminhamos solicitação de dispensa/autorização de falta(s) escolar(es) do(a) aluno(a) ${params.playerName}${
    params.grade ? `, ${params.grade}` : ''
  }${params.periodLabel ? ` — ${params.periodLabel}` : ''}, regularmente matriculado(a) nesta instituição (${
    params.schoolName
  }), em razão de compromissos esportivos oficiais do ${params.tenantName}.

Período / eventos relacionados:
${lines || '- (informar datas na edição do caso)'}

Solicitamos o encaminhamento da dispensa formal e, quando aplicável, orientações para recuperação de conteúdo.

Responsável: ${params.guardianName ?? '(informar contato do responsável)'}

Atenciosamente,
Assistência Social / Pedagogia — ${params.tenantName}`;
}
