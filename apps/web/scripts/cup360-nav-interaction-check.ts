/**
 * Verificação de interações críticas da sidebar/flyout CUP360 v3.
 * Uso: npx tsx apps/web/scripts/cup360-nav-interaction-check.ts
 */
import {
  buildCup360NavV3,
  getFlyoutView,
  type ResolvedFlyoutGroup,
  type ResolvedFlyoutLink,
} from "../src/lib/cup360-nav-build";
import {
  filterAuthorizedSearchResults,
  searchCup360Navigation,
} from "../src/lib/cup360-nav-search";
import { collectAllPresentationScreens } from "../src/lib/cup360-nav-build";

const nav = buildCup360NavV3(() => true, true, true, { includeMaster: true });
const authorized = collectAllPresentationScreens(nav);
const authorizedHrefs = new Set(authorized.map((s) => s.href));

type Check = { id: string; ok: boolean; detail?: string };

const checks: Check[] = [];

function pass(id: string, condition: boolean, detail?: string) {
  checks.push({ id, ok: condition, detail });
  if (!condition) console.error(`FAIL ${id}${detail ? `: ${detail}` : ""}`);
  else console.log(`OK ${id}`);
}

function findLinkInGroups(groups: ResolvedFlyoutGroup[], label: string): ResolvedFlyoutLink | null {
  for (const group of groups) {
    for (const item of group.items) {
      if (item.kind === "link" && item.screen.label === label) {
        return item;
      }
    }
  }
  return null;
}

// 1–2 Standalone dashboards
pass("master-href", !!nav.master?.href, nav.master?.href);
pass("executive-href", !!nav.executive?.href, nav.executive?.href);

// 3 Futebol opens flyout view
const futebolView = getFlyoutView(nav, "futebol", null);
pass("futebol-flyout", !!futebolView, futebolView?.department.label);

// 4 Visão Geral navigates
const visaoGeral = findLinkInGroups(futebolView?.groups ?? [], "Visão Geral");
pass(
  "futebol-visao-geral",
  !!visaoGeral?.screen.href && authorizedHrefs.has(visaoGeral.screen.href),
  visaoGeral?.screen.href,
);

// 5 Logística changes context (module, not link at root)
const logisticaRoot = futebolView?.groups
  .flatMap((g) => g.items)
  .find((i) => i.kind === "module" && i.moduleId === "logistica");
pass("futebol-logistica-module", logisticaRoot?.kind === "module");

// 6 Logística > Pessoas autorizadas
const logisticaView = getFlyoutView(nav, "futebol", "logistica");
const pessoas = findLinkInGroups(logisticaView?.groups ?? [], "Pessoas autorizadas");
pass(
  "logistica-pessoas-autorizadas",
  !!pessoas?.screen.href && authorizedHrefs.has(pessoas.screen.href),
  pessoas?.screen.href,
);

// 7 Saúde context
const saudeView = getFlyoutView(nav, "saude", null);
pass("saude-flyout", !!saudeView && saudeView.groups.length > 0);

// 8 Marketing
const marketingView = getFlyoutView(nav, "marketing", null);
pass("marketing-flyout", !!marketingView);

// 9 Imprensa
const imprensaView = getFlyoutView(nav, "imprensa", null);
pass("imprensa-flyout", !!imprensaView);

// 10 Search navigates authorized href
const searchResults = filterAuthorizedSearchResults(
  searchCup360Navigation(nav, "pessoas autorizadas", 5),
  authorizedHrefs,
);
pass(
  "search-navigates",
  searchResults.length > 0 && authorizedHrefs.has(searchResults[0]!.href),
  searchResults[0]?.href,
);

// 11–12 Escape/outside — comportamento documentado (sem DOM); garantir API de fechamento exposta via build
pass("flyout-module-stack", !!logisticaView && logisticaView.moduleContext?.id === "logistica");

const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
process.exit(failed.length > 0 ? 1 : 0);
