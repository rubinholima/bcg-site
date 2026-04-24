export type UserRole =
  | "super_admin"
  | "company_admin"
  | "editor"
  | "analista"
  | "diretoria"
  | "medico"
  | "psicologo"
  | "user";

export interface UserListItem {
  id: string | null;
  cognitoSub: string;
  username: string;
  email: string;
  name: string | null;
  role: UserRole;
  enabled: boolean;
  /** Escopo de empresas (vazio = sem restrição / vê todas). */
  tenantIds?: string[];
  /** Empresas com nome (lista de usuários). */
  tenants?: { id: string; name: string }[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserBody {
  email: string;
  name?: string | null;
  temporaryPassword: string;
  role: UserRole;
}
