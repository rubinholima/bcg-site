import { formatCpfForDisplay } from "@/lib/format-cpf";
import {
  formatDateDayMonYear,
  formatDateTimeDayMonYear,
} from "@/lib/format-date";
import { getPublicImageUrl } from "@/lib/media-url";
import {
  REPORT_PRINT_BREAK_CSS,
  wrapPrintRootDocument,
} from "@/lib/report-print-layout";
import type {
  HospedesReportDto,
  LayoutRelacionadosReportDto,
  PassageirosReportDto,
  PressKitReportDto,
  PrintPageSize,
  ProgramacaoSemanalReportDto,
  RelatorioPessoaRow,
  RelatorioHospedeRow,
} from "@/lib/futebol-relatorios.types";
import { getStaffRoleLabel } from "@/lib/staff-roles";

/** Cores oficiais Boston City Group — vermelho e azul. */
const BCG = {
  red: "#C8102E",
  redDark: "#9B0C24",
  blue: "#00205B",
  blueMid: "#003087",
  blueLight: "#E8EEF7",
  redLight: "#FCE8EC",
} as const;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Logo estática do grupo — usada em relatórios com filtro "Todos os clubes". */
export const BCG_GROUP_LOGO_PATH = "/bcg-logo.png";

/** Logo do relatório: clube específico ou BCG quando não há clube selecionado. */
export function reportLogoUrlForPrint(
  tenantLogo: string | null | undefined,
  allClubs: boolean,
): string | null | undefined {
  if (allClubs) return BCG_GROUP_LOGO_PATH;
  return tenantLogo ?? null;
}

