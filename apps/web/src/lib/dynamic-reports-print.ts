import { formatDateDayMonYear } from "@/lib/format-date";
import { getCategoryLabel } from "@/lib/fixture-categories";
import { reportLogoUrlForPrint } from "@/lib/futebol-relatorios-print";
import { REPORT_PRINT_BREAK_CSS, wrapPrintRootDocument } from "@/lib/report-print-layout";

export type DynamicReportColumn = { key: string; label: string };

export type DynamicReportRowDto = {
  personType: "player" | "employee";
  values: Record<string, string | number | null>;
};

export type DynamicReportGroupDto = {
  groupName: string;
  rows: DynamicReportRowDto[];
};

export type DynamicReportSectionDto = {
  sectionTitle: string;
  groups: DynamicReportGroupDto[];
};

export type DynamicReportResultDto = {
  columns: DynamicReportColumn[];
  sections: DynamicReportSectionDto[];
  filtersSummary: string;
  sortBy: string;
  sortDir: string;
  groupBy: string;
  population: string;
  strippedFields?: string[];
};

export type PrintPageSize = "A4" | "Letter";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatCellValue(key: string, value: string | number | null | undefined): string {
  if (key === "signature") {
    return '<span class="sig-line">&nbsp;</span>';
  }
  if (value == null || value === "") return "—";
  if (key === "birthDate" || key === "loanStartDate" || key === "loanEndDate") {
    return escapeHtml(formatDateDayMonYear(String(value)));
  }
  if (key === "officialMatchMinutes") {
    return escapeHtml(String(value));
  }
  return escapeHtml(String(value));
}

function pageCss(size: PrintPageSize): string {
  const pageSize = size === "Letter" ? "letter" : "A4";
  return `@page { size: ${pageSize}; margin: 12mm 11mm; }`;
}

function baseStyles(size: PrintPageSize): string {
  return `
    ${pageCss(size)}
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "Segoe UI", system-ui, sans-serif; color: #0f172a; background: #fff; font-size: 11px; }
    ${REPORT_PRINT_BREAK_CSS}
    .top-bar { height: 5px; background: linear-gradient(90deg, #059669, #047857); margin-bottom: 14px; border-radius: 2px; }
    .header { margin-bottom: 16px; padding-bottom: 10px; border-bottom: 2px solid #d1fae5; }
    .header h1 { margin: 0 0 4px; font-size: 18px; color: #065f46; }
    .header .meta { font-size: 10px; color: #64748b; }
    .section-block { margin-top: 18px; break-inside: avoid; page-break-inside: avoid; }
    .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #047857; margin: 0 0 10px; padding-bottom: 4px; border-bottom: 1px solid #a7f3d0; }
    .group-title { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #334155; margin: 14px 0 6px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    thead th { background: #ecfdf5; color: #065f46; font-size: 9px; text-transform: uppercase; padding: 7px 6px; border: 1px solid #a7f3d0; text-align: left; }
    tbody td { padding: 7px 6px; border: 1px solid #e2e8f0; vertical-align: middle; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    .sig-line { display: block; min-width: 140px; border-bottom: 1px solid #64748b; min-height: 18px; }
  `;
}

function renderTable(columns: DynamicReportColumn[], rows: DynamicReportRowDto[]): string {
  if (rows.length === 0) {
    return '<p class="meta">Nenhum registro neste grupo.</p>';
  }
  const head = columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join("");
  const body = rows
    .map((row) => {
      const cells = columns
        .map((c) => `<td>${formatCellValue(c.key, row.values[c.key])}</td>`)
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

export function buildDynamicReportPrintHtml(
  title: string,
  clubName: string,
  logoUrl: string | null | undefined,
  data: DynamicReportResultDto,
  pageSize: PrintPageSize = "A4",
): string {
  const sectionsHtml = data.sections
    .map((section) => {
      const groupsHtml = section.groups
        .map((group) => {
          const groupLabel =
            group.groupName && group.groupName !== "—"
              ? `<h3 class="group-title">${escapeHtml(
                  section.sectionTitle === "ATLETAS"
                    ? getCategoryLabel(group.groupName, "pt")
                    : group.groupName,
                )}</h3>`
              : "";
          return `${groupLabel}${renderTable(data.columns, group.rows)}`;
        })
        .join("");
      const sectionHeader =
        data.sections.length > 1 || section.sectionTitle !== "Relatório"
          ? `<h2 class="section-title">${escapeHtml(section.sectionTitle)}</h2>`
          : "";
      return `<div class="section-block">${sectionHeader}${groupsHtml}</div>`;
    })
    .join("");

  const body = `
    <div class="top-bar"></div>
    ${sectionsHtml}
  `;

  const headerHtml = `
    ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="" style="max-height:48px;margin-bottom:8px;" />` : ""}
    <h1 style="margin:0 0 4px;font-size:18px;color:#065f46;">${escapeHtml(title)}</h1>
    <div style="font-size:10px;color:#64748b;">${escapeHtml(clubName)}</div>
  `;

  const metaHtml = `<div style="font-size:10px;color:#64748b;">${escapeHtml(data.filtersSummary)}</div>`;

  return wrapPrintRootDocument({
    title: escapeHtml(title),
    styles: baseStyles(pageSize),
    headerHtml,
    metaHtml,
    bodyHtml: body,
    footerHtml: "",
  });
}

export function printDynamicReportHtml(html: string): void {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}

export function reportTitleForPreset(presetId: string | null | undefined): string {
  if (presetId === "lista_refeitorio") return "Lista Refeitório";
  return "Relatório Dinâmico";
}

export function logoForPrint(tenantLogo?: string | null, allClubs?: boolean): string | null {
  return reportLogoUrlForPrint(tenantLogo ?? null, allClubs ?? false) ?? null;
}
