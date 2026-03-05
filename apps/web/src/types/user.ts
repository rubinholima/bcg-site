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
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserBody {
  email: string;
  name?: string | null;
  temporaryPassword: string;
  role: UserRole;
}