/** Logo do clube com URL absoluta (iframe srcDoc não resolve paths relativos). */
export function resolveLogoUrlForPrint(logoUrl: string | null | undefined): string {
  const resolved = getPublicImageUrl(logoUrl);
  if (!resolved) return "";
  if (/^https?:\/\//i.test(resolved)) return resolved;
  if (resolved.startsWith("/")) {
    if (typeof window !== "undefined") {
      return `${window.location.origin}${resolved}`;
    }
    return `https://www.bostoncitygroup.biz${resolved}`;
  }
  return resolved;
}

function formatBrDate(iso?: string | null): string {
  return formatDateDayMonYear(iso);
}

function formatBrDateTime(iso?: string | null): string {
  return formatDateTimeDayMonYear(iso);
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
      box-shadow: 0 4px 14px rgba(0, 32, 91, 0.12);
    }
    .logo-wrap img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      padding: 6px;
    }
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
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.02em;
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
      letter-spacing: 0.03em;
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
    .section { margin-bottom: 18px; break-inside: auto; page-break-inside: auto; }
    .section:first-of-type { margin-top: 14px; }
    .section-title {
      margin: 0 0 8px;
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: ${BCG.blue};
      display: flex;
      align-items: center;
      gap: 10px;
      padding-left: 10px;
      border-left: 4px solid ${BCG.red};
      break-after: avoid;
      page-break-after: avoid;
    }
    .section-title::after {
      content: "";
      flex: 1;
      height: 2px;
      background: linear-gradient(90deg, ${BCG.blue} 0%, transparent 100%);
      opacity: 0.35;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      break-inside: auto;
      page-break-inside: auto;
    }
    thead { display: table-header-group; }
    tbody tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    thead th {
      background: linear-gradient(180deg, ${BCG.blueMid} 0%, ${BCG.blue} 100%);
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 9px 8px;
      border: 1px solid ${BCG.blue};
      text-align: left;
    }
    tbody td {
      padding: 7px 8px;
      border: 1px solid #dbe3f0;
      vertical-align: middle;
    }
    tbody tr:nth-child(even) td { background: #f8fafc; }
    .num { width: 36px; text-align: center; font-weight: 700; color: ${BCG.red}; }
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
      page-break-inside: avoid;
    }
    .footer strong { color: ${BCG.blue}; }
    .schedule-wrap { overflow: hidden; }
    .schedule-table { font-size: 9.5px; }
    .schedule-table thead th { text-align: center; padding: 7px 4px; }
    .schedule-table tbody td {
      vertical-align: top;
      min-width: 80px;
      padding: 6px 5px;
    }
    .day-cell {
      background: ${BCG.blueLight} !important;
      font-weight: 700;
      color: ${BCG.blue};
      white-space: nowrap;
      width: 110px;
      border-left: 3px solid ${BCG.red} !important;
    }
    .act {
      margin-bottom: 6px;
      padding-bottom: 6px;
      border-bottom: 1px dashed #cbd5e1;
    }
    .act:last-child { margin-bottom: 0; padding-bottom: 0; border-bottom: 0; }
    .act-time {
      font-weight: 800;
      color: ${BCG.red};
      font-size: 9px;
    }
    .act-title { font-weight: 600; color: #0f172a; line-height: 1.3; }
    .act-meta { font-size: 8.5px; color: #64748b; margin-top: 1px; }
    /* Uma página por categoria — NÃO quebrar antes da primeira */
    .print-page {
      break-inside: auto;
      page-break-inside: auto;
    }
    .print-page + .print-page {
      break-before: page;
      page-break-before: always;
    }
    /* Cabeçalho + tabela começam juntos na mesma página (evita folha em branco) */
    .print-page .report-intro {
      margin-bottom: 0;
    }
    .print-page .footer {
      margin-top: 16px;
    }
    .schedule-category-title {
      margin: 0 0 10px;
      padding: 8px 12px;
      background: ${BCG.blueLight};
      border-left: 4px solid ${BCG.red};
      border-radius: 8px;
      font-size: 13px;
      font-weight: 800;
      color: ${BCG.blue};
      text-transform: uppercase;
      letter-spacing: 0.04em;
      break-after: avoid;
      page-break-after: avoid;
    }
    .schedule-table-single { font-size: 10px; }
    .schedule-table-single thead th:last-child { text-align: left; }
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

function personTableRows(rows: RelatorioPessoaRow[], showRole = false): string {
  if (rows.length === 0) {
    return `<tr><td colspan="${showRole ? 6 : 5}" class="empty">Nenhum registro</td></tr>`;
  }
  return rows
    .map((r) => {
      const roleCell = showRole
        ? `<td>${escapeHtml(r.role?.trim() || "—")}</td>`
        : "";
      return `<tr>
        <td class="num">${r.num}</td>
        <td>${escapeHtml(r.name)}</td>
        ${roleCell}
        <td>${escapeHtml(formatCpfForDisplay(r.cpf) || "—")}</td>
        <td>${escapeHtml(r.rg?.trim() || "—")}</td>
        <td>${escapeHtml(formatBrDate(r.birthDate))}</td>
      </tr>`;
    })
    .join("");
}

function personTable(title: string, rows: RelatorioPessoaRow[], showRole = false): string {
  const roleHead = showRole ? "<th>Função</th>" : "";
  return `
    <section class="section">
      <h2 class="section-title">${escapeHtml(title)}</h2>
      <table>
        <thead>
          <tr>
            <th class="num">#</th>
            <th>Nome</th>
            ${roleHead}
            <th>CPF</th>
            <th>RG</th>
            <th>Nascimento</th>
          </tr>
        </thead>
        <tbody>${personTableRows(rows, showRole)}</tbody>
      </table>
    </section>
  `;
}

function travelMetaHtml(travel: PassageirosReportDto["travel"], extra?: string): string {
  const location = [travel.stadiumName, travel.city, travel.country].filter(Boolean).join(" · ");
  const transportLine = [travel.transportLabel, travel.transportDetails?.trim()]
    .filter(Boolean)
    .join(" — ");
  const side = travel.isHomeMatch ? "Casa" : "Fora";
  const showTravelLogistics = !travel.isHomeMatch;

  return `
    <div class="meta-grid">
      <div class="meta-item">
        <label>Categoria</label>
        <span>${escapeHtml(travel.categoryLabel)}</span>
      </div>
      <div class="meta-item">
        <label>Mandante</label>
        <span>${escapeHtml(side)}</span>
      </div>
      <div class="meta-item">
        <label>Data do jogo</label>
        <span>${escapeHtml(formatBrDate(travel.matchDate))}</span>
      </div>
      <div class="meta-item">
        <label>Adversário</label>
        <span>${escapeHtml(travel.opponentName?.trim() || "—")}</span>
      </div>
      <div class="meta-item">
        <label>Competição</label>
        <span>${escapeHtml(travel.championshipName?.trim() || "—")}</span>
      </div>
      ${location ? `<div class="meta-item full"><label>Local</label><span>${escapeHtml(location)}</span></div>` : ""}
      ${
        showTravelLogistics && transportLine
          ? `<div class="meta-item full"><label>Transporte</label><span>${escapeHtml(transportLine)}</span></div>`
          : ""
      }
      ${
        showTravelLogistics && (travel.estimatedDeparture || travel.estimatedArrival)
          ? `<div class="meta-item"><label>Saída prevista</label><span>${escapeHtml(formatBrDateTime(travel.estimatedDeparture))}</span></div>
             <div class="meta-item"><label>Chegada prevista</label><span>${escapeHtml(formatBrDateTime(travel.estimatedArrival))}</span></div>`
          : ""
      }
      ${
        showTravelLogistics && travel.hotelName
          ? `<div class="meta-item full"><label>Hospedagem</label><span>${escapeHtml(travel.hotelName)}${travel.hotelAddress ? ` — ${escapeHtml(travel.hotelAddress)}` : ""}</span></div>`
          : ""
      }
      ${extra ?? ""}
    </div>
  `;
}

function documentShell(
  title: string,
  clubName: string,
  logoUrl: string | null | undefined,
  docTitle: string,
  badge: string,
  introMeta: string,
  body: string,
  size: PrintPageSize,
): string {
  const headerHtml = `
      <div class="top-bar"></div>
      <header class="header">
        ${logoHtml(logoUrl, clubName)}
        <div class="brand-block">
          <p class="brand">Boston City Group · Depto Futebol</p>
          <h1 class="club">${escapeHtml(clubName)}</h1>
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
    metaHtml: introMeta,
    bodyHtml: body,
    footerHtml,
  });
}

export function buildPassageirosPrintHtml(
  data: PassageirosReportDto,
  size: PrintPageSize = "A4",
): string {
  const { travel } = data;
  const introMeta = travelMetaHtml(travel);
  const body = `
    ${personTable("Atletas convocados", data.athletes)}
    ${personTable("Comissão técnica", data.staff, true)}
    ${personTable("Pessoas autorizadas", data.guests)}
  `;
  const badge = [
    travel.categoryLabel,
    travel.isHomeMatch ? "Casa" : "Fora",
    travel.championshipName,
  ]
    .filter(Boolean)
    .join(" · ");

  return documentShell(
    `Relação de Passageiros — ${travel.tenant.name}`,
    travel.tenant.name,
    travel.tenant.logoUrl,
    "Relação de Passageiros",
    badge,
    introMeta,
    body,
    size,
  );
}

export function buildHospedesPrintHtml(
  data: HospedesReportDto,
  size: PrintPageSize = "A4",
): string {
  const { travel } = data;
  const checkIn = travel.hotelCheckIn
    ? formatBrDateTime(
        travel.hotelCheckIn.includes("T")
          ? travel.hotelCheckIn
          : travel.hotelCheckIn,
      )
    : travel.estimatedArrival
      ? formatBrDateTime(travel.estimatedArrival)
      : formatBrDate(travel.matchDate);
  const checkOut = travel.hotelCheckOut
    ? formatBrDateTime(travel.hotelCheckOut)
    : travel.estimatedDeparture
      ? formatBrDateTime(travel.estimatedDeparture)
      : "—";

  const extra = `
    <div class="meta-item"><label>Check-in</label><span>${escapeHtml(checkIn)}</span></div>
    <div class="meta-item"><label>Check-out</label><span>${escapeHtml(checkOut)}</span></div>
  `;

  let tableRows = "";
  if (data.rows.length === 0) {
    tableRows = `<tr><td colspan="7" class="empty">Nenhum quarto cadastrado nesta viagem</td></tr>`;
  } else {
    tableRows = data.rows
      .map((r: RelatorioHospedeRow) => {
        const roomCell = r.isFirstInGroup
          ? `<td rowspan="${r.groupSize}">${escapeHtml(r.roomNumber)}</td>
             <td rowspan="${r.groupSize}">${escapeHtml(r.roomType)}</td>`
          : "";
        return `<tr>
          <td class="num">${r.num}</td>
          ${roomCell}
          <td>${escapeHtml(r.name)}</td>
          <td>${escapeHtml(formatCpfForDisplay(r.cpf) || "—")}</td>
          <td>${escapeHtml(r.rg?.trim() || "—")}</td>
          <td>${escapeHtml(formatBrDate(r.birthDate))}</td>
        </tr>`;
      })
      .join("");
  }

  const body = `
    <section class="section">
      <h2 class="section-title">Hóspedes por quarto</h2>
      <table>
        <thead>
          <tr>
            <th class="num">#</th>
            <th>Quarto</th>
            <th>Tipo</th>
            <th>Nome</th>
            <th>CPF</th>
            <th>RG</th>
            <th>Nascimento</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
    </section>
  `;

  return documentShell(
    `Relação de Hóspedes — ${travel.tenant.name}`,
    travel.tenant.name,
    travel.tenant.logoUrl,
    "Relação de Hóspedes",
    travel.categoryLabel,
    travelMetaHtml(travel, extra),
    body,
    size,
  );
}

export function buildProgramacaoPrintHtml(
  data: ProgramacaoSemanalReportDto,
  size: PrintPageSize = "A4",
): string {
  const clubName = data.tenant.name;
  const logoUrl = data.tenant.logoUrl;
  const badge = data.period.label;
  const categories =
    data.categories.length > 0 ? data.categories : ["—"];

  const pages = categories
    .map((cat) => {
      const catLabel =
        cat === "—"
          ? "Sem categoria"
          : (data.categoryLabels[cat] ?? cat);
      const rows = data.days
        .map((day) => {
          const acts = day.byCategory[cat] ?? [];
          if (acts.length === 0) {
            return `<tr>
              <td class="day-cell">${escapeHtml(day.weekdayLabel)}<br/><span style="font-weight:500;font-size:9px;color:#64748b">${escapeHtml(day.dateLabel)}</span></td>
              <td><span class="act-meta">—</span></td>
            </tr>`;
          }
          const html = acts
            .map(
              (a) => `<div class="act">
                <div class="act-time">${escapeHtml(a.time)}</div>
                <div class="act-title">${escapeHtml(a.title)}</div>
                <div class="act-meta">${escapeHtml(a.typeLabel)}${a.location ? ` · ${escapeHtml(a.location)}` : ""}</div>
              </div>`,
            )
            .join("");
          return `<tr>
            <td class="day-cell">${escapeHtml(day.weekdayLabel)}<br/><span style="font-weight:500;font-size:9px;color:#64748b">${escapeHtml(day.dateLabel)}</span></td>
            <td>${html}</td>
          </tr>`;
        })
        .join("");

      return `<div class="print-page">
        <div class="report-intro">
          <div class="top-bar"></div>
          <header class="header">
            ${logoHtml(logoUrl, clubName)}
            <div class="brand-block">
              <p class="brand">Boston City Group · Depto Futebol</p>
              <h1 class="club">${escapeHtml(clubName)}</h1>
              <p class="doc-title">Programação Semanal</p>
              <span class="badge">${escapeHtml(badge)}</span>
            </div>
          </header>
          <div class="meta-grid">
            <div class="meta-item full">
              <label>Período</label>
              <span>${escapeHtml(data.period.label)}</span>
            </div>
            <div class="meta-item full">
              <label>Categoria</label>
              <span>${escapeHtml(catLabel)}</span>
            </div>
          </div>
        </div>
        <section class="section schedule-wrap" style="margin-top:14px">
          <h3 class="schedule-category-title">${escapeHtml(catLabel)}</h3>
          <table class="schedule-table schedule-table-single">
            <thead>
              <tr>
                <th>Dia</th>
                <th>Programação</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </section>
        <footer class="footer">
          <span>Gerado em ${escapeHtml(new Date().toLocaleString("pt-BR"))}</span>
          <span><strong>Boston City Group</strong> · Relatório oficial</span>
        </footer>
      </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(`Programação Semanal — ${clubName}`)}</title>
  <style>${baseStyles(size)}</style>
</head>
<body>
  ${pages}
</body>
</html>`;
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

export function printPassageirosReport(
  data: PassageirosReportDto,
  size: PrintPageSize = "A4",
): void {
  printHtmlDocument(buildPassageirosPrintHtml(data, size), "Impressão — Passageiros");
}

export function printHospedesReport(
  data: HospedesReportDto,
  size: PrintPageSize = "A4",
): void {
  printHtmlDocument(buildHospedesPrintHtml(data, size), "Impressão — Hóspedes");
}

export function printProgramacaoReport(
  data: ProgramacaoSemanalReportDto,
  size: PrintPageSize = "A4",
): void {
  printHtmlDocument(buildProgramacaoPrintHtml(data, size), "Impressão — Programação");
}

function formatStopDateTime(v: string | null | undefined): string {
  if (!v?.trim()) return "—";
  const raw = v.includes("T") ? formatBrDateTime(v) : v;
  return escapeHtml(raw);
}

function stopsTable(
  title: string,
  stops: LayoutRelacionadosReportDto["outbound"],
): string {
  if (stops.length === 0) {
    return `
      <section class="section">
        <h2 class="section-title">${escapeHtml(title)}</h2>
        <p class="empty">Sem paradas cadastradas</p>
      </section>`;
  }
  const rows = stops
    .map(
      (s, i) => `<tr>
        <td class="num">${i + 1}</td>
        <td>${escapeHtml(s.place)}</td>
        <td>${formatStopDateTime(s.arriveAt)}</td>
        <td>${formatStopDateTime(s.departAt)}</td>
        <td>${escapeHtml(s.notes?.trim() || "—")}</td>
      </tr>`,
    )
    .join("");
  return `
    <section class="section">
      <h2 class="section-title">${escapeHtml(title)}</h2>
      <table>
        <thead>
          <tr>
            <th class="num">#</th>
            <th>Local</th>
            <th>Chegada</th>
            <th>Saída</th>
            <th>Obs.</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>`;
}

export function buildLayoutRelacionadosPrintHtml(
  data: LayoutRelacionadosReportDto,
  size: PrintPageSize = "A4",
): string {
  const { travel, uniforms } = data;
  const busLine = !travel.isHomeMatch && data.busType ? `Ônibus ${data.busType}` : null;
  const extra = `
    ${busLine ? `<div class="meta-item"><label>Veículo</label><span>${escapeHtml(busLine)}</span></div>` : ""}
    ${
      !travel.isHomeMatch && (travel.hotelCheckIn || travel.hotelCheckOut)
        ? `<div class="meta-item"><label>Check-in</label><span>${escapeHtml(formatBrDateTime(travel.hotelCheckIn) || "—")}</span></div>
           <div class="meta-item"><label>Check-out</label><span>${escapeHtml(formatBrDateTime(travel.hotelCheckOut) || "—")}</span></div>`
        : ""
    }
  `;

  const uniformsRows = (
    travel.isHomeMatch
      ? [
          ["Atletas — jogo", uniforms.athletesGame],
          ["Comissão — jogo", uniforms.staffGame],
        ]
      : [
          ["Atletas — jogo", uniforms.athletesGame],
          ["Atletas — viagem", uniforms.athletesTravel],
          ["Comissão — jogo", uniforms.staffGame],
          ["Comissão — viagem", uniforms.staffTravel],
        ]
  )
    .filter(([, v]) => v?.trim())
    .map(
      ([label, v]) =>
        `<tr><td>${escapeHtml(label as string)}</td><td>${escapeHtml((v as string).trim())}</td></tr>`,
    )
    .join("");

  const uniformsSection = uniformsRows
    ? `<section class="section">
        <h2 class="section-title">Uniformes</h2>
        <table>
          <thead><tr><th>Item</th><th>Kit / observação</th></tr></thead>
          <tbody>${uniformsRows}</tbody>
        </table>
      </section>`
    : "";

  const homeAgenda =
    data.homeMatchAgenda.length > 0
      ? `<section class="section">
          <h2 class="section-title">Agenda do jogo (casa)</h2>
          <table>
            <thead><tr><th class="num">#</th><th>Atividade</th><th>Horário</th><th>Obs.</th></tr></thead>
            <tbody>
              ${data.homeMatchAgenda
                .map(
                  (a, i) => `<tr>
                    <td class="num">${i + 1}</td>
                    <td>${escapeHtml(a.label)}</td>
                    <td>${escapeHtml(a.time?.trim() || "—")}</td>
                    <td>${escapeHtml(a.notes?.trim() || "—")}</td>
                  </tr>`,
                )
                .join("")}
            </tbody>
          </table>
        </section>`
      : "";

  const body = `
    ${personTable("Atletas convocados", data.athletes)}
    ${personTable("Comissão técnica", data.staff, true)}
    ${data.guests.length ? personTable("Pessoas autorizadas", data.guests) : ""}
    ${uniformsSection}
    ${
      travel.isHomeMatch
        ? homeAgenda
        : `${stopsTable("Programação de ida", data.outbound)}
           ${stopsTable("Programação de retorno", data.returnStops)}
           ${homeAgenda}`
    }
  `;

  const badge = [
    travel.categoryLabel,
    travel.isHomeMatch ? "Casa" : "Fora",
    travel.championshipName,
  ]
    .filter(Boolean)
    .join(" · ");

  const programacaoLabel = travel.isHomeMatch
    ? "Layout Relacionados / Programação para o jogo"
    : "Layout Relacionados / Programação da viagem";

  return documentShell(
    `Layout Relacionados — ${travel.tenant.name}`,
    travel.tenant.name,
    travel.tenant.logoUrl,
    programacaoLabel,
    badge,
    travelMetaHtml(travel, extra),
    body,
    size,
  );
}

export function printLayoutRelacionadosReport(
  data: LayoutRelacionadosReportDto,
  size: PrintPageSize = "A4",
): void {
  printHtmlDocument(
    buildLayoutRelacionadosPrintHtml(data, size),
    "Impressão — Layout Relacionados",
  );
}

function shortAthleteName(full: string): string {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 2) return full.trim();
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

function formatBirthShort(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
}

/** Posições % no gramado (formação visual 4-3-3 — não é o esquema tático real). */
const PRESS_KIT_FIELD_SLOTS: { top: number; left: number }[] = [
  { top: 86, left: 50 }, // GK
  { top: 68, left: 14 },
  { top: 70, left: 37 },
  { top: 70, left: 63 },
  { top: 68, left: 86 },
  { top: 46, left: 24 },
  { top: 48, left: 50 },
  { top: 46, left: 76 },
  { top: 22, left: 22 },
  { top: 16, left: 50 },
  { top: 22, left: 78 },
];

export function buildPressKitPrintHtml(
  data: PressKitReportDto,
  size: PrintPageSize = "A4",
): string {
  const { travel, config } = data;
  const club = travel.tenant.name;
  const opponent = travel.opponentName?.trim() || "Adversário";
  const homeName = travel.isHomeMatch ? club : opponent;
  const awayName = travel.isHomeMatch ? opponent : club;
  const kickoff = [formatBrDate(travel.matchDate), config.matchTime].filter(Boolean).join(" · ");
  const venue = [travel.stadiumName, travel.city, travel.country].filter(Boolean).join(" · ");
  const logo = resolveLogoUrlForPrint(travel.tenant.logoUrl);

  const refereesHtml = config.referees
    .filter((r) => r.name.trim())
    .map(
      (r) =>
        `<div class="ref-row"><strong>${escapeHtml(r.name)}</strong><span>${escapeHtml(r.role)}</span></div>`,
    )
    .join("");

  const directorsHtml = config.directors
    .filter((d) => d.name.trim())
    .map(
      (d) =>
        `<div class="dir-card"><strong>${escapeHtml(d.name)}</strong><span>${escapeHtml(d.role)}</span></div>`,
    )
    .join("");

  const staffHtml = data.staff
    .map((s) => {
      const role = s.role ? getStaffRoleLabel(s.role) : "Comissão";
      return `<div class="staff-row"><strong>${escapeHtml(s.name)}</strong><span>${escapeHtml(role)}</span></div>`;
    })
    .join("");

  const subsHtml = data.substitutes
    .map((s) => {
      const n = s.jerseyNumber != null ? String(s.jerseyNumber) : "—";
      const birth = formatBirthShort(s.birthDate);
      return `<div class="sub-row"><span class="sub-num">${escapeHtml(n)}</span><span class="sub-name">${escapeHtml(shortAthleteName(s.name))}</span>${birth ? `<span class="sub-birth">${escapeHtml(birth)}</span>` : ""}</div>`;
    })
    .join("");

  const fieldPlayers = PRESS_KIT_FIELD_SLOTS.map((slot, i) => {
    const p = data.starters[i];
    if (!p) return "";
    const n = p.jerseyNumber != null ? String(p.jerseyNumber) : String(i + 1);
    const birth = formatBirthShort(p.birthDate);
    return `<div class="player-chip" style="top:${slot.top}%;left:${slot.left}%">
      <div class="chip-num">${escapeHtml(n)}</div>
      <div class="chip-name">${escapeHtml(shortAthleteName(p.name))}</div>
      ${birth ? `<div class="chip-birth">${escapeHtml(birth)}</div>` : ""}
    </div>`;
  }).join("");

  const styles = `
    ${pageCss(size)}
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      color: #0f172a;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .pk { max-width: 100%; }
    .pk-top {
      display: grid;
      grid-template-columns: 90px 1fr;
      gap: 14px;
      align-items: center;
      margin-bottom: 10px;
      padding-bottom: 10px;
      border-bottom: 3px solid ${BCG.red};
    }
    .pk-logo {
      width: 88px; height: 88px; object-fit: contain;
      border: 2px solid ${BCG.blue}; border-radius: 12px; background: #fff; padding: 4px;
    }
    .pk-logo-fallback {
      width: 88px; height: 88px; border-radius: 12px; border: 2px solid ${BCG.blue};
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; color: ${BCG.blue}; font-size: 22px; background: ${BCG.blueLight};
    }
    .pk-matchup {
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
      font-size: 22px; font-weight: 800; color: ${BCG.blue}; letter-spacing: 0.02em;
    }
    .pk-x {
      display: inline-flex; width: 36px; height: 36px; border-radius: 999px;
      align-items: center; justify-content: center;
      background: ${BCG.red}; color: #fff; font-size: 16px; font-weight: 800;
    }
    .pk-meta { margin-top: 4px; font-size: 13px; color: #334155; line-height: 1.45; }
    .pk-meta strong { color: ${BCG.blue}; }
    .pk-grid {
      display: grid;
      grid-template-columns: 1fr 1.55fr 0.95fr;
      gap: 10px;
      align-items: start;
    }
    .pk-col h3 {
      margin: 0 0 8px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: ${BCG.red};
      border-bottom: 2px solid ${BCG.red};
      padding-bottom: 4px;
    }
    .ref-row, .staff-row, .sub-row {
      display: flex; flex-direction: column; gap: 1px;
      padding: 5px 0; border-bottom: 1px solid #e2e8f0; font-size: 11px;
    }
    .ref-row strong, .staff-row strong, .sub-name { color: #0f172a; }
    .ref-row span, .staff-row span, .sub-birth { color: #64748b; font-size: 10px; }
    .sub-row { flex-direction: row; align-items: baseline; gap: 6px; flex-wrap: wrap; }
    .sub-num {
      min-width: 22px; height: 22px; border-radius: 999px;
      background: ${BCG.blue}; color: #fff; font-weight: 800; font-size: 11px;
      display: inline-flex; align-items: center; justify-content: center;
    }
    .pitch-wrap {
      position: relative;
      width: 100%;
      aspect-ratio: 3 / 4;
      border-radius: 14px;
      overflow: hidden;
      border: 3px solid #166534;
      background:
        linear-gradient(180deg, rgba(255,255,255,0.08) 0 50%, transparent 50%),
        repeating-linear-gradient(
          90deg,
          #15803d 0 12.5%,
          #16a34a 12.5% 25%
        );
      box-shadow: inset 0 0 0 2px rgba(255,255,255,0.25);
    }
    .pitch-wrap::before {
      content: "";
      position: absolute; inset: 8%;
      border: 2px solid rgba(255,255,255,0.55);
      border-radius: 4px;
      pointer-events: none;
    }
    .pitch-wrap::after {
      content: "";
      position: absolute; left: 50%; top: 50%;
      width: 56px; height: 56px; margin: -28px 0 0 -28px;
      border: 2px solid rgba(255,255,255,0.55);
      border-radius: 999px;
      pointer-events: none;
    }
    .player-chip {
      position: absolute;
      transform: translate(-50%, -50%);
      width: 78px;
      text-align: center;
      z-index: 2;
    }
    .chip-num {
      margin: 0 auto 2px;
      width: 28px; height: 28px; border-radius: 999px;
      background: ${BCG.blue}; color: #fff; font-weight: 800; font-size: 13px;
      display: flex; align-items: center; justify-content: center;
      border: 2px solid #fff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25);
    }
    .chip-name {
      font-size: 9px; font-weight: 700; color: #fff;
      text-shadow: 0 1px 2px rgba(0,0,0,0.65);
      line-height: 1.15;
    }
    .chip-birth {
      font-size: 8px; color: #e2e8f0;
      text-shadow: 0 1px 2px rgba(0,0,0,0.65);
    }
    .dir-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px;
    }
    .dir-card {
      border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px;
      background: linear-gradient(180deg, ${BCG.blueLight}, #fff);
      display: flex; flex-direction: column; gap: 2px; font-size: 11px;
    }
    .dir-card strong { color: ${BCG.blue}; }
    .dir-card span { color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; }
    .pk-disclaimer {
      margin-top: 10px; font-size: 9px; color: #64748b; text-align: center;
      border-top: 1px dashed #cbd5e1; padding-top: 6px;
    }
    .pk-contact {
      margin-top: 8px; font-size: 10px; color: #334155; text-align: center;
    }
    .pk-footer {
      margin-top: 8px; display: flex; justify-content: space-between;
      font-size: 9px; color: #94a3b8;
    }
    @media print {
      .pk-grid { break-inside: avoid; }
    }
  `;

  const body = `
    <div class="pk">
      <div class="pk-top">
        ${
          logo
            ? `<img class="pk-logo" src="${escapeHtml(logo)}" alt="" />`
            : `<div class="pk-logo-fallback">BC</div>`
        }
        <div>
          <div class="pk-matchup">
            <span>${escapeHtml(homeName)}</span>
            <span class="pk-x">X</span>
            <span>${escapeHtml(awayName)}</span>
          </div>
          <div class="pk-meta">
            ${travel.championshipName ? `<div><strong>${escapeHtml(travel.championshipName)}</strong>${config.phase ? ` · ${escapeHtml(config.phase)}` : ""}</div>` : ""}
            ${travel.categoryLabel ? `<div>${escapeHtml(travel.categoryLabel)} · ${travel.isHomeMatch ? "Casa" : "Fora"}</div>` : ""}
            ${kickoff ? `<div>${escapeHtml(kickoff)}</div>` : ""}
            ${venue ? `<div>${escapeHtml(venue)}</div>` : ""}
          </div>
        </div>
      </div>

      <div class="pk-grid">
        <div class="pk-col">
          <h3>Arbitragem</h3>
          ${refereesHtml || `<p style="font-size:11px;color:#94a3b8">Não informado</p>`}
          <h3 style="margin-top:14px">Suplentes</h3>
          ${subsHtml || `<p style="font-size:11px;color:#94a3b8">—</p>`}
        </div>
        <div class="pk-col">
          <h3>Escalação (visual)</h3>
          <div class="pitch-wrap">${fieldPlayers}</div>
        </div>
        <div class="pk-col">
          <h3>Comissão técnica</h3>
          ${staffHtml || `<p style="font-size:11px;color:#94a3b8">—</p>`}
        </div>
      </div>

      ${directorsHtml ? `<div class="dir-grid">${directorsHtml}</div>` : ""}
      ${
        config.showDisclaimer
          ? `<p class="pk-disclaimer">O quadro acima não representa o esquema utilizado, nem o posicionamento dos jogadores em campo.</p>`
          : ""
      }
      ${config.contactLine ? `<p class="pk-contact">${escapeHtml(config.contactLine)}</p>` : ""}
      <div class="pk-footer">
        <span>Gerado em ${escapeHtml(new Date().toLocaleString("pt-BR"))}</span>
        <span><strong>Boston City Group</strong> · Relatório de Imprensa / Press Kit</span>
      </div>
    </div>
  `;

  return wrapPrintRootDocument({
    title: escapeHtml(`Relatório Imprensa — ${club} x ${opponent}`),
    styles,
    headerHtml: "",
    metaHtml: "",
    bodyHtml: body,
    footerHtml: "",
  });
}

export function printPressKitReport(
  data: PressKitReportDto,
  size: PrintPageSize = "A4",
): void {
  printHtmlDocument(buildPressKitPrintHtml(data, size), "Impressão — Press Kit / Relatório Imprensa");
}
