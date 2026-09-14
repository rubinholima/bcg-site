export type JogosListFetchGateInput = {
  tenantId: string;
  urlCategory: string;
  tenantsReady: boolean;
  selectedTenantFound: boolean;
  fixtureCategoriesReady: boolean;
  tenantCategoryOptions: readonly { value: string }[];
};

export type JogosListFetchGateResult = {
  canFetch: boolean;
  /** Categoria enviada à API — undefined = Todas (sem query param). */
  categoryParam: string | undefined;
};

/**
 * Bloqueia fetch com categoria stale/ inválida até tenant e opções canônicas estarem resolvidos.
 */
export function resolveJogosListFetchGate(
  input: JogosListFetchGateInput,
): JogosListFetchGateResult {
  const {
    tenantId,
    urlCategory,
    tenantsReady,
    selectedTenantFound,
    fixtureCategoriesReady,
    tenantCategoryOptions,
  } = input;

  if (!tenantId) {
    return { canFetch: false, categoryParam: undefined };
  }
  if (!tenantsReady || !selectedTenantFound) {
    return { canFetch: false, categoryParam: undefined };
  }
  if (!fixtureCategoriesReady) {
    return { canFetch: false, categoryParam: undefined };
  }

  const category = urlCategory.trim();
  if (!category) {
    return { canFetch: true, categoryParam: undefined };
  }

  const isValid = tenantCategoryOptions.some((c) => c.value === category);
  if (!isValid) {
    return { canFetch: false, categoryParam: undefined };
  }

  return { canFetch: true, categoryParam: category };
}
