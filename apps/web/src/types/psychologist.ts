export interface Psychologist {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  crpOrEquivalent?: string | null;
  bio?: string | null;
  photoUrl?: string | null;
  tenantId?: string | null;
  tenant?: { id: string; name: string; slug: string } | null;
  calendarBlocked: boolean;
  staffRole?: string | null;
  supervisorId?: string | null;
  categories?: string[] | null;
  attendanceLog?: unknown;
  performanceSheet?: unknown;
  createdAt: string;
  updatedAt: string;
}

export type AttendanceLogEntry = {
  date: string;
  startTime?: string;
  endTime?: string;
  playerId?: string;
  playerName?: string;
  durationSeconds?: number;
  notes?: string;
};

export type PerformanceSheet = {
  summary?: string;
  metrics?: Record<string, number>;
  notes?: string;
  updatedAt?: string;
};
