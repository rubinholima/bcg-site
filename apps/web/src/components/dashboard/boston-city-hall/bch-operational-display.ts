export type BchEventListLike = {
  id: string;
  name: string;
  slug?: string | null;
};

/** Remove sufixo numérico longo gerado em testes (somente rótulo na UI). */
export function bchStripGeneratedNumericSuffix(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return trimmed;
  return trimmed.replace(/\s+\d{10,}$/, "").trim() || trimmed;
}

/** Nome do evento para exibição — sempre `name`, nunca slug/ID. */
export function bchEventDisplayName(name: string | null | undefined): string {
  const base = name?.trim();
  if (!base) return "Evento sem nome";
  return bchStripGeneratedNumericSuffix(base);
}

export function bchOperationalEventOptions(events: BchEventListLike[]): { value: string; label: string }[] {
  return events.map((ev) => ({
    value: ev.id,
    label: bchEventDisplayName(ev.name),
  }));
}

/** Lista completa de eventos (sem ocultar registros). */
export function bchOperationalEventList<T extends BchEventListLike>(events: T[]): T[] {
  return events;
}

/** Rótulo de produto — `name` com limpeza de sufixo; nunca expor ID técnico na UI. */
export function bchProductDisplayName(
  productName: string | null | undefined,
  fallback?: { name?: string | null; sku?: string | null },
): string {
  const primary = productName?.trim();
  if (primary) return bchStripGeneratedNumericSuffix(primary);
  const alt = fallback?.name?.trim();
  if (alt) return bchStripGeneratedNumericSuffix(alt);
  return "Produto sem nome";
}

export type BchProductListLike = {
  name?: string;
  productName?: string;
  sku?: string | null;
  productSku?: string | null;
};

/** Lista completa de produtos (sem ocultar registros). */
export function bchOperationalProducts<T extends BchProductListLike>(products: T[]): T[] {
  return products;
}
