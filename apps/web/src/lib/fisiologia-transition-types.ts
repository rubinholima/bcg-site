import type { PhysioTransitionEntry } from "@/types/fisioterapia";

export interface PhysioTransitionProgramListItem {
  id: string;
  tenantId: string;
  playerId: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  isNewReferral?: boolean;
  sessionCount: number;
  player?: {
    id: string;
    name: string;
    category: string | null;
    photoUrl: string | null;
  };
  originSession?: {
    id: string;
    diagnosisLabel: string | null;
    treatmentLabel: string | null;
    endedAt: string | null;
    disposition: string | null;
    region?: { namePt: string } | null;
  };
  latestEntry: PhysioTransitionEntry | null;
}

export interface PhysioTransitionProgramDetail {
  id: string;
  tenantId: string;
  playerId: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  originSessionId: string;
  player?: {
    id: string;
    name: string;
    category: string | null;
    photoUrl: string | null;
    status: string | null;
    statusDetails: string | null;
  };
  originSession: {
    id: string;
    endedAt: string | null;
    disposition: string | null;
    diagnosisLabel: string | null;
    treatmentLabel: string | null;
    treatmentNotes: string | null;
    symptoms: string | null;
    region?: { namePt: string } | null;
    sessionRegions?: Array<{ region?: { namePt: string } | null; side: string | null }>;
    sessionDiagnoses?: Array<{ diagnosisLabel: string | null; diagnosis?: { name: string } | null }>;
    sessionTreatments?: Array<{ treatmentLabel: string | null; treatment?: { name: string } | null }>;
  };
  entries: PhysioTransitionEntry[];
}

export interface CreateTransitionProgramEntryPayload {
  sessionDate: string;
  workType: string;
  workTypeLabel?: string;
  startTime: string;
  endTime: string;
  objective?: string;
  activities?: string;
  evolutionNote?: string;
  stillFeelsPain: boolean;
  evolutionScore?: number;
  needsNewSession: boolean;
  staffId?: string;
  staffName?: string;
}

export interface TransitionOperationalSummary {
  activeCount: number;
  newCount: number;
  items: Array<{
    programId: string;
    playerId: string;
    playerName: string;
    category: string | null;
    startedAt: string;
    originSessionId: string | null;
    originLabel: string | null;
  }>;
}

export interface PlayerTransitionProgramHistory {
  id: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  originSessionId: string;
  originSummary: string;
  originSession: {
    id: string;
    endedAt: string | null;
    disposition: string | null;
  };
  sessionCount: number;
  entries: Array<{
    id: string;
    sessionDate: string;
    workType: string;
    workTypeLabel: string | null;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    objective: string | null;
    activities: string | null;
    evolutionNote: string | null;
    stillFeelsPain: boolean;
    evolutionScore: number | null;
    needsNewSession: boolean;
  }>;
}
