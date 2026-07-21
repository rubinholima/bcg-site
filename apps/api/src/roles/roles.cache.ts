/** Cache em memória — evita async no DashboardRolesGuard. */
let dashboardRoleSlugs: Set<string> | null = null;
let matrixRoleSlugs: string[] | null = null;
let assignableRolesCache: Array<{
  slug: string;
  label: string;
  sortOrder: number;
  canAccessDashboard: boolean;
  includeInMatrix: boolean;
  isSystem: boolean;
  isActive: boolean;
}> | null = null;

const FALLBACK_DASHBOARD = new Set([
  'super_admin',
  'company_admin',
  'editor',
  'gerente',
  'administrativo',
  'analista',
  'diretoria',
  'medico',
  'psicologo',
  'comissao',
]);

const FALLBACK_MATRIX = [
  'company_admin',
  'editor',
  'gerente',
  'administrativo',
  'analista',
  'diretoria',
  'medico',
  'psicologo',
  'comissao',
];

export function setRolesRuntimeCache(data: {
  dashboardSlugs: string[];
  matrixSlugs: string[];
  assignable: NonNullable<typeof assignableRolesCache>;
}) {
  dashboardRoleSlugs = new Set(data.dashboardSlugs);
  matrixRoleSlugs = [...data.matrixSlugs];
  assignableRolesCache = data.assignable;
}

export function invalidateRolesRuntimeCache() {
  dashboardRoleSlugs = null;
  matrixRoleSlugs = null;
  assignableRolesCache = null;
}

export function getDashboardRoleSlugs(): Set<string> {
  return dashboardRoleSlugs ?? FALLBACK_DASHBOARD;
}

export function getMatrixRoleSlugs(): string[] {
  return matrixRoleSlugs ?? FALLBACK_MATRIX;
}

export function getAssignableRolesCache() {
  return assignableRolesCache;
}

export function isDashboardRole(role: string | undefined | null): boolean {
  if (!role) return false;
  if (role === 'super_admin') return true;
  return getDashboardRoleSlugs().has(role);
}
