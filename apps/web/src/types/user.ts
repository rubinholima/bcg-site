export type UserRole = string;

export interface UserListItem {
  id: string | null;
  cognitoSub: string;
  username: string;
  email: string;
  name: string | null;
  role: UserRole;
  enabled: boolean;
  mustChangePassword?: boolean;
  tenantIds?: string[];
  tenants?: { id: string; name: string }[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserBody {
  email: string;
  username: string;
  name?: string | null;
  role: UserRole;
}
