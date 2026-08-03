import {
  reportLogoUrlForPrint,
  resolveLogoUrlForPrint,
} from "@/lib/futebol-relatorios-print";
import type { PrintPageSize } from "@/lib/futebol-relatorios.types";
import {
  REPORT_PRINT_BREAK_CSS,
  wrapPrintRootDocument,
} from "@/lib/report-print-layout";
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

const CHART = {
  individual: "#f59e0b",
  recovery: "#6366f1",
  region: "#22c55e",
  treatment: "#ef4444",
} as const;

function truncateLabel(text: string, max = 14): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function chartLegend(items: { color: string; label: string }[]): string {
  return `<div class="chart-legend">${items
    .map(
      (i) =>
        `<span class="legend-item"><span class="legend-swatch" style="background:${i.color}"></span>${escapeHtml(i.label)}</span>`,
    )
    .join("")}</div>`;
}

function chartBox(title: string, svg: string, legend?: string): string {
  return `<div class="chart-box">
    <h3 class="chart-title">${escapeHtml(title)}</h3>
    ${svg}
    ${legend ?? ""}
  </div>`;
}

function groupedBarChartSvg(
  labels: string[],
  series: { label: string; color: string; values: number[] }[],
): string {
  const W = 500;
  const H = 210;
  const ml = 36;
  const mr = 8;
  const mt = 12;
  const mb = 56;
  const plotW = W - ml - mr;
  const plotH = H - mt - mb;
  const n = labels.length;
  if (n === 0) return `<p class="empty">Sem dados no filtro.</p>`;

  const maxVal = Math.max(1, ...series.flatMap((s) => s.values));
  const groupW = plotW / n;
  const barCount = series.length;
  const barW = Math.min(22, (groupW * 0.72) / barCount);
  const gap = (groupW - barW * barCount) / (barCount + 1);

  let bars = "";
  labels.forEach((_label, gi) => {
    const gx = ml + gi * groupW;
    series.forEach((s, si) => {
      const val = s.values[gi] ?? 0;
      const bh = (val / maxVal) * plotH;
      const x = gx + gap + si * (barW + gap);
      const y = mt + plotH - bh;
      bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(bh, 0).toFixed(1)}" fill="${s.color}" rx="3" />`;
      if (val > 0) {
        bars += `<text x="${(x + barW / 2).toFixed(1)}" y="${(y - 3).toFixed(1)}" text-anchor="middle" font-size="8" fill="#475569">${val}</text>`;
      }
    });
    const lx = gx + groupW / 2;
    const ly = mt + plotH + 16;
    bars += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" font-size="8" fill="#334155" transform="rotate(-22 ${lx.toFixed(1)} ${ly.toFixed(1)})">${escapeHtml(truncateLabel(labels[gi] ?? "", 12))}</text>`;
  });

  let yTicks = "";
  for (let i = 0; i <= 4; i++) {
    const v = Math.round((maxVal * i) / 4);
    const y = mt + plotH - (plotH * i) / 4;
    yTicks += `<line x1="${ml}" y1="${y}" x2="${W - mr}" y2="${y}" stroke="#e2e8f0" stroke-width="1" />`;
    yTicks += `<text x="${ml - 4}" y="${y + 3}" text-anchor="end" font-size="8" fill="#94a3b8">${v}</text>`;
  }

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">${yTicks}${bars}</svg>`;
}

function horizontalBarChartSvg(items: { label: string; value: number }[], color: string, limit = 10): string {
  const slice = items.slice(0, limit);
  if (slice.length === 0) return `<p class="empty">Sem dados.</p>`;

  const W = 500;
  const rowH = 24;
  const labelW = 108;
  const H = slice.length * rowH + 12;
  const maxVal = Math.max(1, ...slice.map((i) => i.value));
  const barMaxW = W - labelW - 36;

  let content = "";
  slice.forEach((item, i) => {
    const y = 6 + i * rowH;
    const bw = (item.value / maxVal) * barMaxW;
    content += `<text x="0" y="${y + 15}" font-size="9" fill="#334155">${escapeHtml(truncateLabel(item.label, 18))}</text>`;
    content += `<rect x="${labelW}" y="${y + 5}" width="${bw.toFixed(1)}" height="14" fill="${color}" rx="3" />`;
    content += `<text x="${(labelW + bw + 6).toFixed(1)}" y="${y + 15}" font-size="9" fill="#475569">${item.value}</text>`;
  });

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">${content}</svg>`;
}

