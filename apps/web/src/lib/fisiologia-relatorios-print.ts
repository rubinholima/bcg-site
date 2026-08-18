import { formatDateDayMonYear } from "@/lib/format-date";
import { printHtmlDocument } from "@/lib/futebol-relatorios-print";
import { REPORT_PRINT_BREAK_CSS, wrapPrintRootDocument } from "@/lib/report-print-layout";
import { getCategoryLabel } from "@/lib/fixture-categories";
import type { FixtureCategoryItem } from "@/lib/fixture-categories";
import {
  reportKindLabel,
  type FisiologiaReport,
} from "@/lib/fisiologia-types";

const SKY = {
  primary: "#0284c7",
  dark: "#0369a1",
  light: "#E0F2FE",
  accent: "#0ea5e9",
} as const;

function esc(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtNum(value: number | null | undefined, suffix = ""): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value}${suffix}`;
}

function periodText(report: FisiologiaReport): string {
  const { from, to } = report.filters;
  if (from && to) {
    return `${formatDateDayMonYear(new Date(`${from}T12:00:00`))} a ${formatDateDayMonYear(new Date(`${to}T12:00:00`))}`;
  }
  if (from) return `A partir de ${formatDateDayMonYear(new Date(`${from}T12:00:00`))}`;
  if (to) return `Até ${formatDateDayMonYear(new Date(`${to}T12:00:00`))}`;
  return "Período completo";
}

function summaryCards(report: FisiologiaReport): string {
  const s = report.summary;
  return `<div class="summary-grid">
    <div class="summary-card"><span class="summary-label">Avaliações</span><strong>${s.assessmentCount}</strong></div>
    <div class="summary-card"><span class="summary-label">Hidratação</span><strong>${s.hydrationCount}</strong></div>
    <div class="summary-card"><span class="summary-label">Sessões carga</span><strong>${s.loadSessionCount}</strong></div>
    <div class="summary-card"><span class="summary-label">Registros GPS</span><strong>${s.loadEntryCount}</strong></div>
  </div>`;
}

function assessmentsTable(rows: FisiologiaReport["assessments"]): string {
  if (rows.length === 0) return `<p class="muted">Nenhuma avaliação no filtro.</p>`;
  const body = rows
    .map(
      (r) => `<tr>
        <td>${esc(formatDateDayMonYear(new Date(r.date)))}</td>
        <td>${esc(r.playerName)}${r.jerseyNumber != null ? ` #${r.jerseyNumber}` : ""}</td>
        <td>${esc(r.assessmentType === "entrada" ? "Entrada" : r.assessmentType === "rotina" ? "Rotina" : r.assessmentType)}</td>
        <td class="num">${esc(fmtNum(r.weight, " kg"))}</td>
        <td class="num">${esc(fmtNum(r.bmi))}</td>
        <td class="num">${esc(fmtNum(r.bodyFatPercent, "%"))}</td>
        <td class="num">${esc(fmtNum(r.leanMassKg, " kg"))}</td>
        <td>${esc(r.compositionStatus ?? "—")}</td>
        <td class="num">${esc(fmtNum(r.vo2max))}</td>
        <td class="num">${esc(fmtNum(r.cmjCm, " cm"))}</td>
      </tr>`,
    )
    .join("");
  return `<table class="data">
    <thead><tr>
      <th>Data</th><th>Atleta</th><th>Tipo</th><th>Peso</th><th>IMC</th><th>% Gordura</th><th>Massa magra</th><th>Status</th><th>VO₂</th><th>CMJ</th>
    </tr></thead>
    <tbody>${body}</tbody>
  </table>`;
}

function hydrationsTable(rows: FisiologiaReport["hydrations"]): string {
  if (rows.length === 0) return `<p class="muted">Nenhum registro de hidratação.</p>`;
  const body = rows
    .map(
      (r) => `<tr>
        <td>${esc(formatDateDayMonYear(new Date(r.date)))}</td>
        <td>${esc(r.playerName)}</td>
        <td>${esc(r.contextType === "jogo" ? "Jogo" : "Treino")}</td>
        <td class="num">${esc(fmtNum(r.weightBefore, " kg"))}</td>
        <td class="num">${esc(fmtNum(r.weightAfter, " kg"))}</td>
        <td>${esc(r.status ?? "—")}</td>
      </tr>`,
    )
    .join("");
  return `<table class="data">
    <thead><tr>
      <th>Data</th><th>Atleta</th><th>Contexto</th><th>Peso antes</th><th>Peso depois</th><th>Status</th>
    </tr></thead>
    <tbody>${body}</tbody>
  </table>`;
}

function loadSessionsHtml(sessions: FisiologiaReport["loadSessions"]): string {
  if (sessions.length === 0) return `<p class="muted">Nenhuma sessão de carga no filtro.</p>`;
  return sessions
    .map((s) => {
      const entries = s.entries
        .map(
          (e) => `<tr>
            <td>${esc(e.playerName)}</td>
            <td>${e.present ? "Sim" : "Não"}</td>
            <td class="num">${esc(fmtNum(e.rpe))}</td>
            <td class="num">${esc(fmtNum(e.maxDistanceM, " m"))}</td>
            <td class="num">${esc(fmtNum(e.maxSpeedKmh, " km/h"))}</td>
            <td class="num">${esc(fmtNum(e.sprintCount))}</td>
            <td class="num">${esc(fmtNum(e.highIntensityDistanceM, " m"))}</td>
          </tr>`,
        )
        .join("");
      return `<div class="session-block">
        <h3>${esc(formatDateDayMonYear(new Date(`${s.sessionDate}T12:00:00`)))} — ${esc(s.sessionType === "jogo" ? "Jogo" : "Treino")}${s.period ? ` · ${esc(s.period)}` : ""}${s.trainingType ? ` · ${esc(s.trainingType)}` : ""}</h3>
        <table class="data">
          <thead><tr>
            <th>Atleta</th><th>Presente</th><th>PSE</th><th>Dist. máx</th><th>Vel. máx</th><th>Sprints</th><th>Dist. alta</th>
          </tr></thead>
          <tbody>${entries || `<tr><td colspan="7" class="muted">Sem registros</td></tr>`}</tbody>
        </table>
      </div>`;
    })
    .join("");
}

export function buildFisiologiaPrintHtml(
  report: FisiologiaReport,
  allCats?: FixtureCategoryItem[],
): string {
  const title = `Fisiologia — ${report.tenant.name}`;
  const kind = reportKindLabel(report.kind);
  const category = report.filters.category
    ? getCategoryLabel(report.filters.category, "pt", allCats)
    : "Todas";

  const showAssessments = report.kind === "geral" || report.kind === "avaliacoes";
  const showHydration = report.kind === "geral" || report.kind === "hidratacao";
  const showLoad =
    report.kind === "geral" || report.kind === "carga_treino" || report.kind === "carga_jogo";

  const sections: string[] = [];
  if (showAssessments) {
    sections.push(`<section class="section"><h2>Avaliações físicas</h2>${assessmentsTable(report.assessments)}</section>`);
  }
  if (showHydration) {
    sections.push(`<section class="section"><h2>Hidratação</h2>${hydrationsTable(report.hydrations)}</section>`);
  }
  if (showLoad) {
    sections.push(`<section class="section"><h2>Carga e GPS</h2>${loadSessionsHtml(report.loadSessions)}</section>`);
  }

  const styles = `
    @page { size: A4 landscape; margin: 10mm; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #111; margin: 0; }
    h1 { font-size: 18px; margin: 0 0 4px; color: ${SKY.dark}; }
    h2 { font-size: 13px; margin: 18px 0 8px; color: ${SKY.primary}; border-bottom: 2px solid ${SKY.light}; padding-bottom: 4px; }
    h3 { font-size: 11px; margin: 0 0 6px; color: ${SKY.dark}; }
    .brand-bar { height: 4px; background: linear-gradient(90deg, ${SKY.primary}, ${SKY.accent}); margin-bottom: 10px; border-radius: 2px; }
    .meta { color: #444; margin-bottom: 10px; line-height: 1.5; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 12px 0 16px; }
    .summary-card { border: 1px solid #bae6fd; border-radius: 8px; padding: 8px 10px; background: ${SKY.light}; }
    .summary-label { display: block; font-size: 9px; color: #555; text-transform: uppercase; letter-spacing: 0.04em; }
    .summary-card strong { font-size: 16px; color: #111; }
    table.data { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    table.data th, table.data td { border: 1px solid #ccc; padding: 5px 6px; vertical-align: top; }
    table.data th { background: ${SKY.light}; text-align: left; font-size: 9px; text-transform: uppercase; color: ${SKY.dark}; }
    .num { text-align: right; white-space: nowrap; }
    .muted { color: #666; font-size: 9px; }
    .section { margin-bottom: 8px; }
    .session-block { margin-bottom: 14px; page-break-inside: avoid; }
    ${REPORT_PRINT_BREAK_CSS}
  `;

  const headerHtml = `<div class="brand-bar"></div><h1>${esc(title)}</h1>`;
  const metaHtml = `
    <div class="meta">
      <div><strong>Relatório:</strong> ${esc(kind)}</div>
      <div><strong>Categoria:</strong> ${esc(category)}</div>
      <div><strong>Período:</strong> ${esc(periodText(report))}</div>
      <div><strong>Gerado em:</strong> ${esc(formatDateDayMonYear(new Date()))}</div>
    </div>
    ${summaryCards(report)}
  `;

  return wrapPrintRootDocument({
    title,
    styles,
    headerHtml,
    metaHtml,
    bodyHtml: sections.join(""),
    footerHtml: `<div style="font-size:9px;color:#666;padding-top:8px;">Boston City Group — Fisiologia</div>`,
  });
}

export function printFisiologiaReport(report: FisiologiaReport, allCats?: FixtureCategoryItem[]): void {
  const html = buildFisiologiaPrintHtml(report, allCats);
  printHtmlDocument(html, `Fisiologia — ${report.tenant.name}`);
}
