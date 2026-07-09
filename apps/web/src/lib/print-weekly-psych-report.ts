import {
  WEEKLY_PSYCH_REPORT_FIELDS,
  type WeeklyPsychReportData,
} from "@/components/dashboard/psychology/WeeklyPsychReportDocument";
import { formatPersonFirstLastName } from "@/lib/consultation-display";

function formatBrDate(d?: string | null): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  if (!y || !m || !day) return d;
  return `${day}/${m}/${y}`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildPrintHtml(report: WeeklyPsychReportData): string {
  const psychologist = formatPersonFirstLastName(report.psychologistName) || "—";
  const estagiario = formatPersonFirstLastName(report.estagiarioName) || "—";
  const sections = WEEKLY_PSYCH_REPORT_FIELDS.map((field) => {
    const value = (report[field.key] as string | null | undefined)?.trim();
    if (!value) return "";
    return `
      <section class="section">
        <h3>${escapeHtml(field.label)}</h3>
        <div class="body">${escapeHtml(value)}</div>
      </section>
    `;
  }).join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Relatório semanal — ${escapeHtml(report.tenant?.name ?? "Psicologia")}</title>
  <style>
    @page { size: A4; margin: 18mm 16mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      color: #111827;
      background: #fff;
      line-height: 1.55;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page { max-width: 780px; margin: 0 auto; }
    .brand {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #6d28d9;
      margin: 0 0 8px;
    }
    .title {
      margin: 0;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #0f172a;
    }
    .subtitle {
      margin: 6px 0 0;
      font-size: 15px;
      font-weight: 600;
      color: #475569;
    }
    .header {
      padding-bottom: 18px;
      margin-bottom: 22px;
      border-bottom: 2px solid #e9d5ff;
    }
    .meta {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 24px;
    }
    .meta-item {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px 12px;
      background: #f8fafc;
    }
    .meta-label {
      margin: 0;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #6d28d9;
    }
    .meta-value {
      margin: 4px 0 0;
      font-size: 13px;
      font-weight: 600;
      color: #0f172a;
    }
    .section {
      margin-bottom: 18px;
      page-break-inside: avoid;
    }
    .section h3 {
      margin: 0 0 8px;
      padding-left: 10px;
      border-left: 4px solid #7c3aed;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #5b21b6;
    }
    .section .body {
      white-space: pre-wrap;
      font-size: 13.5px;
      line-height: 1.75;
      color: #1e293b;
    }
    .footer {
      margin-top: 28px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      font-size: 10px;
      color: #64748b;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="page">
    <header class="header">
      <p class="brand">Boston City Group · Psicologia</p>
      <h1 class="title">Relatório semanal</h1>
      <p class="subtitle">${escapeHtml(report.tenant?.name ?? "—")}</p>
    </header>
    <div class="meta">
      <div class="meta-item">
        <p class="meta-label">Data do registro</p>
        <p class="meta-value">${escapeHtml(formatBrDate(report.date))}${report.time ? ` · ${escapeHtml(report.time)}` : ""}</p>
      </div>
      <div class="meta-item">
        <p class="meta-label">Período</p>
        <p class="meta-value">${escapeHtml(formatBrDate(report.periodStart))} – ${escapeHtml(formatBrDate(report.periodEnd))}</p>
      </div>
      <div class="meta-item">
        <p class="meta-label">Categorias</p>
        <p class="meta-value">${escapeHtml(report.categoriesLabel?.trim() || "—")}</p>
      </div>
      <div class="meta-item">
        <p class="meta-label">Psicóloga(o)</p>
        <p class="meta-value">${escapeHtml(psychologist)}</p>
      </div>
      <div class="meta-item">
        <p class="meta-label">Estagiária(o)</p>
        <p class="meta-value">${escapeHtml(estagiario)}</p>
      </div>
    </div>
    ${sections || '<p style="color:#64748b;text-align:center;">Sem conteúdo preenchido.</p>'}
    <footer class="footer">
      Documento gerado em ${escapeHtml(new Date().toLocaleString("pt-BR"))} · Boston City Group
    </footer>
  </div>
</body>
</html>`;
}

/** Impressão via iframe oculto — não depende de pop-up do navegador. */
export function printWeeklyPsychReport(report: WeeklyPsychReportData): void {
  if (typeof document === "undefined") return;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "Impressão relatório semanal");
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
  frameDoc.write(buildPrintHtml(report));
  frameDoc.close();

  const runPrint = () => {
    try {
      frameWindow.focus();
      frameWindow.print();
    } finally {
      window.setTimeout(() => iframe.remove(), 1500);
    }
  };

  if (frameDoc.readyState === "complete") {
    window.setTimeout(runPrint, 200);
  } else {
    iframe.onload = () => window.setTimeout(runPrint, 200);
  }
}
