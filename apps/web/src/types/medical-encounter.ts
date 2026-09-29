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

export type MedicalExamRecord = {
  type: "solicitado" | "resultado";
  title: string;
  notes?: string | null;
  fileUrl?: string | null;
  recordedAt?: string | null;
};

export type MedicalEvolutionNote = {
  at: string;
  note: string;
  userId?: string | null;
  userName?: string | null;
};

export type MedicalEditLogEntry = {
  at: string;
  userId?: string | null;
  userName?: string | null;
  action: "created" | "updated" | "evolution";
  comment?: string | null;
};

export type MedicalEncounterOrigin = {
  id: string;
  occurredAt: string;
  diagnosis?: string | null;
  physicianName?: string | null;
};

export type MedicalReferPhysioSession = {
  id: string;
  status: string;
  disposition?: string | null;
  diagnosisLabel?: string | null;
  startedAt: string;
  region?: { namePt: string };
  transitionProgram?: {
    id: string;
    status: string;
    startedAt: string;
    completedAt?: string | null;
  } | null;
};

export type MedicalEncounter = {
  id: string;
  tenantId: string;
  playerId: string;
  category?: string | null;
  occurredAt: string;
  physicianStaffId?: string | null;
  physicianName?: string | null;
  physicianCrm?: string | null;
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
  referPhysioSession?: MedicalReferPhysioSession | null;
  originEncounterId?: string | null;
  originEncounter?: MedicalEncounterOrigin | null;
  followUps?: MedicalEncounterOrigin[];
  attachments?: MedicalEncounterAttachment[] | null;
  examRecords?: MedicalExamRecord[] | null;
  evolutionNotes?: MedicalEvolutionNote[] | null;
  editLog?: MedicalEditLogEntry[] | null;
  prescriptions?: MedicalPrescriptionItem[] | null;
  rtpDecision?: string | null;
  medicalRtpReleasedAt?: string | null;
  medicalRtpNotes?: string | null;
  status: string;
  tenant?: { id: string; name: string; slug: string };
  player?: {
    id: string;
    name: string;
    category?: string | null;
    photoUrl?: string | null;
    birthDate?: string | null;
  };
};

export type MedicalTimelineItem = {
  id: string;
  sourceType:
    | "medical_encounter"
    | "medical_evolution"
    | "nursing_session"
    | "physio_session"
    | "physio_transition"
    | "medical_departure"
    | "physiology_clinical";
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

export type MedicalPrescriptionHistoryItem = {
  encounterId: string;
  occurredAt: string;
  physicianName?: string | null;
  diagnosis?: string | null;
  originEncounterId?: string | null;
  prescriptions: MedicalPrescriptionItem[];
};
