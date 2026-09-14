/**
 * Validação local do mapeamento label/value de categorias — sem subir API/Web.
 * Uso: pnpm exec tsx apps/web/scripts/validate-fixture-categories.ts
 */
import {
  FIXTURE_CATEGORIES_FALLBACK,
  filterCategoriesForTenant,
  getCategoryLabel,
} from "../src/lib/fixture-categories";

const VILLA = ["modulo_ii", "sub15_2div", "sub20_2div", "sub13_2div"];
const BOSTON = ["sub20", "sub17", "sub15", "sub13", "sub14", "sub12"];

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const villaOpts = filterCategoriesForTenant(FIXTURE_CATEGORIES_FALLBACK, VILLA);
const bostonOpts = filterCategoriesForTenant(FIXTURE_CATEGORIES_FALLBACK, BOSTON);

console.log("VILLA options", villaOpts.map((c) => ({ value: c.value, label: c.labelPT })));

assert(villaOpts.length === 4, `Villa deve ter 4 opções, got ${villaOpts.length}`);
assert(
  villaOpts.some((c) => c.value === "sub15_2div" && c.labelPT.includes("Sub-15")),
  "sub15_2div deve preservar value canônico com label Sub-15",
);
assert(
  getCategoryLabel("sub15_2div", "pt", FIXTURE_CATEGORIES_FALLBACK).includes("Sub-15"),
  "getCategoryLabel sub15_2div",
);

const bostonValues = bostonOpts.map((c) => c.value).sort();
assert(
  JSON.stringify(bostonValues) === JSON.stringify([...BOSTON].sort()),
  `Boston regression: ${JSON.stringify(bostonValues)}`,
);

console.log("BOSTON options OK", bostonOpts.map((c) => c.value));
console.log("ALL TESTS PASSED");
