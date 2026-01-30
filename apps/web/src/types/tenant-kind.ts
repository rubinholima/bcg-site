export interface TenantKind {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTenantKindDto {
  name: string;
}

export interface UpdateTenantKindDto {
  name?: string;
}
