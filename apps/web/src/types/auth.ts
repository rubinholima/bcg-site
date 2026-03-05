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
  | "analista"
  | "diretoria"
  | "medico"
  | "psicologo"
  | "user";

export interface MeResponse {
  user: MeUser;
  groups: string[];
  role: MeRole;
}
