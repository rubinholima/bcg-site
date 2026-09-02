export type ReportPaperSize = "A4" | "Letter" | "Legal";
export type ReportOrientation = "portrait" | "landscape";

export interface ReportMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ReportPrintConfig {
  paperSize: ReportPaperSize;
  orientation: ReportOrientation;
  /** Margens físicas, em milímetros. */
  margins: ReportMargins;
  firstPageMargins?: ReportMargins;
}

export interface ReportPageMetrics {
  paperWidth: number;
  paperHeight: number;
  usableWidth: number;
  usableHeight: number;
}

export const REPORT_PAPER_SIZES: Record<ReportPaperSize, { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  Letter: { width: 215.9, height: 279.4 },
  Legal: { width: 215.9, height: 355.6 },
};

export const DEFAULT_REPORT_PRINT_CONFIG: ReportPrintConfig = {
  paperSize: "A4",
  orientation: "portrait",
  margins: { top: 12, right: 11, bottom: 14, left: 11 },
};

export function getReportPageMetrics(config: ReportPrintConfig): ReportPageMetrics {
  const paper = REPORT_PAPER_SIZES[config.paperSize];
  const portrait = config.orientation === "portrait";
  const paperWidth = portrait ? paper.width : paper.height;
  const paperHeight = portrait ? paper.height : paper.width;
  return {
    paperWidth,
    paperHeight,
    usableWidth: paperWidth - config.margins.left - config.margins.right,
    usableHeight: paperHeight - config.margins.top - config.margins.bottom,
  };
}

function cssSizeName(size: ReportPaperSize): string {
  return size === "A4" ? "A4" : size.toLowerCase();
}

/** Regras físicas e de quebra usadas por todos os documentos de relatório. */
export function reportPrintCss(config: ReportPrintConfig = DEFAULT_REPORT_PRINT_CONFIG): string {
  const { usableWidth, usableHeight } = getReportPageMetrics(config);
  const { margins, firstPageMargins } = config;
  return `
    @page {
      size: ${cssSizeName(config.paperSize)} ${config.orientation};
      margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm;
    }
    ${firstPageMargins ? `@page :first { margin: ${firstPageMargins.top}mm ${firstPageMargins.right}mm ${firstPageMargins.bottom}mm ${firstPageMargins.left}mm; }` : ""}
    :root {
      --report-usable-width: ${usableWidth}mm;
      --report-usable-height: ${usableHeight}mm;
    }
    *, *::before, *::after { box-sizing: border-box; }
    html, body { max-width: 100%; }
    body { margin: 0; }
    .report-document {
      width: var(--report-usable-width);
      max-width: 100%;
      margin: 0 auto;
      overflow: visible;
    }
    .report-page {
      width: 100%;
      max-width: var(--report-usable-width);
      position: relative;
    }
    .report-page[data-explicit-page="true"] {
      /* A logical page may contain repeated table headers/footers. Never reserve a second physical sheet. */
      min-height: 0;
      break-after: page;
      page-break-after: always;
    }
    .report-page[data-explicit-page="true"]:last-child {
      break-after: auto;
      page-break-after: auto;
    }
    .report-cover {
      width: 100%;
      height: var(--report-usable-height);
      min-height: 0;
      max-height: var(--report-usable-height);
      overflow: hidden;
      break-after: page;
      page-break-after: always;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .report-section { break-inside: auto; page-break-inside: auto; }
    
    .report-atomic,
    .report-header,
    .report-footer,
    figure,
    img,
    svg,
    canvas,
    .signature,
    .card {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .report-section[data-splittable="true"] { break-inside: auto; page-break-inside: auto; }
    h1, h2, h3, h4, h5, h6, .section-title, .report-section > .report-header {
      break-after: avoid;
      page-break-after: avoid;
    }
    .report-table, table:not(.print-root) {
      width: 100%;
      max-width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
      overflow-wrap: anywhere;
      word-break: normal;
    }
    .report-table thead, table:not(.print-root) thead { display: table-header-group; }
    .report-table tfoot, table:not(.print-root) tfoot { display: table-footer-group; }
    .report-table tr, table:not(.print-root) tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .report-table th, .report-table td, table:not(.print-root) th, table:not(.print-root) td {
      max-width: 100%;
      white-space: normal;
      overflow-wrap: anywhere;
    }
    .report-watermark {
      position: fixed; top: 0; right: 0; width: 12mm; height: 10mm;
      object-fit: contain; opacity: .10; filter: grayscale(1) invert(1); z-index: 2147483647; pointer-events: none;
    }
    .print-root > tbody > tr, .print-root > tbody > tr > td {
      break-inside: auto; page-break-inside: auto;
    }
    @media print {
      html, body, .report-document { width: auto; max-width: none; }
      .report-document { margin: 0; }
      body { margin: 0; padding: 0; }
    }
  `;
}

