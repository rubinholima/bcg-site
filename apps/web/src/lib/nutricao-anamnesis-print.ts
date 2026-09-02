import { ReportLegacyDocument } from "@/lib/report-print-layout";
import { formatDateDayMonYear } from "@/lib/format-date";
import { getCategoryLabel } from "@/lib/fixture-categories";
import { printHtmlDocument } from "@/lib/futebol-relatorios-print";
import {
  NUTRITION_ANAMNESIS_SECTIONS,
  type NutritionAnamnesisData,
  nutritionAnamnesisLabel,
} from "@/lib/nutricao-anamnesis";
import type { NutritionAnamnesisRow } from "@/lib/nutricao-types";

function esc(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildNutritionAnamnesisPrintHtml(
  row: NutritionAnamnesisRow,
  tenantName?: string,
): string {
  const data = (row.data ?? {}) as NutritionAnamnesisData;
  const player = row.player;
  const title = `Anamnese nutricional — ${player?.name ?? "Atleta"}`;
  const assessed = formatDateDayMonYear(new Date(row.assessedAt));

  const sections = NUTRITION_ANAMNESIS_SECTIONS.map((section) => {
    const fields = section.fields
      .map((field) => {
        const val = data[field.key]?.trim();
        if (!val) return "";
        return `<tr><th>${esc(field.label)}</th><td>${esc(val).replace(/\n/g, "<br/>")}</td></tr>`;
      })
      .filter(Boolean)
      .join("");
    if (!fields) return "";
    return `<h2>${esc(section.title)}</h2><table class="qa">${fields}</table>`;
  }).join("");

  const notes = row.notes?.trim()
    ? `<h2>Notas adicionais</h2><p>${esc(row.notes).replace(/\n/g, "<br/>")}</p>`
    : "";

  const body = `<h1>${esc(title)}</h1>
    <p class="meta">${tenantName ? `${esc(tenantName)} · ` : ""}Data: ${assessed}${player?.category ? ` · ${esc(getCategoryLabel(player.category, "pt"))}` : ""}</p>
    <p class="meta">${esc(nutritionAnamnesisLabel(data))}</p>
    ${sections}
    ${notes}`;

  return ReportLegacyDocument(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${esc(title)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #111; }
  h1 { font-size: 16px; margin: 0 0 4px; }
  h2 { font-size: 12px; margin: 14px 0 6px; border-bottom: 1px solid #ccc; padding-bottom: 2px; }
  .meta { color: #444; margin: 0 0 8px; }
  table.qa { width: 100%; border-collapse: collapse; }
  table.qa th { width: 38%; text-align: left; vertical-align: top; padding: 4px 8px 4px 0; font-weight: 600; }
  table.qa td { padding: 4px 0; vertical-align: top; }
</style>
</head>
<body>${body}</body>
</html>`);
}

export function printNutritionAnamnesis(row: NutritionAnamnesisRow, tenantName?: string): void {
  const title = `Anamnese nutricional — ${row.player?.name ?? "Atleta"}`;
  printHtmlDocument(buildNutritionAnamnesisPrintHtml(row, tenantName), title);
}
