import { ReportLegacyDocument } from "@/lib/report-print-layout";
import type { PsychologyAttendanceRow } from "@/types/psychology-session";
import { formatDateDayMonYear } from "@/lib/format-date";
import { formatPersonFirstLastName } from "@/lib/consultation-display";

export type PsychologyGroupAbsentPrintInput = {
  date: string;
  time?: string | null;
  categoryLabel: string;
  tenantName?: string;
  psychologistName?: string | null;
  estagiarioName?: string | null;
  location?: string | null;
  groupSummary?: string | null;
  absent: PsychologyAttendanceRow[];
  totalRoster: number;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildPrintHtml(input: PsychologyGroupAbsentPrintInput): string {
  const professional =
    formatPersonFirstLastName(input.estagiarioName) ||
    formatPersonFirstLastName(input.psychologistName) ||
    "—";
  const presentCount = Math.max(0, input.totalRoster - input.absent.length);
  const absentRows =
    input.absent.length > 0
      ? input.absent
          .map(
            (row, i) =>
              `<tr><td class="num">${i + 1}</td><td>${escapeHtml(row.playerName?.trim() || "Atleta")}</td></tr>`,
          )
          .join("")
      : `<tr><td colspan="2" class="empty">Nenhum ausente registrado nesta chamada.</td></tr>`;

  const summaryBlock = input.groupSummary?.trim()
    ? `<section class="section">
        <h3>Resumo do atendimento</h3>
        <div class="body">${escapeHtml(input.groupSummary.trim())}</div>
      </section>`
    : "";

  return ReportLegacyDocument(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Ausentes — Psicologia em grupo — ${escapeHtml(input.tenantName ?? "BCG")}</title>
  <style>
    @page { size: A4; margin: 16mm 14mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", system-ui, sans-serif;
      color: #111827;
      background: #fff;
      line-height: 1.5;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page { max-width: 760px; margin: 0 auto; }
    .brand {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #6d28d9;
      margin: 0 0 6px;
    }
    .title { margin: 0; font-size: 22px; font-weight: 800; color: #0f172a; }
    .subtitle { margin: 4px 0 0; font-size: 14px; color: #475569; font-weight: 600; }
    .header {
      padding-bottom: 14px;
      margin-bottom: 16px;
      border-bottom: 2px solid #e9d5ff;
    }
    .meta {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin-bottom: 18px;
    }
    .meta-item {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px 10px;
      background: #f8fafc;
    }
    .meta-label { margin: 0; font-size: 9px; font-weight: 700; text-transform: uppercase; color: #64748b; }
    .meta-value { margin: 2px 0 0; font-size: 13px; font-weight: 600; color: #0f172a; }
    .stats {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 16px;
    }
    .stat {
      flex: 1;
      min-width: 120px;
      border-radius: 8px;
      padding: 10px 12px;
      text-align: center;
      border: 1px solid #e2e8f0;
    }
    .stat.absent { background: #fef2f2; border-color: #fecaca; }
    .stat.present { background: #f0fdf4; border-color: #bbf7d0; }
    .stat-num { font-size: 22px; font-weight: 800; line-height: 1.1; }
    .stat-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-top: 4px; }
    table.list {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    table.list th, table.list td {
      border: 1px solid #e2e8f0;
      padding: 8px 10px;
      text-align: left;
    }
    table.list th { background: #f1f5f9; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
    table.list td.num { width: 44px; text-align: center; font-weight: 700; color: #64748b; }
    table.list td.empty { text-align: center; color: #64748b; font-style: italic; }
    .section { margin-top: 18px; }
    .section h3 { margin: 0 0 8px; font-size: 12px; text-transform: uppercase; color: #5b21b6; }
    .section .body { white-space: pre-wrap; font-size: 13px; color: #334155; }
    .footer {
      margin-top: 24px;
      padding-top: 10px;
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
      <h1 class="title">Relatório de ausentes — atendimento em grupo</h1>
      <p class="subtitle">${escapeHtml(input.tenantName ?? "—")}</p>
    </header>
    <div class="meta">
      <div class="meta-item">
        <p class="meta-label">Data do atendimento</p>
        <p class="meta-value">${escapeHtml(formatDateDayMonYear(input.date))}${input.time ? ` · ${escapeHtml(input.time)}` : ""}</p>
      </div>
      <div class="meta-item">
        <p class="meta-label">Categoria</p>
        <p class="meta-value">${escapeHtml(input.categoryLabel)}</p>
      </div>
      <div class="meta-item">
        <p class="meta-label">Profissional</p>
        <p class="meta-value">${escapeHtml(professional)}</p>
      </div>
      <div class="meta-item">
        <p class="meta-label">Local</p>
        <p class="meta-value">${escapeHtml(input.location?.trim() || "—")}</p>
      </div>
    </div>
    <div class="stats">
      <div class="stat present">
        <div class="stat-num">${presentCount}</div>
        <div class="stat-label">Presentes</div>
      </div>
      <div class="stat absent">
        <div class="stat-num">${input.absent.length}</div>
        <div class="stat-label">Ausentes</div>
      </div>
      <div class="stat">
        <div class="stat-num">${input.totalRoster}</div>
        <div class="stat-label">Total na lista</div>
      </div>
    </div>
    <table class="list">
      <thead>
        <tr><th>#</th><th>Atleta ausente</th></tr>
      </thead>
      <tbody>${absentRows}</tbody>
    </table>
    ${summaryBlock}
    <footer class="footer">
      Documento gerado em ${escapeHtml(new Date().toLocaleString("pt-BR"))} · Controle de participação obrigatória
    </footer>
  </div>
</body>
</html>`);
}

export function printPsychologyGroupAbsentReport(input: PsychologyGroupAbsentPrintInput): void {
  if (typeof document === "undefined") return;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "Impressão ausentes psicologia");
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
  frameDoc.write(buildPrintHtml(input));
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
