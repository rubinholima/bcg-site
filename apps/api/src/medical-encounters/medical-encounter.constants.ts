export const MEDICAL_ENCOUNTER_STATUSES = ['draft', 'finalized', 'cancelled'] as const;
export type MedicalEncounterStatus = (typeof MEDICAL_ENCOUNTER_STATUSES)[number];

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
  'nursing_session',
  'physio_session',
  'physio_transition',
  'medical_departure',
  'physiology_clinical',
] as const;

export type MedicalTimelineSourceType = (typeof MEDICAL_TIMELINE_SOURCE_TYPES)[number];
