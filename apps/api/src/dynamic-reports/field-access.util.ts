import type { DynamicReportFieldDefinition } from './dynamic-reports.types';
import { isFootballManagementRole } from '../modules/football-domain-access.util';

/** Populações exclusivas de atletas (Player) — elegíveis à exceção gestão Futebol. */
export const ATHLETE_REPORT_POPULATIONS = [
  'player.current_bid',
  'player.loaned',
  'player.athletes',
  'player.payroll',
] as const;

export type AthleteReportPopulation = (typeof ATHLETE_REPORT_POPULATIONS)[number];

export function isAthleteReportPopulation(population: string | null | undefined): boolean {
  return (
    typeof population === 'string' &&
    (ATHLETE_REPORT_POPULATIONS as readonly string[]).includes(population)
  );
}

export type DynamicReportFieldAccessContext = {
  moduleSlugs: string[];
  population: string;
  role: string;
  isSuperAdmin: boolean;
};

/** Gestão Futebol com acesso a Relatórios Dinâmicos do dept — exceção contextual por população. */
export function hasFootballManagementAthleteReportAccess(ctx: DynamicReportFieldAccessContext): boolean {
  if (ctx.isSuperAdmin) return false;
  if (!isFootballManagementRole(ctx.role)) return false;
  if (!ctx.moduleSlugs.includes('relatorios_futebol')) return false;
  return isAthleteReportPopulation(ctx.population);
}

export function fieldAllowedForPopulation(
  field: DynamicReportFieldDefinition,
  population: string,
): boolean {
  if (field.populations.length === 0) return true;
  return field.populations.includes(population);
}

export function canAccessDynamicReportField(
  field: DynamicReportFieldDefinition,
  ctx: DynamicReportFieldAccessContext,
): boolean {
  if (!fieldAllowedForPopulation(field, ctx.population)) return false;

  if (ctx.isSuperAdmin) return true;

  if (field.requiredModules.length === 0) return true;

  if (field.requiredModules.some((m) => ctx.moduleSlugs.includes(m))) return true;

  if (hasFootballManagementAthleteReportAccess(ctx)) return true;

  return false;
}

export function filterFieldsForAccessContext(
  fields: DynamicReportFieldDefinition[],
  ctx: DynamicReportFieldAccessContext,
): DynamicReportFieldDefinition[] {
  return fields.filter((field) => canAccessDynamicReportField(field, ctx));
}
