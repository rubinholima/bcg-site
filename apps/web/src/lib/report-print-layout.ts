import {
  DEFAULT_REPORT_PRINT_CONFIG,
  ReportCover,
  ReportDocument,
  type ReportOrientation,
  type ReportPaperSize,
  type ReportPrintConfig,
} from "@/lib/report-print-engine";

/**
 * Layout de impressão compartilhado — evita página 1 em branco e
 * repete o cabeçalho em cada folha (thead do print-root).
 */

/** Regras críticas: NUNCA break-after:avoid no intro (empurra tudo p/ pág. 2). */
export const REPORT_PRINT_BREAK_CSS = `
    .report-intro {
      break-inside: avoid;
      page-break-inside: avoid;
      break-after: auto;
      page-break-after: auto;
    }
    .print-root {
      width: 100%;
      border-collapse: collapse;
      border-spacing: 0;
    }
    .print-root > thead { display: table-header-group; }
    .print-root > tfoot { display: table-footer-group; }
    .print-root > tbody { display: table-row-group; }
    .print-root > thead > tr > td,
    .print-root > tbody > tr > td,
    .print-root > tfoot > tr > td {
      padding: 0;
      border: none;
      vertical-align: top;
    }
    .print-root .report-header-block {
      padding-bottom: 8px;
    }
    .print-root .report-meta-block {
      margin-bottom: 12px;
    }
    /* Conteúdo começa na página 1 — nunca forçar quebra na 1ª seção */
    .section:first-of-type,
    .print-root tbody .section:first-child {
      break-before: auto;
      page-break-before: auto;
    }
`;

function legacyConfig(styles: string): { config: ReportPrintConfig; styles: string } {
  const declaration = styles.match(/@page\s*\{([^}]*)\}/i);
  if (!declaration) return { config: DEFAULT_REPORT_PRINT_CONFIG, styles };
  const body = declaration[1];
  const sizeValue = body.match(/size\s*:\s*([^;]+)/i)?.[1]?.trim().toLowerCase() ?? "a4";
  const paperSize: ReportPaperSize = sizeValue.includes("letter")
    ? "Letter"
    : sizeValue.includes("legal")
      ? "Legal"
      : "A4";
  const orientation: ReportOrientation = sizeValue.includes("landscape")
    ? "landscape"
    : "portrait";
  const marginValues = body
    .match(/margin\s*:\s*([^;]+)/i)?.[1]
    ?.trim()
    .split(/\s+/)
    .map((value) => {
      const number = Number.parseFloat(value);
      return /in$/i.test(value) ? number * 25.4 : /cm$/i.test(value) ? number * 10 : /pt$/i.test(value) ? number * 25.4 / 72 : /px$/i.test(value) ? number * 25.4 / 96 : number;
    })
    .filter(Number.isFinite);
  const values = marginValues?.length ? marginValues : [12, 11, 14, 11];
  const [top, right = top, bottom = top, left = right] =
    values.length === 2
      ? [values[0], values[1], values[0], values[1]]
      : values.length === 3
        ? [values[0], values[1], values[2], values[1]]
        : values;
  return {
    config: { paperSize, orientation, margins: { top, right, bottom, left },
      ...(styles.match(/@page\s*:first\s*\{([^}]*)\}/i) ? {
        firstPageMargins: legacyConfig(`@page {${styles.match(/@page\s*:first\s*\{([^}]*)\}/i)![1]}}`).config.margins,
      } : {}),
    },
    styles: styles.replace(/@page\s*(?::first\s*)?\{[^}]*\}/gi, ""),
  };
}

export function wrapPrintRootDocument(opts: {
  title: string;
  styles: string;
  headerHtml: string;
  metaHtml?: string;
  bodyHtml: string;
  footerHtml: string;
  coverHtml?: string;
  config?: ReportPrintConfig;
}): string {
  const legacy = legacyConfig(opts.styles);
  const meta = opts.metaHtml?.trim()
    ? `<div class="report-meta-block">${opts.metaHtml}</div>`
    : "";
  return ReportDocument({
    title: opts.title,
    config: opts.config ?? legacy.config,
    styles: legacy.styles,
    content: `${opts.coverHtml?.trim() ? ReportCover(opts.coverHtml) : ""}<table class="print-root">
    <thead>
      <tr>
        <td>
          <div class="report-header-block">
            ${opts.headerHtml}
          </div>
        </td>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          ${meta}
          ${opts.bodyHtml}
        </td>
      </tr>
    </tbody>
    <tfoot>
      <tr>
        <td>
          ${opts.footerHtml}
        </td>
      </tr>
    </tfoot>
  </table>`,
  });
}

/** Compatibility entry point: legacy generators keep content/design, physical layout belongs to the engine. */
export function ReportLegacyDocument(html: string): string {
  const rawTitle = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "Relatório CUP360";
  const title = rawTitle.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  const styles = Array.from(html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi), (m) => m[1]).join("\n");
  const body = html.match(/<body([^>]*)>([\s\S]*?)<\/body>/i);
  const legacy = legacyConfig(styles);
  return ReportDocument({ title, styles: legacy.styles, config: legacy.config, content: body?.[2] ?? "", bodyAttributes: body?.[1] });
}
