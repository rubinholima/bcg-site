const VAULT_LIST_SLUGS = ["vault", "vault_manage", "vault_reveal"] as const;

export function canAccessVaultList(
  modules: readonly string[],
  role: string | null | undefined,
): boolean {
  if (role === "super_admin") return true;
  return VAULT_LIST_SLUGS.some((s) => modules.includes(s));
}
