export const SOCIAL_PEDAGOGY_TRIGGER_OPTIONS = [
  { value: 'horario_treino', label: 'Mudança de horário de treino' },
  { value: 'convocacao', label: 'Convocação (jogo/viagem)' },
  { value: 'inicio_letivo', label: 'Início do período letivo' },
  { value: 'novo_atleta_apto', label: 'Novo atleta apto (BID)' },
  { value: 'manual', label: 'Manual' },
] as const;

export const SOCIAL_PEDAGOGY_STATUS_OPTIONS = [
  { value: 'coleta', label: '1 — Coleta de dados' },
  { value: 'agenda', label: '2 — Cruzamento com agenda' },
  { value: 'comunicacao', label: '3 — Comunicação escola' },
  { value: 'documentos', label: '4 — Documentos escolares' },
  { value: 'concluido', label: 'Concluído' },
] as const;

export const SOCIAL_PEDAGOGY_DOCUMENT_TYPES = [
  { value: 'matricula', label: 'Comprovante de matrícula' },
  { value: 'boletim', label: 'Boletim' },
  { value: 'frequencia', label: 'Frequência escolar' },
  { value: 'dispensa', label: 'Dispensa / autorização' },
  { value: 'comprovante', label: 'Comprovante' },
  { value: 'parecer', label: 'Parecer pedagógico' },
  { value: 'outro', label: 'Outro' },
] as const;

export const GUARDIAN_RELATIONSHIP_OPTIONS = [
  { value: 'pai', label: 'Pai' },
  { value: 'mae', label: 'Mãe' },
  { value: 'tutor', label: 'Tutor(a)' },
  { value: 'responsavel', label: 'Responsável legal' },
  { value: 'outro', label: 'Outro' },
] as const;

export interface ContactValidation {
  ok: boolean;
  issues: string[];
  checkedAt: string;
}

export interface PlayerGuardianRow {
  id: string;
  playerId: string;
  name: string;
  relationship: string;
  phone: string | null;
  email: string | null;
  cpf: string | null;
  isPrimary: boolean;
  notes: string | null;
}

export interface PlayerSchoolEnrollmentRow {
  id: string;
  playerId: string;
  schoolName: string;
  grade: string | null;
  period: string | null;
  shift: string | null;
  city: string | null;
  coordinatorName: string | null;
  coordinatorEmail: string | null;
  coordinatorPhone: string | null;
  schoolYear: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
}

export interface SocialPedagogyCaseRow {
  id: string;
  tenantId: string;
  playerId: string;
  triggerType: string;
  triggerLabel: string | null;
  status: string;
  periodStart: string | null;
  periodEnd: string | null;
  contactValidation: ContactValidation | null;
  agendaSnapshot: unknown;
  schoolNotificationText: string | null;
  schoolNotificationSentAt: string | null;
  schoolNotificationChannel: string | null;
  schoolResponseNotes: string | null;
  notes: string | null;
  updatedAt: string;
  player?: {
    id: string;
    name: string;
    jerseyNumber: number | null;
    category: string | null;
  };
  tenant?: { id: string; name: string; slug: string };
  documents?: SocialPedagogyDocumentRow[];
}

export interface SocialPedagogyDocumentRow {
  id: string;
  playerId: string;
  caseId: string | null;
  documentType: string;
  name: string;
  fileUrl: string;
  schoolYear: string | null;
  period: string | null;
  receivedAt: string | null;
  notes: string | null;
  player?: {
    id: string;
    name: string;
    jerseyNumber: number | null;
    category: string | null;
  };
}

export interface SocialPedagogyContext {
  player: {
    id: string;
    name: string;
    category: string | null;
    contactPhone: string | null;
    contactEmail: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    emergencyContactEmail: string | null;
  };
  profileSchool: {
    schoolName: string | null;
    schoolGrade: string | null;
    educationLevel: string | null;
  };
  contactValidation: ContactValidation;
  guardians: PlayerGuardianRow[];
  enrollments: PlayerSchoolEnrollmentRow[];
  cases: SocialPedagogyCaseRow[];
  documents: SocialPedagogyDocumentRow[];
  openCasesCount: number;
}

export interface RosterValidationRow {
  playerId: string;
  name: string;
  jerseyNumber: number | null;
  category: string | null;
  schoolName: string | null;
  validation: ContactValidation;
}

export interface SocialPedagogyAptoNotification {
  caseId: string;
  playerId: string;
  playerName: string;
  jerseyNumber: number | null;
  category: string | null;
  status: string;
  createdAt: string;
}

export interface SocialPedagogyAptoNotificationsResponse {
  count: number;
  items: SocialPedagogyAptoNotification[];
}

export function triggerLabel(value: string): string {
  return SOCIAL_PEDAGOGY_TRIGGER_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function statusLabel(value: string): string {
  return SOCIAL_PEDAGOGY_STATUS_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function documentTypeLabel(value: string): string {
  return SOCIAL_PEDAGOGY_DOCUMENT_TYPES.find((o) => o.value === value)?.label ?? value;
}
