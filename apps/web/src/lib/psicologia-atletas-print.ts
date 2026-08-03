import { formatCpfForDisplay } from "@/lib/format-cpf";
import { getCategoryLabel } from "@/lib/fixture-categories";
import { getPositionLabel } from "@/lib/football-positions";
import {
  GENDER_OPTIONS,
  parseRegistrationProfile,
} from "@/lib/player-registration-profile";
import { reportLogoUrlForPrint, resolveLogoUrlForPrint } from "@/lib/futebol-relatorios-print";
import {
  REPORT_PRINT_BREAK_CSS,
  wrapPrintRootDocument,
} from "@/lib/report-print-layout";

export type PsicologiaAtletaFieldKey =
  | "num"
  | "fullName"
  | "nickname"
  | "birthDate"
  | "position"
  | "category"
  | "club"
  | "jerseyNumber"
  | "cpf"
  | "rg"
  | "nationality"
  | "gender"
  | "birthPlace"
  | "contactEmail"
  | "contactPhone";

export type PrintPageSize = "A4" | "Letter";

export interface PsicologiaAtletaFieldDef {
  key: PsicologiaAtletaFieldKey;
  label: string;
  defaultSelected: boolean;
}

export const PSICOLOGIA_ATLETA_FIELDS: PsicologiaAtletaFieldDef[] = [
  { key: "num", label: "#", defaultSelected: true },
  { key: "fullName", label: "Nome completo", defaultSelected: true },
  { key: "nickname", label: "Apelido", defaultSelected: true },
  { key: "birthDate", label: "Data de nascimento", defaultSelected: true },
  { key: "position", label: "Posição", defaultSelected: true },
  { key: "category", label: "Categoria", defaultSelected: true },
  { key: "club", label: "Clube", defaultSelected: false },
  { key: "jerseyNumber", label: "Número da camisa", defaultSelected: false },
  { key: "cpf", label: "CPF", defaultSelected: false },
  { key: "rg", label: "RG", defaultSelected: false },
  { key: "nationality", label: "Nacionalidade", defaultSelected: false },
  { key: "gender", label: "Gênero", defaultSelected: false },
  { key: "birthPlace", label: "Naturalidade", defaultSelected: false },
  { key: "contactEmail", label: "E-mail de contato", defaultSelected: false },
  { key: "contactPhone", label: "Telefone de contato", defaultSelected: false },
];

export interface PsicologiaAtletaReportPlayer {
  id: string;
  name: string;
  birthDate?: string | null;
  nationality?: string | null;
  jerseyNumber?: number | null;
  position?: string | null;
  category?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  tenant?: { id: string; name: string; slug?: string; logoUrl?: string | null };
  registrationProfile?: unknown;
}

