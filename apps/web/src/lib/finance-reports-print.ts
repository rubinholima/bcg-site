import { printReportDocument } from "@/lib/report-print-engine";
import { REPORT_PRINT_BREAK_CSS } from "@/lib/report-print-layout";

export type FinancePrintMeta = {
  title: string;
  empresa: string;
  period: string;
  dateBasis: string;
  view: string;
  filtersSummary: string;
};

export function printFinanceReport(
  meta: FinancePrintMeta,
  summaryRows: Array<{ label: string; value: string }>,
  detailRows: Array<Record<string, string | number | null>>,
  detailColumns: Array<{ key: string; label: string }>,
): void {
  const head = `
    <h1 style="font-size:18px;margin:0 0 8px">${meta.title}</h1>
    <p style="font-size:11px;margin:0 0 4px"><strong>Empresa:</strong> ${meta.empresa}</p>
    <p style="font-size:11px;margin:0 0 4px"><strong>Período:</strong> ${meta.period}</p>
    <p style="font-size:11px;margin:0 0 4px"><strong>Base temporal:</strong> ${meta.dateBasis}</p>
    <p style="font-size:11px;margin:0 0 4px"><strong>Visão:</strong> ${meta.view}</p>
    <p style="font-size:11px;margin:0 0 12px"><strong>Filtros:</strong> ${meta.filtersSummary || "—"}</p>
    <p style="font-size:10px;margin:0 0 12px;color:#555">Gerado em ${new Date().toLocaleString("pt-BR")}</p>
  `;
  const kpiTable = `
    <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:16px">
      <tbody>
        ${summaryRows
          .map(
            (r) =>
              `<tr><td style="padding:4px 8px;border:1px solid #333">${r.label}</td><td style="padding:4px 8px;border:1px solid #333;text-align:right">${r.value}</td></tr>`,
          )
          .join("")}
      </tbody>
    </table>
  `;
  const th = detailColumns.map((c) => `<th style="padding:4px;border:1px solid #333;font-size:9px">${c.label}</th>`).join("");
  const body = detailRows
    .slice(0, 500)
    .map(
      (row) =>
        `<tr>${detailColumns
          .map((c) => {
            const v = row[c.key];
            return `<td style="padding:3px;border:1px solid #444;font-size:9px">${v == null ? "" : String(v)}</td>`;
          })
          .join("")}</tr>`,
    )
    .join("");
  const detailTable =
    detailRows.length > 0
      ? `<table style="width:100%;border-collapse:collapse"><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table>`
      : "";
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"/><title>Relatório Financeiro</title><style>${REPORT_PRINT_BREAK_CSS} body{font-family:system-ui,sans-serif;padding:16px;color:#111;background:#fff}</style></head><body>${head}${kpiTable}${detailTable}</body></html>`;
  printReportDocument(html);
}
