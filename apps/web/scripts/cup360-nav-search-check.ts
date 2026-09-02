/**
 * Verificação rápida: busca só retorna hrefs autorizados.
 * Uso: npx tsx apps/web/scripts/cup360-nav-search-check.ts
 */
import {
  buildCup360NavV3,
  collectAllPresentationScreens,
} from "../src/lib/cup360-nav-build";
import {
  filterAuthorizedSearchResults,
  searchCup360Navigation,
} from "../src/lib/cup360-nav-search";

const nav = buildCup360NavV3(() => true, true, true, { includeMaster: true });
const authorized = new Set(collectAllPresentationScreens(nav).map((s) => s.href));

const queries = ["atletas", "logistica", "psicologia", "cartoes", "relatorios"];
let failed = false;

for (const q of queries) {
  const results = filterAuthorizedSearchResults(
    searchCup360Navigation(nav, q, 20),
    authorized,
  );
  const bad = results.filter((r) => !authorized.has(r.href));
  if (bad.length > 0) {
    failed = true;
    console.error(`FAIL query="${q}": unauthorized`, bad);
  } else {
    console.log(`OK query="${q}": ${results.length} resultado(s)`);
  }
}

process.exit(failed ? 1 : 0);
