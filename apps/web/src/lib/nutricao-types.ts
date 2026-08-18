import type { NutritionAnamnesisData } from "@/lib/nutricao-anamnesis";

export interface NutritionAnamnesisRow {
  id: string;
  playerId: string;
  assessedAt: string;
  data: NutritionAnamnesisData;
  notes: string | null;
  player?: {
    id: string;
    name: string;
    jerseyNumber: number | null;
    category: string | null;
    tenantId?: string;
  };
}

export interface KitchenMenuReportDay {
  id: string;
  date: string;
  dayContext: string | null;
  notes: string | null;
  menu: {
    id: string;
    name: string;
    items: Array<{
      id: string;
      description: string;
      calories: number | null;
      proteinG: number | null;
      carbsG: number | null;
      fatsG: number | null;
      sortOrder: number;
      mealType: { id: string; name: string; code: string; sortOrder?: number };
    }>;
  };
}

export interface KitchenMenuReport {
  tenant: { id: string; name: string; slug: string; logoUrl?: string | null };
  category: { id: string; name: string; code?: string | null };
  startDate: string;
  endDate: string;
  mealTypes: Array<{ id: string; name: string; code: string; sortOrder: number }>;
  days: KitchenMenuReportDay[];
}

export interface SupplementationReport {
  tenant: { id: string; name: string; slug: string; logoUrl?: string | null };
  scope: string;
  categoryId: string | null;
  playerId: string | null;
  guides: Array<{
    id: string;
    name: string;
    whenToTake: string | null;
    notes: string | null;
    category?: { id: string; name: string } | null;
    player?: { id: string; name: string; jerseyNumber: number | null; category: string | null } | null;
  }>;
  rosterPlayers: Array<{ id: string; name: string; jerseyNumber: number | null; category: string | null }>;
}

export interface PlayerNutritionContext {
  player: {
    id: string;
    name: string;
    category: string | null;
    weight: number | null;
    height: number | null;
    bmi: number | null;
    bodyFatPercent: number | null;
  };
  anamneses: NutritionAnamnesisRow[];
  assessments: Array<{
    id: string;
    assessedAt: string;
    weightKg: number;
    heightCm: number | null;
    bmi: number | null;
    bodyFatPercent: number | null;
    notes: string | null;
  }>;
  supplements: SupplementationReport["guides"];
  healthLinks: {
    physioSessions: Array<{
      id: string;
      startedAt: string;
      status: string;
      diagnosisLabel: string | null;
      symptoms: string | null;
      evolutionNotes: unknown;
    }>;
    psychFoodNotes: string[];
    medicalAllergies: string[];
  };
}

export type KitchenPrintPeriod = "day" | "week" | "month";

export type SupplementReportScope = "all" | "team" | "category" | "individual";

export type SupplementReportPeriod = "week" | "month";
