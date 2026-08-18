import { formatDateDayMonYear } from "@/lib/format-date";
import { getCategoryLabel } from "@/lib/fixture-categories";
import {
  printHtmlDocument,
  resolveLogoUrlForPrint,
} from "@/lib/futebol-relatorios-print";
import {
  REPORT_PRINT_BREAK_CSS,
  wrapPrintRootDocument,
} from "@/lib/report-print-layout";
import type { SocialPedagogyCaseRow } from "@/lib/assistencia-social-types";
import { triggerLabel, statusLabel } from "@/lib/assistencia-social-types";

const BCG = {
  red: "#C8102E",
  redDark: "#9B0C24",
  blue: "#00205B",
  blueMid: "#003087",
  blueLight: "#E8EEF7",
  redLight: "#FCE8EC",
} as const;

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

export type RosterValidationPrintRow = {
  name: string;
  jerseyNumber: number | null;
  category: string | null;
  schoolName: string | null;
  validation: { ok: boolean; issues: string[] };
};

export interface RosterValidationPrintData {
  tenantName: string;
  logoUrl?: string | null;
  categoryLabel: string;
  rows: RosterValidationPrintRow[];
  stats: { total: number; ok: number; pending: number };
}

function rosterValidationStyles(): string {
  return `
    @page { size: A4 landscape; margin: 10mm 11mm; }
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
      width: 80px;
      height: 80px;
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
      line-height: 1.2;
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
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: ${BCG.blue};
      line-height: 1.12;
    }
    .doc-title {
      margin: 8px 0 0;
      font-size: 14px;
      font-weight: 700;
      color: ${BCG.blueMid};
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
      letter-spacing: 0.03em;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px 16px;
      margin-bottom: 0;
      padding: 12px 14px;
      background: ${BCG.blueLight};
      border: 1px solid #cbd5e1;
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
    .summary-card strong { font-size: 16px; color: ${BCG.blue}; }
    .section { margin-top: 14px; margin-bottom: 18px; }
    table.data {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    table.data thead { display: table-header-group; }
    table.data tbody tr { break-inside: avoid; page-break-inside: avoid; }
    table.data th {
      background: linear-gradient(180deg, ${BCG.blueMid} 0%, ${BCG.blue} 100%);
      color: #fff;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 8px 7px;
      border: 1px solid ${BCG.blue};
      text-align: left;
    }
    table.data td {
      padding: 7px 7px;
      border: 1px solid #cbd5e1;
      vertical-align: top;
    }
    table.data tbody tr:nth-child(even) td { background: ${BCG.blueLight}; }
    .num { text-align: center; font-weight: 700; color: ${BCG.blue}; white-space: nowrap; }
    .status-ok { color: #15803d; font-weight: 700; }
    .status-pending { color: ${BCG.redDark}; font-weight: 700; }
    .issues { font-size: 9.5px; color: #334155; line-height: 1.4; }
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
      page-break-inside: avoid;
    }
    .footer strong { color: ${BCG.blue}; }
  `;
}

function rosterLogoHtml(logoUrl: string | null | undefined, clubName: string): string {
  const absolute = resolveLogoUrlForPrint(logoUrl);
  if (absolute) {
    return `<div class="logo-wrap"><img src="${esc(absolute)}" alt="${esc(clubName)}" /></div>`;
  }
  const initials = clubName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase();
  return `<div class="logo-wrap"><div class="logo-fallback">${esc(initials || "BCG")}</div></div>`;
}

export function buildRosterValidationPrintHtml(data: RosterValidationPrintData): string {
  const sortedRows = [...data.rows].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }),
  );

  const tableRows =
    sortedRows.length === 0
      ? `<tr><td colspan="6" style="text-align:center;color:#64748b;font-style:italic;padding:14px;">Nenhum atleta listado</td></tr>`
      : sortedRows
          .map((r) => {
            const statusCell = r.validation.ok
              ? `<span class="status-ok">OK</span>`
              : `<span class="status-pending">Pendente</span>`;
            const issuesCell = r.validation.ok
              ? "—"
              : `<span class="issues">${esc(r.validation.issues.join(" · "))}</span>`;
            return `<tr>
              <td class="num">${r.jerseyNumber ?? "—"}</td>
              <td>${esc(r.name)}</td>
              <td>${r.category ? esc(getCategoryLabel(r.category, "pt")) : "—"}</td>
              <td>${esc(r.schoolName ?? "—")}</td>
              <td>${statusCell}</td>
              <td>${issuesCell}</td>
            </tr>`;
          })
          .join("");

  const headerHtml = `
    <div class="top-bar"></div>
    <header class="header">
      ${rosterLogoHtml(data.logoUrl, data.tenantName)}
      <div class="brand-block">
        <p class="brand">Boston City Group · Assistência Social / Pedagogia</p>
        <h1 class="club">${esc(data.tenantName)}</h1>
        <p class="doc-title">Validação cadastral do elenco</p>
        <span class="badge">${data.stats.total} atleta${data.stats.total === 1 ? "" : "s"}</span>
      </div>
    </header>`;

  const metaHtml = `
    <div class="meta-grid">
      <div class="meta-item summary-card">
        <label>Total</label>
        <span><strong>${data.stats.total}</strong></span>
      </div>
      <div class="meta-item summary-card">
        <label>OK</label>
        <span><strong>${data.stats.ok}</strong></span>
      </div>
      <div class="meta-item summary-card">
        <label>Pendentes</label>
        <span><strong>${data.stats.pending}</strong></span>
      </div>
      <div class="meta-item">
        <label>Categoria</label>
        <span>${esc(data.categoryLabel)}</span>
      </div>
    </div>`;

  const bodyHtml = `
    <section class="section">
      <table class="data">
        <thead>
          <tr>
            <th class="num">#</th>
            <th>Atleta</th>
            <th>Categoria</th>
            <th>Escola</th>
            <th>Status</th>
            <th>Pendências</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
    </section>`;

  const footerHtml = `
    <footer class="footer">
      <span>Gerado em ${esc(new Date().toLocaleString("pt-BR"))}</span>
      <span><strong>Boston City Group</strong> · Validação cadastral</span>
    </footer>`;

  return wrapPrintRootDocument({
    title: esc(`Validação cadastral — ${data.tenantName}`),
    styles: rosterValidationStyles(),
    headerHtml,
    metaHtml,
    bodyHtml,
    footerHtml,
  });
}

export function printRosterValidation(data: RosterValidationPrintData): void {
  printHtmlDocument(
    buildRosterValidationPrintHtml(data),
    `Validação cadastral — ${data.tenantName}`,
  );
}
