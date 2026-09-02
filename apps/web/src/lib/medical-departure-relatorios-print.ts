import { ReportLegacyDocument } from "@/lib/report-print-layout";
import { formatDateDayMonYear } from "@/lib/format-date";
import {
  MEDICAL_DEPARTURE_CARE_TYPE_LABEL,
  MEDICAL_DEPARTURE_STATUS_LABEL,
  MEDICAL_DEPARTURE_TRANSPORT_LABEL,
  formatMedicalDepartureDateTime,
} from "@/lib/medical-departure-labels";
import type { MedicalDepartureReportsDashboard } from "@/types/medical-departure";

function esc(value: string | null | undefined) {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function buildMedicalDeparturePrintHtml(
  report: MedicalDepartureReportsDashboard,
  meta: {
    tenantName?: string;
    from?: string;
    to?: string;
    status?: string;
    careType?: string;
    transportMode?: string;
  },
) {
  const period =
    meta.from && meta.to
      ? `${formatDateDayMonYear(meta.from)} — ${formatDateDayMonYear(meta.to)}`
      : "Período completo";

  const rows = report.departures
    .map(
      (d) => `
      <tr>
        <td>${esc(formatMedicalDepartureDateTime(d.departedAt))}</td>
        <td>${esc(d.player?.name ?? "—")}</td>
        <td>${esc(d.category ?? "—")}</td>
        <td>${esc(MEDICAL_DEPARTURE_CARE_TYPE_LABEL[d.careType] ?? d.careType)}</td>
        <td>${esc(MEDICAL_DEPARTURE_STATUS_LABEL[d.status] ?? d.status)}</td>
        <td>${esc(d.destination)}</td>
        <td>${esc(MEDICAL_DEPARTURE_TRANSPORT_LABEL[d.transportMode] ?? d.transportMode)}</td>
        <td>${esc(formatMedicalDepartureDateTime(d.returnedAt))}</td>
      </tr>`,
    )
    .join("");

  const statBlock = (label: string, items: Array<{ label: string; count: number }>) =>
    items
      .map((i) => `<li>${esc(i.label)}: <strong>${i.count}</strong></li>`)
      .join("") || "<li>—</li>";

  return ReportLegacyDocument(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Relatório — Saídas do CT</title>
  <style>
    body { font-family: system-ui, sans-serif; color: #111; margin: 24px; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .meta { color: #555; font-size: 13px; margin-bottom: 20px; }
    .stats { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; }
    .stat { border: 1px solid #ddd; border-radius: 8px; padding: 10px 14px; min-width: 120px; }
    .stat strong { display: block; font-size: 18px; }
    .cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 20px; }
    ul { margin: 0; padding-left: 18px; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #f4f4f5; }
  </style>
</head>
<body>
  <h1>Saídas do CT — Atendimentos externos</h1>
  <p class="meta">${meta.tenantName ? esc(meta.tenantName) + " · " : ""}${esc(period)}</p>
  <div class="stats">
    <div class="stat"><span>Total de saídas</span><strong>${report.summary.total}</strong></div>
    <div class="stat"><span>Atletas distintos</span><strong>${report.summary.uniquePlayers}</strong></div>
  </div>
  <div class="cols">
    <div><h3>Por atendimento</h3><ul>${statBlock(
      "care",
      report.byCareType.map((x) => ({
        label: MEDICAL_DEPARTURE_CARE_TYPE_LABEL[x.careType] ?? x.careType,
        count: x.count,
      })),
    )}</ul></div>
    <div><h3>Por categoria</h3><ul>${statBlock(
      "cat",
      report.byCategory.map((x) => ({ label: x.category, count: x.count })),
    )}</ul></div>
    <div><h3>Por transporte</h3><ul>${statBlock(
      "transport",
      report.byTransport.map((x) => ({
        label: MEDICAL_DEPARTURE_TRANSPORT_LABEL[x.transportMode] ?? x.transportMode,
        count: x.count,
      })),
    )}</ul></div>
    <div><h3>Por status</h3><ul>${statBlock(
      "status",
      report.byStatus.map((x) => ({
        label: MEDICAL_DEPARTURE_STATUS_LABEL[x.status] ?? x.status,
        count: x.count,
      })),
    )}</ul></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Saída</th><th>Atleta</th><th>Categoria</th><th>Atendimento</th><th>Status</th>
        <th>Destino</th><th>Transporte</th><th>Retorno</th>
      </tr>
    </thead>
    <tbody>${rows || "<tr><td colspan='8'>Nenhuma saída no filtro.</td></tr>"}</tbody>
  </table>
</body>
</html>`);
}

export function printMedicalDepartureReport(html: string) {
  const w = window.open("", "_blank", "noopener,noreferrer");
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
  return true;
}
