/** Tipos de colaborador no cadastro mestre (RH / funcionários). */
export const EMPLOYEE_TYPES = {
  staff: "Funcionário",
  dirigente: "Dirigente",
  athlete: "Atleta",
} as const;

export type EmployeeType = keyof typeof EMPLOYEE_TYPES;

export function getEmployeeTypeLabel(type: string): string {
  return EMPLOYEE_TYPES[type as EmployeeType] ?? type;
}
