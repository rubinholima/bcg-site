/**
 * Gera PDF do manual de convocação a partir do HTML.
 * Uso: pnpm exec ts-node --transpile-only scripts/generate-convocacao-manual-pdf.ts
 * (a partir de apps/api) ou node com playwright do workspace.
 */
import { chromium } from "playwright";
import * as path from "path";
import * as fs from "fs";

async function main() {
  const root = path.resolve(__dirname, "../../..");
  const htmlPath = path.join(root, "docs", "manual-convocacao-logistica.html");
  const outPath = path.join(root, "docs", "Manual-Convocacao-Logistica-BCG.pdf");

  if (!fs.existsSync(htmlPath)) {
    throw new Error(`HTML não encontrado: ${htmlPath}`);
  }

  const fileUrl = "file:///" + htmlPath.replace(/\\/g, "/");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(fileUrl, { waitUntil: "load" });
    await page.pdf({
      path: outPath,
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", right: "10mm", bottom: "12mm", left: "10mm" },
    });
    console.log("PDF gerado:", outPath);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
