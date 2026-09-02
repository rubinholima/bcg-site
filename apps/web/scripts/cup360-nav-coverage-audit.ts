/**
 * Auditoria única: destinos do DASHBOARD_MENU vs apresentação CUP360 (super_admin / acesso total).
 * Uso: npx tsx apps/web/scripts/cup360-nav-coverage-audit.ts
 */
import { auditCup360NavCoverage } from "../src/lib/cup360-nav-build";

const report = auditCup360NavCoverage(() => true, true, true);

console.log("=== CUP360 NAV COVERAGE (acesso total) ===");
console.log(`Menu leaves: ${report.menuLeafCount}`);
console.log(`Presentation leaves (unique hrefs): ${report.presentationLeafCount}`);
console.log(`Mapped: ${report.mapped.length}`);
console.log(`Missing: ${report.missing.length}`);
console.log(`Duplicates in presentation: ${report.duplicates.length}`);
console.log(`Intentional exclusions: ${report.intentionalExclusions.length}`);

if (report.missing.length > 0) {
  console.log("\n--- MISSING ---");
  for (const m of report.missing) {
    console.log(`  ${m.href}  (${m.label})  path=${m.menuPath}`);
  }
}

if (report.duplicates.length > 0) {
  console.log("\n--- DUPLICATES ---");
  for (const href of report.duplicates) {
    console.log(`  ${href}`);
  }
}

if (report.intentionalExclusions.length > 0) {
  console.log("\n--- INTENTIONAL EXCLUSIONS ---");
  for (const x of report.intentionalExclusions) {
    console.log(`  ${x.href} — ${x.reason}`);
  }
}

process.exit(report.missing.length > 0 ? 1 : 0);
