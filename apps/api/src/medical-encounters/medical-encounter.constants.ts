export const MEDICAL_ENCOUNTER_STATUSES = ['draft', 'finalized', 'cancelled'] as const;
export type MedicalEncounterStatus = (typeof MEDICAL_ENCOUNTER_STATUSES)[number];

export const MEDICAL_RTP_DECISIONS = [
  'pendente',
  'liberado_parcial',
  'liberado',
  'restrito',
] as const;
export type MedicalRtpDecision = (typeof MEDICAL_RTP_DECISIONS)[number];

export type MedicalEvolutionNote = {
  at: string;
  note: string;
  userId?: string | null;
  userName?: string | null;
};

export type MedicalExamRecord = {
  type: 'solicitado' | 'resultado';
  title: string;
  notes?: string | null;
  fileUrl?: string | null;
  recordedAt?: string | null;
};

export type MedicalPrescriptionItem = {
  medication: string;
  presentation?: string | null;
  dose?: string | null;
  route?: string | null;
  frequency?: string | null;
  duration?: string | null;
  instructions?: string | null;
};

export type MedicalEncounterAttachment = {
  label?: string;
  fileUrl: string;
  kind?: string;
};

export const MEDICAL_TIMELINE_SOURCE_TYPES = [
  'medical_encounter',
  'medical_evolution',
  'nursing_session',
  'physio_session',
  'physio_transition',
  'medical_departure',
  'physiology_clinical',
] as const;

export type MedicalTimelineSourceType = (typeof MEDICAL_TIMELINE_SOURCE_TYPES)[number];
