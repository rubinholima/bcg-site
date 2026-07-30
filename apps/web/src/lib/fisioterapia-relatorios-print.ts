import { resolveLogoUrlForPrint } from "@/lib/futebol-relatorios-print";
import type { PrintPageSize } from "@/lib/futebol-relatorios.types";
import type { PhysioReportsDashboard } from "@/types/fisioterapia";

const BCG = {
  red: "#C8102E",
  redDark: "#9B0C24",
  blue: "#00205B",
  blueMid: "#003087",
  blueLight: "#E8EEF7",
  redLight: "#FCE8EC",
} as const;

export type FisioterapiaPrintContext = {
  clubName: string;
  logoUrl?: string | null;
  categoryLabel: string;
  periodLabel: string;
  formatCategory?: (value: string) => string;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatBrDate(iso?: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function pageCss(size: PrintPageSize): string {
  const pageSize = size === "Letter" ? "letter" : "A4";
  return `@page { size: ${pageSize}; margin: 12mm 11mm; }`;
}

function baseStyles(size: PrintPageSize): string {
  return `
    ${pageCss(size)}
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      color: #0f172a;
      background: #fff;
      line-height: 1.45;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page { max-width: 100%; margin: 0 auto; }
    .report-intro {
      break-inside: avoid;
      page-break-inside: avoid;
      break-after: avoid;
      page-break-after: avoid;
    }
    .top-bar {
      height: 6px;
      background: linear-gradient(90deg, ${BCG.red} 0%, ${BCG.red} 48%, ${BCG.blue} 52%, ${BCG.blue} 100%);
      border-radius: 3px;
      margin-bottom: 16px;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 16px 18px;
      margin-bottom: 14px;
      background: linear-gradient(135deg, ${BCG.blueLight} 0%, #ffffff 55%, ${BCG.redLight} 100%);
      border: 1px solid #cbd5e1;
      border-left: 5px solid ${BCG.red};
      border-radius: 12px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .logo-wrap {
      flex-shrink: 0;
      width: 88px;
      height: 88px;
      border-radius: 14px;
      border: 2px solid ${BCG.blue};
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .logo-wrap img { max-width: 100%; max-height: 100%; object-fit: contain; padding: 6px; }
    .logo-fallback {
      font-size: 11px;
      font-weight: 800;
      color: ${BCG.blue};
      text-align: center;
      padding: 8px;
    }
    .brand-block { flex: 1; min-width: 0; }
    .brand {
      margin: 0 0 4px;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: ${BCG.red};
    }
    .club {
      margin: 0;
      font-size: 24px;
      font-weight: 800;
      color: ${BCG.blue};
      line-height: 1.12;
    }
    .doc-title {
      margin: 8px 0 0;
      font-size: 14px;
      font-weight: 700;
      color: ${BCG.redDark};
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .badge {
      display: inline-block;
      margin-top: 10px;
      padding: 5px 12px;
      border-radius: 999px;
      background: ${BCG.blue};
      font-size: 10px;
      font-weight: 700;
      color: #fff;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px 16px;
      margin-bottom: 0;
      padding: 12px 14px;
      background: ${BCG.blueLight};
      border: 1px solid #b8c9e8;
      border-top: 3px solid ${BCG.red};
      border-radius: 10px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .meta-item label {
      display: block;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: ${BCG.blueMid};
      margin-bottom: 2px;
    }
    .meta-item span {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: #1e293b;
    }
    .meta-item.full { grid-column: 1 / -1; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      margin: 14px 0 18px;
    }
    .stat {
      padding: 10px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      background: #f8fafc;
      break-inside: avoid;
    }
    .stat-value {
      font-size: 20px;
      font-weight: 800;
      color: ${BCG.blue};
      line-height: 1.1;
    }
    .stat-label {
      margin-top: 4px;
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #64748b;
    }
    .section { margin-bottom: 18px; }
    .section:first-of-type { margin-top: 14px; }
    .section-title {
      margin: 0 0 8px;
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: ${BCG.blue};
      padding-left: 10px;
      border-left: 4px solid ${BCG.red};
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    thead { display: table-header-group; }
    tbody tr { break-inside: avoid; page-break-inside: avoid; }
    thead th {
      background: linear-gradient(180deg, ${BCG.blueMid} 0%, ${BCG.blue} 100%);
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 8px 10px;
      text-align: left;
    }
    thead th.num { text-align: right; }
    tbody td {
      padding: 7px 10px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
    }
    tbody tr:nth-child(even) td { background: #f8fafc; }
    td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
    .empty {
      text-align: center;
      color: #94a3b8;
      font-style: italic;
      padding: 14px;
    }
    .footer {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 2px solid ${BCG.blueLight};
      display: flex;
      justify-content: space-between;
      gap: 12px;
      font-size: 9px;
      color: #64748b;
      break-inside: avoid;
    }
    .footer strong { color: ${BCG.blue}; }
  `;
}

function logoHtml(logoUrl: string | null | undefined, clubName: string): string {
  const absolute = resolveLogoUrlForPrint(logoUrl);
  if (absolute) {
    return `<div class="logo-wrap"><img src="${escapeHtml(absolute)}" alt="${escapeHtml(clubName)}" /></div>`;
  }
  const initials = clubName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase();
  return `<div class="logo-wrap"><div class="logo-fallback">${escapeHtml(initials || "BCG")}</div></div>`;
}

function filterMetaHtml(ctx: FisioterapiaPrintContext): string {
  return `<div class="meta-grid">
    <div class="meta-item"><label>Clube</label><span>${escapeHtml(ctx.clubName)}</span></div>
    <div class="meta-item"><label>Período</label><span>${escapeHtml(ctx.periodLabel)}</span></div>
    <div class="meta-item"><label>Categoria</label><span>${escapeHtml(ctx.categoryLabel)}</span></div>
  </div>`;
}

function documentShell(
  title: string,
  ctx: FisioterapiaPrintContext,
  docTitle: string,
  badge: string,
  body: string,
  size: PrintPageSize,
): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>${baseStyles(size)}</style>
</head>
<body>
  <div class="page">
    <div class="report-intro">
      <div class="top-bar"></div>
      <header class="header">
        ${logoHtml(ctx.logoUrl, ctx.clubName)}
        <div class="brand-block">
          <p class="brand">Boston City Group · Saúde · Fisioterapia</p>
          <h1 class="club">${escapeHtml(ctx.clubName)}</h1>
          <p class="doc-title">${escapeHtml(docTitle)}</p>
          <span class="badge">${escapeHtml(badge)}</span>
        </div>
      </header>
      ${filterMetaHtml(ctx)}
    </div>
    ${body}
    <footer class="footer">
      <span>Gerado em ${escapeHtml(new Date().toLocaleString("pt-BR"))}</span>
      <span><strong>Boston City Group</strong> · Relatório oficial</span>
    </footer>
  </div>
</body>
</html>`;
}

function dataTable(
  title: string,
  headers: string[],
  rows: string[][],
  numericCols: number[] = [],
): string {
  const head = headers
    .map((h, i) => `<th class="${numericCols.includes(i) ? "num" : ""}">${escapeHtml(h)}</th>`)
    .join("");
  const body =
    rows.length === 0
      ? `<tr><td colspan="${headers.length}" class="empty">Nenhum registro no filtro</td></tr>`
      : rows
          .map((cells) => {
            const tds = cells
              .map((c, i) => `<td class="${numericCols.includes(i) ? "num" : ""}">${escapeHtml(c)}</td>`)
              .join("");
            return `<tr>${tds}</tr>`;
          })
          .join("");
  return `<section class="section">
    <h2 class="section-title">${escapeHtml(title)}</h2>
    <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
  </section>`;
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

const STATUS_LABEL: Record<string, string> = {
  active: "Em tratamento",
  completed: "Alta",
  cancelled: "Cancelado",
};

export function buildAtendimentosPrintHtml(
  data: PhysioReportsDashboard,
  ctx: FisioterapiaPrintContext,
  size: PrintPageSize = "A4",
): string {
  const fmt = ctx.formatCategory ?? ((v: string) => v);
  const s = data.summary;

  const stats = `<div class="stats-grid">
    <div class="stat"><div class="stat-value">${s.totalIndividual}</div><div class="stat-label">Individual</div></div>
    <div class="stat"><div class="stat-value">${s.totalGroup}</div><div class="stat-label">Recovery grupo</div></div>
    <div class="stat"><div class="stat-value">${s.activeSessions}</div><div class="stat-label">Ativos</div></div>
    <div class="stat"><div class="stat-value">${s.uniquePlayers}</div><div class="stat-label">Atletas</div></div>
    <div class="stat"><div class="stat-value">${s.completedSessions}</div><div class="stat-label">Altas</div></div>
    <div class="stat"><div class="stat-value">${s.avgPainScore != null ? `${s.avgPainScore}/10` : "—"}</div><div class="stat-label">Dor média EVA</div></div>
    <div class="stat"><div class="stat-value">${s.avgReturnDays != null ? `${s.avgReturnDays}d` : "—"}</div><div class="stat-label">Tempo até alta</div></div>
  </div>`;

  const body = [
    stats,
    dataTable(
      "Por categoria",
      ["Categoria", "Individual", "Recovery", "Ativos", "Total"],
      data.byCategory.map((r) => [
        fmt(r.category),
        String(r.individual),
        String(r.group),
        String(r.active),
        String(r.total),
      ]),
      [1, 2, 3, 4],
    ),
    dataTable(
      "Evolução mensal",
      ["Mês", "Individual", "Recovery"],
      data.byMonth.map((r) => [monthLabel(r.month), String(r.individual), String(r.group)]),
      [1, 2],
    ),
    dataTable(
      "Regiões corporais",
      ["Região", "Ocorrências"],
      data.byRegion.map((r) => [r.regionName, String(r.count)]),
      [1],
    ),
    dataTable(
      "Tratamentos",
      ["Tratamento", "Ocorrências"],
      data.byTreatment.map((r) => [r.label, String(r.count)]),
      [1],
    ),
    dataTable(
      "Status (individual)",
      ["Status", "Quantidade"],
      data.byStatus.map((r) => [STATUS_LABEL[r.status] ?? r.status, String(r.count)]),
      [1],
    ),
    data.byDiagnosis.length
      ? dataTable(
          "Diagnósticos",
          ["Diagnóstico", "Ocorrências"],
          data.byDiagnosis.map((r) => [r.label, String(r.count)]),
          [1],
        )
      : "",
  ].join("");

  return documentShell(
    `Atendimentos — ${ctx.clubName}`,
    ctx,
    "Relatório de Atendimentos",
    ctx.periodLabel,
    body,
    size,
  );
}

export function buildLesionadosPrintHtml(
  data: PhysioReportsDashboard,
  ctx: FisioterapiaPrintContext,
  size: PrintPageSize = "A4",
): string {
  const fmt = ctx.formatCategory ?? ((v: string) => v);
  const rows = data.activeInjured.map((r) => [
    r.playerName,
    r.tenantName,
    r.category ? fmt(r.category) : "—",
    r.regions.map((x) => x.name + (x.side === "E" ? " (E)" : x.side === "D" ? " (D)" : "")).join(" · "),
    r.diagnoses.join(" · ") || "—",
    r.painScore != null ? `${r.painScore}/10` : "—",
    r.estimatedEndDate ? formatBrDate(r.estimatedEndDate.slice(0, 10)) : "—",
    r.staffName ?? "—",
  ]);

  const body = dataTable(
    `Lesionados em tratamento (${data.activeInjured.length})`,
    ["Atleta", "Clube", "Categoria", "Locais", "Diagnósticos", "Dor", "Previsão alta", "Fisio"],
    rows,
  );

  return documentShell(
    `Lesionados — ${ctx.clubName}`,
    ctx,
    "Lesionados em Tratamento",
    `${data.activeInjured.length} atleta(s)`,
    body,
    size,
  );
}

export function buildCargaFisioPrintHtml(
  data: PhysioReportsDashboard,
  ctx: FisioterapiaPrintContext,
  size: PrintPageSize = "A4",
): string {
  const rows = data.byStaff.map((s) => [
    s.staffName,
    String(s.individual),
    String(s.group),
    String(s.individual + s.group),
  ]);
  const totalInd = data.byStaff.reduce((a, s) => a + s.individual, 0);
  const totalGrp = data.byStaff.reduce((a, s) => a + s.group, 0);

  const stats = `<div class="stats-grid">
    <div class="stat"><div class="stat-value">${totalInd}</div><div class="stat-label">Individual total</div></div>
    <div class="stat"><div class="stat-value">${totalGrp}</div><div class="stat-label">Recovery total</div></div>
    <div class="stat"><div class="stat-value">${data.byStaff.length}</div><div class="stat-label">Profissionais</div></div>
  </div>`;

  const body =
    stats +
    dataTable(
      "Carga por fisioterapeuta",
      ["Fisioterapeuta", "Individual", "Recovery", "Total"],
      rows,
      [1, 2, 3],
    );

  return documentShell(
    `Carga fisio — ${ctx.clubName}`,
    ctx,
    "Carga por Fisioterapeuta",
    ctx.periodLabel,
    body,
    size,
  );
}

function printHtmlDocument(html: string, title: string): void {
  if (typeof document === "undefined") return;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", title);
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const frameDoc = frameWindow?.document;
  if (!frameWindow || !frameDoc) {
    iframe.remove();
    return;
  }

  frameDoc.open();
  frameDoc.write(html);
  frameDoc.close();

  const runPrint = () => {
    try {
      frameWindow.focus();
      frameWindow.print();
    } finally {
      setTimeout(() => iframe.remove(), 500);
    }
  };

  if (frameDoc.readyState === "complete") runPrint();
  else iframe.onload = runPrint;
}

export function printAtendimentosReport(
  data: PhysioReportsDashboard,
  ctx: FisioterapiaPrintContext,
  size: PrintPageSize = "A4",
): void {
  printHtmlDocument(buildAtendimentosPrintHtml(data, ctx, size), "Impressão — Atendimentos Fisioterapia");
}

export function printLesionadosReport(
  data: PhysioReportsDashboard,
  ctx: FisioterapiaPrintContext,
  size: PrintPageSize = "A4",
): void {
  printHtmlDocument(buildLesionadosPrintHtml(data, ctx, size), "Impressão — Lesionados");
}

export function printCargaFisioReport(
  data: PhysioReportsDashboard,
  ctx: FisioterapiaPrintContext,
  size: PrintPageSize = "A4",
): void {
  printHtmlDocument(buildCargaFisioPrintHtml(data, ctx, size), "Impressão — Carga Fisio");
}
