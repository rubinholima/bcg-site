/** Tenant escolhido em Marketing → Boston TV — mantido até o usuário trocar. */
export const BOSTON_TV_TENANT_STORAGE_KEY = "boston_tv_tenant_id";

export function getStoredBostonTvTenantId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(BOSTON_TV_TENANT_STORAGE_KEY);
}

export function setStoredBostonTvTenantId(tenantId: string): void {
  if (typeof window === "undefined" || !tenantId) return;
  window.localStorage.setItem(BOSTON_TV_TENANT_STORAGE_KEY, tenantId);
}

export function pickBostonTvTenantId(
  tenants: { id: string }[],
  current: string,
  userTenantIds: string[] | null | undefined,
): string {
  const list = tenants;
  if (current && list.some((t) => t.id === current)) return current;

  const stored = getStoredBostonTvTenantId();
  if (stored && list.some((t) => t.id === stored)) return stored;

  if (userTenantIds?.length === 1 && list.some((t) => t.id === userTenantIds[0])) {
    return userTenantIds[0];
  }

  return list[0]?.id ?? "";
}
