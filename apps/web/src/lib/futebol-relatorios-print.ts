import { formatCpfForDisplay } from "@/lib/format-cpf";
import {
  formatDateDayMonYear,
  formatDateDaySlashMonYear,
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
  SumulaCartoesMatchPlayer,
  SumulaCartoesMatchTeam,
  SumulaCartoesReportDto,
  CartoesSuspensaoReportDto,
} from "@/lib/futebol-relatorios.types";
import { getStaffRoleLabel } from "@/lib/staff-roles";
import { getFormation, pitchChipTranslateY } from "@/lib/press-kit-formations";
import { cadastroPositionAbbrev } from "@/lib/press-kit-lineup";
import type { PressKitUniformKitDto } from "@/lib/futebol-relatorios.types";

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

/** Logo/foto com URL absoluta (iframe srcDoc não resolve paths relativos). */
export function resolveLogoUrlForPrint(logoUrl: string | null | undefined): string {
  if (!logoUrl) return "";
  const raw = logoUrl.trim();
  // Recorte do gramado (canvas) — não passar por getPublicImageUrl (apagava data:/blob:).
  if (raw.startsWith("data:") || raw.startsWith("blob:")) return raw;
  const resolved = getPublicImageUrl(raw);
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

function travelClubName(
  travel: PassageirosReportDto["travel"],
): string {
  return travel.tenant.tradeName?.trim() || travel.tenant.name;
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
    .doc-id {
      white-space: nowrap;
      word-break: keep-all;
      font-variant-numeric: tabular-nums;
    }
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
    .schedule-table-grid thead th { font-size: 8.5px; padding: 6px 4px; }
    .schedule-table-grid tbody td { min-width: 72px; }
    .schedule-day-title {
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

function formatDocId(value: string | null | undefined): string {
  const v = value?.trim();
  return v ? escapeHtml(v) : "—";
}

function formatCpfCell(cpf: string | null | undefined): string {
  const formatted = formatCpfForDisplay(cpf);
  if (!formatted) return "—";
  return `<span class="doc-id">${escapeHtml(formatted)}</span>`;
}

function formatRgCell(rg: string | null | undefined): string {
  const v = rg?.trim();
  if (!v) return "—";
  return `<span class="doc-id">${escapeHtml(v)}</span>`;
}

type PersonTableOpts = {
  showRole?: boolean;
  /** Só nome, apelido e nascimento (sem CPF/RG) — convocação / relacionados */
  convocacao?: boolean;
};

function personTableRows(rows: RelatorioPessoaRow[], opts: PersonTableOpts = {}): string {
  const showRole = opts.showRole === true;
  const convocacao = opts.convocacao === true;
  const colCount = 3 + (showRole ? 1 : 0) + (convocacao ? 1 : 4);
  if (rows.length === 0) {
    return `<tr><td colspan="${colCount}" class="empty">Nenhum registro</td></tr>`;
  }
  const birthFmt = convocacao ? formatDateDaySlashMonYear : formatBrDate;
  return rows
    .map((r) => {
      const roleCell = showRole
        ? `<td>${escapeHtml(r.role?.trim() || "—")}</td>`
        : "";
      const docsCells = convocacao
        ? ""
        : `<td>${formatCpfCell(r.cpf)}</td>
        <td>${formatRgCell(r.rg)}</td>
        <td>${formatDocId(r.rgIssuer)}</td>`;
      return `<tr>
        <td class="num">${r.num}</td>
        <td class="left">${escapeHtml(r.name)}</td>
        <td class="left">${escapeHtml(r.nickname?.trim() || "—")}</td>
        ${roleCell}
        ${docsCells}
        <td>${escapeHtml(birthFmt(r.birthDate))}</td>
      </tr>`;
    })
    .join("");
}

function personTable(
  title: string,
  rows: RelatorioPessoaRow[],
  opts: PersonTableOpts | boolean = {},
): string {
  const normalized: PersonTableOpts =
    typeof opts === "boolean" ? { showRole: opts } : opts;
  const showRole = normalized.showRole === true;
  const convocacao = normalized.convocacao === true;
  const roleHead = showRole ? "<th>Função</th>" : "";
  const docsHead = convocacao
    ? ""
    : "<th>CPF</th><th>RG</th><th>Órgão emissor</th>";
  return `
    <section class="section">
      <h2 class="section-title">${escapeHtml(title)}</h2>
      <table>
        <thead>
          <tr>
            <th class="num">#</th>
            <th>Nome</th>
            <th>Apelido</th>
            ${roleHead}
            ${docsHead}
            <th>Nascimento</th>
          </tr>
        </thead>
        <tbody>${personTableRows(rows, normalized)}</tbody>
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
    `Relação de Passageiros — ${travelClubName(travel)}`,
    travelClubName(travel),
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
    tableRows = `<tr><td colspan="8" class="empty">Nenhum quarto cadastrado nesta viagem</td></tr>`;
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
          <td class="left">${escapeHtml(r.name)}</td>
          <td class="left">${escapeHtml(r.nickname?.trim() || "—")}</td>
          <td>${formatCpfCell(r.cpf)}</td>
          <td>${formatRgCell(r.rg)}</td>
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
            <th>Apelido</th>
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
    `Relação de Hóspedes — ${travelClubName(travel)}`,
    travelClubName(travel),
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
  const categories = data.categories.length > 0 ? data.categories : ["—"];

  const categoryHeaders = categories
    .map((cat) => {
      const catLabel =
        cat === "—" ? "Sem categoria" : (data.categoryLabels[cat] ?? cat);
      return `<th>${escapeHtml(catLabel)}</th>`;
    })
    .join("");

  const pages = data.days
    .map((day) => {
      const cells = categories
        .map((cat) => {
          const acts = day.byCategory[cat] ?? [];
          if (acts.length === 0) {
            return `<td><span class="act-meta">—</span></td>`;
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
          return `<td>${html}</td>`;
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
          </div>
        </div>
        <section class="section schedule-wrap" style="margin-top:14px">
          <h3 class="schedule-day-title">${escapeHtml(day.weekdayLabel)} · ${escapeHtml(day.dateLabel)}</h3>
          <table class="schedule-table schedule-table-grid">
            <thead>
              <tr>${categoryHeaders}</tr>
            </thead>
            <tbody><tr>${cells}</tr></tbody>
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

export function printHtmlDocument(html: string, title: string): void {
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

function sumulaPlayerRows(players: SumulaCartoesMatchPlayer[]): string {
  if (players.length === 0) {
    return `<tr><td colspan="8" class="empty">Sem jogadores na súmula</td></tr>`;
  }
  return players
    .map((p) => `<tr>
        <td class="num">${p.jerseyNumber ?? "—"}</td>
        <td class="left">${escapeHtml(p.name)}</td>
        <td><span class="doc-id">${escapeHtml(p.cbfRegistration?.trim() || "—")}</span></td>
        <td>${p.starter ? "Sim" : "Não"}</td>
        <td>${p.played ? p.minutesPlayed : "—"}</td>
        <td>${p.goals > 0 ? p.goals : "—"}</td>
        <td>${p.yellowCards > 0 ? p.yellowCards : "—"}</td>
        <td>${p.redCards > 0 ? p.redCards : "—"}</td>
      </tr>`)
    .join("");
}

function sumulaTeamTable(title: string, team: SumulaCartoesMatchTeam): string {
  const score = team.score != null ? String(team.score) : "—";
  return `
    <section class="section">
      <h2 class="section-title">${escapeHtml(title)} — ${escapeHtml(team.teamName)} (${escapeHtml(score)})</h2>
      <table>
        <thead>
          <tr>
            <th class="num">#</th>
            <th>Atleta</th>
            <th>CBF</th>
            <th>Titular</th>
            <th>Min</th>
            <th>Gols</th>
            <th>A</th>
            <th>V</th>
          </tr>
        </thead>
        <tbody>${sumulaPlayerRows(team.players)}</tbody>
      </table>
    </section>
  `;
}

function disciplineRows(rows: SumulaCartoesReportDto["discipline"]): string {
  if (rows.length === 0) {
    return `<tr><td colspan="6" class="empty">Nenhum cartão registrado no período</td></tr>`;
  }
  return rows
    .map(
      (r) => `<tr>
        <td class="num">${r.num}</td>
        <td class="left">${escapeHtml(r.name)}</td>
        <td class="num">${r.jerseyNumber ?? "—"}</td>
        <td>${escapeHtml(r.categoryLabel)}</td>
        <td>${r.yellowCards > 0 ? r.yellowCards : "—"}</td>
        <td>${r.redCards > 0 ? r.redCards : "—"}</td>
      </tr>`,
    )
    .join("");
}

function sumulaSeasonGridSection(data: SumulaCartoesReportDto): string {
  const grid = data.seasonGrid;
  if (!grid || grid.players.length === 0) {
    return `<section class="section"><p class="empty">Selecione uma categoria para ver a sequência de cartões da temporada.</p></section>`;
  }

  const gridDto: CartoesSuspensaoReportDto = {
    tenant: data.tenant,
    filters: {
      season: data.filters.season,
      category: data.filters.category ?? "",
      categoryLabel: data.filters.categoryLabel,
      competition: null,
      phase: null,
    },
    nextRound: grid.nextRound,
    rounds: grid.rounds,
    players: grid.players,
    totals: grid.totals,
    generatedAt: data.generatedAt,
  };

  const nextRoundMeta = grid.nextRound
    ? `<div class="meta-item full"><label>Próxima rodada</label><span>${escapeHtml(grid.nextRound.label)} · ${escapeHtml(formatBrDate(grid.nextRound.matchDate))}</span></div>`
    : "";

  return `
    <style>${cartoesSuspensaoDisciplineTableStyles()}</style>
    <section class="section">
      <h2 class="section-title">Cartões da temporada — ${escapeHtml(data.filters.categoryLabel)} · ${data.filters.season}</h2>
      <div class="meta-grid">${nextRoundMeta}</div>
      ${cartoesSuspensaoLegend()}
      <table class="discipline-table">
        <thead>
          <tr>
            <th class="num">#</th>
            <th>Atleta</th>
            <th>C.A</th>
            <th>C.V</th>
            ${cartoesSuspensaoRoundHeaders(grid.rounds)}
            ${cartoesSuspensaoNextRoundHeader(gridDto)}
          </tr>
        </thead>
        <tbody>
          ${cartoesSuspensaoPlayerRows(gridDto)}
          ${cartoesSuspensaoTotalsRow(gridDto)}
        </tbody>
      </table>
      <p class="summary-line">
        Média C.A/Jogo: <strong>${grid.totals.avgYellowPerMatch}</strong>
        · Média C.V/Jogo: <strong>${grid.totals.avgRedPerMatch}</strong>
        · Total de jogos: <strong>${grid.totals.matchCount}</strong>
      </p>
    </section>
  `;
}

export function buildSumulaCartoesPrintHtml(
  data: SumulaCartoesReportDto,
  size: PrintPageSize = "A4",
): string {
  const badge = [String(data.filters.season), data.filters.categoryLabel].filter(Boolean).join(" · ");

  const matchMeta = data.match
    ? `
    <div class="meta-grid">
      <div class="meta-item"><label>Competição</label><span>${escapeHtml(data.match.competition)}</span></div>
      <div class="meta-item"><label>Categoria</label><span>${escapeHtml(data.match.categoryLabel)}</span></div>
      <div class="meta-item"><label>Data</label><span>${escapeHtml(formatBrDate(data.match.matchDate))}${data.match.kickoffTime ? ` · ${escapeHtml(data.match.kickoffTime)}` : ""}</span></div>
      <div class="meta-item"><label>Placar</label><span>${escapeHtml(data.match.homeTeam)} ${data.match.homeScore ?? "—"} x ${data.match.awayScore ?? "—"} ${escapeHtml(data.match.awayTeam)}</span></div>
      ${data.match.phase ? `<div class="meta-item"><label>Fase</label><span>${escapeHtml(data.match.phase)}</span></div>` : ""}
      ${data.match.round != null ? `<div class="meta-item"><label>Rodada</label><span>${data.match.round}</span></div>` : ""}
    </div>
  `
    : "";

  const sumulaBody = data.match
    ? `${matchMeta}${sumulaTeamTable("Mandante", data.match.home)}${sumulaTeamTable("Visitante", data.match.away)}`
    : "";

  const disciplineBody = sumulaSeasonGridSection(data);

  return documentShell(
    `Súmula e Cartões — ${data.tenant.name}`,
    data.tenant.name,
    data.tenant.logoUrl,
    "Súmula e Cartões",
    badge,
    data.match
      ? ""
      : `<div class="meta-grid"><div class="meta-item full"><label>Temporada</label><span>${data.filters.season} · ${escapeHtml(data.filters.categoryLabel)}</span></div></div>`,
    `${sumulaBody}${disciplineBody}`,
    size,
  );
}

export function printSumulaCartoesReport(
  data: SumulaCartoesReportDto,
  size: PrintPageSize = "A4",
): void {
  printHtmlDocument(buildSumulaCartoesPrintHtml(data, size), "Impressão — Súmula e Cartões");
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

function uniformKitCardHtml(
  label: string,
  kit: PressKitUniformKitDto | null | undefined,
  fallbackName: string | null | undefined,
): string {
  const name = kit?.name?.trim() || fallbackName?.trim();
  if (!name) return "";
  const mainSrc = kit?.imageUrl
    ? resolveLogoUrlForPrint(kit.imageUrl) || kit.imageUrl
    : null;
  const pieces = (kit?.items ?? [])
    .filter((item) => item.imageUrl)
    .slice(0, 4)
    .map((item) => {
      const src = resolveLogoUrlForPrint(item.imageUrl!) || item.imageUrl!;
      return `<div class="uk-piece"><img src="${escapeHtml(src)}" alt="" /><span>${escapeHtml(item.name)}</span></div>`;
    })
    .join("");
  return `<div class="uk-card">
    <div class="uk-label">${escapeHtml(label)}</div>
    <div class="uk-body">
      ${mainSrc ? `<img class="uk-main" src="${escapeHtml(mainSrc)}" alt="" />` : `<div class="uk-main uk-main-empty"></div>`}
      <div>
        <strong>${escapeHtml(name)}</strong>
        ${pieces ? `<div class="uk-pieces">${pieces}</div>` : ""}
      </div>
    </div>
  </div>`;
}

export function buildLayoutRelacionadosPrintHtml(
  data: LayoutRelacionadosReportDto,
  size: PrintPageSize = "A4",
): string {
  const { travel, uniforms } = data;
  const kits = data.uniformKits ?? {
    athletesGame: null,
    athletesTravel: null,
    staffGame: null,
    staffTravel: null,
  };
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

  const uniformCards = (
    travel.isHomeMatch
      ? [
          uniformKitCardHtml("Atletas — jogo", kits.athletesGame, uniforms.athletesGame),
          uniformKitCardHtml("Comissão — jogo", kits.staffGame, uniforms.staffGame),
        ]
      : [
          uniformKitCardHtml("Atletas — jogo", kits.athletesGame, uniforms.athletesGame),
          uniformKitCardHtml("Atletas — viagem", kits.athletesTravel, uniforms.athletesTravel),
          uniformKitCardHtml("Comissão — jogo", kits.staffGame, uniforms.staffGame),
          uniformKitCardHtml("Comissão — viagem", kits.staffTravel, uniforms.staffTravel),
        ]
  )
    .filter(Boolean)
    .join("");

  const uniformsSection = uniformCards
    ? `<section class="section">
        <h2 class="section-title">Uniformes</h2>
        <style>
          .uk-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; }
          .uk-card { border: 1px solid #cbd5e1; border-radius: 2mm; overflow: hidden; background: #f8fafc; }
          .uk-label { padding: 1.5mm 2.5mm; color: #fff; background: ${BCG.blue}; font-size: 7.5pt; letter-spacing: .06em; text-transform: uppercase; }
          .uk-body { display: flex; gap: 2.5mm; padding: 2.5mm; align-items: center; }
          .uk-main { width: 22mm; height: 22mm; object-fit: contain; border-radius: 1.5mm; background: #fff; border: 1px solid #e2e8f0; }
          .uk-main-empty { width: 22mm; height: 22mm; border-radius: 1.5mm; background: #e2e8f0; }
          .uk-body strong { display: block; color: ${BCG.blue}; font-size: 10pt; text-transform: uppercase; }
          .uk-pieces { display: flex; flex-wrap: wrap; gap: 1.5mm; margin-top: 1.5mm; }
          .uk-piece { text-align: center; width: 12mm; }
          .uk-piece img { width: 11mm; height: 11mm; object-fit: contain; border: 1px solid #dbe3ee; border-radius: 1mm; background: #fff; }
          .uk-piece span { display: block; font-size: 5.5pt; color: #64748b; line-height: 1.1; margin-top: 0.5mm; }
        </style>
        <div class="uk-grid">${uniformCards}</div>
      </section>`
    : "";

  const homeAgenda =
    data.homeMatchAgenda.length > 0
      ? `<section class="section">
          <h2 class="section-title">${travel.isHomeMatch ? "Agenda do jogo" : "Agenda do jogo / concentração"}</h2>
          <table>
            <thead><tr><th class="num">#</th><th>Data</th><th>Horário</th><th>Atividade</th><th>Obs.</th></tr></thead>
            <tbody>
              ${data.homeMatchAgenda
                .map(
                  (a, i) => `<tr>
                    <td class="num">${i + 1}</td>
                    <td>${escapeHtml(formatBrDate(a.date) || "—")}</td>
                    <td>${escapeHtml(a.time?.trim() || "—")}</td>
                    <td>${escapeHtml(a.label)}</td>
                    <td>${escapeHtml(a.notes?.trim() || "—")}</td>
                  </tr>`,
                )
                .join("")}
            </tbody>
          </table>
        </section>`
      : "";

  const body = `
    ${personTable("Atletas convocados", data.athletes, { convocacao: true })}
    ${personTable("Comissão técnica", data.staff, { showRole: true, convocacao: true })}
    ${data.guests.length ? personTable("Pessoas autorizadas", data.guests, { convocacao: true }) : ""}
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
    ? "Relacionados / Programação para o jogo"
    : "Relacionados / Programação da viagem";

  return documentShell(
    `Relacionados / Programação — ${travelClubName(travel)}`,
    travelClubName(travel),
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
    "Impressão — Relacionados / Programação",
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

function playerPhotoHtml(photoUrl: string | null | undefined, alt: string): string {
  const src = resolveLogoUrlForPrint(photoUrl);
  if (!src) {
    return `<div class="chip-photo chip-photo-fallback">${escapeHtml(alt.slice(0, 1).toUpperCase())}</div>`;
  }
  return `<img class="chip-photo" src="${escapeHtml(src)}" alt="" />`;
}

function clubInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function clubBadgeHtml(name: string, logo: string, tag: string): string {
  const crest = logo
    ? `<img class="pk-crest" src="${escapeHtml(logo)}" alt="" />`
    : `<div class="pk-crest pk-crest-fallback">${escapeHtml(clubInitials(name))}</div>`;
  return `<div class="pk-club">
    ${crest}
    <div class="pk-club-text">
      <span class="pk-club-tag">${escapeHtml(tag)}</span>
      <strong class="pk-club-name">${escapeHtml(name)}</strong>
    </div>
  </div>`;
}

export function buildPressKitPrintHtml(
  data: PressKitReportDto,
  size: PrintPageSize = "A4",
): string {
  const { travel, config } = data;
  const club = travelClubName(travel);
  const opponent = travel.opponentName?.trim() || "Adversário";
  const clubLogo = resolveLogoUrlForPrint(travel.tenant.logoUrl);
  const opponentLogo = resolveLogoUrlForPrint(data.opponentLogoUrl);
  const championshipLogo = resolveLogoUrlForPrint(data.championshipLogoUrl);
  const homeName = travel.isHomeMatch ? club : opponent;
  const awayName = travel.isHomeMatch ? opponent : club;
  const homeLogo = travel.isHomeMatch ? clubLogo : opponentLogo;
  const awayLogo = travel.isHomeMatch ? opponentLogo : clubLogo;
  const kickoff = [formatBrDate(travel.matchDate), config.matchTime].filter(Boolean).join(" · ");
  const venue = [travel.stadiumName, travel.city, travel.country].filter(Boolean).join(" · ");
  const competition = [travel.championshipName, config.phase].filter(Boolean).join(" · ");

  const refereesHtml = config.referees
    .filter((r) => r.name.trim())
    .map((r) => {
      const photo = playerPhotoHtml(r.photoUrl, r.name);
      return `<div class="ref-row">${photo}<div><strong>${escapeHtml(r.name)}</strong><span>${escapeHtml(r.role)}</span></div></div>`;
    })
    .join("");

  const directorsHtml = config.directors
    .filter((d) => d.name.trim())
    .map(
      (d) =>
        `<div class="dir-card"><strong>${escapeHtml(d.name)}</strong><span>${escapeHtml(d.role)}</span></div>`,
    )
    .join("");

  const staffRank = (m: RelatorioPessoaRow) => {
    const raw = (m.role ?? "").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
    const label = getStaffRoleLabel(m.role ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "");
    if (raw === "tecnico" || (label.includes("tecnico") && !label.includes("auxiliar"))) {
      return 0;
    }
    if (label.includes("auxiliar")) return 1;
    return 10;
  };
  const staffSorted = [...data.staff].sort((a, b) => {
    const d = staffRank(a) - staffRank(b);
    if (d !== 0) return d;
    return a.name.localeCompare(b.name, "pt-BR");
  });
  const staffHtml = staffSorted
    .map((s) => {
      const role = s.role ? getStaffRoleLabel(s.role) : "Comissão";
      const photo = playerPhotoHtml(s.photoUrl, s.name);
      return `<div class="staff-row">${photo}<div><strong>${escapeHtml(s.name)}</strong><span>${escapeHtml(role)}</span></div></div>`;
    })
    .join("");

  const athleteLabel = (p: RelatorioPessoaRow) =>
    p.nickname?.trim() || shortAthleteName(p.name);

  const subsHtml = data.substitutes
    .map((s) => {
      const n = s.jerseyNumber != null ? String(s.jerseyNumber) : "—";
      const birth = formatBirthShort(s.birthDate);
      const photo = playerPhotoHtml(s.photoUrl, s.name);
      const stats = s.seasonStats;
      const statsLine = stats
        ? `J ${stats.matches} · G ${stats.goals} · ${stats.minutes} min`
        : "";
      return `<div class="sub-row">${photo}<span class="sub-num">${escapeHtml(n)}</span><div class="sub-text"><span class="sub-name">${escapeHtml(athleteLabel(s))}</span><span class="sub-birth">${escapeHtml(s.name)}</span>${birth ? `<span class="sub-birth">${escapeHtml(birth)}</span>` : ""}${statsLine ? `<span class="sub-stats">${escapeHtml(statsLine)}</span>` : ""}</div></div>`;
    })
    .join("");

  const formation = getFormation(config.formation);
  const athletesById = new Map(
    data.athletes.filter((a) => a.playerId).map((a) => [a.playerId!, a]),
  );
  const fieldPlayers = formation.slots.map((slot, i) => {
    const slotId = config.starterPlayerIds[i];
    const p = slotId ? athletesById.get(slotId) : undefined;
    if (!p) return "";
    const n = p.jerseyNumber != null ? String(p.jerseyNumber) : "—";
    const photo = playerPhotoHtml(p.photoUrl, p.name);
    const isCaptain =
      Boolean(config.captainPlayerId) && p.playerId === config.captainPlayerId;
    const nickOnly = (
      p.nickname?.trim() ||
      shortAthleteName(p.name)
    ).toLocaleUpperCase("pt-BR");
    const pos = cadastroPositionAbbrev(p.position);
    const birth = formatBirthShort(p.birthDate);
    const ty = pitchChipTranslateY(slot.top);
    return `<div class="player-chip" style="top:${slot.top}%;left:${slot.left}%;transform:translate(-50%,${ty})">
      <div class="chip-photo-wrap">
        ${photo}
        <span class="chip-num">${escapeHtml(n)}${isCaptain ? `<b class="chip-cap">C</b>` : ""}</span>
      </div>
      <div class="chip-nick">${escapeHtml(nickOnly)}</div>
      ${pos && pos !== "—" ? `<div class="chip-pos">${escapeHtml(pos)}</div>` : ""}
      ${birth ? `<div class="chip-birth">${escapeHtml(birth)}</div>` : ""}
    </div>`;
  }).join("");
  const uniformHtml = data.uniformKit
    ? `<div class="kit-card">
        ${
          data.uniformKit.imageUrl
            ? `<img class="kit-main" src="${escapeHtml(resolveLogoUrlForPrint(data.uniformKit.imageUrl) || data.uniformKit.imageUrl)}" alt="" />`
            : ""
        }
        <div class="kit-copy">
          <strong>${escapeHtml(data.uniformKit.name)}</strong>
          <div class="kit-pieces">${data.uniformKit.items
            .filter((item) => item.imageUrl)
            .slice(0, 3)
            .map(
              (item) =>
                `<img src="${escapeHtml(resolveLogoUrlForPrint(item.imageUrl!) || item.imageUrl!)}" alt="${escapeHtml(item.name)}" />`,
            )
            .join("")}</div>
        </div>
      </div>`
    : `<p class="pk-empty">Não informado</p>`;

  const styles = `
    @page { size: ${size === "Letter" ? "letter" : "A4"} landscape; margin: 8mm 9mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      color: #0f172a;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .pk { width: 100%; }

    /* ---------- Cabeçalho: escudo x escudo ---------- */
    .pk-top {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 10px;
      align-items: center;
      padding: 6px 10px 8px;
      border-radius: 12px;
      background: linear-gradient(120deg, ${BCG.blue} 0%, ${BCG.blueMid} 55%, ${BCG.red} 100%);
      color: #fff;
    }
    .pk-club { display: flex; align-items: center; gap: 8px; min-width: 0; }
    .pk-top > .pk-club:last-child { flex-direction: row-reverse; text-align: right; }
    .pk-top > .pk-club:last-child .pk-club-text { align-items: flex-end; }
    .pk-crest {
      width: 46px; height: 46px; object-fit: contain; flex-shrink: 0;
      background: #fff; border-radius: 10px; padding: 3px;
    }
    .pk-crest-fallback {
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 15px; color: ${BCG.blue};
    }
    .pk-club-text { display: flex; flex-direction: column; min-width: 0; }
    .pk-club-tag {
      font-size: 7px; letter-spacing: 0.14em; text-transform: uppercase;
      color: rgba(255,255,255,0.72);
    }
    .pk-club-name {
      font-size: 15px; font-weight: 800; line-height: 1.1; letter-spacing: 0.01em;
      text-transform: uppercase;
    }
    .pk-center { text-align: center; padding: 0 6px; }
    .pk-comp {
      display: inline-flex; align-items: center; gap: 5px;
      font-size: 8px; letter-spacing: 0.1em; text-transform: uppercase;
      color: rgba(255,255,255,0.86);
    }
    .pk-comp img { height: 16px; width: auto; max-width: 26px; object-fit: contain; }
    .pk-x {
      margin: 2px auto 1px;
      width: 26px; height: 26px; border-radius: 999px;
      background: #fff; color: ${BCG.red};
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 900;
    }
    .pk-when { font-size: 11px; font-weight: 700; }
    .pk-where { font-size: 8px; color: rgba(255,255,255,0.85); }

    .pk-page { page-break-after: always; break-after: page; }
    .pk-page:last-child { page-break-after: auto; break-after: auto; }
    /* ---------- Corpo em colunas ---------- */
    .pk-main {
      display: grid;
      grid-template-columns: 0.82fr 1.5fr 0.82fr;
      gap: 9px;
      margin-top: 7px;
      align-items: start;
    }
    .pk-main-lists { grid-template-columns: 1fr 1fr; }
    .pk-staff-aside .staff-row .chip-photo,
    .pk-staff-aside .staff-row .chip-photo-fallback {
      width: 22px;
      height: 30px;
    }
    .pk-col { display: flex; flex-direction: column; gap: 7px; min-width: 0; }
    .pk-block h3 {
      margin: 0 0 4px;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: ${BCG.red};
      border-bottom: 2px solid ${BCG.red};
      padding-bottom: 2px;
    }
    .pk-empty { margin: 0; font-size: 9px; color: #94a3b8; }
    .kit-card { display: flex; align-items: center; gap: 6px; padding: 5px; border: 1px solid #cbd5e1; border-radius: 7px; background: ${BCG.blueLight}; }
    .kit-main { width: 48px; height: 48px; object-fit: contain; border-radius: 5px; background: #fff; }
    .kit-copy { min-width: 0; flex: 1; }
    .kit-copy strong { display: block; font-size: 8px; line-height: 1.2; color: ${BCG.blue}; text-transform: uppercase; }
    .kit-pieces { display: flex; gap: 3px; margin-top: 4px; }
    .kit-pieces img { width: 22px; height: 22px; object-fit: contain; border: 1px solid #dbe3ee; border-radius: 3px; background: #fff; }

    /* ---------- Gramado ---------- */
    .pitch-wrap {
      position: relative;
      width: 135mm;
      height: 139mm;
      border-radius: 8px;
      overflow: hidden;
      border: 2.5px solid #14532d;
      background: repeating-linear-gradient(90deg, #15803d 0 11.1%, #16a34a 11.1% 22.2%);
    }
    .pitch-players {
      position: absolute;
      inset: 0 7%;
      z-index: 2;
      overflow: hidden;
    }
    .pitch-line {
      position: absolute;
      border: 2px solid rgba(255,255,255,0.55);
      pointer-events: none;
    }
    .pl-half { left: 0; right: 0; top: 50%; border-width: 0 0 2px 0; }
    .pl-circle {
      left: 50%; top: 50%; width: 56px; height: 56px;
      margin: -28px 0 0 -28px; border-radius: 999px;
    }
    .pl-box-top { left: 22%; right: 22%; top: 0; height: 14%; border-top: 0; }
    .pl-box-bottom { left: 22%; right: 22%; bottom: 0; height: 14%; border-bottom: 0; }
    .pl-goal-top { left: 36%; right: 36%; top: 0; height: 6%; border-top: 0; }
    .pl-goal-bottom { left: 36%; right: 36%; bottom: 0; height: 6%; border-bottom: 0; }

    .player-chip {
      position: absolute;
      transform: translate(-50%, -50%);
      width: 84px;
      text-align: center;
      z-index: 2;
    }
    .chip-photo-wrap {
      position: relative;
      width: 44px;
      height: 58px;
      margin: 0 auto 3px;
      background: transparent;
    }
    .chip-photo {
      width: 36px;
      height: 48px;
      border-radius: 2px;
      object-fit: cover;
      object-position: center 12%;
      display: block;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25);
    }
    .pitch-wrap .chip-photo {
      width: 44px;
      height: 58px;
      background: transparent;
      box-shadow: none;
    }
    .chip-photo-fallback {
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-weight: 800; font-size: 14px;
      border-radius: 2px;
      background: rgba(0,0,0,0.45);
    }
    .pitch-wrap .chip-photo-fallback {
      width: 44px;
      height: 58px;
      font-size: 15px;
      mix-blend-mode: normal;
    }
    .chip-num {
      position: absolute;
      left: -3px;
      bottom: 4px;
      min-width: 17px; height: 17px; border-radius: 3px;
      background: ${BCG.red}; color: #fff; font-weight: 800; font-size: 9px;
      display: flex; align-items: center; justify-content: center;
      border: 1px solid #fff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      padding: 0 2px;
      z-index: 2;
    }
    .chip-nick {
      font-size: 8.5px; font-weight: 800; color: #fde68a;
      text-shadow: 0 0 3px #000, 0 1px 2px rgba(0,0,0,0.95);
      text-transform: uppercase; line-height: 1.1;
      white-space: normal; overflow: visible;
    }
    .chip-pos {
      font-size: 8px; font-weight: 800; color: #fff;
      text-shadow: 0 0 3px #000, 0 1px 2px rgba(0,0,0,0.95);
      text-transform: uppercase; line-height: 1.1;
    }
    .chip-birth {
      font-size: 7.5px; font-weight: 700; color: #fff;
      text-shadow: 0 0 3px #000, 0 1px 2px rgba(0,0,0,0.95);
      line-height: 1.1;
    }

    .pk-pitch-layout {
      display: flex;
      flex-direction: row;
      flex-wrap: nowrap;
      justify-content: center;
      align-items: stretch;
      gap: 6px;
      width: max-content;
      max-width: 100%;
      margin: 4px auto 0;
    }
    .pk-pitch-layout .pk-staff-aside {
      width: 48mm;
      flex: 0 0 48mm;
    }
    .pk-pitch-layout > .pk-block:not(.pk-staff-aside) {
      flex: 0 0 auto;
    }
    .pk-page-pitch .pk-block h3 { margin-bottom: 3px; }
    .pk-bench-strip {
      margin-top: 5px;
      padding: 4px 6px;
      border: 1px solid #fdba74;
      border-radius: 6px;
      background: #fff7ed;
    }
    .pk-bench-strip h3 {
      margin: 0 0 3px;
      font-size: 8px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #c2410c;
      border-bottom: 1.5px solid #ea580c;
      padding-bottom: 2px;
    }
    .pk-bench-strip .subs-grid { gap: 0 6px; }
    .pk-bench-strip .sub-row { padding: 1.5px 0; font-size: 8px; }
    .pk-bench-strip .staff-row .chip-photo,
    .pk-bench-strip .sub-row .chip-photo,
    .pk-bench-strip .staff-row .chip-photo-fallback,
    .pk-bench-strip .sub-row .chip-photo-fallback {
      width: 14px; height: 19px;
    }

    /* ---------- Listas laterais ---------- */
    .ref-row {
      display: flex;
      gap: 5px;
      align-items: center;
      padding: 2.5px 0;
      border-bottom: 1px solid #e2e8f0;
      font-size: 9px;
    }
    .ref-row .chip-photo,
    .ref-row .chip-photo-fallback {
      width: 22px;
      height: 30px;
      border-radius: 3px;
      flex-shrink: 0;
      object-fit: cover;
      object-position: center 12%;
    }
    .ref-row strong, .staff-row strong, .sub-name {
      color: #0f172a; line-height: 1.2; display: block;
    }
    .ref-row span, .staff-row span, .sub-birth {
      color: #64748b; font-size: 8px; display: block; line-height: 1.2;
    }
    .staff-row, .sub-row {
      display: flex;
      gap: 5px;
      align-items: center;
      padding: 2.5px 0;
      border-bottom: 1px solid #e2e8f0;
      font-size: 9px;
    }
    .staff-row .chip-photo,
    .sub-row .chip-photo,
    .staff-row .chip-photo-fallback,
    .sub-row .chip-photo-fallback {
      width: 18px;
      height: 24px;
      border-radius: 3px;
      border-width: 1px;
      font-size: 9px;
      flex-shrink: 0;
      object-fit: cover;
      object-position: center 12%;
    }
    .sub-stats { color: ${BCG.blue}; font-size: 7px; font-weight: 700; display: block; }
    .sub-num {
      min-width: 17px; height: 17px; border-radius: 999px;
      background: ${BCG.blue}; color: #fff; font-weight: 800; font-size: 9px;
      display: inline-flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .sub-text { min-width: 0; }
    .subs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 8px; }
    .staff-grid { display: grid; grid-template-columns: 1fr; gap: 0; }

    .dir-grid { display: grid; grid-template-columns: 1fr; gap: 4px; }
    .dir-card {
      border: 1px solid #cbd5e1; border-left: 3px solid ${BCG.blue}; border-radius: 6px;
      padding: 3px 6px;
      background: linear-gradient(180deg, ${BCG.blueLight}, #fff);
      display: flex; flex-direction: column; font-size: 9px; line-height: 1.2;
    }
    .dir-card strong { color: ${BCG.blue}; }
    .dir-card span { color: #64748b; font-size: 7px; text-transform: uppercase; letter-spacing: 0.05em; }

    /* ---------- Rodapé ---------- */
    .pk-foot {
      margin-top: 6px; padding-top: 4px; border-top: 1px solid #cbd5e1;
      display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: end;
    }
    .pk-disclaimer { margin: 0; font-size: 7px; color: #64748b; }
    .pk-contact { margin: 1px 0 0; font-size: 8.5px; color: #334155; font-weight: 600; }
    .pk-sign { font-size: 7px; color: #94a3b8; text-align: right; line-height: 1.3; }
    .pk-sign strong { color: ${BCG.blue}; display: block; font-size: 8px; }
  `;

  const categoryLine = [
    travel.categoryLabel,
    travel.isHomeMatch ? "Casa" : "Fora",
  ]
    .filter(Boolean)
    .join(" · ");

  const matchHeader = `
      <div class="pk-top">
        ${clubBadgeHtml(homeName, homeLogo, "Mandante")}
        <div class="pk-center">
          ${
            competition || championshipLogo
              ? `<div class="pk-comp">${championshipLogo ? `<img src="${escapeHtml(championshipLogo)}" alt="" />` : ""}<span>${escapeHtml(competition)}</span></div>`
              : ""
          }
          <div class="pk-x">X</div>
          ${kickoff ? `<div class="pk-when">${escapeHtml(kickoff)}</div>` : ""}
          ${categoryLine ? `<div class="pk-where">${escapeHtml(categoryLine)}</div>` : ""}
          ${venue ? `<div class="pk-where">${escapeHtml(venue)}</div>` : ""}
        </div>
        ${clubBadgeHtml(awayName, awayLogo, "Visitante")}
      </div>`;

  const body = `
    <div class="pk pk-page">
      ${matchHeader}
      <div class="pk-main pk-main-lists">
        <div class="pk-col">
          <div class="pk-block">
            <h3>Arbitragem</h3>
            ${refereesHtml || `<p class="pk-empty">Não informado</p>`}
          </div>
          <div class="pk-block">
            <h3>Uniforme da partida</h3>
            ${uniformHtml}
          </div>
        </div>
        <div class="pk-col">
          <div class="pk-block">
            <h3>Suplentes</h3>
            ${subsHtml ? `<div class="subs-grid">${subsHtml}</div>` : `<p class="pk-empty">—</p>`}
          </div>
          <div class="pk-block">
            <h3>Diretoria</h3>
            ${directorsHtml ? `<div class="dir-grid">${directorsHtml}</div>` : `<p class="pk-empty">—</p>`}
          </div>
        </div>
      </div>
      <div class="pk-foot">
        <div>
          ${config.contactLine ? `<p class="pk-contact">${escapeHtml(config.contactLine)}</p>` : ""}
        </div>
        <div class="pk-sign">
          <strong>Boston City Group</strong>
          Relatório de Imprensa · gerado em ${escapeHtml(new Date().toLocaleString("pt-BR"))}
        </div>
      </div>
    </div>

    <div class="pk pk-page pk-page-pitch">
      ${matchHeader}
      <div class="pk-pitch-layout">
        <div class="pk-block pk-staff-aside">
          <h3>Comissão técnica</h3>
          ${staffHtml ? `<div class="staff-grid">${staffHtml}</div>` : `<p class="pk-empty">—</p>`}
        </div>
        <div class="pk-block">
          <h3>Escalação visual · ${escapeHtml(formation.label)}</h3>
          <div class="pitch-wrap">
            <div class="pitch-line pl-half"></div>
            <div class="pitch-line pl-circle"></div>
            <div class="pitch-line pl-box-top"></div>
            <div class="pitch-line pl-goal-top"></div>
            <div class="pitch-line pl-box-bottom"></div>
            <div class="pitch-line pl-goal-bottom"></div>
            <div class="pitch-players">${fieldPlayers}</div>
          </div>
        </div>
      </div>
      <div class="pk-bench-strip">
        <h3>Reservas · banco</h3>
        ${subsHtml ? `<div class="subs-grid">${subsHtml}</div>` : `<p class="pk-empty">—</p>`}
      </div>
      <div class="pk-foot">
        <div>
          ${config.contactLine ? `<p class="pk-contact">${escapeHtml(config.contactLine)}</p>` : ""}
        </div>
        <div class="pk-sign">
          <strong>Boston City Group</strong>
          Escalação visual
        </div>
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

export type MatchExternalReportAudience = "opponent" | "referees";

export function buildMatchExternalReportHtml(
  data: PressKitReportDto,
  audience: MatchExternalReportAudience,
  size: PrintPageSize = "A4",
): string {
  const { travel, config } = data;
  const club = travelClubName(travel);
  const opponent = travel.opponentName?.trim() || "Adversário";
  const title =
    audience === "referees" ? "Relação oficial para arbitragem" : "Informações para a equipe adversária";
  const uniformImage = data.uniformKit?.imageUrl
    ? resolveLogoUrlForPrint(data.uniformKit.imageUrl) || data.uniformKit.imageUrl
    : null;
  const athleteCount = data.athletes.length;
  const compact = athleteCount > 18;
  const athleteRows = [...data.athletes]
    .sort((a, b) => (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999) || a.name.localeCompare(b.name))
    .map((athlete, index) => {
      const photoSrc = athlete.photoUrl
        ? resolveLogoUrlForPrint(athlete.photoUrl) || athlete.photoUrl
        : null;
      const photoCell = photoSrc
        ? `<img class="ath-photo" src="${escapeHtml(photoSrc)}" alt="" />`
        : `<span class="ath-photo ath-photo-fallback">${escapeHtml((athlete.nickname || athlete.name).slice(0, 1).toUpperCase())}</span>`;
      return `<tr>
        <td>${index + 1}</td>
        <td>${photoCell}</td>
        <td>${escapeHtml(String(athlete.jerseyNumber ?? "—"))}</td>
        <td class="left">${escapeHtml(athlete.name)}</td>
        <td class="left">${escapeHtml(athlete.nickname?.trim() || "—")}</td>
        <td>${escapeHtml(athlete.position ?? "—")}</td>
        ${audience === "referees" ? `<td>${escapeHtml(athlete.cbfRegistration ?? "—")}</td>` : ""}
      </tr>`;
    })
    .join("");
  const staffRows = [...data.staff]
    .sort((a, b) => {
      const rank = (m: (typeof data.staff)[number]) => {
        const raw = (m.role ?? "").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
        const label = getStaffRoleLabel(m.role ?? "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/\p{M}/gu, "");
        if (raw === "tecnico" || (label.includes("tecnico") && !label.includes("auxiliar"))) {
          return 0;
        }
        if (label.includes("auxiliar")) return 1;
        return 10;
      };
      const d = rank(a) - rank(b);
      if (d !== 0) return d;
      return a.name.localeCompare(b.name, "pt-BR");
    })
    .map((member) => {
      const photoSrc = member.photoUrl
        ? resolveLogoUrlForPrint(member.photoUrl) || member.photoUrl
        : null;
      const photoCell = photoSrc
        ? `<img class="ath-photo" src="${escapeHtml(photoSrc)}" alt="" />`
        : `<span class="ath-photo ath-photo-fallback">${escapeHtml(member.name.slice(0, 1).toUpperCase())}</span>`;
      return `<tr>
        <td>${photoCell}</td>
        <td class="left">${escapeHtml(member.name)}</td>
        <td class="left">${escapeHtml(member.role ? getStaffRoleLabel(member.role) : "Comissão técnica")}</td>
      </tr>`;
    })
    .join("");
  const styles = `
    @page { size: ${size === "Letter" ? "letter" : "A4"} portrait; margin: 8mm 9mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; height: 100%; }
    body {
      color: #0f172a;
      font-family: "Segoe UI", system-ui, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet {
      min-height: 0;
      max-height: 100%;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .head { display: grid; grid-template-columns: 18mm 1fr 18mm; align-items: center; gap: 3mm; padding: ${compact ? "3mm" : "4mm"}; color: #fff; background: linear-gradient(120deg, ${BCG.blue}, ${BCG.red}); border-radius: 3mm; }
    .head img { width: 16mm; height: 16mm; object-fit: contain; padding: 1mm; border-radius: 2mm; background: #fff; }
    .head div { text-align: center; }
    h1 { margin: 0; font-size: ${compact ? "12pt" : "14pt"}; text-transform: uppercase; line-height: 1.1; }
    .head p { margin: 1mm 0 0; font-size: 8pt; }
    .meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 2mm; margin: 3mm 0; }
    .meta div { padding: 2mm 2.5mm; border-left: 2.5px solid ${BCG.red}; background: #f1f5f9; }
    .meta span { display: block; color: #64748b; font-size: 6pt; letter-spacing: .1em; text-transform: uppercase; }
    .meta strong { font-size: ${compact ? "8pt" : "9pt"}; line-height: 1.2; }
    .uniform { display: flex; align-items: center; gap: 3mm; margin-bottom: 3mm; padding: 2.5mm 3mm; border: 1px solid #cbd5e1; border-radius: 2mm; background: ${BCG.blueLight}; }
    .uniform > img { width: ${compact ? "18mm" : "22mm"}; height: ${compact ? "18mm" : "22mm"}; object-fit: contain; background: #fff; border-radius: 1.5mm; }
    .uniform span { display: block; font-size: 6.5pt; color: #64748b; text-transform: uppercase; letter-spacing: .08em; }
    .uniform strong { display: block; color: ${BCG.blue}; font-size: ${compact ? "10pt" : "11pt"}; text-transform: uppercase; }
    .pieces { display: flex; gap: 1.5mm; margin-top: 1mm; }
    .pieces img { width: 10mm; height: 10mm; object-fit: contain; border: 1px solid #dbe3ee; border-radius: 1mm; background: #fff; }
    h2 { margin: 2.5mm 0 1.5mm; padding-bottom: 1mm; color: ${BCG.blue}; border-bottom: 2px solid ${BCG.red}; font-size: ${compact ? "9pt" : "10pt"}; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; font-size: ${compact ? "7pt" : "7.8pt"}; }
    th, td { padding: ${compact ? "0.7mm 1.2mm" : "1mm 1.4mm"}; border: 1px solid #cbd5e1; text-align: center; vertical-align: middle; }
    th { color: #fff; background: ${BCG.blue}; font-size: ${compact ? "6pt" : "6.6pt"}; letter-spacing: .06em; text-transform: uppercase; }
    .left { text-align: left; }
    .ath-photo {
      width: ${compact ? "5.5mm" : "6.5mm"};
      height: ${compact ? "7.5mm" : "9mm"};
      object-fit: cover;
      object-position: center 12%;
      border-radius: 1mm;
      display: inline-block;
      vertical-align: middle;
      background: #e2e8f0;
      border: 0.3mm solid #cbd5e1;
    }
    .ath-photo-fallback {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 6pt;
      font-weight: 700;
      color: ${BCG.blue};
    }
    .foot { margin-top: 2.5mm; padding-top: 1.5mm; border-top: 1px solid #cbd5e1; color: #64748b; font-size: 7pt; }
    .staff-table { font-size: ${compact ? "6.5pt" : "7.2pt"}; }
  `;
  const logo = (url: string | null | undefined) => {
    const resolved = resolveLogoUrlForPrint(url);
    return resolved ? `<img src="${escapeHtml(resolved)}" alt="" />` : "<span></span>";
  };
  const body = `
    <div class="sheet">
    <div class="head">
      ${logo(travel.tenant.logoUrl)}
      <div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(club)} × ${escapeHtml(opponent)}</p></div>
      ${logo(data.opponentLogoUrl)}
    </div>
    <div class="meta">
      <div><span>Data e horário</span><strong>${escapeHtml([formatBrDate(travel.matchDate), config.matchTime].filter(Boolean).join(" · ") || "A definir")}</strong></div>
      <div><span>Local</span><strong>${escapeHtml([travel.stadiumName, travel.city].filter(Boolean).join(" · ") || "A definir")}</strong></div>
      <div><span>Competição</span><strong>${escapeHtml([travel.championshipName, config.phase].filter(Boolean).join(" · ") || "—")}</strong></div>
      <div><span>Categoria</span><strong>${escapeHtml(travel.categoryLabel)}</strong></div>
    </div>
    <div class="uniform">
      ${uniformImage ? `<img src="${escapeHtml(uniformImage)}" alt="" />` : ""}
      <div>
        <span>Uniforme da partida</span>
        <strong>${escapeHtml(data.uniformKit?.name ?? "Não informado")}</strong>
        <div class="pieces">${(data.uniformKit?.items ?? [])
          .filter((item) => item.imageUrl)
          .slice(0, 3)
          .map(
            (item) =>
              `<img src="${escapeHtml(resolveLogoUrlForPrint(item.imageUrl!) || item.imageUrl!)}" alt="${escapeHtml(item.name)}" />`,
          )
          .join("")}</div>
      </div>
    </div>
    <h2>${audience === "referees" ? "Atletas relacionados" : "Relação da equipe"}</h2>
    <table><thead><tr><th>#</th><th>Foto</th><th>Camisa</th><th>Nome</th><th>Apelido</th><th>Posição</th>${audience === "referees" ? "<th>Registro CBF</th>" : ""}</tr></thead><tbody>${athleteRows}</tbody></table>
    ${
      audience === "referees" && staffRows
        ? `<h2>Comissão técnica</h2><table class="staff-table"><thead><tr><th>Foto</th><th>Nome</th><th>Função</th></tr></thead><tbody>${staffRows}</tbody></table>`
        : ""
    }
    <div class="foot">${config.contactLine ? escapeHtml(config.contactLine) : "Boston City Group"}</div>
    </div>
  `;
  return wrapPrintRootDocument({
    title: escapeHtml(title),
    styles,
    headerHtml: "",
    metaHtml: "",
    bodyHtml: body,
    footerHtml: "",
  });
}

export function printMatchExternalReport(
  data: PressKitReportDto,
  audience: MatchExternalReportAudience,
  size: PrintPageSize = "A4",
): void {
  const title = audience === "referees" ? "Relatório para arbitragem" : "Relatório para adversário";
  printHtmlDocument(buildMatchExternalReportHtml(data, audience, size), title);
}

function cartoesSuspensaoDisciplineCell(code: string): string {
  if (!code) return `<td class="cell-code">—</td>`;
  const label = code === "A" ? "AT" : code;
  let cls = "cell-code";
  if (label === "AV" || label === "AM") cls += " cell-disc-yellow";
  else if (label === "V" || label === "VM") cls += " cell-disc-red";
  else if (label === "AT") cls += " cell-disc-at";
  return `<td class="${cls}">${escapeHtml(label)}</td>`;
}

function cartoesSuspensaoLegend(): string {
  return `
    <div class="legend-grid">
      <span><strong class="legend-at">AT</strong> Atuação</span>
      <span><strong class="legend-yellow">AV</strong> Advertência (amarelo)</span>
      <span><strong class="legend-yellow">AM</strong> Advertência manual</span>
      <span><strong class="legend-red">V</strong> Expulsão</span>
      <span><strong class="legend-red">VM</strong> Expulsão manual</span>
      <span><strong>P</strong> Pendurado (rodada / próximo jogo)</span>
      <span><strong>SA</strong> Suspensão automática</span>
      <span><strong>ST</strong> Suspensão STJD/TDJ</span>
      <span><strong>S</strong> Suspenso no próximo jogo</span>
    </div>
  `;
}

function cartoesSuspensaoDisciplineTableStyles(): string {
  return `
    .legend-grid { display: flex; flex-wrap: wrap; gap: 8px 14px; font-size: 9px; margin: 8px 0 12px; }
    .discipline-table { font-size: 8px; }
    .discipline-table th, .discipline-table td { padding: 3px 4px; text-align: center; }
    .discipline-table .left { text-align: left; min-width: 140px; }
    .discipline-table .round-head {
      writing-mode: vertical-rl;
      text-orientation: mixed;
      min-width: 22px;
      max-width: 28px;
      font-size: 7px;
      line-height: 1.1;
      padding: 4px 2px;
      vertical-align: bottom;
    }
    .discipline-table .next-round-head {
      writing-mode: horizontal-tb;
      transform: none;
      min-width: 44px;
      max-width: 64px;
      white-space: normal;
      vertical-align: bottom;
      padding: 4px 3px;
      background: #EFF6FF;
      color: #1D4ED8;
      font-weight: 700;
      font-size: 7px;
      line-height: 1.15;
    }
    .discipline-table .cell-code { font-weight: 700; }
    .discipline-table .cell-disc-yellow { background: #FDE047; color: #713F12; }
    .discipline-table .cell-disc-red { background: #F87171; color: #7F1D1D; }
    .discipline-table .cell-disc-at { background: #F3F4F6; color: #374151; font-weight: 600; }
    .legend-grid .legend-yellow { background: #FDE047; color: #713F12; padding: 0 4px; border-radius: 2px; }
    .legend-grid .legend-red { background: #F87171; color: #7F1D1D; padding: 0 4px; border-radius: 2px; }
    .legend-grid .legend-at { background: #F3F4F6; color: #374151; padding: 0 4px; border-radius: 2px; }
    .discipline-table .cell-next-p { background: #DBEAFE; color: #1D4ED8; }
    .discipline-table .cell-next-s { background: #E5E7EB; color: #374151; }
    .discipline-table .row-unavailable { background: #FEF3C7; color: #92400E; }
    .discipline-table .row-unavailable td { border-color: #FCD34D; }
    .discipline-table .totals-row { background: #F3F4F6; font-size: 8px; }
    .discipline-table .muted { color: #6B7280; font-weight: 400; }
    .summary-line { font-size: 10px; margin-top: 8px; }
  `;
}

function cartoesSuspensaoNextRoundHeader(data: CartoesSuspensaoReportDto): string {
  const label = data.nextRound?.label?.trim() || "Próx. jogo";
  return `<th class="next-round-head" title="Próximo jogo">${escapeHtml(label)}</th>`;
}

function cartoesSuspensaoNextRoundCell(code: CartoesSuspensaoReportDto["players"][number]["nextRoundCell"]): string {
  if (!code) return `<td class="cell-code">—</td>`;
  const cls = code === "P" ? "cell-next-p" : "cell-next-s";
  return `<td class="cell-code ${cls}">${code}</td>`;
}

function cartoesSuspensaoColumnCount(roundCount: number): number {
  return 5 + roundCount + 1;
}

function cartoesSuspensaoPlayerRows(data: CartoesSuspensaoReportDto): string {
  if (data.players.length === 0) {
    return `<tr><td colspan="${cartoesSuspensaoColumnCount(data.rounds.length)}" class="empty">Nenhum atleta no elenco atual</td></tr>`;
  }
  return data.players
    .map((player) => {
      const rowClass = player.unavailable ? "row-unavailable" : "";
      const cells = player.roundCells.map((code) => cartoesSuspensaoDisciplineCell(code)).join("");
      const squadNote =
        player.playedUp && player.squadCategoryLabel
          ? ` <span class="muted">[${escapeHtml(player.squadCategoryLabel)}]</span>`
          : "";
      return `<tr class="${rowClass}">
        <td class="num">${player.num}</td>
        <td class="left">${escapeHtml(player.name)}${squadNote} <span class="muted">(${escapeHtml(player.positionLabel)})</span></td>
        <td class="num">${player.yellowCardsTotal}</td>
        <td class="num">${player.redCardsTotal}</td>
        ${cells}
        ${cartoesSuspensaoNextRoundCell(player.nextRoundCell ?? "")}
      </tr>`;
    })
    .join("");
}

function cartoesSuspensaoRoundHeaders(rounds: CartoesSuspensaoReportDto["rounds"]): string {
  return rounds
    .map((round) => `<th class="round-head">${escapeHtml(round.shortLabel)}</th>`)
    .join("");
}

function cartoesSuspensaoTotalsRow(data: CartoesSuspensaoReportDto): string {
  const yellowCells = data.totals.yellowByRound
    .map((n) => `<td class="num">${n}</td>`)
    .join("");
  const redCells = data.totals.redByRound
    .map((n) => `<td class="num">${n}</td>`)
    .join("");
  return `
    <tr class="totals-row">
      <td colspan="2" class="left"><strong>Total C. Amarelos</strong></td>
      <td class="num"><strong>${data.totals.yellowCards}</strong></td>
      <td></td>
      ${yellowCells}
      <td></td>
    </tr>
    <tr class="totals-row">
      <td colspan="2" class="left"><strong>Total C. Vermelhos</strong></td>
      <td></td>
      <td class="num"><strong>${data.totals.redCards}</strong></td>
      ${redCells}
      <td></td>
    </tr>
  `;
}

export function buildCartoesSuspensaoPrintHtml(
  data: CartoesSuspensaoReportDto,
  size: PrintPageSize = "A4",
): string {
  const badge = [
    data.filters.categoryLabel,
    String(data.filters.season),
    data.filters.competition ?? "",
  ]
    .filter(Boolean)
    .join(" · ");

  const nextRoundMeta = data.nextRound
    ? `<div class="meta-item full"><label>Próxima rodada</label><span>${escapeHtml(data.nextRound.label)} · ${escapeHtml(formatBrDate(data.nextRound.matchDate))}</span></div>`
    : "";

  const extraStyles = cartoesSuspensaoDisciplineTableStyles();

  const body = `
    <style>${extraStyles}</style>
    <div class="meta-grid">
      ${nextRoundMeta}
      <div class="meta-item"><label>Fase</label><span>${escapeHtml(data.filters.phase ?? "—")}</span></div>
      <div class="meta-item"><label>Elenco</label><span>${data.players.length} atleta(s) atuais</span></div>
    </div>
    ${cartoesSuspensaoLegend()}
    <section class="section">
      <table class="discipline-table">
        <thead>
          <tr>
            <th class="num">#</th>
            <th>Atleta</th>
            <th>C.A</th>
            <th>C.V</th>
            ${cartoesSuspensaoRoundHeaders(data.rounds)}
            ${cartoesSuspensaoNextRoundHeader(data)}
          </tr>
        </thead>
        <tbody>
          ${cartoesSuspensaoPlayerRows(data)}
          ${cartoesSuspensaoTotalsRow(data)}
        </tbody>
      </table>
      <p class="summary-line">
        Média C.A/Jogo: <strong>${data.totals.avgYellowPerMatch}</strong>
        · Média C.V/Jogo: <strong>${data.totals.avgRedPerMatch}</strong>
        · Total de jogos: <strong>${data.totals.matchCount}</strong>
      </p>
    </section>
  `;

  return documentShell(
    `Cartões e Suspensão — ${data.tenant.name}`,
    data.tenant.name,
    data.tenant.logoUrl,
    "Cartões e Suspensão",
    badge,
    "",
    body,
    size,
  );
}

export function printCartoesSuspensaoReport(
  data: CartoesSuspensaoReportDto,
  size: PrintPageSize = "A4",
): void {
  printHtmlDocument(
    buildCartoesSuspensaoPrintHtml(data, size),
    "Impressão — Cartões e Suspensão",
  );
}



