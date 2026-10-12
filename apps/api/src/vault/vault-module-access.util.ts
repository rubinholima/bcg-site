/** Slugs que permitem ver/listar metadados do Vault (sem revelar segredo). */
export const VAULT_LIST_MODULE_SLUGS = ['vault', 'vault_manage', 'vault_reveal'] as const;

export function hasVaultListModuleAccess(slugs: string[]): boolean {
  return VAULT_LIST_MODULE_SLUGS.some((s) => slugs.includes(s));
}
