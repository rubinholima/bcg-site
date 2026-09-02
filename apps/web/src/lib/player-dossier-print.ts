import { formatDateDayMonYear } from "@/lib/format-date";
import { getCategoryLabel } from "@/lib/fixture-categories";
import { getPositionLabel } from "@/lib/football-positions";
import { reportLogoUrlForPrint, resolveLogoUrlForPrint } from "@/lib/futebol-relatorios-print";
import { PLAYER_DOSSIER_OPTIONAL_LABELS } from "@/lib/player-dossier-access";
import type { PlayerDossierDto, PlayerDossierOptionalSection } from "@/lib/player-dossier.types";
import {
  REPORT_PRINT_BREAK_CSS,
  wrapPrintRootDocument,
} from "@/lib/report-print-layout";

const BCG = {
  red: "#C8102E",
  blue: "#00205B",
  blueLight: "#E8EEF7",
  violet: "#6d28d9",
  violetDark: "#5b21b6",
  violetLight: "#f3e8ff",
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
  if (value === "both") return "Ambidestro";
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

function optionalBadge(label: string): string {
  return `<span class="optional-badge">Seção opcional · ${escapeHtml(label)}</span>`;
}

function section(title: string, body: string, optionalLabel?: string): string {
  if (!body.trim()) return "";
  const badge = optionalLabel ? `<div class="section-badges">${optionalBadge(optionalLabel)}</div>` : "";
  return `
    <section class="section">
      ${badge}
      <h3>${escapeHtml(title)}</h3>
      ${body}
    </section>
  `;
}

function kvGrid(items: Array<{ label: string; value: string }>): string {
  const rows = items.filter((i) => i.value && i.value !== "—");
  if (rows.length === 0) return "";
  return `
    <div class="kv-grid">
      ${rows
        .map(
          (item) => `
        <div class="kv-item">
          <label>${escapeHtml(item.label)}</label>
          <span>${escapeHtml(item.value)}</span>
        </div>`,
        )
        .join("")}
    </div>
  `;
}

function barChart(
  title: string,
  items: Array<{ label: string; value: number; suffix?: string }>,
): string {
  if (items.length === 0) return "";
  const max = Math.max(...items.map((i) => i.value), 1);
  return `
    <div class="chart-block">
      <h4>${escapeHtml(title)}</h4>
      <div class="bar-chart">
        ${items
          .map(
            (item) => `
          <div class="bar-row">
            <div class="bar-label">${escapeHtml(item.label)}</div>
            <div class="bar-track">
              <div class="bar-fill" style="width:${Math.round((item.value / max) * 100)}%"></div>
            </div>
            <div class="bar-value">${item.value}${item.suffix ?? ""}</div>
          </div>`,
          )
          .join("")}
      </div>
    </div>
  `;
}

function baseStyles(): string {
  return `
    ${REPORT_PRINT_BREAK_CSS}
    @page { size: A4; margin: 12mm 11mm; }
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
    .top-bar {
      height: 6px;
      background: linear-gradient(90deg, ${BCG.violet} 0%, ${BCG.blue} 100%);
      border-radius: 3px;
      margin-bottom: 14px;
    }
    .hero {
      display: grid;
      grid-template-columns: 120px 1fr;
      gap: 18px;
      padding: 16px 18px;
      margin-bottom: 14px;
      border: 1px solid #ddd6fe;
      border-left: 5px solid ${BCG.violet};
      border-radius: 12px;
      background: linear-gradient(135deg, ${BCG.violetLight} 0%, #fff 100%);
      break-inside: avoid;
    }
    .photo-wrap {
      width: 120px;
      height: 150px;
      border-radius: 12px;
      overflow: hidden;
      border: 2px solid ${BCG.violetDark};
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .photo-wrap img { width: 100%; height: 100%; object-fit: cover; }
    .photo-fallback {
      font-size: 11px;
      font-weight: 700;
      color: ${BCG.violetDark};
      text-align: center;
      padding: 8px;
    }
    .hero h1 {
      margin: 0 0 6px;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.02em;
      text-transform: uppercase;
    }
    .hero .club {
      margin: 0 0 8px;
      font-size: 13px;
      font-weight: 700;
      color: ${BCG.violet};
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .hero .subtitle {
      margin: 0;
      font-size: 14px;
      color: #334155;
    }
    .doc-tag {
      display: inline-block;
      margin-top: 10px;
      padding: 5px 12px;
      border-radius: 999px;
      background: ${BCG.violetDark};
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .section { margin: 18px 0 0; break-inside: avoid-page; }
    .section h3 {
      margin: 0 0 10px;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: ${BCG.violetDark};
      border-bottom: 2px solid ${BCG.violetLight};
      padding-bottom: 6px;
    }
    .section h4 { margin: 0 0 8px; font-size: 12px; font-weight: 700; color: #334155; }
    .section-badges { margin-bottom: 6px; }
    .optional-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 999px;
      background: #fef3c7;
      border: 1px solid #fcd34d;
      color: #92400e;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .kv-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px 14px;
    }
    .kv-item label {
      display: block;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      color: ${BCG.violetDark};
      margin-bottom: 2px;
    }
    .kv-item span { display: block; font-size: 13px; font-weight: 600; color: #0f172a; }
    .stats-row {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      margin-top: 8px;
    }
    .stat-card {
      padding: 10px 12px;
      border-radius: 10px;
      background: ${BCG.blueLight};
      border: 1px solid #cbd5e1;
      text-align: center;
    }
    .stat-card .num { font-size: 22px; font-weight: 800; color: ${BCG.blue}; line-height: 1; }
    .stat-card .lbl {
      margin-top: 4px;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #475569;
    }
    .chart-block { margin-top: 12px; }
    .bar-chart { display: flex; flex-direction: column; gap: 8px; }
    .bar-row {
      display: grid;
      grid-template-columns: 140px 1fr 56px;
      gap: 8px;
      align-items: center;
    }
    .bar-label { font-size: 11px; font-weight: 600; color: #334155; }
    .bar-track {
      height: 10px;
      border-radius: 999px;
      background: #e2e8f0;
      overflow: hidden;
    }
    .bar-fill {
      height: 100%;
      border-radius: 999px;
      background: linear-gradient(90deg, ${BCG.violet} 0%, ${BCG.blue} 100%);
    }
    .bar-value { font-size: 11px; font-weight: 700; text-align: right; color: #0f172a; }
    .timeline { display: flex; flex-direction: column; gap: 8px; }
    .timeline-item {
      display: grid;
      grid-template-columns: 88px 1fr;
      gap: 10px;
      padding: 8px 10px;
      border-radius: 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
    }
    .timeline-date { font-size: 10px; font-weight: 700; color: ${BCG.violetDark}; }
    .timeline-label { font-size: 12px; font-weight: 700; color: #0f172a; }
    .timeline-detail { font-size: 11px; color: #475569; margin-top: 2px; }
    .simple-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    .simple-table th, .simple-table td {
      border: 1px solid #e2e8f0;
      padding: 6px 8px;
      text-align: left;
      vertical-align: top;
    }
    .simple-table th {
      background: ${BCG.violetLight};
      font-size: 9px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: ${BCG.violetDark};
    }
    .bio { font-size: 12px; color: #334155; white-space: pre-wrap; }
    .report-footer {
      margin-top: 16px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      font-size: 9px;
      color: #64748b;
      text-align: center;
    }
    @media print {
      .section { break-inside: avoid-page; }
    }
  `;
}

function renderIdentity(d: PlayerDossierDto): string {
  const id = d.identity;
  const photo = id.photoUrl ? resolveLogoUrlForPrint(id.photoUrl) : "";
  const logo = d.club?.logoUrl
    ? resolveLogoUrlForPrint(reportLogoUrlForPrint(d.club.logoUrl, false))
    : "";

  return `
    <div class="top-bar"></div>
    <div class="hero">
      <div class="photo-wrap">
        ${
          photo
            ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(id.name)}" />`
            : `<div class="photo-fallback">Sem foto</div>`
        }
      </div>
      <div>
        ${
          logo
            ? `<img src="${escapeHtml(logo)}" alt="" style="height:36px;object-fit:contain;margin-bottom:8px;" />`
            : ""
        }
        <p class="club">${escapeHtml(d.club?.name ?? "Clube")}</p>
        <h1>${escapeHtml(id.name)}</h1>
        <p class="subtitle">
          ${[
            id.jerseyNumber != null ? `#${id.jerseyNumber}` : null,
            id.category ? getCategoryLabel(id.category, "pt") : null,
            id.position ? getPositionLabel(id.position) : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <span class="doc-tag">Dossiê do Atleta · Apresentação externa</span>
      </div>
    </div>
  `;
}

function renderProfile(d: PlayerDossierDto): string {
  const id = d.identity;
  return section(
    "Perfil esportivo",
    kvGrid([
      { label: "Categoria", value: id.category ? getCategoryLabel(id.category, "pt") : "—" },
      { label: "Posição", value: id.position ? getPositionLabel(id.position) : "—" },
      { label: "Pé dominante", value: footLabel(id.preferredFoot) },
      { label: "Altura", value: id.height ? `${id.height} cm` : "—" },
      { label: "Peso", value: id.weight ? `${id.weight} kg` : "—" },
      { label: "Nascimento", value: formatDateDayMonYear(id.birthDate) || "—" },
      { label: "Nacionalidade", value: id.nationality?.trim() || "—" },
      { label: "IMC", value: id.bmi != null ? String(id.bmi) : "—" },
      { label: "% Gordura", value: id.bodyFatPercent != null ? `${id.bodyFatPercent}%` : "—" },
    ]),
  );
}

function renderRegistration(d: PlayerDossierDto): string {
  const r = d.registration;
  return section(
    "Registro e situação esportiva",
    kvGrid([
      { label: "Registro CBF", value: r.cbfRegistration?.trim() || "—" },
      { label: "Federação local", value: r.localFedRegistration?.trim() || "—" },
      { label: "COMET", value: r.comet?.trim() || "—" },
      { label: "Situação", value: r.situation?.trim() || "—" },
      { label: "Nome na camisa", value: r.jerseyName?.trim() || "—" },
      { label: "Clube atual", value: d.identity.currentTeam?.trim() || d.club?.name || "—" },
    ]),
  );
}

function renderCareer(d: PlayerDossierDto): string {
  const teams = d.career.previousTeams;
  const history = asArray(d.career.seasonHistory);
  if (teams.length === 0 && history.length === 0) return "";

  const teamsHtml =
    teams.length > 0
      ? `<p><strong>Clubes anteriores:</strong> ${escapeHtml(teams.join(" · "))}</p>`
      : "";

  const historyRows = history
    .slice(0, 8)
    .map((row) => {
      const o = asObject(row);
      const season = typeof o.season === "string" ? o.season : typeof o.year === "string" ? o.year : "—";
      const club = typeof o.club === "string" ? o.club : typeof o.team === "string" ? o.team : "—";
      const category =
        typeof o.category === "string" ? getCategoryLabel(o.category, "pt") : "—";
      return `<tr><td>${escapeHtml(season)}</td><td>${escapeHtml(club)}</td><td>${escapeHtml(category)}</td></tr>`;
    })
    .join("");

  const historyHtml =
    historyRows.length > 0
      ? `
      <table class="simple-table" style="margin-top:10px;">
        <thead><tr><th>Temporada</th><th>Clube</th><th>Categoria</th></tr></thead>
        <tbody>${historyRows}</tbody>
      </table>`
      : "";

  return section("Trajetória e histórico", `${teamsHtml}${historyHtml}`);
}

function renderFmfStats(d: PlayerDossierDto): string {
  const stats = d.fmfStats;
  if (!stats?.total) return "";

  const cards = `
    <div class="stats-row">
      <div class="stat-card"><div class="num">${stats.total.matchesPlayed}</div><div class="lbl">Jogos</div></div>
      <div class="stat-card"><div class="num">${stats.total.minutesPlayed}</div><div class="lbl">Minutos</div></div>
      <div class="stat-card"><div class="num">${stats.total.goals}</div><div class="lbl">Gols</div></div>
      <div class="stat-card"><div class="num">${d.meta.season}</div><div class="lbl">Temporada ref.</div></div>
    </div>
  `;

  const charts = [
    barChart(
      "Minutos por temporada/competição (FMF)",
      d.charts.seasonMinutes.map((s) => ({
        label: s.label,
        value: s.minutesPlayed,
        suffix: " min",
      })),
    ),
    barChart(
      "Gols por ano (FMF)",
      d.charts.yearTotals.map((y) => ({
        label: String(y.year),
        value: y.goals,
      })),
    ),
  ].join("");

  return section("Estatísticas oficiais de temporada", `${cards}${charts}`);
}

function renderPerformance(d: PlayerDossierDto): string {
  const perf = d.performance;
  const parts: string[] = [];

  if (perf.coachEvaluations.count > 0) {
    parts.push(`
      <p><strong>Avaliações técnicas (comissão):</strong> ${perf.coachEvaluations.count} período(s)
      ${perf.coachEvaluations.averagePercentage != null ? ` · média ${perf.coachEvaluations.averagePercentage}%` : ""}</p>
    `);
    const rows = perf.coachEvaluations.periods
      .map(
        (p) =>
          `<tr><td>${escapeHtml(p.periodKey)}</td><td>${p.percentage != null ? `${p.percentage}%` : "—"}</td><td>${escapeHtml(p.classification ?? "—")}</td></tr>`,
      )
      .join("");
    if (rows) {
      parts.push(`
        <table class="simple-table">
          <thead><tr><th>Período</th><th>%</th><th>Classificação</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      `);
    }
  }

  const metrics = perf.analysisMetrics;
  const metricKeys = Object.keys(metrics).filter((k) => metrics[k] != null);
  if (metricKeys.length > 0) {
    parts.push(
      barChart(
        "Indicadores analíticos",
        metricKeys.slice(0, 8).map((k) => ({
          label: k,
          value: Number(metrics[k]) || 0,
        })),
      ),
    );
  }

  const evals = asArray(perf.evaluations);
  if (evals.length > 0) {
    const rows = evals
      .slice(0, 6)
      .map((ev) => {
        const o = asObject(ev);
        return `<tr>
          <td>${escapeHtml(formatDateDayMonYear(typeof o.date === "string" ? o.date : null) || "—")}</td>
          <td>${escapeHtml(typeof o.evaluator === "string" ? o.evaluator : "—")}</td>
          <td>${o.rating != null ? String(o.rating) : "—"}</td>
          <td>${escapeHtml(typeof o.notes === "string" ? o.notes.slice(0, 120) : "—")}</td>
        </tr>`;
      })
      .join("");
    parts.push(`
      <table class="simple-table" style="margin-top:10px;">
        <thead><tr><th>Data</th><th>Avaliador</th><th>Nota</th><th>Observações</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `);
  }

  if (parts.length === 0) return "";
  return section("Desempenho e evolução", parts.join(""));
}

function renderTimeline(d: PlayerDossierDto): string {
  if (d.timeline.length === 0) return "";
  const items = d.timeline
    .slice(0, 14)
    .map(
      (ev) => `
      <div class="timeline-item">
        <div class="timeline-date">${escapeHtml(ev.date ? formatDateDayMonYear(ev.date) : "—")}</div>
        <div>
          <div class="timeline-label">${escapeHtml(ev.label)}</div>
          ${ev.detail ? `<div class="timeline-detail">${escapeHtml(ev.detail)}</div>` : ""}
        </div>
      </div>`,
    )
    .join("");
  return section("Linha do tempo esportiva", `<div class="timeline">${items}</div>`);
}

function renderBio(d: PlayerDossierDto): string {
  const bio = d.identity.bioPT?.trim();
  if (!bio) return "";
  return section("Apresentação", `<div class="bio">${escapeHtml(bio)}</div>`);
}

function renderOptionalSection(
  sectionId: PlayerDossierOptionalSection,
  d: PlayerDossierDto,
): string {
  const data = d.optional;
  const label = PLAYER_DOSSIER_OPTIONAL_LABELS[sectionId];

  switch (sectionId) {
    case "psychology": {
      const block = asObject(data.psychology);
      const assessments = asArray(block.assessments);
      const consultations = asArray(block.consultations);
      if (assessments.length === 0 && consultations.length === 0) return "";
      const rows = assessments
        .slice(0, 5)
        .map((a) => {
          const o = asObject(a);
          return `<tr><td>${escapeHtml(formatDateDayMonYear(typeof o.date === "string" ? o.date : null) || "—")}</td><td>${escapeHtml(typeof o.evaluator === "string" ? o.evaluator : "Avaliação")}</td></tr>`;
        })
        .join("");
      const consultRows = consultations
        .slice(0, 5)
        .map((c) => {
          const o = asObject(c);
          return `<tr><td>${escapeHtml(formatDateDayMonYear(typeof o.date === "string" ? o.date : null) || "—")}</td><td>${escapeHtml(typeof o.type === "string" ? o.type : "Consulta")}</td><td>${escapeHtml(typeof o.status === "string" ? o.status : "—")}</td></tr>`;
        })
        .join("");
      const body = [
        rows
          ? `<table class="simple-table"><thead><tr><th>Data</th><th>Avaliação</th></tr></thead><tbody>${rows}</tbody></table>`
          : "",
        consultRows
          ? `<table class="simple-table" style="margin-top:8px;"><thead><tr><th>Data</th><th>Tipo</th><th>Status</th></tr></thead><tbody>${consultRows}</tbody></table>`
          : "",
      ].join("");
      return section("Psicologia", body, label);
    }
    case "physio": {
      const block = asObject(data.physio);
      const rows = asArray(block.evaluations);
      if (rows.length === 0) return "";
      const table = rows
        .map((r) => {
          const o = asObject(r);
          const date =
            o.evaluatedAt instanceof Date
              ? o.evaluatedAt.toISOString()
              : typeof o.evaluatedAt === "string"
                ? o.evaluatedAt
                : null;
          return `<tr>
            <td>${escapeHtml(formatDateDayMonYear(date) || "—")}</td>
            <td>${escapeHtml(typeof o.context === "string" ? o.context : "—")}</td>
            <td>${o.rating != null ? String(o.rating) : "—"}</td>
            <td>${escapeHtml(typeof o.outcome === "string" ? o.outcome : "—")}</td>
          </tr>`;
        })
        .join("");
      return section(
        "Fisioterapia",
        `<table class="simple-table"><thead><tr><th>Data</th><th>Contexto</th><th>Nota</th><th>Resultado</th></tr></thead><tbody>${table}</tbody></table>`,
        label,
      );
    }
    case "nursing": {
      const block = asObject(data.nursing);
      const rows = asArray(block.sessions);
      if (rows.length === 0) return "";
      const table = rows
        .map((r) => {
          const o = asObject(r);
          const date =
            typeof o.attendedAt === "string"
              ? o.attendedAt
              : o.attendedAt instanceof Date
                ? o.attendedAt.toISOString()
                : null;
          return `<tr>
            <td>${escapeHtml(formatDateDayMonYear(date) || "—")}</td>
            <td>${escapeHtml(typeof o.symptoms === "string" ? o.symptoms.slice(0, 80) : "—")}</td>
            <td>${escapeHtml(typeof o.status === "string" ? o.status : "—")}</td>
          </tr>`;
        })
        .join("");
      return section(
        "Enfermaria",
        `<table class="simple-table"><thead><tr><th>Data</th><th>Queixa</th><th>Status</th></tr></thead><tbody>${table}</tbody></table>`,
        label,
      );
    }
    case "medical": {
      const block = asObject(data.medical);
      const departures = asArray(block.departures);
      const history = asArray(block.history);
      if (departures.length === 0 && history.length === 0) return "";
      const depRows = departures
        .map((r) => {
          const o = asObject(r);
          const date =
            typeof o.departedAt === "string"
              ? o.departedAt
              : o.departedAt instanceof Date
                ? o.departedAt.toISOString()
                : null;
          return `<tr>
            <td>${escapeHtml(formatDateDayMonYear(date) || "—")}</td>
            <td>${escapeHtml(typeof o.careType === "string" ? o.careType : "—")}</td>
            <td>${escapeHtml(typeof o.destination === "string" ? o.destination.slice(0, 60) : "—")}</td>
          </tr>`;
        })
        .join("");
      const histRows = history
        .map((r) => {
          const o = asObject(r);
          return `<tr>
            <td>${escapeHtml(formatDateDayMonYear(typeof o.date === "string" ? o.date : null) || "—")}</td>
            <td>${escapeHtml(typeof o.type === "string" ? o.type : "—")}</td>
            <td>${escapeHtml(typeof o.description === "string" ? o.description.slice(0, 80) : "—")}</td>
          </tr>`;
        })
        .join("");
      const body = [
        depRows
          ? `<table class="simple-table"><thead><tr><th>Saída</th><th>Tipo</th><th>Destino</th></tr></thead><tbody>${depRows}</tbody></table>`
          : "",
        histRows
          ? `<table class="simple-table" style="margin-top:8px;"><thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th></tr></thead><tbody>${histRows}</tbody></table>`
          : "",
      ].join("");
      return section("Saúde clínica", body, label);
    }
    case "training": {
      const block = asObject(data.training);
      const rows = asArray(block.sessions);
      if (rows.length === 0) return "";
      const table = rows
        .map((r) => {
          const o = asObject(r);
          return `<tr>
            <td>${escapeHtml(formatDateDayMonYear(typeof o.sessionDate === "string" ? o.sessionDate : null) || "—")}</td>
            <td>${escapeHtml(typeof o.category === "string" ? o.category : "—")}</td>
            <td>${o.rating != null ? String(o.rating) : "—"}</td>
            <td>${escapeHtml(typeof o.staffName === "string" ? o.staffName : "—")}</td>
          </tr>`;
        })
        .join("");
      return section(
        "Treinos",
        `<table class="simple-table"><thead><tr><th>Data</th><th>Categoria</th><th>Nota</th><th>Comissão</th></tr></thead><tbody>${table}</tbody></table>`,
        label,
      );
    }
    case "scouting": {
      const block = asObject(data.scouting);
      const prospect = asObject(block.prospect);
      if (Object.keys(prospect).length === 0) return "";
      return section(
        "Captação / Scouting",
        kvGrid([
          { label: "Estágio", value: typeof prospect.stage === "string" ? prospect.stage : "—" },
          { label: "Prioridade", value: typeof prospect.priority === "string" ? prospect.priority : "—" },
          {
            label: "Recomendação",
            value: typeof prospect.recommendation === "string" ? prospect.recommendation : "—",
          },
          {
            label: "Nota geral",
            value: prospect.overallRating != null ? String(prospect.overallRating) : "—",
          },
        ]),
        label,
      );
    }
    case "nutrition":
    case "physiology":
    case "performance": {
      const key =
        sectionId === "performance"
          ? "performanceDetail"
          : sectionId;
      const block = asObject(data[key]);
      if (Object.keys(block).length === 0) return "";
      const summary = JSON.stringify(block, null, 2).slice(0, 1200);
      return section(
        PLAYER_DOSSIER_OPTIONAL_LABELS[sectionId],
        `<pre style="font-size:10px;white-space:pre-wrap;background:#f8fafc;padding:10px;border-radius:8px;border:1px solid #e2e8f0;">${escapeHtml(summary)}</pre>`,
        label,
      );
    }
    default:
      return "";
  }
}

export function buildPlayerDossierPrintHtml(d: PlayerDossierDto): string {
  const included = d.meta.includedOptionalSections;
  const optionalHtml = included.map((id) => renderOptionalSection(id, d)).join("");

  const bodyHtml = [
    renderIdentity(d),
    renderProfile(d),
    renderRegistration(d),
    renderBio(d),
    renderCareer(d),
    renderFmfStats(d),
    renderPerformance(d),
    renderTimeline(d),
    optionalHtml,
  ].join("");

  const generated = formatDateDayMonYear(d.meta.generatedAt.slice(0, 10)) || d.meta.generatedAt;
  const optionalNote =
    included.length > 0
      ? `<p><strong>Seções opcionais incluídas:</strong> ${included.map((id) => escapeHtml(PLAYER_DOSSIER_OPTIONAL_LABELS[id])).join(" · ")}</p>`
      : "";

  return wrapPrintRootDocument({
    title: `Dossiê — ${d.identity.name}`,
    styles: baseStyles(),
    headerHtml: "",
    metaHtml: `
      <div class="kv-grid" style="grid-template-columns:repeat(2,minmax(0,1fr));margin-bottom:12px;">
        <div class="kv-item"><label>Gerado em</label><span>${escapeHtml(generated)}</span></div>
        <div class="kv-item"><label>Temporada de referência</label><span>${d.meta.season}</span></div>
      </div>
      ${optionalNote}
    `,
    bodyHtml,
    footerHtml: `<div class="report-footer">Documento gerado pelo CUP360 · Uso externo autorizado pelo clube · Confidencialidade conforme seções incluídas</div>`,
  });
}

export function printPlayerDossierDocument(html: string): void {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.srcdoc = html;
  document.body.appendChild(iframe);
  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      window.setTimeout(() => iframe.remove(), 1000);
    }
  };
}
