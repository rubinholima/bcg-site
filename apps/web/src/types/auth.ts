export interface MeUser {
  id: string;
  email: string;
  username: string;
  name: string | null;
  cognitoSub: string;
}

export type MeRole = string;

export interface MeResponse {
  user: MeUser;
  groups: string[];
  role: MeRole;
  canAccessDashboard?: boolean;
  mustChangePassword: boolean;
  tenantIds?: string[] | null;
}