function chartsSection(title: string, chartsHtml: string): string {
  return `<section class="section">
    <h2 class="section-title">${escapeHtml(title)}</h2>
    <div class="charts-grid">${chartsHtml}</div>
  </section>`;
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
    ${REPORT_PRINT_BREAK_CSS}
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
    .charts-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 4px;
    }
    .chart-box {
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 10px 12px 12px;
      background: #fff;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .chart-title {
      margin: 0 0 8px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: ${BCG.blueMid};
    }
    .chart-box svg {
      width: 100%;
      height: auto;
      display: block;
    }
    .chart-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 10px 14px;
      margin-top: 8px;
      font-size: 9px;
      color: #475569;
    }
    .legend-item {
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    .legend-swatch {
      width: 10px;
      height: 10px;
      border-radius: 2px;
      flex-shrink: 0;
    }
    @media print {
      .charts-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
  `;
}

function logoHtml(logoUrl: string | null | undefined, clubName: string): string {
  const effective =
    logoUrl ?? (clubName === "Todos os clubes" ? reportLogoUrlForPrint(null, true) : null);
  const absolute = resolveLogoUrlForPrint(effective);
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
  const headerHtml = `
      <div class="top-bar"></div>
      <header class="header">
        ${logoHtml(ctx.logoUrl, ctx.clubName)}
        <div class="brand-block">
          <p class="brand">Boston City Group · Saúde · Fisioterapia</p>
          <h1 class="club">${escapeHtml(ctx.clubName)}</h1>
          <p class="doc-title">${escapeHtml(docTitle)}</p>
          <span class="badge">${escapeHtml(badge)}</span>
        </div>
      </header>`;
  const footerHtml = `
    <footer class="footer">
      <span>Gerado em ${escapeHtml(new Date().toLocaleString("pt-BR"))}</span>
      <span><strong>Boston City Group</strong> · Relatório oficial</span>
    </footer>`;
  return wrapPrintRootDocument({
    title: escapeHtml(title),
    styles: baseStyles(size),
    headerHtml,
    metaHtml: filterMetaHtml(ctx),
    bodyHtml: body,
    footerHtml,
  });
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

  const seriesLegend = chartLegend([
    { color: CHART.individual, label: "Individual" },
    { color: CHART.recovery, label: "Recovery" },
  ]);

  const categoryLabels = data.byCategory.map((r) => fmt(r.category));
  const categoryChart = chartBox(
    "Por categoria",
    groupedBarChartSvg(categoryLabels, [
      { label: "Individual", color: CHART.individual, values: data.byCategory.map((r) => r.individual) },
      { label: "Recovery", color: CHART.recovery, values: data.byCategory.map((r) => r.group) },
    ]),
    seriesLegend,
  );

  const monthChart = chartBox(
    "Evolução mensal",
    groupedBarChartSvg(
      data.byMonth.map((r) => monthLabel(r.month)),
      [
        { label: "Individual", color: CHART.individual, values: data.byMonth.map((r) => r.individual) },
        { label: "Recovery", color: CHART.recovery, values: data.byMonth.map((r) => r.group) },
      ],
    ),
    seriesLegend,
  );

  const regionChart = chartBox(
    "Top regiões corporais",
    horizontalBarChartSvg(
      data.byRegion.map((r) => ({ label: r.regionName, value: r.count })),
      CHART.region,
    ),
  );

  const treatmentChart = chartBox(
    "Tratamentos mais usados",
    horizontalBarChartSvg(
      data.byTreatment.map((r) => ({ label: r.label, value: r.count })),
      CHART.treatment,
      8,
    ),
  );

  const charts = chartsSection("Gráficos", categoryChart + monthChart + regionChart + treatmentChart);

  const body = [
    stats,
    charts,
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

  const staffChart = chartsSection(
    "Gráfico",
    chartBox(
      "Atendimentos por fisioterapeuta",
      groupedBarChartSvg(
        data.byStaff.map((s) => s.staffName),
        [
          { label: "Individual", color: CHART.individual, values: data.byStaff.map((s) => s.individual) },
          { label: "Recovery", color: CHART.recovery, values: data.byStaff.map((s) => s.group) },
        ],
      ),
      chartLegend([
        { color: CHART.individual, label: "Individual" },
        { color: CHART.recovery, label: "Recovery" },
      ]),
    ),
  );

  const body =
    stats +
    staffChart +
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
