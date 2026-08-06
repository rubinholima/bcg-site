export type PhysioSide = "E" | "D" | "bilateral";
export type PhysioBodyMapView = "front" | "back";
export type PhysioSessionStatus = "active" | "completed" | "cancelled";

export interface PhysioBodyRegion {
  id: string;
  namePt: string;
  sortOrder: number;
  bilateral: boolean;
  diagnoses?: PhysioDiagnosis[];
}

export interface PhysioDiagnosis {
  id: string;
  regionId: string;
  name: string;
  isSystem: boolean;
  active: boolean;
}

export interface PhysioTreatment {
  id: string;
  name: string;
  regionId: string | null;
  equipment: string | null;
  isSystem: boolean;
  active: boolean;
}

export interface PhysioAttachment {
  name: string;
  url: string;
  key?: string;
  mimeType?: string;
}

export interface PhysioEvolutionNote {
  at: string;
  note: string;
  painScore?: number | null;
  userId?: string | null;
  userName?: string | null;
}

export interface PhysioSessionRegion {
  id: string;
  sessionId: string;
  regionId: string;
  side: PhysioSide | null;
  bodyMapView: PhysioBodyMapView | null;
  bodyMapX: number | null;
  bodyMapY: number | null;
  sortOrder: number;
  region?: PhysioBodyRegion;
}

export interface PhysioSessionDiagnosis {
  id: string;
  sessionId: string;
  regionId: string | null;
  diagnosisId: string | null;
  diagnosisLabel: string | null;
  sortOrder: number;
  diagnosis?: PhysioDiagnosis | null;
}

export interface PhysioSessionTreatment {
  id: string;
  sessionId: string;
  treatmentId: string | null;
  treatmentLabel: string | null;
  sortOrder: number;
  treatment?: PhysioTreatment | null;
}

export interface PhysioSession {
  id: string;
  tenantId: string;
  playerId: string;
  category: string | null;
  regionId: string;
  side: PhysioSide | null;
  bodyMapView: PhysioBodyMapView | null;
  bodyMapX: number | null;
  bodyMapY: number | null;
  symptoms: string | null;
  painScore: number | null;
  diagnosisId: string | null;
  diagnosisLabel: string | null;
  treatmentId: string | null;
  treatmentLabel: string | null;
  treatmentNotes: string | null;
  estimatedDays: number | null;
  estimatedEndDate: string | null;
  startedAt: string;
  endedAt: string | null;
  status: PhysioSessionStatus;
  staffId: string | null;
  staffName: string | null;
  attachments: PhysioAttachment[] | null;
  evolutionNotes: PhysioEvolutionNote[] | null;
  region?: PhysioBodyRegion;
  diagnosis?: PhysioDiagnosis | null;
  treatment?: PhysioTreatment | null;
  sessionRegions?: PhysioSessionRegion[];
  sessionDiagnoses?: PhysioSessionDiagnosis[];
  sessionTreatments?: PhysioSessionTreatment[];
  player?: {
    id: string;
    name: string;
    category: string | null;
    photoUrl: string | null;
    status: string | null;
    tenantId: string;
  };
  tenant?: { id: string; name: string; slug: string };
}

export interface PhysioSessionRegionInput {
  regionId: string;
  side?: PhysioSide;
  bodyMapView?: PhysioBodyMapView;
  bodyMapX?: number;
  bodyMapY?: number;
}

export interface PhysioSessionDiagnosisInput {
  regionId?: string;
  diagnosisId?: string;
  diagnosisLabel?: string;
}

export interface PhysioSessionTreatmentInput {
  treatmentId?: string;
  treatmentLabel?: string;
}

export interface CreatePhysioSessionPayload {
  tenantId: string;
  playerId: string;
  category?: string;
  regionId?: string;
  regions?: PhysioSessionRegionInput[];
  diagnoses?: PhysioSessionDiagnosisInput[];
  treatments?: PhysioSessionTreatmentInput[];
  side?: PhysioSide;
  bodyMapView?: PhysioBodyMapView;
  bodyMapX?: number;
  bodyMapY?: number;
  symptoms?: string;
  painScore?: number;
  diagnosisId?: string;
  diagnosisLabel?: string;
  treatmentId?: string;
  treatmentLabel?: string;
  treatmentNotes?: string;
  estimatedDays?: number;
  estimatedEndDate?: string;
  staffId?: string;
  staffName?: string;
  attachments?: PhysioAttachment[];
}

export interface UpdatePhysioSessionPayload {
  category?: string;
  regionId?: string;
  regions?: PhysioSessionRegionInput[];
  diagnoses?: PhysioSessionDiagnosisInput[];
  treatments?: PhysioSessionTreatmentInput[];
  side?: PhysioSide;
  bodyMapView?: PhysioBodyMapView;
  bodyMapX?: number;
  bodyMapY?: number;
  symptoms?: string;
  painScore?: number;
  diagnosisId?: string;
  diagnosisLabel?: string;
  treatmentId?: string;
  treatmentLabel?: string;
  treatmentNotes?: string;
  estimatedDays?: number;
  estimatedEndDate?: string | null;
  staffId?: string;
  staffName?: string;
  attachments?: PhysioAttachment[];
  status?: PhysioSessionStatus;
}

export interface PhysioGroupAttendanceRow {
  playerId: string;
  playerName?: string;
  present?: boolean;
  notes?: string;
}

export interface PhysioGroupSession {
  id: string;
  tenantId: string;
  category: string;
  sessionDate: string;
  description: string | null;
  staffId: string | null;
  staffName: string | null;
  location: string | null;
  attendance: PhysioGroupAttendanceRow[];
  createdAt: string;
  updatedAt: string;
  tenant?: { id: string; name: string; slug: string };
}

export interface CreatePhysioGroupSessionPayload {
  tenantId: string;
  category: string;
  sessionDate: string;
  description?: string;
  staffId?: string;
  staffName?: string;
  location?: string;
  attendance: PhysioGroupAttendanceRow[];
}

export interface PhysioReportsSummary {
  totalIndividual: number;
  totalGroup: number;
  activeSessions: number;
  completedSessions: number;
  groupParticipants: number;
  uniquePlayers: number;
  avgPainScore: number | null;
  avgReturnDays: number | null;
}

export interface PhysioReportsDashboard {
  summary: PhysioReportsSummary;
  byCategory: Array<{
    category: string;
    individual: number;
    group: number;
    active: number;
    total: number;
  }>;
  byStatus: Array<{ status: string; count: number }>;
  byRegion: Array<{ regionId: string; regionName: string; count: number }>;
  byDiagnosis: Array<{ label: string; count: number }>;
  byTreatment: Array<{ label: string; count: number }>;
  byStaff: Array<{
    staffId: string | null;
    staffName: string;
    individual: number;
    group: number;
  }>;
  byMonth: Array<{ month: string; individual: number; group: number }>;
  activeInjured: Array<{
    id: string;
    playerId: string;
    playerName: string;
    category: string | null;
    tenantName: string;
    regions: Array<{ name: string; side: string | null }>;
    diagnoses: string[];
    painScore: number | null;
    estimatedEndDate: string | null;
    startedAt: string;
    staffName: string | null;
  }>;
}
