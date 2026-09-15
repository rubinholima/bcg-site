/**
 * Validação local — categorias operacionais vs competição FMF.
 * Uso: pnpm exec tsx apps/web/scripts/validate-fixture-categories.ts
 */
import {
  FIXTURE_CATEGORIES_FALLBACK,
  filterCategoriesForTenant,
  getCategoryLabel,
  toOperationalCategoryKey,
} from "../src/lib/fixture-categories";

const VILLA_LEGACY = ["modulo_ii", "sub15_2div", "sub20_2div", "sub13_2div"];
const VILLA_CORRECT = ["modulo_ii", "sub20", "sub15", "sub13"];
const BOSTON = ["sub20", "sub17", "sub15", "sub13", "sub14", "sub12"];

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const villaFromLegacy = filterCategoriesForTenant(FIXTURE_CATEGORIES_FALLBACK, VILLA_LEGACY);
const villaCorrect = filterCategoriesForTenant(FIXTURE_CATEGORIES_FALLBACK, VILLA_CORRECT);

console.log("VILLA from legacy tenant keys", villaFromLegacy.map((c) => ({ value: c.value, label: c.labelPT })));

assert(villaFromLegacy.length === 4, "Villa deve ter 4 categorias operacionais");
assert(
  !villaFromLegacy.some((c) => c.value.includes("_2div")),
  "Nenhuma opção *_2div no selector",
);
assert(
  villaFromLegacy.some((c) => c.value === "sub15" && c.labelPT === "Sub-15"),
  "Sub-15 operacional",
);
assert(getCategoryLabel("sub20_2div", "pt") === "Sub-20", "Label de dado legado sub20_2div");

const bostonOpts = filterCategoriesForTenant(FIXTURE_CATEGORIES_FALLBACK, BOSTON);
assert(
  JSON.stringify(bostonOpts.map((c) => c.value).sort()) === JSON.stringify([...BOSTON].sort()),
  "Boston inalterado",
);

assert(toOperationalCategoryKey("sub15_2div") === "sub15", "toOperationalCategoryKey");
assert(JSON.stringify(villaCorrect.map((c) => c.value).sort()) === JSON.stringify(["modulo_ii", "sub13", "sub15", "sub20"]), "Villa canonical tenant");

console.log("ALL TESTS PASSED");
