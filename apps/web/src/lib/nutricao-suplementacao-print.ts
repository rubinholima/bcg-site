import { getCategoryLabel } from "@/lib/fixture-categories";
import { formatDateDayMonYear } from "@/lib/format-date";
import { printHtmlDocument } from "@/lib/futebol-relatorios-print";
import type { SupplementReportPeriod, SupplementationReport } from "@/lib/nutricao-types";

function esc(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function scopeLabel(scope: string): string {
  if (scope === "team") return "Time todo";
  if (scope === "category") return "Por categoria";
  if (scope === "individual") return "Individual";
  return "Geral";
}

function periodLabel(period: SupplementReportPeriod): string {
  return period === "week" ? "Semanal" : "Mensal";
}

export function buildSupplementationPrintHtml(
  report: SupplementationReport,
  period: SupplementReportPeriod,
  generatedAt = new Date(),
): string {
  const title = `Suplementação — ${periodLabel(period)} — ${scopeLabel(report.scope)}`;
  const rows =
    report.guides.length === 0
      ? `<tr><td colspan="4" class="muted">Nenhum item cadastrado.</td></tr>`
      : report.guides
          .map((g) => {
            const scope =
              g.player != null
                ? `${g.player.name}${g.player.jerseyNumber != null ? ` #${g.player.jerseyNumber}` : ""}${g.player.category ? ` · ${getCategoryLabel(g.player.category, "pt")}` : ""}`
                : g.category?.name ?? "Time todo";
            return `<tr>
              <td><strong>${esc(g.name)}</strong></td>
              <td>${esc(scope)}</td>
              <td>${esc(g.whenToTake || "—")}</td>
              <td>${esc(g.notes || "—")}</td>
            </tr>`;
          })
          .join("");

  const rosterBlock =
    report.rosterPlayers.length > 0
      ? `<h2>Elenco (referência)</h2>
         <p class="meta">${report.rosterPlayers
           .map(
             (p) =>
               `${esc(p.name)}${p.jerseyNumber != null ? ` #${p.jerseyNumber}` : ""}`,
           )
           .join(" · ")}</p>`
      : "";

  const body = `<h1>${esc(title)}</h1>
    <p class="meta">${esc(report.tenant.name)} · Emitido em ${formatDateDayMonYear(generatedAt)}</p>
    <p class="meta">Quadro de distribuição / cozinha</p>
    <table>
      <thead><tr>
        <th>Suplemento</th>
        <th>Escopo</th>
        <th>Quando tomar</th>
        <th>Observações</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${rosterBlock}`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${esc(title)}</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #111; }
  h1 { font-size: 16px; margin: 0 0 4px; }
  h2 { font-size: 13px; margin: 16px 0 6px; }
  .meta { color: #444; margin: 0 0 8px; }
  .muted { color: #666; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { border: 1px solid #ccc; padding: 5px 6px; vertical-align: top; }
  th { background: #f3f3f3; text-align: left; }
</style>
</head>
<body>${body}</body>
</html>`;
}

export function printSupplementationReport(
  report: SupplementationReport,
  period: SupplementReportPeriod,
): void {
  const title = `Suplementação — ${period}`;
  printHtmlDocument(buildSupplementationPrintHtml(report, period), title);
}