function attrs(values: Record<string, string | boolean | undefined>): string {
  return Object.entries(values)
    .filter(([, value]) => value !== undefined && value !== false)
    .map(([key, value]) => `${key}="${value === true ? "true" : String(value)}"`)
    .join(" ");
}

export function ReportPage(content: string, options: { className?: string; explicit?: boolean } = {}): string {
  return `<section ${attrs({ class: `report-page ${options.className ?? ""}`.trim(), "data-explicit-page": options.explicit })}>${content}</section>`;
}

export function ReportCover(content: string, className = ""): string {
  return `<section class="report-cover ${className}" data-explicit-page="true">${content}</section>`;
}

export function ReportSection(content: string, options: { className?: string; splittable?: boolean } = {}): string {
  return `<section ${attrs({ class: `report-section ${options.className ?? ""}`.trim(), "data-splittable": options.splittable ?? true })}>${content}</section>`;
}

export function ReportTable(content: string, className = ""): string {
  return `<table class="report-table ${className}">${content}</table>`;
}

export function ReportHeader(content: string, className = ""): string {
  return `<header class="report-header ${className}">${content}</header>`;
}

export function ReportFooter(content: string, className = ""): string {
  return `<footer class="report-footer ${className}">${content}</footer>`;
}

export function ReportDocument(options: {
  title: string;
  content: string;
  styles?: string;
  config?: ReportPrintConfig;
  bodyAttributes?: string;
}): string {
  const config = options.config ?? DEFAULT_REPORT_PRINT_CONFIG;
  const title = escapeReportHtml(options.title);
  const logo = typeof window === "undefined" ? "/cup360-logo.png" : new URL("/cup360-logo.png", window.location.origin).href;
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <meta name="author" content="CUP360" />
  <style>${options.styles ?? ""}${reportPrintCss(config)}</style>
</head>
<body ${options.bodyAttributes ?? ""}><img class="report-watermark" src="${logo}" alt="" aria-hidden="true" /><main class="report-document">${options.content}</main></body>
</html>`;
}

function escapeReportHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Print only after fonts and images settle; Chrome uses the top-level title for Save as PDF. */
export function printReportDocument(html: string): void {
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  frame.title = "Impressão do relatório";
  frame.onload = async () => {
    const win = frame.contentWindow;
    const doc = frame.contentDocument;
    if (!win || !doc) { frame.remove(); return; }
    await doc.fonts.ready;
    await Promise.all(Array.from(doc.images, (img) => img.decode().catch(() => undefined)));
    const previousTitle = document.title;
    const reportTitle = doc.title || "Relatório CUP360";
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      if (document.title === reportTitle) document.title = previousTitle;
      frame.remove();
    };
    win.addEventListener("afterprint", cleanup, { once: true });
    document.title = reportTitle;
    try { win.focus(); win.print(); } catch (error) { cleanup(); throw error; }
    // Safety net for browsers that omit afterprint; never remove a live print frame after 1 second.
    window.setTimeout(cleanup, 300_000);
  };
  frame.srcdoc = html;
  document.body.appendChild(frame);
}
