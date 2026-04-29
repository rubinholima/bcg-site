export interface MeUser {
  id: string;
  email: string;
  name: string | null;
  cognitoSub: string;
}

export type MeRole =
  | "super_admin"
  | "company_admin"
  | "editor"
  | "gerente"
  | "administrativo"
  | "analista"
  | "diretoria"
  | "medico"
  | "psicologo"
  | "user";

export interface MeResponse {
  user: MeUser;
  groups: string[];
  role: MeRole;
  /** null = sem escopo (todas as empresas). Lista = só esses tenants. */
  tenantIds?: string[] | null;
}
