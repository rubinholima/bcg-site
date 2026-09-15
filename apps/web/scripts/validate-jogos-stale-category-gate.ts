/**
 * Validação cirúrgica do gate de fetch — sem subir API/Web.
 */
import {
  FIXTURE_CATEGORIES_FALLBACK,
  filterCategoriesForTenant,
} from "../src/lib/fixture-categories";
import { resolveJogosListFetchGate } from "../src/lib/jogos-list-fetch-gate";

const VILLA = ["modulo_ii", "sub20", "sub15", "sub13"];
const BOSTON = ["sub20", "sub17", "sub15", "sub13", "sub14", "sub12"];

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const villaOpts = filterCategoriesForTenant(FIXTURE_CATEGORIES_FALLBACK, VILLA);
const ready = {
  tenantsReady: true,
  selectedTenantFound: true,
  fixtureCategoriesReady: true,
};

const villaStale = resolveJogosListFetchGate({
  tenantId: "villa-id",
  urlCategory: "sub15_2div",
  ...ready,
  tenantCategoryOptions: villaOpts,
});
assert(villaStale.canFetch === false, "sub15_2div stale bloqueado");

const villaCanonical = resolveJogosListFetchGate({
  tenantId: "villa-id",
  urlCategory: "sub15",
  ...ready,
  tenantCategoryOptions: villaOpts,
});
assert(villaCanonical.canFetch === true && villaCanonical.categoryParam === "sub15", "sub15 operacional");

const bostonCanonical = resolveJogosListFetchGate({
  tenantId: "boston-id",
  urlCategory: "sub15",
  ...ready,
  tenantCategoryOptions: filterCategoriesForTenant(FIXTURE_CATEGORIES_FALLBACK, BOSTON),
});
assert(bostonCanonical.canFetch === true && bostonCanonical.categoryParam === "sub15", "Boston sub15");

console.log("SURGICAL TESTS PASSED");
