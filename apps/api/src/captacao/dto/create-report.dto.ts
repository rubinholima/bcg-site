export class DimensionEvalDto {
  rating?: number;
  notes?: string;
}

export class CreateReportDto {
  tenantId!: string;
  prospectId!: string;
  scoutId!: string;
  reportDate?: string;
  matchName?: string;
  matchDate?: string;
  competition?: string;
  minutesObserved?: number;
  positionPlayed?: string;
  observationType?: string;
  opponentStrength?: string;
  technical?: Record<string, DimensionEvalDto>;
  tactical?: Record<string, DimensionEvalDto>;
  physical?: Record<string, DimensionEvalDto>;
  mental?: Record<string, DimensionEvalDto>;
  overallRating?: number;
  recommendation!: string;
  strengths?: string;
  weaknesses?: string;
  risks?: string;
  scoutNotes?: string;
  latitude?: number;
  longitude?: number;
  locationLabel?: string;
  /** Anexar GPS automaticamente ao relatório */
  reverseGeocode?: boolean;
}
