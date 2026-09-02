import { reportTrend, reportRadar } from "@/lib/report-charts";
import { formatDateDayMonYear } from "@/lib/format-date";
import { getCategoryLabel } from "@/lib/fixture-categories";
import { getPositionLabel } from "@/lib/football-positions";
import { reportLogoUrlForPrint, resolveLogoUrlForPrint } from "@/lib/futebol-relatorios-print";
import { PLAYER_DOSSIER_OPTIONAL_LABELS } from "@/lib/player-dossier-access";
import type {
  DossierCoachEvaluationRow,
  DossierFmfMatchRow,
  DossierHighlightItem,
  DossierKpiStrip,
  DossierPsychRecord,
  PlayerDossierDto,
  PlayerDossierOptionalSection,
} from "@/lib/player-dossier.types";
import {
  REPORT_PRINT_BREAK_CSS,
  wrapPrintRootDocument,
} from "@/lib/report-print-layout";
import { ReportPage, ReportSection, ReportHeader, printReportDocument, type ReportPrintConfig } from "@/lib/report-print-engine";

const BCG = {
  red: "#C8102E",
  redDark: "#9B0C24",
  blue: "#00205B",
  blueMid: "#003087",
  blueDeep: "#001433",
  blueLight: "#E8EEF7",
  gold: "#D4AF37",
} as const;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function footLabel(value?: string | null): string {
  if (!value) return "—";
  if (value === "left") return "Esquerdo";
  if (value === "right") return "Direito";
  if (value === "both") return "Ambidextro";
  return value;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function fmtDate(iso?: string | null): string {
  return formatDateDayMonYear(iso) || "—";
}

function fmtNum(value: number | null | undefined, suffix = ""): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value}${suffix}`;
}

function clubDisplayName(d: PlayerDossierDto): string {
  return d.club?.name?.trim() || "Boston City FC";
}

function clubLogo(d: PlayerDossierDto): string {
  return d.club?.logoUrl
    ? resolveLogoUrlForPrint(reportLogoUrlForPrint(d.club.logoUrl, false))
    : resolveLogoUrlForPrint("/bcg-logo.png");
}

function isoFromUnknown(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return null;
}

function dossierStyles(): string {
  return `
    ${REPORT_PRINT_BREAK_CSS}
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      color: #0f172a;
      background: #fff;
      line-height: 1.45;
      font-size: 10.5px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page-inner { padding: 4px 2px 0; }

    /* —— CAPA HERO —— */
    .report-cover > .cover-hero { height: 100%; }
    .cover-hero {
      min-height: 0;
      height: 100%;
      display: flex;
      flex-direction: column;
      background: linear-gradient(145deg, ${BCG.blueDeep} 0%, ${BCG.blue} 42%, ${BCG.blueMid} 100%);
      color: #fff;
      overflow: hidden;
      position: relative;
    }
    .cover-hero::before {
      content: "";
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse 80% 60% at 85% 35%, rgba(200,16,46,0.18) 0%, transparent 55%);
      pointer-events: none;
    }
    .cover-hero-top {
      position: relative;
      z-index: 2;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 22px 10px;
      border-bottom: 1px solid rgba(255,255,255,0.12);
    }
    .cover-brand { display: flex; align-items: center; gap: 12px; }
    .cover-logo {
      width: 52px; height: 52px; object-fit: contain;
      background: #fff; border-radius: 8px; padding: 5px;
    }
    .cover-club-tag {
      font-size: 8px; letter-spacing: 0.18em; text-transform: uppercase; opacity: 0.75;
    }
    .cover-club-name {
      margin: 0; font-size: 15px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
    }
    .cover-doc-badge {
      text-align: right;
      font-size: 8px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; opacity: 0.85;
    }
    .cover-hero-main {
      position: relative;
      z-index: 2;
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 1.05fr;
      gap: 0;
      align-items: stretch;
      min-height: 0;
    }
    .cover-identity {
      padding: 28px 24px 20px 22px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .cover-position-line {
      font-size: 10px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase;
      color: ${BCG.gold}; margin-bottom: 8px;
    }
    .cover-athlete-name {
      margin: 0 0 6px;
      font-size: 36px; font-weight: 900; letter-spacing: -0.02em; line-height: 0.95;
      text-transform: uppercase;
    }
    .cover-nickname {
      margin: 0 0 16px; font-size: 15px; font-weight: 500; opacity: 0.85; font-style: italic;
    }
    .cover-meta-chips {
      display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px;
    }
    .cover-chip {
      padding: 4px 10px; border-radius: 999px;
      background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
      font-size: 9px; font-weight: 700; letter-spacing: 0.04em;
    }
    .cover-bio-excerpt {
      font-size: 10.5px; line-height: 1.55; opacity: 0.9;
      border-left: 3px solid ${BCG.red}; padding-left: 12px;
      max-height: 120px; overflow: hidden;
    }
    .cover-photo-wrap {
      position: relative;
      min-height: 0;
      display: flex; align-items: flex-end; justify-content: center;
    }
    .cover-photo-wrap::before {
      content: "";
      position: absolute; inset: 0;
      background: linear-gradient(90deg, ${BCG.blue} 0%, transparent 35%);
      z-index: 1;
    }
    .cover-photo-wrap img {
      width: 100%; height: 100%; min-height: 0;
      object-fit: cover; object-position: center 12%;
      display: block;
    }
    .cover-photo-fallback {
      width: 100%; min-height: 340px;
      display: flex; align-items: center; justify-content: center;
      background: rgba(0,0,0,0.25);
      font-size: 11px; font-weight: 700; opacity: 0.7;
    }
    .cover-kpi-strip {
      position: relative; z-index: 3;
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      background: linear-gradient(180deg, ${BCG.red} 0%, ${BCG.redDark} 100%);
      border-top: 3px solid rgba(255,255,255,0.15);
    }
    .cover-kpi {
      text-align: center; padding: 12px 6px 14px;
      border-right: 1px solid rgba(255,255,255,0.12);
    }
    .cover-kpi:last-child { border-right: none; }
    .cover-kpi .n { font-size: 22px; font-weight: 900; line-height: 1; color: #fff; }
    .cover-kpi .l {
      margin-top: 4px; font-size: 7px; font-weight: 700;
      letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255,255,255,0.82);
    }

    /* —— SEÇÕES —— */
    .section-title {
      margin: 0 0 12px;
      font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em;
      color: ${BCG.blue};
      display: flex; align-items: center; gap: 10px;
      break-after: avoid;
    }
    .section-title::before {
      content: ""; width: 4px; height: 18px; background: ${BCG.red}; border-radius: 2px; flex-shrink: 0;
    }
    .section-title::after {
      content: ""; flex: 1; height: 1px; background: linear-gradient(90deg, #cbd5e1 0%, transparent 100%);
    }
    .section-block { margin-bottom: 18px; break-inside: avoid-page; }
    .section-block.section-splittable { break-inside: auto; page-break-inside: auto; }
    .optional-tag {
      display: inline-block; margin-bottom: 8px; padding: 3px 10px; border-radius: 999px;
      background: #fef3c7; border: 1px solid #fcd34d; color: #92400e;
      font-size: 7.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
    }
    .lead-text {
      margin: 0 0 12px; font-size: 10.5px; color: #334155; line-height: 1.55;
    }
    .prose {
      font-size: 10.5px; color: #334155; white-space: pre-wrap; line-height: 1.58;
      padding: 10px 12px; background: #f8fafc; border-left: 3px solid ${BCG.blueMid};
    }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .kv-grid {
      display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px 12px;
    }
    .kv-item label {
      display: block; font-size: 7px; font-weight: 700; letter-spacing: 0.08em;
      text-transform: uppercase; color: ${BCG.blueMid}; margin-bottom: 2px;
    }
    .kv-item span { font-size: 11px; font-weight: 600; color: #0f172a; }
    .stats-band {
      display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin: 0 0 14px;
    }
    .stat-box {
      text-align: center; padding: 10px 6px;
      border: 1px solid #cbd5e1; border-top: 3px solid ${BCG.red};
      background: ${BCG.blueLight}; border-radius: 4px;
    }
    .stat-box .n { font-size: 18px; font-weight: 800; color: ${BCG.blue}; line-height: 1; }
    .stat-box .l {
      margin-top: 4px; font-size: 7px; font-weight: 700;
      letter-spacing: 0.06em; text-transform: uppercase; color: #64748b;
    }
    table.data-table {
      width: 100%; border-collapse: collapse; font-size: 9.5px; margin-top: 6px;
    }
    table.data-table thead { display: table-header-group; }
    table.data-table th {
      background: ${BCG.blue}; color: #fff;
      font-size: 7.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
      padding: 7px 5px; border: 1px solid ${BCG.blueMid}; text-align: left;
    }
    table.data-table td {
      padding: 5px; border: 1px solid #dbe3f0; vertical-align: top;
    }
    table.data-table tbody tr:nth-child(even) td { background: #f8fafc; }
    .chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 12px; }
    .chart-wrap { break-inside: avoid-page; }
    .chart-title {
      margin: 0 0 6px; font-size: 8.5px; font-weight: 700; color: #334155;
      text-transform: uppercase; letter-spacing: 0.05em;
    }
    .bar-row {
      display: grid; grid-template-columns: 72px 1fr 40px; gap: 6px;
      align-items: center; margin-bottom: 5px;
    }
    .bar-label { font-size: 8px; font-weight: 600; color: #475569; }
    .bar-track { height: 7px; background: #e2e8f0; border-radius: 999px; overflow: hidden; }
    .bar-fill {
      height: 100%;
      background: linear-gradient(90deg, ${BCG.blueMid} 0%, ${BCG.red} 100%);
      border-radius: 999px;
    }
    .bar-val { font-size: 8px; font-weight: 700; text-align: right; }

    /* —— TRAJETÓRIA —— */
    .story-timeline { display: flex; flex-direction: column; gap: 0; }
    .story-row {
      display: grid; grid-template-columns: 72px 110px 1fr;
      gap: 10px; padding: 9px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .story-row:last-child { border-bottom: none; }
    .story-date { font-size: 9px; font-weight: 700; color: ${BCG.blue}; }
    .story-type {
      font-size: 7.5px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.05em; color: ${BCG.red};
    }
    .story-title { font-size: 10.5px; font-weight: 700; color: #0f172a; }
    .story-detail { font-size: 9px; color: #64748b; margin-top: 2px; }

    /* —— DESTAQUES —— */
    .highlights-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
    }
    .highlight-card {
      border: 1px solid #dbe3f0; border-radius: 6px; overflow: hidden;
      break-inside: avoid-page;
    }
    .highlight-thumb {
      height: 90px; background: ${BCG.blueLight};
      display: flex; align-items: center; justify-content: center;
      font-size: 8px; font-weight: 700; color: ${BCG.blue}; text-transform: uppercase;
    }
    .highlight-thumb img { width: 100%; height: 100%; object-fit: cover; }
    .highlight-body { padding: 8px 10px; }
    .highlight-kind {
      font-size: 7px; font-weight: 700; letter-spacing: 0.08em;
      text-transform: uppercase; color: ${BCG.red}; margin-bottom: 3px;
    }
    .highlight-url { font-size: 8px; color: ${BCG.blueMid}; word-break: break-all; }

    /* —— PERFORMANCE —— */
    .eval-card {
      margin-bottom: 12px; padding: 10px 12px;
      border: 1px solid #dbe3f0; border-left: 4px solid ${BCG.red};
      background: #fafbfc; break-inside: avoid-page;
    }
    .eval-card-hdr {
      display: flex; justify-content: space-between; align-items: baseline;
      margin-bottom: 6px;
    }
    .eval-card-title { font-size: 10.5px; font-weight: 800; color: ${BCG.blue}; }
    .eval-card-pct { font-size: 16px; font-weight: 900; color: ${BCG.red}; }
    .eval-dims {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin: 8px 0;
    }
    .eval-dim {
      text-align: center; padding: 5px; background: #fff; border: 1px solid #e2e8f0; border-radius: 4px;
    }
    .eval-dim .n { font-size: 12px; font-weight: 800; color: ${BCG.blue}; }
    .eval-dim .l { font-size: 6.5px; font-weight: 700; text-transform: uppercase; color: #64748b; }

    /* —— TIMELINE —— */
    .timeline { display: flex; flex-direction: column; gap: 5px; }
    .tl-row {
      display: grid; grid-template-columns: 76px 96px 1fr; gap: 8px;
      padding: 6px 8px; border: 1px solid #e2e8f0; border-left: 3px solid ${BCG.red}; background: #fafbfc;
    }
    .tl-date { font-size: 8.5px; font-weight: 700; color: ${BCG.blue}; }
    .tl-cat { font-size: 7.5px; font-weight: 700; text-transform: uppercase; color: #64748b; }
    .tl-title { font-size: 9.5px; font-weight: 600; color: #0f172a; }
    .tl-detail { font-size: 8.5px; color: #64748b; margin-top: 2px; }

    /* —— PSICOLOGIA / DEPT —— */
    .psych-record {
      margin-bottom: 12px; padding: 10px 12px;
      border: 1px solid #dbe3f0; border-radius: 4px; break-inside: avoid-page;
    }
    .psych-record-hdr {
      display: flex; justify-content: space-between; margin-bottom: 6px;
      font-size: 9px; font-weight: 700; color: ${BCG.blue};
    }
    .psych-obs { margin: 4px 0 0; padding-left: 14px; font-size: 9.5px; color: #334155; }
    .psych-obs li { margin-bottom: 3px; }

    .report-hdr {
      display: flex; align-items: center; justify-content: space-between;
      gap: 12px; padding-bottom: 8px; border-bottom: 2px solid ${BCG.blueLight};
    }
    .report-hdr img { height: 34px; object-fit: contain; }
    .report-hdr-title {
      font-size: 9.5px; font-weight: 800; letter-spacing: 0.08em;
      text-transform: uppercase; color: ${BCG.blue}; text-align: right;
    }
    .report-hdr-sub { font-size: 8.5px; color: #64748b; text-align: right; }
    .report-ftr {
      margin-top: 14px; padding-top: 8px; border-top: 2px solid ${BCG.blueLight};
      display: flex; justify-content: space-between; font-size: 7.5px; color: #64748b;
    }
    .report-ftr strong { color: ${BCG.blue}; }
    @media print {
      .section-block:not(.section-splittable), .eval-card, .highlight-card, .chart-wrap { break-inside: avoid-page; }
      thead { display: table-header-group; }
    }
  `;
}

function sectionBlock(title: string, body: string, optionalLabel?: string): string {
  if (!body.trim()) return "";
  const tag = optionalLabel
    ? `<div class="optional-tag">Seção opcional · ${escapeHtml(optionalLabel)}</div>`
    : "";
  return ReportSection(`${ReportHeader(`${tag}<h2 class="section-title">${escapeHtml(title)}</h2>`)}${body}`, { className: "section-block section-splittable" });
}

function kvGrid(items: Array<{ label: string; value: string }>): string {
  const rows = items.filter((i) => i.value && i.value !== "—");
  if (rows.length === 0) return "";
  return `<div class="kv-grid">${rows
    .map(
      (i) =>
        `<div class="kv-item"><label>${escapeHtml(i.label)}</label><span>${escapeHtml(i.value)}</span></div>`,
    )
    .join("")}</div>`;
}

function dataTable(headers: string[], rows: string[][], widths?: number[]): string {
  if (rows.length === 0) return "";
  return `<table class="data-table">${widths ? `<colgroup>${widths.map(w => `<col style="width:${w}%">`).join("")}</colgroup>` : ""}<thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
}

function barChart(title: string, items: Array<{ label: string; value: number; suffix?: string }>): string {
  if (items.length === 0) return "";
  const max = Math.max(...items.map((i) => i.value), 1);
  return `<div class="chart-wrap"><p class="chart-title">${escapeHtml(title)}</p>${items
    .map(
      (item) => `<div class="bar-row">
        <div class="bar-label">${escapeHtml(item.label)}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.round((item.value / max) * 100)}%"></div></div>
        <div class="bar-val">${item.value}${item.suffix ?? ""}</div>
      </div>`,
    )
    .join("")}</div>`;
}

function renderKpiStrip(kpi: DossierKpiStrip): string {
  const items = [
    { n: fmtNum(kpi.games), l: "Jogos" },
    { n: fmtNum(kpi.starts), l: "Titular" },
    { n: fmtNum(kpi.minutes), l: "Minutos" },
    { n: fmtNum(kpi.goals), l: "Gols" },
    { n: fmtNum(kpi.assists), l: "Assist." },
    { n: fmtNum(kpi.yellowCards), l: "Amarelos" },
    { n: fmtNum(kpi.coachAvgPct, "%"), l: "Média CT" },
  ];
  return `<div class="cover-kpi-strip">${items
    .map((i) => `<div class="cover-kpi"><div class="n">${escapeHtml(i.n)}</div><div class="l">${escapeHtml(i.l)}</div></div>`)
    .join("")}</div>`;
}

function renderCover(d: PlayerDossierDto): string {
  const c = d.cover;
  const logo = clubLogo(d);
  const photo = c.photoUrl ? resolveLogoUrlForPrint(c.photoUrl) : "";
  const position = c.position ? getPositionLabel(c.position) : "Atleta";
  const category = c.category ? getCategoryLabel(c.category, "pt") : "";
  const chips = [
    category,
    c.jerseyNumber != null ? `#${c.jerseyNumber}` : "",
    c.age != null ? `${c.age} anos` : "",
    c.nationality?.trim() ?? "",
    footLabel(c.preferredFoot),
    c.height ? `${c.height} cm` : "",
    c.weight ? `${c.weight} kg` : "",
    c.situation?.trim() ?? "",
  ].filter(Boolean);

  const bioExcerpt = c.bioPT?.trim()
    ? c.bioPT.trim().length > 280
      ? `${c.bioPT.trim().slice(0, 277)}…`
      : c.bioPT.trim()
    : "";

  return `
    <div class="cover-hero">
      <div class="cover-hero-top">
        <div class="cover-brand">
          ${logo ? `<img class="cover-logo" src="${escapeHtml(logo)}" alt="" />` : ""}
          <div>
            <div class="cover-club-tag">Departamento de Futebol · Apresentação externa</div>
            <h1 class="cover-club-name">${escapeHtml(clubDisplayName(d))}</h1>
          </div>
        </div>
        <div class="cover-doc-badge">Dossiê do Atleta · Confidencial</div>
      </div>
      <div class="cover-hero-main">
        <div class="cover-identity">
          <div class="cover-position-line">${escapeHtml(position)}${category ? ` · ${escapeHtml(category)}` : ""}</div>
          <h2 class="cover-athlete-name">${escapeHtml(c.name)}</h2>
          ${c.nickname?.trim() ? `<p class="cover-nickname">${escapeHtml(c.nickname)}</p>` : ""}
          <div class="cover-meta-chips">
            ${chips.map((chip) => `<span class="cover-chip">${escapeHtml(chip)}</span>`).join("")}
          </div>
          ${bioExcerpt ? `<div class="cover-bio-excerpt">${escapeHtml(bioExcerpt)}</div>` : ""}
        </div>
        <div class="cover-photo-wrap">
          ${
            photo
              ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(c.name)}" />`
              : `<div class="cover-photo-fallback">Sem foto cadastrada</div>`
          }
        </div>
      </div>
      ${renderKpiStrip(d.snapshot)}
    </div>
  `;
}

function renderExecutiveSnapshot(d: PlayerDossierDto): string {
  const p = d.profile;
  const c = d.cover;
  const left = kvGrid([
    { label: "Data de nascimento", value: fmtDate(p.birthDate) },
    { label: "Registro CBF", value: p.cbfRegistration?.trim() || "—" },
    { label: "Federação local", value: p.localFedRegistration?.trim() || "—" },
    { label: "COMET", value: p.comet?.trim() || "—" },
    { label: "Nome na camisa", value: p.jerseyName?.trim() || "—" },
    { label: "Clube atual", value: p.currentTeam?.trim() || "—" },
  ]);
  const right = kvGrid([
    { label: "Altura", value: fmtNum(c.height, " cm") },
    { label: "Peso", value: fmtNum(c.weight, " kg") },
    { label: "Pé dominante", value: footLabel(c.preferredFoot) },
    { label: "Posição", value: c.position ? getPositionLabel(c.position) : "—" },
    { label: "Categoria", value: c.category ? getCategoryLabel(c.category, "pt") : "—" },
    { label: "Situação", value: c.situation?.trim() || "—" },
    { label: "IMC", value: d.meta.includedOptionalSections.includes("physiology") && p.bmi != null ? String(p.bmi) : "—" },
    { label: "% Gordura", value: d.meta.includedOptionalSections.includes("physiology") && p.bodyFatPercent != null ? `${p.bodyFatPercent}%` : "—" },
    { label: "Valor mercado", value: p.marketValue != null ? `€ ${p.marketValue}` : "—" },
  ]);
  const bio = c.bioPT?.trim() ? `<div class="prose" style="margin-top:12px">${escapeHtml(c.bioPT.trim())}</div>` : "";
  return sectionBlock(
    "Perfil executivo",
    `<p class="lead-text">${escapeHtml(c.name)} · ${escapeHtml(c.position ? getPositionLabel(c.position) : "Atleta")} do ${escapeHtml(clubDisplayName(d))}.${d.matchHistory.totals ? ` ${d.matchHistory.totals.matchesPlayed} jogos, ${d.matchHistory.totals.starts} titularidades e ${d.matchHistory.totals.minutesPlayed} minutos no histórico oficial disponível.` : ""}</p><div class="two-col"><div>${left}</div><div>${right}</div></div>${bio}`,
  );
}

function renderSportingStory(d: PlayerDossierDto): string {
  if (d.sportingStory.length === 0) return "";
  const rows = d.sportingStory
    .map(
      (m) => `<div class="story-row">
        <div class="story-date">${escapeHtml(m.date ? fmtDate(m.date) : "—")}</div>
        <div class="story-type">${escapeHtml(m.type)}</div>
        <div><div class="story-title">${escapeHtml(m.title)}</div>${m.detail ? `<div class="story-detail">${escapeHtml(m.detail)}</div>` : ""}</div>
      </div>`,
    )
    .join("");
  return sectionBlock(
    "Trajetória esportiva",
    `<p class="lead-text">Histórico cronológico de clubes, categorias, temporadas, movimentações e marcos registrados no CUP360.</p><div class="story-timeline">${rows}</div>`,
  );
}

function matchRole(row: DossierFmfMatchRow): string {
  if (!row.listed && !row.played) return "—";
  if (row.starter) return "Titular";
  if (row.played && row.enteredMinute != null) return `Reserva (${row.enteredMinute}′)`;
  if (row.played) return "Reserva";
  return "Relacionado";
}

function renderMatchStatistics(d: PlayerDossierDto): string {
  const mh = d.matchHistory;
  if (!mh.totals && mh.matches.length === 0) return "";

  const totals = mh.totals
    ? `<div class="stats-band">
        <div class="stat-box"><div class="n">${mh.totals.matchesPlayed}</div><div class="l">Jogos</div></div>
        <div class="stat-box"><div class="n">${mh.totals.starts}</div><div class="l">Titularidades</div></div>
        <div class="stat-box"><div class="n">${mh.totals.minutesPlayed}</div><div class="l">Minutos</div></div>
        <div class="stat-box"><div class="n">${mh.totals.goals}</div><div class="l">Gols</div></div>
        <div class="stat-box"><div class="n">${fmtNum(d.snapshot.assists)}</div><div class="l">Assistências</div></div>
        <div class="stat-box"><div class="n">${mh.totals.yellowCards}</div><div class="l">Amarelos</div></div>
      </div>`
    : "";

  const seasonRows = mh.bySeason.map((s) => [
    escapeHtml(String(s.year)),
    escapeHtml(s.competition),
    escapeHtml(getCategoryLabel(s.category, "pt")),
    escapeHtml(String(s.matchesPlayed)),
    escapeHtml(String(s.starts)),
    escapeHtml(String(s.minutesPlayed)),
    escapeHtml(String(s.goals)),
  ]);

  const matchRows = mh.matches
    .filter((r) => r.played || r.listed)
    .slice(0, 55)
    .map((r) => {
      const m = r.match;
      const score = `${m.homeScore ?? "–"}×${m.awayScore ?? "–"}`;
      const cards =
        [r.yellowCards > 0 ? `${r.yellowCards}A` : "", r.redCards > 0 ? `${r.redCards}V` : ""]
          .filter(Boolean)
          .join(" ") || "—";
      return [
        escapeHtml(fmtDate(m.matchDate)),
        escapeHtml(`${m.season} · ${m.competition}`),
        escapeHtml(`${m.homeTeam} ${score} ${m.awayTeam}`),
        escapeHtml(matchRole(r)),
        escapeHtml(r.played ? String(r.minutesPlayed) : "0"),
        escapeHtml(r.goals > 0 ? String(r.goals) : "—"),
        escapeHtml(cards),
      ];
    });

  const charts = `<div class="chart-grid">
    ${mh.totals ? barChart("Participação nas partidas registradas", [
      {label: "Relacionado", value: mh.totals.matchesListed}, {label: "Entrou em campo", value: mh.totals.matchesPlayed},
      {label: "Titular", value: mh.totals.starts},
    ]) : ""}
    ${barChart("Minutos por mês", d.charts.monthlyMinutes.map((x) => ({ label: x.label, value: x.minutes, suffix: "′" })))}
    ${barChart("Gols por mês", d.charts.monthlyGoals.map((x) => ({ label: x.label, value: x.goals })))}
    ${barChart("Jogos por mês", d.charts.monthlyAppearances.map((x) => ({ label: x.label, value: x.appearances })))}
    ${barChart("Minutos por temporada", d.charts.seasonMinutes.map((x) => ({ label: x.label, value: x.minutesPlayed, suffix: "′" })))}
  </div>`;

  const parts = [
    `<p class="lead-text">Histórico oficial FMF com participação jogo a jogo, totais por competição e evolução estatística.</p>`,
    totals,
    seasonRows.length
      ? dataTable(["Temp.", "Competição", "Cat.", "Jogos", "Tit.", "Min.", "Gols"], seasonRows)
      : "",
    charts,
    matchRows.length
      ? `<p style="margin-top:14px;font-size:9px;font-weight:700;text-transform:uppercase;color:#64748b">Partidas individuais</p>${dataTable(["Data", "Competição", "Confronto", "Função", "Min", "Gols", "Cartões"], matchRows, [11, 22, 30, 13, 7, 7, 10])}`
      : "",
  ].join("");

  return sectionBlock("Estatísticas e histórico oficial", parts);
}

function renderHighlights(d: PlayerDossierDto): string {
  if (d.highlights.length === 0) return "";
  const cards = d.highlights.map((item: DossierHighlightItem) => {
    const isImage = item.kind === "image";
    const thumb = isImage
      ? `<img src="${escapeHtml(resolveLogoUrlForPrint(item.url))}" alt="" />`
      : item.kind === "video"
        ? "▶ Vídeo"
        : "Link";
    return `<div class="highlight-card">
      <div class="highlight-thumb">${thumb}</div>
      <div class="highlight-body">
        <div class="highlight-kind">${escapeHtml(item.label)}</div>
        <div class="highlight-url">${escapeHtml(item.url)}</div>
      </div>
    </div>`;
  });
  return sectionBlock(
    "Melhores momentos / Destaques",
    `<p class="lead-text">Mídia e destaques cadastrados na ficha do atleta (URLs canônicas CUP360).</p><div class="highlights-grid">${cards.join("")}</div>`,
  );
}

function renderCoachEvalCard(r: DossierCoachEvaluationRow): string {
  const dims = [
    { n: r.techAverage, l: "Técnica" },
    { n: r.tacAverage, l: "Tática" },
    { n: r.physAverage, l: "Física" },
    { n: r.behAverage, l: "Comport." },
  ].filter((d) => d.n != null);

  return `<div class="eval-card">
    <div class="eval-card-hdr">
      <div class="eval-card-title">${escapeHtml(String(r.season))} · ${escapeHtml(r.periodKey)}${r.classification ? ` · ${escapeHtml(r.classification)}` : ""}</div>
      ${r.percentage != null ? `<div class="eval-card-pct">${r.percentage}%</div>` : ""}
    </div>
    <div style="font-size:9px;color:#64748b;margin-bottom:4px">
      Min. jogos: ${r.matchMinutes} · Min. treino: ${r.trainingMinutes} · Gols: ${r.goals} · Assist.: ${r.assists}
      ${r.submittedAt ? ` · Enviado ${escapeHtml(fmtDate(r.submittedAt))}` : ""}
    </div>
    ${
      dims.length
        ? `<div class="eval-dims">${dims
            .map(
              (d) =>
                `<div class="eval-dim"><div class="n">${d.n!.toFixed(1)}</div><div class="l">${escapeHtml(d.l)}</div></div>`,
            )
            .join("")}</div>`
        : ""
    }
    ${r.technicalAssessment?.trim() ? `<div class="prose">${escapeHtml(r.technicalAssessment.trim())}</div>` : ""}
    ${r.finalResult?.trim() ? `<p style="margin-top:6px;font-size:9.5px"><strong>Resultado:</strong> ${escapeHtml(r.finalResult.trim())}</p>` : ""}
  </div>`;
}

function renderPerformance(d: PlayerDossierDto): string {
  const perf = d.performance;
  const parts: string[] = [];

  if (perf.coachEvaluations.length > 0) {
    parts.push(
      `<p class="lead-text">Avaliações concluídas da comissão técnica${perf.coachSummary.averagePercentage != null ? ` · média ${perf.coachSummary.averagePercentage}%` : ""}.</p>`,
    );
    parts.push(perf.coachEvaluations.map(renderCoachEvalCard).join(""));
  }

  if (d.meta.includedOptionalSections.includes("performance") && perf.performanceAnalysis?.trim()) {
    parts.push(`<div class="prose">${escapeHtml(perf.performanceAnalysis.trim())}</div>`);
  }

  const evalRows = asArray(d.meta.includedOptionalSections.includes("performance") ? perf.diretoriaEvaluations : [])
    .slice(0, 12)
    .map((ev) => {
      const o = asObject(ev);
      return [
        escapeHtml(fmtDate(typeof o.date === "string" ? o.date : null)),
        escapeHtml(typeof o.evaluator === "string" ? o.evaluator : "—"),
        escapeHtml(o.rating != null ? String(o.rating) : "—"),
        escapeHtml(typeof o.notes === "string" ? o.notes : "—"),
      ];
    });
  if (evalRows.length > 0) {
    parts.push(
      dataTable(["Data", "Avaliador", "Nota", "Observações / conclusões"], evalRows),
    );
  }

  const metrics = asObject(d.meta.includedOptionalSections.includes("performance") ? perf.analysisMetrics : {});
  const mRows = Object.entries(metrics)
    .filter(([, v]) => v != null && v !== "")
    .slice(0, 16)
    .map(([k, v]) => [escapeHtml(k), escapeHtml(String(v))]);
  if (mRows.length > 0) {
    parts.push(dataTable(["Indicador analítico", "Valor"], mRows));
  }

  const latest = [...perf.coachEvaluations].filter(r => r.submittedAt).sort((a,b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""))[0];
  if (latest) parts.push(reportRadar(`Avaliação por dimensão · ${fmtDate(latest.submittedAt)}`, [
    {label: "Técnica", value: latest.techAverage}, {label: "Tática", value: latest.tacAverage},
    {label: "Física", value: latest.physAverage}, {label: "Comportamento", value: latest.behAverage},
  ], 5));
  const trend = barChart(
    "Evolução das avaliações técnicas (%)",
    d.charts.evaluationTrend.map((x) => ({ label: x.label, value: x.value, suffix: "%" })),
  );
  if (trend) parts.push(trend);

  if (parts.length === 0) return "";
  return sectionBlock("Desempenho e avaliações", parts.join(""));
}

function renderTimeline(d: PlayerDossierDto): string {
  if (d.timeline.length === 0) return "";
  const rows = d.timeline
    .map(
      (ev) => `<div class="tl-row">
        <div class="tl-date">${escapeHtml(ev.date ? fmtDate(ev.date) : "—")}</div>
        <div class="tl-cat">${escapeHtml(ev.category)}</div>
        <div><div class="tl-title">${escapeHtml(ev.title)}</div>${ev.detail ? `<div class="tl-detail">${escapeHtml(ev.detail)}</div>` : ""}</div>
      </div>`,
    )
    .join("");
  return sectionBlock(
    "Linha do tempo esportiva",
    `<p class="lead-text">Marcos integrados de partidas, avaliações e eventos registrados no CUP360.</p><div class="timeline">${rows}</div>`,
  );
}

function renderPsychologySection(d: PlayerDossierDto, label: string): string {
  const records: DossierPsychRecord[] =
    d.psychologyRecords ??
    (asArray(asObject(d.optional.psychology).records) as DossierPsychRecord[]);
  const consultations = asArray(asObject(d.optional.psychology).consultations);

  if (records.length === 0 && consultations.length === 0) return "";

  const recordHtml = records
    .map((r) => {
      const obs =
        r.observations.length > 0
          ? `<ul class="psych-obs">${r.observations
              .slice(0, 8)
              .map((o) => `<li><strong>${escapeHtml(o.label)}:</strong> ${escapeHtml(o.text)}</li>`)
              .join("")}</ul>`
          : "";
      return `<div class="psych-record">
        <div class="psych-record-hdr">
          <span>${escapeHtml(r.kind)}${r.evaluator ? ` · ${escapeHtml(r.evaluator)}` : ""}</span>
          <span>${escapeHtml(r.date ? fmtDate(r.date) : "—")}</span>
        </div>
        ${r.summary ? `<div class="prose">${escapeHtml(r.summary)}</div>` : ""}
        ${obs}
      </div>`;
    })
    .join("");

  const cRows = consultations.map((c) => {
    const o = asObject(c);
    return [
      escapeHtml(fmtDate(typeof o.date === "string" ? o.date : null)),
      escapeHtml(typeof o.type === "string" ? o.type : "Consulta"),
      escapeHtml(typeof o.psychologist === "string" ? o.psychologist : "—"),
      escapeHtml(typeof o.notes === "string" ? o.notes : typeof o.status === "string" ? o.status : "—"),
    ];
  });

  const body = [
    recordCounts("Registros por modalidade", records, "kind"),
    recordHtml,
    cRows.length ? dataTable(["Data", "Modalidade", "Profissional", "Registro / status"], cRows) : "",
  ].join("");
  return sectionBlock("Psicologia — avaliações e acompanhamento", body, label);
}

function flattenEvolutionNotes(raw: unknown): string | null {
  const texts = asArray(raw)
    .map((n) => {
      const o = asObject(n);
      const t = typeof o.note === "string" ? o.note : typeof o.text === "string" ? o.text : null;
      return t?.trim() || null;
    })
    .filter(Boolean) as string[];
  return texts.length > 0 ? texts.join(" · ") : null;
}


const PHYSICAL_METRICS = [
  ["weight", "Peso", "kg"], ["height", "Altura", "cm"], ["bmi", "IMC", "kg/m²"],
  ["bodyFatPercent", "Gordura corporal", "%"], ["leanMassKg", "Massa magra", "kg"],
  ["vo2max", "VO₂ máx", "ml/kg/min"], ["cmjCm", "Salto CMJ", "cm"],
  ["illinoisSec", "Agilidade Illinois", "s"], ["tTestSec", "Teste T", "s"],
  ["sprint10m", "Sprint 10 m", "s"], ["sprint20m", "Sprint 20 m", "s"],
  ["yoyoDistance", "Yo-Yo", "m"], ["rastPower", "Potência RAST", "W"],
] as const;

function renderPhysicalRecords(block: Record<string, unknown>): string {
  const records = [...asArray(block.assessments), ...asArray(block.records)].map(asObject);
  const metricRows: string[][] = [];
  const charts: string[] = [];
  for (const [key, label, unit] of PHYSICAL_METRICS) {
    const observations = records.flatMap(r => {
      const value = r[key] ?? (key === "weight" ? r.weightKg : key === "height" ? r.heightCm : undefined);
      const date = isoFromUnknown(r.assessedAt ?? r.date);
      return typeof value === "number" && Number.isFinite(value) && date
        ? [{ date, value }] : [];
    }).sort((a,b) => a.date.localeCompare(b.date));
    for (const p of observations) metricRows.push([escapeHtml(fmtDate(p.date)), label, `${p.value} ${unit}`]);
    charts.push(reportTrend(label, unit, observations));
  }
  const notes = records.flatMap(r => {
    const date = isoFromUnknown(r.assessedAt ?? r.date);
    return [r.notes, r.mobilityNotes].filter((v): v is string => typeof v === "string" && !!v.trim())
      .map(text => `<p class="prose"><strong>${escapeHtml(fmtDate(date))}:</strong> ${escapeHtml(text)}</p>`);
  }).join("");
  const chartHtml = charts.filter(Boolean).join("");
  return `${chartHtml ? `<div class="chart-grid">${chartHtml}</div>` : ""}${dataTable(["Data", "Avaliação física", "Valor observado"], metricRows)}${notes}`;
}

function recordCounts(title: string, records: unknown[], field: string): string {
  const groups = new Map<string, number>();
  for (const raw of records) {
    const value = asObject(raw)[field];
    if (typeof value === "string" && value.trim()) groups.set(value, (groups.get(value) ?? 0) + 1);
  }
  return barChart(title, [...groups].map(([label,value]) => ({label,value})));
}

function renderOptionalSection(sectionId: PlayerDossierOptionalSection, d: PlayerDossierDto): string {
  const label = PLAYER_DOSSIER_OPTIONAL_LABELS[sectionId];
  const data = d.optional;

  switch (sectionId) {
    case "psychology":
      return renderPsychologySection(d, label);
    case "physio": {
      const block = asObject(data.physio);
      const sessions = asArray(block.sessions);
      const evaluations = asArray(block.evaluations);
      if (sessions.length === 0 && evaluations.length === 0) return "";
      const sessionRows = sessions.map((s) => {
        const o = asObject(s);
        const region = asObject(o.region);
        const evolution = flattenEvolutionNotes(o.evolutionNotes);
        return [
          escapeHtml(fmtDate(isoFromUnknown(o.startedAt))),
          escapeHtml(typeof region.namePt === "string" ? region.namePt : "—"),
          escapeHtml(typeof o.diagnosisLabel === "string" ? o.diagnosisLabel : "—"),
          escapeHtml(typeof o.symptoms === "string" ? o.symptoms.slice(0, 80) : "—"),
          escapeHtml(typeof o.treatmentNotes === "string" ? o.treatmentNotes.slice(0, 60) : evolution?.slice(0, 60) ?? "—"),
          escapeHtml(typeof o.disposition === "string" ? o.disposition : typeof o.status === "string" ? o.status : "—"),
        ];
      });
      const evalRows = evaluations.map((e) => {
        const o = asObject(e);
        return [
          escapeHtml(fmtDate(isoFromUnknown(o.evaluatedAt))),
          escapeHtml(typeof o.context === "string" ? o.context : "—"),
          escapeHtml(o.rating != null ? String(o.rating) : "—"),
          escapeHtml(typeof o.outcome === "string" ? o.outcome : "—"),
          escapeHtml(typeof o.finalObservations === "string" ? o.finalObservations : "—"),
        ];
      });
      const body = [
        recordCounts("Episódios por status", sessions, "status"),
        sessionRows.length
          ? dataTable(["Início", "Região", "Diagnóstico", "Queixa", "Evolução / conduta", "Desfecho"], sessionRows)
          : "",
        evalRows.length
          ? dataTable(["Data", "Contexto", "Nota", "Resultado", "Observações finais"], evalRows)
          : "",
      ].join("");
      return sectionBlock("Fisioterapia — episódios e avaliações", body, label);
    }
    case "nursing": {
      const sessions = asArray(asObject(data.nursing).sessions);
      if (sessions.length === 0) return "";
      const rows = sessions.map((s) => {
        const o = asObject(s);
        const diags = asArray(o.sessionDiagnoses)
          .map((d) => asObject(asObject(d).diagnosis).name)
          .filter((n) => typeof n === "string")
          .join(", ");
        return [
          escapeHtml(fmtDate(isoFromUnknown(o.attendedAt))),
          escapeHtml(typeof o.symptoms === "string" ? o.symptoms : "—"),
          escapeHtml(diags || "—"),
          escapeHtml(typeof o.treatmentNotes === "string" ? o.treatmentNotes : "—"),
          escapeHtml(typeof o.status === "string" ? o.status : "—"),
        ];
      });
      return sectionBlock(
        "Enfermaria — atendimentos",
        recordCounts("Atendimentos por status", sessions, "status") + dataTable(["Data", "Queixa", "Diagnósticos", "Conduta", "Status"], rows),
        label,
      );
    }
    case "medical": {
      const block = asObject(data.medical);
      const departures = asArray(block.departures);
      const history = asArray(block.clinicalHistory);
      if (departures.length === 0 && history.length === 0) return "";
      const depRows = departures.map((dep) => {
        const o = asObject(dep);
        return [
          escapeHtml(fmtDate(isoFromUnknown(o.departedAt))),
          escapeHtml(typeof o.careType === "string" ? o.careType : "—"),
          escapeHtml(typeof o.destination === "string" ? o.destination : "—"),
          escapeHtml(typeof o.reason === "string" ? o.reason : "—"),
          escapeHtml(fmtDate(isoFromUnknown(o.returnedAt))),
          escapeHtml(typeof o.status === "string" ? o.status : "—"),
        ];
      });
      const histRows = history.map((h) => {
        const o = asObject(h);
        return [
          escapeHtml(fmtDate(typeof o.date === "string" ? o.date : null)),
          escapeHtml(typeof o.type === "string" ? o.type : "—"),
          escapeHtml(typeof o.description === "string" ? o.description : "—"),
        ];
      });
      const body = [
        recordCounts("Saídas por status", departures, "status"),
        depRows.length ? dataTable(["Saída", "Tipo", "Destino", "Motivo", "Retorno", "Status"], depRows) : "",
        histRows.length ? dataTable(["Data", "Tipo", "Registro clínico"], histRows) : "",
      ].join("");
      return sectionBlock("Saúde clínica — saídas e histórico", body, label);
    }
    case "training": {
      const sessions = asArray(asObject(data.training).sessions);
      if (sessions.length === 0) return "";
      const rows = sessions.map((s) => {
        const o = asObject(s);
        return [
          escapeHtml(fmtDate(typeof o.sessionDate === "string" ? o.sessionDate : null)),
          escapeHtml(typeof o.category === "string" ? o.category : "—"),
          escapeHtml(o.rating != null ? String(o.rating) : "—"),
          escapeHtml(typeof o.staffName === "string" ? o.staffName : "—"),
          escapeHtml(typeof o.agendaTitle === "string" ? o.agendaTitle : "—"),
          escapeHtml(typeof o.notes === "string" ? o.notes : "—"),
        ];
      });
      return sectionBlock(
        "Treinos — participação e avaliação",
        recordCounts("Participações registradas por categoria", sessions, "category") + dataTable(["Data", "Categoria", "Nota", "Comissão", "Atividade", "Observações"], rows),
        label,
      );
    }
    case "scouting": {
      const prospects = asArray(asObject(data.scouting).prospects);
      if (prospects.length === 0) return "";
      const parts: string[] = [recordCounts("Observações por etapa", prospects, "stage")];
      for (const p of prospects) {
        const o = asObject(p);
        const reports = asArray(o.reports);
        for (const raw of reports) {
          const report = asObject(raw);
          parts.push(reportRadar(`Scouting por dimensão · ${fmtDate(isoFromUnknown(report.reportDate))}`, [
            ["Técnica", report.technicalRating], ["Tática", report.tacticalRating],
            ["Física", report.physicalRating], ["Cognitiva", report.cognitiveRating],
          ].map(([label, value]) => ({ label: String(label), value: typeof value === "number" ? value : null })), 10));
        }
        parts.push(`<div class="eval-card">
          <div class="eval-card-title">${escapeHtml(typeof o.stage === "string" ? o.stage : "Captação")} · ${escapeHtml(typeof o.recommendation === "string" ? o.recommendation : "—")}</div>
          ${typeof o.strengths === "string" && o.strengths.trim() ? `<p><strong>Pontos fortes:</strong> ${escapeHtml(o.strengths.trim())}</p>` : ""}
          ${typeof o.weaknesses === "string" && o.weaknesses.trim() ? `<p><strong>Pontos a desenvolver:</strong> ${escapeHtml(o.weaknesses.trim())}</p>` : ""}
          ${typeof o.descriptiveObservation === "string" && o.descriptiveObservation.trim() ? `<div class="prose">${escapeHtml(o.descriptiveObservation.trim())}</div>` : ""}
        </div>`);
        const repRows = reports.map((r) => {
          const ro = asObject(r);
          return [
            escapeHtml(fmtDate(isoFromUnknown(ro.reportDate))),
            escapeHtml(typeof ro.matchName === "string" ? ro.matchName : "—"),
            escapeHtml(ro.overallRating != null ? String(ro.overallRating) : "—"),
            escapeHtml(typeof ro.recommendation === "string" ? ro.recommendation : "—"),
            escapeHtml(typeof ro.scoutNotes === "string" ? ro.scoutNotes.slice(0, 120) : typeof ro.strengths === "string" ? ro.strengths.slice(0, 120) : "—"),
          ];
        });
        if (repRows.length) {
          parts.push(dataTable(["Data", "Observação", "Nota", "Recomendação", "Notas do olheiro"], repRows));
        }
      }
      return sectionBlock("Captação / scouting", parts.join(""), label);
    }
    case "nutrition": {
      const block = asObject(data.nutrition);
      const anamneses = asArray(block.anamneses);
      const assessments = asArray(block.assessments);
      if (anamneses.length === 0 && assessments.length === 0) return "";
      const aRows = anamneses.slice(0, 12).map((a) => {
        const o = asObject(a);
        return [
          escapeHtml(fmtDate(isoFromUnknown(o.assessedAt))),
          escapeHtml(typeof o.objective === "string" ? o.objective : "—"),
          escapeHtml(typeof o.notes === "string" ? o.notes : typeof o.summary === "string" ? o.summary : "—"),
        ];
      });
      const eRows = assessments.slice(0, 12).map((a) => {
        const o = asObject(a);
        return [
          escapeHtml(fmtDate(isoFromUnknown(o.assessedAt))),
          escapeHtml(o.weightKg != null ? `${o.weightKg} kg` : o.weight != null ? `${o.weight} kg` : "—"),
          escapeHtml(o.bodyFatPercent != null ? `${o.bodyFatPercent}%` : "—"),
          escapeHtml(typeof o.notes === "string" ? o.notes : "—"),
        ];
      });
      const body = [
        renderPhysicalRecords(block),
        aRows.length ? dataTable(["Data", "Objetivo", "Registro / observações"], aRows) : "",
        eRows.length ? dataTable(["Data", "Peso", "% Gordura", "Observações"], eRows) : "",
      ].join("");
      return sectionBlock("Nutrição — anamneses e avaliações", body, label);
    }
    case "physiology": {
      const block = asObject(data.physiology);
      const profile = asObject(block.profile);
      const profileItems = PHYSICAL_METRICS.flatMap(([key,label,unit]) =>
        typeof profile[key] === "number" ? [{label, value: `${profile[key]} ${unit}`}] : []);
      const body = kvGrid(profileItems) + renderPhysicalRecords(block);
      if (!asArray(block.assessments).length && !asArray(block.records).length && !profileItems.length) return "";
      return sectionBlock("Fisiologia e avaliações físicas", body, label);
    }
    case "performance": {
      const block = asObject(data.performanceDetail);
      if (!block.performanceAnalysis && Object.keys(asObject(block.analysisMetrics)).length === 0) {
        return "";
      }
      const metrics = asObject(block.analysisMetrics);
      const mRows = Object.entries(metrics)
        .filter(([, v]) => v != null)
        .slice(0, 16)
        .map(([k, v]) => [escapeHtml(k), escapeHtml(String(v))]);
      const body = [
        typeof block.performanceAnalysis === "string" && block.performanceAnalysis.trim()
          ? `<div class="prose">${escapeHtml(block.performanceAnalysis.trim())}</div>`
          : "",
        mRows.length ? dataTable(["Indicador", "Valor"], mRows) : "",
      ].join("");
      return sectionBlock("Desempenho analítico — indicadores", body, label);
    }
    default:
      return "";
  }
}

function renderOptionalSections(d: PlayerDossierDto): string {
  return d.meta.includedOptionalSections
    .map((id) => renderOptionalSection(id, d))
    .filter(Boolean)
    .join("");
}

function reportHeader(d: PlayerDossierDto): string {
  const logo = clubLogo(d);
  return `<div class="report-hdr">
    ${logo ? `<img src="${escapeHtml(logo)}" alt="" />` : ""}
    <div>
      <div class="report-hdr-title">Dossiê do Atleta</div>
      <div class="report-hdr-sub">${escapeHtml(d.cover.name)} · ${escapeHtml(clubDisplayName(d))}</div>
    </div>
  </div>`;
}

function reportFooter(d: PlayerDossierDto): string {
  const optional =
    d.meta.includedOptionalSections.length > 0
      ? ` · Seções internas: ${d.meta.includedOptionalSections.map((id) => PLAYER_DOSSIER_OPTIONAL_LABELS[id]).join(", ")}`
      : "";
  return `<div class="report-ftr">
    <span><strong>${escapeHtml(clubDisplayName(d))}</strong> · CUP360 · ${escapeHtml(fmtDate(d.meta.generatedAt.slice(0, 10)))}</span>
    <span>Documento para apresentação externa${escapeHtml(optional)}</span>
  </div>`;
}

export function buildPlayerDossierPrintHtml(
  d: PlayerDossierDto,
  config?: ReportPrintConfig,
): string {
  const page = (content: string) =>
    content.trim() ? ReportPage(`<div class="page-inner">${content}</div>`) : "";

  const bodyHtml = [
    page([renderExecutiveSnapshot(d), renderSportingStory(d)].join("")),
    page([renderMatchStatistics(d), renderHighlights(d)].join("")),
    page([renderPerformance(d), renderTimeline(d)].join("")),
    page(renderOptionalSections(d)),
  ].join("");

  return wrapPrintRootDocument({
    title: `Dossiê - ${d.cover.name}`,
    config,
    styles: dossierStyles(),
    coverHtml: renderCover(d),
    headerHtml: reportHeader(d),
    metaHtml: "",
    bodyHtml,
    footerHtml: reportFooter(d),
  });
}

export function printPlayerDossierDocument(html: string): void {
  printReportDocument(html);
}
