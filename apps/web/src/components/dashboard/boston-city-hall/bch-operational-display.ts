export type BchEventListLike = {
  id: string;
  name: string;
  slug?: string | null;
};

/** Registros de smoke/integration test no tenant BCH (nome com sufixo numérico longo). */
const SMOKE_EVENT_NAME =
  /^(BCH Bar Smoke|Smoke Ticketing|BCH Core Smoke|POS Smoke|Smoke Beer|Smoke Whisky)\b/i;

const SMOKE_EVENT_SLUG = /^(bch-bar-smoke-|smoke-tix-|bch-core-smoke)/i;

export function isBchSmokeTestEvent(item: BchEventListLike): boolean {
  const name = item.name?.trim() ?? "";
  if (SMOKE_EVENT_NAME.test(name) && /\d{10,}/.test(name)) return true;
  const slug = item.slug?.trim() ?? "";
  if (slug && SMOKE_EVENT_SLUG.test(slug)) return true;
  return false;
}

/** Listas operacionais — oculta eventos de smoke test; slug só uso interno. */
export function bchOperationalEventOptions(
  events: BchEventListLike[],
  opts?: { includeSmokeTests?: boolean },
): { value: string; label: string }[] {
  const list = bchOperationalEventList(events, opts);
  return list.map((ev) => ({
    value: ev.id,
    label: ev.name?.trim() || "Evento sem nome",
  }));
}

export function bchOperationalEventList<T extends BchEventListLike>(
  events: T[],
  opts?: { includeSmokeTests?: boolean },
): T[] {
  if (opts?.includeSmokeTests) return events;
  return events.filter((ev) => !isBchSmokeTestEvent(ev));
}

/** Rótulo de produto comercial — nunca expor ID técnico na UI. */
export function bchProductDisplayName(
  productName: string | null | undefined,
  fallback?: { name?: string | null; sku?: string | null },
): string {
  const primary = productName?.trim();
  if (primary) return primary;
  const alt = fallback?.name?.trim();
  if (alt) return alt;
  return "Produto sem nome";
}

const SMOKE_PRODUCT_NAME = /^(Smoke Beer|Smoke Whisky|POS Smoke)/i;

export type BchProductListLike = {
  name?: string;
  productName?: string;
  sku?: string | null;
  productSku?: string | null;
};

export function isBchSmokeTestProduct(item: BchProductListLike): boolean {
  const name = (item.productName ?? item.name ?? "").trim();
  if (SMOKE_PRODUCT_NAME.test(name) && /\d{10,}/.test(name)) return true;
  const sku = (item.productSku ?? item.sku ?? "").trim();
  if (/^(SMK-|POS-SMOKE-)/i.test(sku) && /\d{10,}/.test(sku)) return true;
  return false;
}

export function bchOperationalProducts<T extends BchProductListLike>(
  products: T[],
  opts?: { includeSmokeTests?: boolean },
): T[] {
  if (opts?.includeSmokeTests) return products;
  return products.filter((p) => !isBchSmokeTestProduct(p));
}
