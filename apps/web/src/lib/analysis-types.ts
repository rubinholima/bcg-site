/**
 * Tipos para o módulo Análise (Avaliações, Status, Métricas de desempenho, Relatório).
 * Baseado em práticas de clubes: avaliações com dimensões, status de aptidão, métricas scout (xG, xA, por 90).
 */

export const STATUS_OPTIONS = [
  { value: "available", label: "Apto" },
  { value: "injured", label: "Lesionado" },
  { value: "suspended", label: "Suspenso" },
  { value: "absent", label: "Ausente" },
  { value: "on_bench", label: "No banco" },
  { value: "not_in_squad", label: "Fora do elenco" },
] as const;

/** Avaliação da comissão/diretoria — nota geral e dimensões (estilo clubes: técnico, tático, físico, mental, comportamento). */
export interface EvaluationEntry {
  date?: string;
  evaluator?: string;
  rating?: number; // 0–10 geral
  technical?: number;   // 0–10 técnico
  tactical?: number;    // 0–10 tático
  physical?: number;   // 0–10 físico
  mental?: number;     // 0–10 mental
  behavior?: number;   // 0–10 comportamento/atitude (ética, comprometimento, disciplina)
  notes?: string;
}

export function normalizeEvaluations(val: unknown): EvaluationEntry[] {
  if (Array.isArray(val)) return val as EvaluationEntry[];
  return [];
}

/** Métricas de desempenho (scout / análise moderna) — totais ou por 90. */
export interface AnalysisMetrics {
  season?: string;       // ex: "2025/2026"
  matchesPlayed?: number;
  minutesPlayed?: number;
  // Ataque
  goals?: number;
  assists?: number;
  xG?: number;
  xA?: number;
  shots?: number;
  shotsOnTarget?: number;
  keyPasses?: number;
  bigChancesCreated?: number;
  dribblesSuccess?: number;
  // Posse / criação
  passes?: number;
  passAccuracy?: number;  // 0–100
  progressivePasses?: number;
  // Defesa
  tackles?: number;
  interceptions?: number;
  duelsWon?: number;
  recoveries?: number;
  // Outros
  foulsCommitted?: number;
  foulsDrawn?: number;
  yellowCards?: number;
  redCards?: number;
}

export function normalizeAnalysisMetrics(val: unknown): AnalysisMetrics {
  if (val && typeof val === "object" && !Array.isArray(val)) return val as AnalysisMetrics;
  return {};
}
