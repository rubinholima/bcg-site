import { ReportLegacyDocument } from "@/lib/report-print-layout";
import { formatDateDayMonYear } from "@/lib/format-date";
import {
  monthLabel,
  NURSING_STATUS_LABEL,
  type NursingReportsDashboard,
} from "@/lib/enfermaria-relatorios-types";
import { formatNursingExemptFromTraining } from "@/lib/enfermaria-labels";

function esc(value: string | null | undefined) {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function buildEnfermariaPrintHtml(
  report: NursingReportsDashboard,
  meta: { tenantName?: string; from?: string; to?: string; status?: string },
) {
  const period =
    meta.from && meta.to
      ? `${formatDateDayMonYear(meta.from)} — ${formatDateDayMonYear(meta.to)}`
      : "Período completo";
  const statusLabel = meta.status ? NURSING_STATUS_LABEL[meta.status] ?? meta.status : "Todos";

  const rows = report.sessions
    .map(
      (s) => `
      <tr>
        <td>${esc(formatDateDayMonYear(s.attendedAt))}</td>
        <td>${esc(s.playerName)}</td>
        <td>${esc(s.category ?? "—")}</td>
        <td>${esc(NURSING_STATUS_LABEL[s.status] ?? s.status)}</td>
        <td>${esc(s.diagnoses.join(" · ") || "—")}</td>
        <td>${esc(s.treatments.join(" · ") || "—")}</td>
        <td>${esc(formatNursingExemptFromTraining(s.exemptFromTraining))}</td>
        <td>${esc(s.nurseName ?? "—")}</td>
      </tr>`,
    )
    .join("");

  return ReportLegacyDocument(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Relatório — Enfermaria</title>
  <style>
    body { font-family: system-ui, sans-serif; color: #111; margin: 24px; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .meta { color: #555; font-size: 13px; margin-bottom: 20px; }
    .stats { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; }
    .stat { border: 1px solid #ddd; border-radius: 8px; padding: 10px 14px; min-width: 120px; }
    .stat strong { display: block; font-size: 18px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #f4f4f5; }
  </style>
</head>
<body>
  <h1>Enfermaria — Atendimentos</h1>
  <p class="meta">
    ${meta.tenantName ? esc(meta.tenantName) + " · " : ""}${esc(period)} · Status: ${esc(statusLabel)}
  </p>
  <div class="stats">
    <div class="stat"><span>Total</span><strong>${report.summary.total}</strong></div>
    <div class="stat"><span>Ativos</span><strong>${report.summary.active}</strong></div>
    <div class="stat"><span>Altas</span><strong>${report.summary.completed}</strong></div>
    <div class="stat"><span>Atletas</span><strong>${report.summary.uniquePlayers}</strong></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Data</th><th>Atleta</th><th>Categoria</th><th>Status</th>
        <th>Diagnósticos</th><th>Medicamentos</th><th>Treino</th><th>Enfermeiro</th>
      </tr>
    </thead>
    <tbody>${rows || "<tr><td colspan='8'>Nenhum atendimento no filtro.</td></tr>"}</tbody>
  </table>
</body>
</html>`);
}

export function printEnfermariaReport(html: string) {
  const w = window.open("", "_blank", "noopener,noreferrer,width=1100,height=800");
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
  return true;
}
