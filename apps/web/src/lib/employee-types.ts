/** Tipos de colaborador no cadastro mestre (RH / funcionários). */
export const EMPLOYEE_TYPES = {
  staff: "Funcionário",
  comissao_tecnica: "Comissão técnica",
  dirigente: "Dirigente",
  athlete: "Atleta",
  temporario: "Temporário",
  estagio: "Estágio",
} as const;

export type EmployeeType = keyof typeof EMPLOYEE_TYPES;

export function getEmployeeTypeLabel(type: string): string {
  return EMPLOYEE_TYPES[type as EmployeeType] ?? type;
}

export interface EmployeeAddress {
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

export interface EmployeeDependentRow {
  id?: string;
  name: string;
  birthDate: string;
  birthCertificateFileUrl?: string;
  schoolAttendanceFileUrl?: string;
  vaccinationCardFileUrl?: string;
}

export const EMPTY_EMPLOYEE_ADDRESS: EmployeeAddress = {
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  zipCode: "",
};

export function parseEmployeeAddress(raw: unknown): EmployeeAddress {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...EMPTY_EMPLOYEE_ADDRESS };
  const o = raw as Record<string, unknown>;
  return {
    street: typeof o.street === "string" ? o.street : "",
    number: typeof o.number === "string" ? o.number : "",
    complement: typeof o.complement === "string" ? o.complement : "",
    neighborhood: typeof o.neighborhood === "string" ? o.neighborhood : "",
    city: typeof o.city === "string" ? o.city : "",
    state: typeof o.state === "string" ? o.state : "",
    zipCode: typeof o.zipCode === "string" ? o.zipCode : "",
  };
}

export function isMinorUnder14(birthDate: string): boolean {
  if (!birthDate?.trim()) return false;
  const birth = new Date(`${birthDate.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(birth.getTime())) return false;
  const limit = new Date();
  limit.setFullYear(limit.getFullYear() - 14);
  return birth > limit;
}
