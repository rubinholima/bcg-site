import { formatDateDayMonYear } from "@/lib/format-date";
import { getCategoryLabel } from "@/lib/fixture-categories";
import { printHtmlDocument } from "@/lib/futebol-relatorios-print";
import type { SocialPedagogyCaseRow } from "@/lib/assistencia-social-types";
import { triggerLabel, statusLabel } from "@/lib/assistencia-social-types";

function esc(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type NotificationReport = {
  case: SocialPedagogyCaseRow & {
    tenant?: { name: string };
    player?: { name: string; category: string | null; jerseyNumber: number | null };
  };
  school: {
    schoolName: string | null;
    grade?: string | null;
    period?: string | null;
    coordinatorName?: string | null;
    coordinatorEmail?: string | null;
    coordinatorPhone?: string | null;
  };
  guardian: { name: string; phone?: string | null; email?: string | null } | null;
};

export function buildSchoolNotificationPrintHtml(data: NotificationReport): string {
  const c = data.case;
  const tenantName = c.tenant?.name ?? "Clube";
  const playerName = c.player?.name ?? "Atleta";
  const title = `Dispensa escolar — ${playerName}`;
  const bodyText = c.schoolNotificationText ?? "";

  const agendaItems = Array.isArray(c.agendaSnapshot)
    ? (c.agendaSnapshot as Array<Record<string, unknown>>).slice(0, 15)
    : [];

  const agendaHtml =
    agendaItems.length === 0
      ? ""
      : `<h2>Compromissos do clube (referência)</h2><ul>${agendaItems
          .map((item) => {
            const date = String(item.date ?? item.startDate ?? "");
            const label = String(item.title ?? item.name ?? "Compromisso");
            return `<li>${esc(date)} — ${esc(label)}</li>`;
          })
          .join("")}</ul>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${esc(title)}</title>
<style>
  @page { size: A4; margin: 16mm; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #111; line-height: 1.5; }
  h1 { font-size: 16px; margin: 0 0 8px; }
  h2 { font-size: 13px; margin: 16px 0 6px; }
  .meta { color: #444; margin-bottom: 12px; }
  .letter { white-space: pre-wrap; }
  ul { margin: 6px 0 0 18px; padding: 0; }
</style>
</head>
<body>
  <h1>${esc(title)}</h1>
  <p class="meta">${esc(tenantName)} · ${esc(data.school.schoolName ?? "Escola")}${
    data.school.grade ? ` · ${esc(data.school.grade)}` : ""
  }${
    c.player?.category ? ` · ${esc(getCategoryLabel(c.player.category, "pt"))}` : ""
  }</p>
  <p class="meta">Gatilho: ${esc(triggerLabel(c.triggerType))} · Status: ${esc(statusLabel(c.status))}${
    c.periodStart && c.periodEnd
      ? ` · Período: ${formatDateDayMonYear(new Date(c.periodStart))} a ${formatDateDayMonYear(new Date(c.periodEnd))}`
      : ""
  }</p>
  <div class="letter">${esc(bodyText).replace(/\n/g, "<br/>")}</div>
  ${agendaHtml}
  ${
    data.guardian
      ? `<p class="meta"><strong>Responsável:</strong> ${esc(data.guardian.name)}${
          data.guardian.phone ? ` · ${esc(data.guardian.phone)}` : ""
        }${data.guardian.email ? ` · ${esc(data.guardian.email)}` : ""}</p>`
      : ""
  }
  ${
    data.school.coordinatorName
      ? `<p class="meta"><strong>Coordenação escolar:</strong> ${esc(data.school.coordinatorName)}${
          data.school.coordinatorPhone ? ` · ${esc(data.school.coordinatorPhone)}` : ""
        }</p>`
      : ""
  }
</body>
</html>`;
}

export function printSchoolNotification(data: NotificationReport): void {
  const title = `Dispensa escolar — ${data.case.player?.name ?? "Atleta"}`;
  printHtmlDocument(buildSchoolNotificationPrintHtml(data), title);
}

export function buildRosterValidationPrintHtml(
  tenantName: string,
  rows: Array<{ name: string; jerseyNumber: number | null; category: string | null; schoolName: string | null; validation: { ok: boolean; issues: string[] } }>,
): string {
  const tableRows = rows
    .map(
      (r) => `<tr>
        <td>${r.jerseyNumber ?? "—"}</td>
        <td>${esc(r.name)}</td>
        <td>${r.category ? esc(getCategoryLabel(r.category, "pt")) : "—"}</td>
        <td>${esc(r.schoolName ?? "—")}</td>
        <td>${r.validation.ok ? "OK" : esc(r.validation.issues.join("; "))}</td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Validação cadastral — Assistência Social</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; }
  h1 { font-size: 16px; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th, td { border: 1px solid #ccc; padding: 4px 6px; vertical-align: top; }
  th { background: #f3f3f3; text-align: left; }
</style>
</head>
<body>
  <h1>Validação cadastral — ${esc(tenantName)}</h1>
  <table>
    <thead><tr><th>#</th><th>Atleta</th><th>Categoria</th><th>Escola</th><th>Pendências</th></tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
</body>
</html>`;
}

export function printRosterValidation(
  tenantName: string,
  rows: Array<{ name: string; jerseyNumber: number | null; category: string | null; schoolName: string | null; validation: { ok: boolean; issues: string[] } }>,
): void {
  printHtmlDocument(buildRosterValidationPrintHtml(tenantName, rows), "Validação cadastral");
}