export interface PsicologiaAtletaReportData {
  titleClubName: string;
  logoUrl?: string | null;
  filtersSummary: string;
  fields: PsicologiaAtletaFieldKey[];
  players: PsicologiaAtletaReportPlayer[];
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatBrDate(iso?: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function genderLabel(value?: string | null): string {
  if (!value) return "—";
  return GENDER_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

function getFieldValue(
  player: PsicologiaAtletaReportPlayer,
  key: PsicologiaAtletaFieldKey,
  index: number,
): string {
  const profile = parseRegistrationProfile(player.registrationProfile);
  const personal = profile.personal ?? {};

  switch (key) {
    case "num":
      return String(index + 1);
    case "fullName":
      return player.name?.trim() || "—";
    case "nickname":
      return personal.nickname?.trim() || "—";
    case "birthDate":
      return formatBrDate(player.birthDate);
    case "position":
      return getPositionLabel(player.position) || "—";
    case "category":
      return player.category ? getCategoryLabel(player.category, "pt") : "—";
    case "club":
      return player.tenant?.name?.trim() || "—";
    case "jerseyNumber":
      return player.jerseyNumber != null ? String(player.jerseyNumber) : "—";
    case "cpf":
      return formatCpfForDisplay(personal.cpf) || "—";
    case "rg":
      return personal.rg?.trim() || "—";
    case "nationality":
      return player.nationality?.trim() || "—";
    case "gender":
      return genderLabel(personal.gender);
    case "birthPlace":
      return personal.birthPlace?.trim() || "—";
    case "contactEmail":
      return player.contactEmail?.trim() || "—";
    case "contactPhone":
      return player.contactPhone?.trim() || "—";
    default:
      return "—";
  }
}

function pageCss(size: PrintPageSize): string {
  const pageSize = size === "Letter" ? "letter" : "A4";
  return `@page { size: ${pageSize}; margin: 12mm 11mm; }`;
}

function baseStyles(size: PrintPageSize): string {
  const purple = "#6d28d9";
  const purpleDark = "#5b21b6";
  const purpleLight = "#f3e8ff";

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
      background: linear-gradient(90deg, ${purple} 0%, ${purpleDark} 100%);
      border-radius: 3px;
      margin-bottom: 16px;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 16px 18px;
      margin-bottom: 14px;
      background: linear-gradient(135deg, ${purpleLight} 0%, #ffffff 100%);
      border: 1px solid #ddd6fe;
      border-left: 5px solid ${purple};
      border-radius: 12px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .logo-wrap {
      flex-shrink: 0;
      width: 80px;
      height: 80px;
      border-radius: 14px;
      border: 2px solid ${purpleDark};
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
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
      color: ${purpleDark};
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
      color: ${purple};
    }
    .club {
      margin: 0;
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #0f172a;
      line-height: 1.12;
    }
    .doc-title {
      margin: 8px 0 0;
      font-size: 14px;
      font-weight: 700;
      color: ${purpleDark};
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .badge {
      display: inline-block;
      margin-top: 10px;
      padding: 5px 12px;
      border-radius: 999px;
      background: ${purpleDark};
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
      background: ${purpleLight};
      border: 1px solid #ddd6fe;
      border-top: 3px solid ${purple};
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
      color: ${purpleDark};
      margin-bottom: 2px;
    }
    .meta-item span {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: #1e293b;
    }
    .meta-item.full { grid-column: 1 / -1; }
    .section { margin-top: 14px; margin-bottom: 18px; break-inside: auto; page-break-inside: auto; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5px;
      break-inside: auto;
      page-break-inside: auto;
    }
    thead { display: table-header-group; }
    tbody tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    thead th {
      background: linear-gradient(180deg, ${purple} 0%, ${purpleDark} 100%);
      color: #fff;
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 9px 7px;
      border: 1px solid ${purpleDark};
      text-align: left;
    }
    tbody td {
      padding: 7px 7px;
      border: 1px solid #e9d5ff;
      vertical-align: middle;
    }
    tbody tr:nth-child(even) td { background: #faf5ff; }
    .num { width: 36px; text-align: center; font-weight: 700; color: ${purple}; }
    .empty {
      text-align: center;
      color: #94a3b8;
      font-style: italic;
      padding: 14px;
    }
    .footer {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 2px solid ${purpleLight};
      display: flex;
      justify-content: space-between;
      gap: 12px;
      font-size: 9px;
      color: #64748b;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .footer strong { color: ${purpleDark}; }
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

function fieldDef(key: PsicologiaAtletaFieldKey): PsicologiaAtletaFieldDef {
  return PSICOLOGIA_ATLETA_FIELDS.find((f) => f.key === key)!;
}

export function buildPsicologiaAtletasPrintHtml(
  data: PsicologiaAtletaReportData,
  size: PrintPageSize = "A4",
): string {
  const fields = data.fields.length > 0 ? data.fields : (["fullName"] as PsicologiaAtletaFieldKey[]);
  const sortedPlayers = [...data.players].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }),
  );

  const headCells = fields
    .map((key) => {
      const cls = key === "num" ? ' class="num"' : "";
      return `<th${cls}>${escapeHtml(fieldDef(key).label)}</th>`;
    })
    .join("");

  let bodyRows = "";
  if (sortedPlayers.length === 0) {
    bodyRows = `<tr><td colspan="${fields.length}" class="empty">Nenhum atleta encontrado com os filtros selecionados</td></tr>`;
  } else {
    bodyRows = sortedPlayers
      .map((player, index) => {
        const cells = fields
          .map((key) => {
            const cls = key === "num" ? ' class="num"' : "";
            return `<td${cls}>${escapeHtml(getFieldValue(player, key, index))}</td>`;
          })
          .join("");
        return `<tr>${cells}</tr>`;
      })
      .join("");
  }

  const columnLabels = fields.map((k) => fieldDef(k).label).join(" · ");

  const headerHtml = `
      <div class="top-bar"></div>
      <header class="header">
        ${logoHtml(data.logoUrl, data.titleClubName)}
        <div class="brand-block">
          <p class="brand">Boston City Group · Depto de Saúde · Psicologia</p>
          <h1 class="club">${escapeHtml(data.titleClubName)}</h1>
          <p class="doc-title">Lista de Atletas</p>
          <span class="badge">${sortedPlayers.length} atleta${sortedPlayers.length === 1 ? "" : "s"}</span>
        </div>
      </header>`;
  const metaHtml = `
      <div class="meta-grid">
        <div class="meta-item full">
          <label>Filtros aplicados</label>
          <span>${escapeHtml(data.filtersSummary)}</span>
        </div>
        <div class="meta-item full">
          <label>Colunas do relatório</label>
          <span>${escapeHtml(columnLabels)}</span>
        </div>
      </div>`;
  const bodyHtml = `
    <section class="section">
      <table>
        <thead><tr>${headCells}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </section>`;
  const footerHtml = `
    <footer class="footer">
      <span>Gerado em ${escapeHtml(new Date().toLocaleString("pt-BR"))}</span>
      <span><strong>Boston City Group</strong> · Relatório de psicologia</span>
    </footer>`;

  return wrapPrintRootDocument({
    title: escapeHtml(`Lista de Atletas — ${data.titleClubName}`),
    styles: baseStyles(size),
    headerHtml,
    metaHtml,
    bodyHtml,
    footerHtml,
  });
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

export function printPsicologiaAtletasReport(
  data: PsicologiaAtletaReportData,
  size: PrintPageSize = "A4",
): void {
  printHtmlDocument(
    buildPsicologiaAtletasPrintHtml(data, size),
    `Lista de Atletas — ${data.titleClubName}`,
  );
}
