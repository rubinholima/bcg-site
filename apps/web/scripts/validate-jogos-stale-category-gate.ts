/**
 * Validação cirúrgica do gate de fetch — sem subir API/Web.
 * Uso: pnpm exec tsx apps/web/scripts/validate-jogos-stale-category-gate.ts
 */
import {
  FIXTURE_CATEGORIES_FALLBACK,
  filterCategoriesForTenant,
} from "../src/lib/fixture-categories";
import { resolveJogosListFetchGate } from "../src/lib/jogos-list-fetch-gate";

const VILLA_CATS = ["modulo_ii", "sub15_2div", "sub20_2div", "sub13_2div"];
const BOSTON_CATS = ["sub20", "sub17", "sub15", "sub13", "sub14", "sub12"];

const villaOptions = filterCategoriesForTenant(FIXTURE_CATEGORIES_FALLBACK, VILLA_CATS);
const bostonOptions = filterCategoriesForTenant(FIXTURE_CATEGORIES_FALLBACK, BOSTON_CATS);

const ready = {
  tenantsReady: true,
  selectedTenantFound: true,
  fixtureCategoriesReady: true,
};

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

// 1. Villa URL category=sub15 → ZERO requests with category=sub15
const villaStale = resolveJogosListFetchGate({
  tenantId: "villa-id",
  urlCategory: "sub15",
  ...ready,
  tenantCategoryOptions: villaOptions,
});
assert(villaStale.canFetch === false, "Villa sub15 stale deve bloquear fetch");
assert(villaStale.categoryParam === undefined, "Villa sub15 stale não deve enviar categoryParam");

// 2. after resolution → unfiltered/canonical request
const villaTodas = resolveJogosListFetchGate({
  tenantId: "villa-id",
  urlCategory: "",
  ...ready,
  tenantCategoryOptions: villaOptions,
});
assert(villaTodas.canFetch === true && villaTodas.categoryParam === undefined, "Villa Todas após resolução");

// 3. Villa category=sub15_2div → normal request
const villaCanonical = resolveJogosListFetchGate({
  tenantId: "villa-id",
  urlCategory: "sub15_2div",
  ...ready,
  tenantCategoryOptions: villaOptions,
});
assert(
  villaCanonical.canFetch === true && villaCanonical.categoryParam === "sub15_2div",
  "Villa sub15_2div canônico",
);

// 4. Boston category=sub15 → normal request
const bostonCanonical = resolveJogosListFetchGate({
  tenantId: "boston-id",
  urlCategory: "sub15",
  ...ready,
  tenantCategoryOptions: bostonOptions,
});
assert(
  bostonCanonical.canFetch === true && bostonCanonical.categoryParam === "sub15",
  "Boston sub15 canônico",
);

// 5. Todas continues working (tenant still loading → block; resolved → allow)
const todasLoading = resolveJogosListFetchGate({
  tenantId: "villa-id",
  urlCategory: "",
  tenantsReady: false,
  selectedTenantFound: false,
  fixtureCategoriesReady: false,
  tenantCategoryOptions: [],
});
assert(todasLoading.canFetch === false, "Todas bloqueada enquanto tenant não resolve");

const todasReady = resolveJogosListFetchGate({
  tenantId: "boston-id",
  urlCategory: "",
  ...ready,
  tenantCategoryOptions: bostonOptions,
});
assert(todasReady.canFetch === true && todasReady.categoryParam === undefined, "Todas após resolução");

console.log("SURGICAL TESTS PASSED");
console.log("1. Villa sub15 stale => canFetch=false (zero API com category=sub15)");
console.log("2. Villa Todas resolvida => canFetch=true, sem categoryParam");
console.log("3. Villa sub15_2div => canFetch=true, categoryParam=sub15_2div");
console.log("4. Boston sub15 => canFetch=true, categoryParam=sub15");
console.log("5. Todas => bloqueia até resolver; depois ok sem categoryParam");
