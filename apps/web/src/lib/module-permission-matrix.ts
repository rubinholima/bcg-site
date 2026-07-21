/** Linha da matriz Configurações → Acessos. */
export type ModulePermissionRow = {
  slug: string;
  name: string;
  sortOrder: number;
  functionalArea?: string;
  permissions: Record<string, boolean>;
};

export function emptyPermissions(managedRoles: string[]): Record<string, boolean> {
  return Object.fromEntries(managedRoles.map((r) => [r, false]));
}

export function normalizeModuleFromApi(
  row: {
    slug: string;
    name: string;
    sortOrder: number;
    functionalArea?: string;
    permissions?: Record<string, boolean>;
  },
  managedRoles: string[],
): ModulePermissionRow {
  return {
    slug: row.slug,
    name: row.name,
    sortOrder: row.sortOrder,
    functionalArea: row.functionalArea,
    permissions: {
      ...emptyPermissions(managedRoles),
      ...(row.permissions ?? {}),
    },
  };
}

export function getRolePermission(row: ModulePermissionRow, role: string): boolean {
  return Boolean(row.permissions[role]);
}

export function setRolePermission(
  row: ModulePermissionRow,
  role: string,
  value: boolean,
): ModulePermissionRow {
  return {
    ...row,
    permissions: { ...row.permissions, [role]: value },
  };
}

export function permissionsPayload(rows: ModulePermissionRow[]): Record<string, Record<string, boolean>> {
  const out: Record<string, Record<string, boolean>> = {};
  for (const row of rows) {
    out[row.slug] = { ...row.permissions };
  }
  return out;
}
