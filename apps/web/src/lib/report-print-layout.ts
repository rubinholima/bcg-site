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

export function wrapPrintRootDocument(opts: {
  title: string;
  styles: string;
  headerHtml: string;
  metaHtml?: string;
  bodyHtml: string;
  footerHtml: string;
}): string {
  const meta = opts.metaHtml?.trim()
    ? `<div class="report-meta-block">${opts.metaHtml}</div>`
    : "";
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${opts.title}</title>
  <style>${opts.styles}</style>
</head>
<body>
  <table class="print-root">
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
  </table>
</body>
</html>`;
}
