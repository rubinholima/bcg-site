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

export type MedicalEncounter = {
  id: string;
  tenantId: string;
  playerId: string;
  category?: string | null;
  occurredAt: string;
  physicianStaffId?: string | null;
  physicianName?: string | null;
  chiefComplaint?: string | null;
  anamnesis?: string | null;
  physicalExam?: string | null;
  diagnosis?: string | null;
  conduct?: string | null;
  examsRequested?: string | null;
  observations?: string | null;
  restrictTraining: boolean;
  restrictMatch: boolean;
  returnForecastAt?: string | null;
  referPhysio: boolean;
  referPhysioNotes?: string | null;
  referPhysioSessionId?: string | null;
  attachments?: MedicalEncounterAttachment[] | null;
  prescriptions?: MedicalPrescriptionItem[] | null;
  status: string;
  player?: {
    id: string;
    name: string;
    category?: string | null;
    photoUrl?: string | null;
  };
};

export type MedicalTimelineItem = {
  id: string;
  sourceType:
    | 'medical_encounter'
    | 'nursing_session'
    | 'physio_session'
    | 'physio_transition'
    | 'medical_departure'
    | 'physiology_clinical';
  sourceId: string;
  occurredAt: string;
  title: string;
  summary: string | null;
  readOnly: boolean;
};

export type MedicalProntuarioTimeline = {
  player: {
    id: string;
    name: string;
    category?: string | null;
    photoUrl?: string | null;
    tenantId: string;
    status?: string | null;
    statusDetails?: string | null;
    statusUntil?: string | null;
  };
  medicalProfile: Record<string, unknown>;
  timeline: MedicalTimelineItem[];
};
