import type { CoachReportSelectionToken } from '../player-dossier-coach-reports.util';

export type PlayerDossierPdfRequestDto = {
  sections?: string;
  coachReports?: CoachReportSelectionToken[];
  /** IDs de AnalysisPlayerMaterialItem selecionados para o dossiê. */
  analysisMaterial?: string[];
  paperSize?: 'A4' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
  season?: number;
};
