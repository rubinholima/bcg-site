import type { CoachReportSelectionToken } from '../player-dossier-coach-reports.util';

export type PlayerDossierPdfRequestDto = {
  sections?: string;
  coachReports?: CoachReportSelectionToken[];
  paperSize?: 'A4' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
  season?: number;
};
