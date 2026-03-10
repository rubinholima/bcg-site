/**
 * Tipos para o módulo Depto de Fisiologia (avaliação física do atleta).
 * Campos baseados em práticas de clubes: composição corporal, VO2, Yo-Yo, sprint, RAST, CMJ, agilidade.
 */

export interface PhysiologyEntry {
  date?: string;
  evaluator?: string;
  // Composição corporal
  weight?: number;
  height?: number;
  bmi?: number;
  fatPercent?: number;
  leanMass?: number;
  // Cardiorrespiratória
  vo2max?: number;
  hrRest?: number;
  hrMax?: number;
  // Testes de campo
  yoyoDistance?: number;
  sprint10m?: number;
  sprint20m?: number;
  rastPower?: number;
  cmjCm?: number;
  illinoisSec?: number;
  tTestSec?: number;
  notes?: string;
}

export interface PhysiologyData {
  profile?: Record<string, unknown>;
  records: PhysiologyEntry[];
}

export function normalizePhysiology(phys: unknown): PhysiologyData {
  if (Array.isArray(phys)) {
    return { profile: {}, records: phys as PhysiologyEntry[] };
  }
  if (phys && typeof phys === "object" && "records" in phys) {
    const obj = phys as { profile?: Record<string, unknown>; records?: PhysiologyEntry[] };
    return {
      profile: obj.profile ?? {},
      records: Array.isArray(obj.records) ? obj.records : [],
    };
  }
  return { profile: {}, records: [] };
}
