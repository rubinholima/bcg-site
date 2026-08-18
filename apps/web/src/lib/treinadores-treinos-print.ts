import { formatDateDayMonYear } from "@/lib/format-date";
import { getPublicImageUrl } from "@/lib/media-url";
import type { CoachTrainingPeriodReport, CoachTrainingSessionReport } from "@/lib/treinadores-types";
import { COACH_TRAINING_ATTACHMENT_KINDS } from "@/lib/treinadores-types";
import { printHtmlDocument } from "@/lib/futebol-relatorios-print";

type PrintPageSize = "A4" | "Letter";

function esc(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function attachmentKindLabel(kind: string | null): string {
  return COACH_TRAINING_ATTACHMENT_KINDS.find((k) => k.value === kind)?.label ?? kind ?? "Anexo";
}

function printShell(title: string, body: string, size: PrintPageSize = "A4"): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${esc(title)}</title>
<style>
  @page { size: ${size}; margin: 12mm; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #111; }
  h1 { font-size: 16px; margin: 0 0 4px; }
  h2 { font-size: 13px; margin: 16px 0 8px; }
  .meta { color: #444; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { border: 1px solid #ccc; padding: 5px 6px; vertical-align: top; }
  th { background: #f3f3f3; text-align: left; }
  .muted { color: #666; }
  .badge { display: inline-block; padding: 1px 6px; border-radius: 4px; background: #eee; }
  ul { margin: 6px 0 0 18px; padding: 0; }
</style>
</head>
<body>
${body}
</body>
</html>`;
}

export function buildTrainingSessionPrintHtml(data: CoachTrainingSessionReport, size: PrintPageSize = "A4"): string {
  const s = data.session;
  const time =
    s.startTime && s.endTime ? `${s.startTime} – ${s.endTime}` : s.startTime || s.endTime || "—";
  const attachments =
    data.attachments.length === 0
      ? "<p class='muted'>Nenhum anexo.</p>"
      : `<ul>${data.attachments
          .map((a) => {
            const url = getPublicImageUrl(a.fileUrl) || a.fileUrl;
            const label = a.label?.trim() || attachmentKindLabel(a.kind);
            return `<li><strong>${esc(label)}</strong> — ${esc(attachmentKindLabel(a.kind))}${url ? ` — ${esc(url)}` : ""}</li>`;
          })
          .join("")}</ul>`;

  const playersRows =
    data.players.length === 0
      ? `<tr><td colspan="5" class="muted">Sem avaliações.</td></tr>`
      : data.players
          .map((p) => {
            const avail = p.available
              ? p.rating != null
                ? String(p.rating)
                : "—"
              : esc(p.unavailableReason || "Indisponível");
            return `<tr>
              <td>${p.jerseyNumber ?? "—"}</td>
              <td>${esc(p.name)}</td>
              <td>${p.available ? "Sim" : "Não"}</td>
              <td>${avail}</td>
              <td>${esc(p.notes || "—")}</td>
            </tr>`;
          })
          .join("");

  const activities =
    data.activities.length === 0
      ? "<p class='muted'>Plano registrado somente em anexo.</p>"
      : `<table><thead><tr><th>Tipo</th><th>Título</th><th>Min</th></tr></thead><tbody>${data.activities
          .map(
            (a) =>
              `<tr><td>${esc(a.kind)}</td><td>${esc(a.title)}</td><td>${a.durationMinutes ?? "—"}</td></tr>`,
          )
          .join("")}</tbody></table>`;

  const body = `
<h1>Resumo do treino</h1>
<div class="meta">
  <div><strong>Data:</strong> ${esc(formatDateDayMonYear(new Date(`${s.sessionDate}T12:00:00`)))} · ${esc(time)}</div>
  ${s.category ? `<div><strong>Categoria:</strong> ${esc(s.category)}</div>` : ""}
  ${s.staffName ? `<div><strong>Comissão:</strong> ${esc(s.staffName)}</div>` : ""}
  ${s.agendaTitle ? `<div><strong>Agenda:</strong> ${esc(s.agendaTitle)}${s.agendaLocation ? ` — ${esc(s.agendaLocation)}` : ""}</div>` : ""}
  ${s.planTemplateTitle ? `<div><strong>Plano (biblioteca):</strong> ${esc(s.planTemplateTitle)}</div>` : ""}
  <div><strong>Status:</strong> ${esc(s.status)} · <strong>Média:</strong> ${data.summary.averageRating ?? "—"} · <strong>Presentes:</strong> ${data.summary.availableCount}/${data.summary.totalPlayers}</div>
</div>
${s.objectives ? `<p><strong>Objetivos:</strong> ${esc(s.objectives)}</p>` : ""}
<h2>Anexos do plano</h2>
${attachments}
<h2>Atividades no sistema</h2>
${activities}
<h2>Avaliação do elenco</h2>
<table>
  <thead><tr><th>Nº</th><th>Atleta</th><th>Disponível</th><th>Nota</th><th>Observações</th></tr></thead>
  <tbody>${playersRows}</tbody>
</table>
${s.notes ? `<h2>Observações gerais</h2><p>${esc(s.notes)}</p>` : ""}
`;

  return printShell("Resumo do treino", body, size);
}

export function buildTrainingPeriodPrintHtml(data: CoachTrainingPeriodReport, size: PrintPageSize = "A4"): string {
  const periodLabel = `${formatDateDayMonYear(new Date(`${data.from}T12:00:00`))} – ${formatDateDayMonYear(new Date(`${data.to}T12:00:00`))}`;

  const sessionRows =
    data.sessions.length === 0
      ? `<tr><td colspan="5" class="muted">Nenhum treino no período.</td></tr>`
      : data.sessions
          .map(
            (s) => `<tr>
              <td>${esc(formatDateDayMonYear(new Date(`${s.sessionDate}T12:00:00`)))}</td>
              <td>${esc(s.status)}</td>
              <td>${s.availableCount}</td>
              <td>${s.averageRating ?? "—"}</td>
              <td>${s.attachmentCount}</td>
            </tr>`,
          )
          .join("");

  const playerRows =
    data.players.length === 0
      ? `<tr><td colspan="7" class="muted">Sem dados de elenco.</td></tr>`
      : data.players
          .map(
            (p) => `<tr>
              <td>${p.jerseyNumber ?? "—"}</td>
              <td>${esc(p.name)}</td>
              <td>${p.sessionsAvailable}/${p.sessionsTotal}</td>
              <td>${p.averageRating ?? "—"}</td>
              <td>${p.lastRating ?? "—"}</td>
              <td>${p.sessionsUnavailable}</td>
              <td>${esc(p.lastNotes || "—")}</td>
            </tr>`,
          )
          .join("");

  const highlightList = (rows: CoachTrainingPeriodReport["players"]) =>
    rows.length === 0
      ? "<p class='muted'>Nenhum destaque.</p>"
      : `<ul>${rows.map((p) => `<li>${esc(p.name)} — média ${p.averageRating ?? "—"} · faltas ${p.sessionsUnavailable}</li>`).join("")}</ul>`;

  const body = `
<h1>Relatório de treinos</h1>
<div class="meta">
  <div><strong>Período:</strong> ${esc(periodLabel)}</div>
  ${data.category ? `<div><strong>Categoria:</strong> ${esc(data.category)}</div>` : ""}
  <div><strong>Treinos:</strong> ${data.summary.sessionCount} · <strong>Finalizados:</strong> ${data.summary.finalizedCount}</div>
  <div><strong>Média do grupo:</strong> ${data.summary.averageTeamRating ?? "—"} · <strong>Presença média:</strong> ${data.summary.averageAttendancePct != null ? `${data.summary.averageAttendancePct}%` : "—"}</div>
</div>
<h2>Treinos do período</h2>
<table>
  <thead><tr><th>Data</th><th>Status</th><th>Presentes</th><th>Média</th><th>Anexos</th></tr></thead>
  <tbody>${sessionRows}</tbody>
</table>
<h2>Elenco no período</h2>
<table>
  <thead><tr><th>Nº</th><th>Atleta</th><th>Presença</th><th>Média</th><th>Última nota</th><th>Indisp.</th><th>Última obs.</th></tr></thead>
  <tbody>${playerRows}</tbody>
</table>
<h2>Alertas — nota baixa recorrente</h2>
${highlightList(data.highlights.lowRating)}
<h2>Alertas — indisponibilidades frequentes</h2>
${highlightList(data.highlights.frequentAbsences)}
`;

  return printShell("Relatório de treinos", body, size);
}

export function printTrainingSessionReport(data: CoachTrainingSessionReport, size: PrintPageSize = "A4"): void {
  printHtmlDocument(buildTrainingSessionPrintHtml(data, size), "Impressão — Resumo do treino");
}

export function printTrainingPeriodReport(data: CoachTrainingPeriodReport, size: PrintPageSize = "A4"): void {
  printHtmlDocument(buildTrainingPeriodPrintHtml(data, size), "Impressão — Relatório de treinos");
}
