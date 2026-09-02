import { formatDateDayMonYear } from "@/lib/format-date";
import { getCategoryLabel } from "@/lib/fixture-categories";
import { getPositionLabel } from "@/lib/football-positions";
import { reportLogoUrlForPrint, resolveLogoUrlForPrint } from "@/lib/futebol-relatorios-print";
import { PLAYER_DOSSIER_OPTIONAL_LABELS } from "@/lib/player-dossier-access";
import type {
  DossierFmfMatchRow,
  PlayerDossierDto,
  PlayerDossierOptionalSection,
} from "@/lib/player-dossier.types";
import {
  REPORT_PRINT_BREAK_CSS,
  wrapPrintRootDocument,
} from "@/lib/report-print-layout";

const BCG = {
  red: "#C8102E",
  redDark: "#9B0C24",
  blue: "#00205B",
  blueMid: "#003087",
  blueLight: "#E8EEF7",
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

function fmtDate(iso?: string | null): string {
  return formatDateDayMonYear(iso) || "—";
}

function clubDisplayName(d: PlayerDossierDto): string {
  return d.club?.name?.trim() || "Boston City FC";
}

function dossierStyles(): string {
  return `
    ${REPORT_PRINT_BREAK_CSS}
    @page { size: A4; margin: 14mm 12mm 16mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      color: #0f172a;
      background: #fff;
      line-height: 1.45;
      font-size: 11px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .doc-page {
      break-after: page;
      page-break-after: always;
    }
    .doc-page:last-child {
      break-after: auto;
      page-break-after: auto;
    }
    .cover-page {
      min-height: 250mm;
      display: flex;
      flex-direction: column;
      break-after: page;
      page-break-after: always;
    }
    .cover-top {
      background: linear-gradient(135deg, ${BCG.blue} 0%, ${BCG.blueMid} 100%);
      color: #fff;
      padding: 18px 22px 16px;
      border-radius: 0 0 12px 12px;
    }
    .cover-brand {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 14px;
    }
    .cover-logo {
      width: 64px;
      height: 64px;
      object-fit: contain;
      background: #fff;
      border-radius: 10px;
      padding: 6px;
    }
    .cover-club-tag {
      font-size: 9px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      opacity: 0.85;
    }
    .cover-club-name {
      margin: 2px 0 0;
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .cover-doc-type {
      margin: 0;
      font-size: 11px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      opacity: 0.9;
    }
    .cover-body {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 1.15fr;
      gap: 22px;
      padding: 24px 22px 18px;
      align-items: start;
    }
    .cover-photo {
      width: 100%;
      max-width: 280px;
      aspect-ratio: 4/5;
      border-radius: 12px;
      overflow: hidden;
      border: 3px solid ${BCG.blue};
      background: ${BCG.blueLight};
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .cover-photo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center 15%;
    }
    .cover-photo-fallback {
      font-size: 12px;
      font-weight: 700;
      color: ${BCG.blue};
      text-align: center;
      padding: 16px;
    }
    .cover-name {
      margin: 0 0 4px;
      font-size: 32px;
      font-weight: 900;
      letter-spacing: -0.02em;
      text-transform: uppercase;
      color: ${BCG.blue};
      line-height: 1.05;
    }
    .cover-nickname {
      margin: 0 0 12px;
      font-size: 16px;
      font-weight: 600;
      color: #475569;
    }
    .cover-meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px 16px;
      margin-bottom: 16px;
    }
    .cover-meta-item label {
      display: block;
      font-size: 8px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: ${BCG.red};
      margin-bottom: 2px;
    }
    .cover-meta-item span {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
    }
    .cover-bio {
      margin-top: 8px;
      padding: 12px 14px;
      border-left: 4px solid ${BCG.red};
      background: ${BCG.blueLight};
      font-size: 11px;
      color: #334155;
      white-space: pre-wrap;
      line-height: 1.55;
    }
    .section-title {
      margin: 0 0 10px;
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
    }
    .section-title::after {
      content: "";
      flex: 1;
      height: 2px;
      background: linear-gradient(90deg, ${BCG.blue} 0%, transparent 100%);
      opacity: 0.3;
    }
    .section-block { margin-bottom: 20px; break-inside: avoid-page; }
    .optional-tag {
      display: inline-block;
      margin-bottom: 8px;
      padding: 3px 10px;
      border-radius: 999px;
      background: #fef3c7;
      border: 1px solid #fcd34d;
      color: #92400e;
      font-size: 8px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .kv-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px 14px;
      margin-bottom: 4px;
    }
    .kv-item label {
      display: block;
      font-size: 8px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: ${BCG.blueMid};
      margin-bottom: 2px;
    }
    .kv-item span { font-size: 12px; font-weight: 600; color: #0f172a; }
    .stats-band {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 8px;
      margin: 12px 0 16px;
    }
    .stat-box {
      text-align: center;
      padding: 10px 6px;
      border: 1px solid #cbd5e1;
      border-top: 3px solid ${BCG.red};
      background: ${BCG.blueLight};
      border-radius: 6px;
    }
    .stat-box .n { font-size: 20px; font-weight: 800; color: ${BCG.blue}; line-height: 1; }
    .stat-box .l {
      margin-top: 4px;
      font-size: 7px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #64748b;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      margin-top: 8px;
    }
    table.data-table thead { display: table-header-group; }
    table.data-table th {
      background: linear-gradient(180deg, ${BCG.blueMid} 0%, ${BCG.blue} 100%);
      color: #fff;
      font-size: 8px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 8px 6px;
      border: 1px solid ${BCG.blue};
      text-align: left;
    }
    table.data-table td {
      padding: 6px;
      border: 1px solid #dbe3f0;
      vertical-align: top;
    }
    table.data-table tbody tr:nth-child(even) td { background: #f8fafc; }
    .chart-wrap { margin-top: 14px; }
    .chart-title {
      margin: 0 0 8px;
      font-size: 10px;
      font-weight: 700;
      color: #334155;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .bar-row {
      display: grid;
      grid-template-columns: 120px 1fr 48px;
      gap: 8px;
      align-items: center;
      margin-bottom: 6px;
    }
    .bar-label { font-size: 9px; font-weight: 600; color: #475569; }
    .bar-track {
      height: 8px;
      background: #e2e8f0;
      border-radius: 999px;
      overflow: hidden;
    }
    .bar-fill {
      height: 100%;
      background: linear-gradient(90deg, ${BCG.blueMid} 0%, ${BCG.blue} 100%);
      border-radius: 999px;
    }
    .bar-val { font-size: 9px; font-weight: 700; text-align: right; }
    .timeline { display: flex; flex-direction: column; gap: 6px; }
    .tl-row {
      display: grid;
      grid-template-columns: 82px 100px 1fr;
      gap: 8px;
      padding: 7px 10px;
      border: 1px solid #e2e8f0;
      border-left: 3px solid ${BCG.red};
      background: #fafbfc;
    }
    .tl-date { font-size: 9px; font-weight: 700; color: ${BCG.blue}; }
    .tl-cat { font-size: 8px; font-weight: 700; text-transform: uppercase; color: #64748b; }
    .tl-title { font-size: 10px; font-weight: 600; color: #0f172a; }
    .tl-detail { font-size: 9px; color: #64748b; margin-top: 2px; }
    .prose { font-size: 11px; color: #334155; white-space: pre-wrap; line-height: 1.55; }
    .report-hdr {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid ${BCG.blueLight};
    }
    .report-hdr img { height: 36px; object-fit: contain; }
    .report-hdr-title {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: ${BCG.blue};
      text-align: right;
    }
    .report-hdr-sub { font-size: 9px; color: #64748b; text-align: right; }
    .report-ftr {
      margin-top: 16px;
      padding-top: 8px;
      border-top: 2px solid ${BCG.blueLight};
      display: flex;
      justify-content: space-between;
      font-size: 8px;
      color: #64748b;
    }
    .report-ftr strong { color: ${BCG.blue}; }
    @media print {
      .section-block { break-inside: avoid-page; }
      thead { display: table-header-group; }
    }
  `;
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

function dataTable(headers: string[], rows: string[][]): string {
  if (rows.length === 0) return "";
  return `<table class="data-table"><thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${rows
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

function sectionBlock(title: string, body: string, optionalLabel?: string): string {
  if (!body.trim()) return "";
  const tag = optionalLabel
    ? `<div class="optional-tag">Seção opcional · ${escapeHtml(optionalLabel)}</div>`
    : "";
  return `<div class="section-block">${tag}<h2 class="section-title">${escapeHtml(title)}</h2>${body}</div>`;
}

function matchRole(row: DossierFmfMatchRow): string {
  if (!row.listed && !row.played) return "—";
  if (row.starter) return "Titular";
  if (row.played && row.enteredMinute != null) return `Reserva (${row.enteredMinute}′)`;
  if (row.played) return "Reserva";
  return "Relacionado";
}

function renderCover(d: PlayerDossierDto): string {
  const c = d.cover;
  const logo = d.club?.logoUrl
    ? resolveLogoUrlForPrint(reportLogoUrlForPrint(d.club.logoUrl, false))
    : resolveLogoUrlForPrint("/bcg-logo.png");
  const photo = c.photoUrl ? resolveLogoUrlForPrint(c.photoUrl) : "";

  return `
    <div class="cover-page">
      <div class="cover-top">
        <div class="cover-brand">
          ${logo ? `<img class="cover-logo" src="${escapeHtml(logo)}" alt="" />` : ""}
          <div>
            <div class="cover-club-tag">Departamento de Futebol · Apresentação externa</div>
            <h1 class="cover-club-name">${escapeHtml(clubDisplayName(d))}</h1>
          </div>
        </div>
        <p class="cover-doc-type">Dossiê do Atleta · Documento confidencial</p>
      </div>
      <div class="cover-body">
        <div class="cover-photo">
          ${
            photo
              ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(c.name)}" />`
              : `<div class="cover-photo-fallback">Sem foto cadastrada</div>`
          }
        </div>
        <div>
          <h2 class="cover-name">${escapeHtml(c.name)}</h2>
          ${c.nickname?.trim() ? `<p class="cover-nickname">${escapeHtml(c.nickname)}</p>` : ""}
          <div class="cover-meta-grid">
            ${[
              ["Categoria", c.category ? getCategoryLabel(c.category, "pt") : "—"],
              ["Posição", c.position ? getPositionLabel(c.position) : "—"],
              ["Camisa", c.jerseyNumber != null ? String(c.jerseyNumber) : "—"],
              ["Idade", c.age != null ? `${c.age} anos` : fmtDate(d.profile.birthDate)],
              ["Nacionalidade", c.nationality?.trim() || "—"],
              ["Pé dominante", footLabel(c.preferredFoot)],
              ["Altura", c.height ? `${c.height} cm` : "—"],
              ["Peso", c.weight ? `${c.weight} kg` : "—"],
              ["Situação esportiva", c.situation?.trim() || "—"],
            ]
              .map(
                ([label, value]) =>
                  `<div class="cover-meta-item"><label>${escapeHtml(label)}</label><span>${escapeHtml(value)}</span></div>`,
              )
              .join("")}
          </div>
          ${c.bioPT?.trim() ? `<div class="cover-bio">${escapeHtml(c.bioPT.trim())}</div>` : ""}
        </div>
      </div>
    </div>
  `;
}

function renderProfile(d: PlayerDossierDto): string {
  const p = d.profile;
  return sectionBlock(
    "Perfil do atleta",
    kvGrid([
      { label: "Data de nascimento", value: fmtDate(p.birthDate) },
      { label: "Registro CBF", value: p.cbfRegistration?.trim() || "—" },
      { label: "Federação local", value: p.localFedRegistration?.trim() || "—" },
      { label: "COMET", value: p.comet?.trim() || "—" },
      { label: "Nome na camisa", value: p.jerseyName?.trim() || "—" },
      { label: "Clube atual", value: p.currentTeam?.trim() || "—" },
      { label: "IMC", value: p.bmi != null ? String(p.bmi) : "—" },
      { label: "% Gordura", value: p.bodyFatPercent != null ? `${p.bodyFatPercent}%` : "—" },
      { label: "Valor de mercado", value: p.marketValue != null ? `€ ${p.marketValue}` : "—" },
    ]),
  );
}

function renderCareer(d: PlayerDossierDto): string {
  const parts: string[] = [];
  if (d.career.previousTeams.length > 0) {
    parts.push(
      `<p><strong>Clubes anteriores:</strong> ${escapeHtml(d.career.previousTeams.join(" · "))}</p>`,
    );
  }
  const histRows = asArray(d.career.seasonHistory)
    .map((row) => {
      const o = asObject(row);
      return [
        escapeHtml(typeof o.season === "string" ? o.season : typeof o.year === "string" ? o.year : "—"),
        escapeHtml(typeof o.club === "string" ? o.club : typeof o.team === "string" ? o.team : "—"),
        escapeHtml(typeof o.category === "string" ? getCategoryLabel(o.category, "pt") : "—"),
      ];
    })
    .filter((r) => r.some((c) => c !== "—"));
  if (histRows.length > 0) {
    parts.push(dataTable(["Temporada", "Clube", "Categoria"], histRows));
  }
  const movRows = d.career.movements.map((m) => [
    escapeHtml(fmtDate(m.date) !== "—" ? m.date : m.date || "—"),
    escapeHtml(m.label),
    escapeHtml(m.detail ?? "—"),
  ]);
  if (movRows.length > 0) {
    parts.push(dataTable(["Data", "Evento", "Detalhe"], movRows));
  }
  return sectionBlock("Trajetória e histórico esportivo", parts.join(""));
}

function renderMatchHistory(d: PlayerDossierDto): string {
  const mh = d.matchHistory;
  if (!mh.totals && mh.matches.length === 0) return "";

  const totals = mh.totals
    ? `<div class="stats-band">
        <div class="stat-box"><div class="n">${mh.totals.matchesPlayed}</div><div class="l">Jogos</div></div>
        <div class="stat-box"><div class="n">${mh.totals.starts}</div><div class="l">Titularidades</div></div>
        <div class="stat-box"><div class="n">${mh.totals.minutesPlayed}</div><div class="l">Minutos</div></div>
        <div class="stat-box"><div class="n">${mh.totals.goals}</div><div class="l">Gols</div></div>
        <div class="stat-box"><div class="n">${mh.totals.yellowCards}</div><div class="l">Amarelos</div></div>
        <div class="stat-box"><div class="n">${mh.totals.redCards}</div><div class="l">Vermelhos</div></div>
      </div>`
    : "";

  const matchRows = mh.matches
    .filter((r) => r.played || r.listed)
    .slice(0, 50)
    .map((r) => {
      const m = r.match;
      const score = `${m.homeScore ?? "–"}×${m.awayScore ?? "–"}`;
      const cards =
        [r.yellowCards > 0 ? `${r.yellowCards}A` : "", r.redCards > 0 ? `${r.redCards}V` : ""]
          .filter(Boolean)
          .join(" ") || "—";
      return [
        escapeHtml(`${m.season}`),
        escapeHtml(m.competition),
        escapeHtml(fmtDate(m.matchDate)),
        escapeHtml(`${m.homeTeam} ${score} ${m.awayTeam}`),
        escapeHtml(matchRole(r)),
        escapeHtml(r.played ? String(r.minutesPlayed) : "0"),
        escapeHtml(r.goals > 0 ? String(r.goals) : "—"),
        escapeHtml(cards),
      ];
    });

  const charts = [
    barChart(
      "Minutos por mês (partidas oficiais FMF)",
      d.charts.monthlyMinutes.map((x) => ({ label: x.label, value: x.minutes, suffix: " min" })),
    ),
    barChart(
      "Minutos por temporada/competição",
      d.charts.seasonMinutes.map((x) => ({
        label: x.label,
        value: x.minutesPlayed,
        suffix: " min",
      })),
    ),
  ].join("");

  return sectionBlock(
    "Histórico oficial de partidas (FMF)",
    `${totals}${dataTable(["Temp.", "Competição", "Data", "Confronto", "Função", "Min", "Gols", "Cartões"], matchRows)}${charts}`,
  );
}

function renderPerformance(d: PlayerDossierDto): string {
  const perf = d.performance;
  const parts: string[] = [];

  if (perf.coachSummary.count > 0) {
    parts.push(
      `<p><strong>Avaliações da comissão técnica:</strong> ${perf.coachSummary.count} período(s) concluído(s)${perf.coachSummary.averagePercentage != null ? ` · média ${perf.coachSummary.averagePercentage}%` : ""}.</p>`,
    );
    const coachRows = perf.coachEvaluations.map((r) => [
      escapeHtml(String(r.season)),
      escapeHtml(r.periodKey),
      escapeHtml(r.percentage != null ? `${r.percentage}%` : "—"),
      escapeHtml(r.classification ?? "—"),
      escapeHtml(String(r.matchMinutes)),
      escapeHtml(String(r.goals)),
      escapeHtml(fmtDate(r.submittedAt)),
    ]);
    parts.push(
      dataTable(
        ["Temp.", "Período", "%", "Classif.", "Min. jogos", "Gols", "Enviado"],
        coachRows,
      ),
    );
  }

  if (perf.performanceAnalysis?.trim()) {
    parts.push(`<div class="prose">${escapeHtml(perf.performanceAnalysis.trim())}</div>`);
  }

  const evalRows = asArray(perf.diretoriaEvaluations)
    .slice(0, 10)
    .map((ev) => {
      const o = asObject(ev);
      return [
        escapeHtml(fmtDate(typeof o.date === "string" ? o.date : null)),
        escapeHtml(typeof o.evaluator === "string" ? o.evaluator : "—"),
        escapeHtml(o.rating != null ? String(o.rating) : "—"),
        escapeHtml(typeof o.notes === "string" ? o.notes.slice(0, 100) : "—"),
      ];
    });
  if (evalRows.length > 0) {
    parts.push(dataTable(["Data", "Avaliador", "Nota", "Observações"], evalRows));
  }

  const trend = barChart(
    "Evolução das avaliações técnicas (%)",
    d.charts.evaluationTrend.map((x) => ({ label: x.label, value: x.value, suffix: "%" })),
  );
  if (trend) parts.push(trend);

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
  return sectionBlock("Linha do tempo esportiva", `<div class="timeline">${rows}</div>`);
}

function renderOptionalSections(d: PlayerDossierDto): string {
  return d.meta.includedOptionalSections
    .map((id) => renderOptionalSection(id, d))
    .filter(Boolean)
    .join("");
}

function renderOptionalSection(sectionId: PlayerDossierOptionalSection, d: PlayerDossierDto): string {
  const label = PLAYER_DOSSIER_OPTIONAL_LABELS[sectionId];
  const data = d.optional;

  switch (sectionId) {
    case "physio": {
      const block = asObject(data.physio);
      const sessions = asArray(block.sessions);
      const evaluations = asArray(block.evaluations);
      if (sessions.length === 0 && evaluations.length === 0) return "";
      const sessionRows = sessions.map((s) => {
        const o = asObject(s);
        const region = asObject(o.region);
        return [
          escapeHtml(fmtDate(isoFromUnknown(o.startedAt))),
          escapeHtml(typeof region.namePt === "string" ? region.namePt : "—"),
          escapeHtml(typeof o.diagnosisLabel === "string" ? o.diagnosisLabel : "—"),
          escapeHtml(typeof o.symptoms === "string" ? o.symptoms.slice(0, 60) : "—"),
          escapeHtml(typeof o.status === "string" ? o.status : "—"),
          escapeHtml(typeof o.disposition === "string" ? o.disposition : "—"),
        ];
      });
      const evalRows = evaluations.map((e) => {
        const o = asObject(e);
        return [
          escapeHtml(fmtDate(isoFromUnknown(o.evaluatedAt))),
          escapeHtml(typeof o.context === "string" ? o.context : "—"),
          escapeHtml(o.rating != null ? String(o.rating) : "—"),
          escapeHtml(typeof o.outcome === "string" ? o.outcome : "—"),
          escapeHtml(typeof o.finalObservations === "string" ? o.finalObservations.slice(0, 80) : "—"),
        ];
      });
      const body = [
        sessionRows.length
          ? `<p><strong>Episódios / atendimentos</strong></p>${dataTable(["Início", "Região", "Diagnóstico", "Queixa", "Status", "Desfecho"], sessionRows)}`
          : "",
        evalRows.length
          ? `<p style="margin-top:12px"><strong>Avaliações periódicas</strong></p>${dataTable(["Data", "Contexto", "Nota", "Resultado", "Observações"], evalRows)}`
          : "",
      ].join("");
      return sectionBlock("Histórico — Fisioterapia", body, label);
    }
    case "psychology": {
      const block = asObject(data.psychology);
      const assessments = asArray(block.assessments);
      const consultations = asArray(block.consultations);
      if (assessments.length === 0 && consultations.length === 0) return "";
      const aRows = assessments.map((a) => {
        const o = asObject(a);
        return [
          escapeHtml(fmtDate(typeof o.date === "string" ? o.date : null)),
          escapeHtml(typeof o.evaluator === "string" ? o.evaluator : "Avaliação"),
          escapeHtml(typeof o.kind === "string" ? o.kind : "—"),
        ];
      });
      const cRows = consultations.map((c) => {
        const o = asObject(c);
        return [
          escapeHtml(fmtDate(typeof o.date === "string" ? o.date : null)),
          escapeHtml(typeof o.type === "string" ? o.type : "Consulta"),
          escapeHtml(typeof o.status === "string" ? o.status : "—"),
        ];
      });
      const body = [
        aRows.length ? dataTable(["Data", "Profissional", "Tipo"], aRows) : "",
        cRows.length ? dataTable(["Data", "Modalidade", "Status"], cRows) : "",
      ].join("");
      return sectionBlock("Histórico — Psicologia", body, label);
    }
    case "nursing": {
      const sessions = asArray(asObject(data.nursing).sessions);
      if (sessions.length === 0) return "";
      const rows = sessions.map((s) => {
        const o = asObject(s);
        return [
          escapeHtml(fmtDate(isoFromUnknown(o.attendedAt))),
          escapeHtml(typeof o.symptoms === "string" ? o.symptoms.slice(0, 70) : "—"),
          escapeHtml(typeof o.treatmentNotes === "string" ? o.treatmentNotes.slice(0, 70) : "—"),
          escapeHtml(typeof o.status === "string" ? o.status : "—"),
        ];
      });
      return sectionBlock(
        "Histórico — Enfermaria",
        dataTable(["Data", "Queixa", "Conduta", "Status"], rows),
        label,
      );
    }
    case "medical": {
      const block = asObject(data.medical);
      const departures = asArray(block.departures);
      const history = asArray(block.clinicalHistory);
      if (departures.length === 0 && history.length === 0) return "";
      const depRows = departures.map((d) => {
        const o = asObject(d);
        return [
          escapeHtml(fmtDate(isoFromUnknown(o.departedAt))),
          escapeHtml(typeof o.careType === "string" ? o.careType : "—"),
          escapeHtml(typeof o.destination === "string" ? o.destination.slice(0, 50) : "—"),
          escapeHtml(typeof o.reason === "string" ? o.reason.slice(0, 60) : "—"),
          escapeHtml(fmtDate(isoFromUnknown(o.returnedAt))),
          escapeHtml(typeof o.status === "string" ? o.status : "—"),
        ];
      });
      const histRows = history.map((h) => {
        const o = asObject(h);
        return [
          escapeHtml(fmtDate(typeof o.date === "string" ? o.date : null)),
          escapeHtml(typeof o.type === "string" ? o.type : "—"),
          escapeHtml(typeof o.description === "string" ? o.description.slice(0, 80) : "—"),
        ];
      });
      const body = [
        depRows.length
          ? dataTable(["Saída", "Tipo", "Destino", "Motivo", "Retorno", "Status"], depRows)
          : "",
        histRows.length ? dataTable(["Data", "Tipo", "Registro"], histRows) : "",
      ].join("");
      return sectionBlock("Histórico — Saúde clínica", body, label);
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
          escapeHtml(typeof o.agendaTitle === "string" ? o.agendaTitle.slice(0, 50) : "—"),
        ];
      });
      return sectionBlock(
        "Histórico — Treinos",
        dataTable(["Data", "Categoria", "Nota", "Comissão", "Atividade"], rows),
        label,
      );
    }
    case "scouting": {
      const prospects = asArray(asObject(data.scouting).prospects);
      if (prospects.length === 0) return "";
      const rows = prospects.map((p) => {
        const o = asObject(p);
        return [
          escapeHtml(typeof o.stage === "string" ? o.stage : "—"),
          escapeHtml(typeof o.priority === "string" ? o.priority : "—"),
          escapeHtml(typeof o.recommendation === "string" ? o.recommendation : "—"),
          escapeHtml(o.overallRating != null ? String(o.overallRating) : "—"),
        ];
      });
      return sectionBlock(
        "Histórico — Captação",
        dataTable(["Estágio", "Prioridade", "Recomendação", "Nota"], rows),
        label,
      );
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
          escapeHtml(typeof o.objective === "string" ? o.objective.slice(0, 60) : "—"),
        ];
      });
      const eRows = assessments.slice(0, 12).map((a) => {
        const o = asObject(a);
        return [
          escapeHtml(fmtDate(isoFromUnknown(o.assessedAt))),
          escapeHtml(o.weight != null ? `${o.weight} kg` : "—"),
          escapeHtml(o.bodyFatPercent != null ? `${o.bodyFatPercent}%` : "—"),
        ];
      });
      const body = [
        aRows.length ? dataTable(["Data", "Anamnese"], aRows) : "",
        eRows.length ? dataTable(["Data", "Peso", "% Gordura"], eRows) : "",
      ].join("");
      return sectionBlock("Histórico — Nutrição", body, label);
    }
    case "physiology": {
      const block = asObject(data.physiology);
      const assessments = asArray(block.assessments);
      if (assessments.length === 0) return "";
      const rows = assessments.map((a) => {
        const o = asObject(a);
        return [
          escapeHtml(fmtDate(isoFromUnknown(o.assessedAt))),
          escapeHtml(o.weight != null ? String(o.weight) : "—"),
          escapeHtml(o.bodyFatPercent != null ? `${o.bodyFatPercent}%` : "—"),
          escapeHtml(o.vo2max != null ? String(o.vo2max) : "—"),
        ];
      });
      return sectionBlock(
        "Histórico — Fisiologia",
        dataTable(["Data", "Peso", "% Gordura", "VO₂ máx"], rows),
        label,
      );
    }
    case "performance": {
      const block = asObject(data.performanceDetail);
      if (!block.performanceAnalysis && Object.keys(asObject(block.analysisMetrics)).length === 0) {
        return "";
      }
      const metrics = asObject(block.analysisMetrics);
      const mRows = Object.entries(metrics)
        .filter(([, v]) => v != null)
        .slice(0, 12)
        .map(([k, v]) => [escapeHtml(k), escapeHtml(String(v))]);
      const body = [
        typeof block.performanceAnalysis === "string" && block.performanceAnalysis.trim()
          ? `<div class="prose">${escapeHtml(block.performanceAnalysis.trim())}</div>`
          : "",
        mRows.length ? dataTable(["Indicador", "Valor"], mRows) : "",
      ].join("");
      return sectionBlock("Histórico — Desempenho analítico", body, label);
    }
    default:
      return "";
  }
}

function isoFromUnknown(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return null;
}

function reportHeader(d: PlayerDossierDto): string {
  const logo = d.club?.logoUrl
    ? resolveLogoUrlForPrint(reportLogoUrlForPrint(d.club.logoUrl, false))
    : resolveLogoUrlForPrint("/bcg-logo.png");
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

export function buildPlayerDossierPrintHtml(d: PlayerDossierDto): string {
  const bodyHtml = [
    renderCover(d),
    `<div class="doc-page">`,
    renderProfile(d),
    renderCareer(d),
    `</div>`,
    `<div class="doc-page">`,
    renderMatchHistory(d),
    `</div>`,
    `<div class="doc-page">`,
    renderPerformance(d),
    renderTimeline(d),
    renderOptionalSections(d),
    `</div>`,
  ].join("");

  return wrapPrintRootDocument({
    title: `Dossiê — ${d.cover.name}`,
    styles: dossierStyles(),
    headerHtml: reportHeader(d),
    metaHtml: "",
    bodyHtml,
    footerHtml: reportFooter(d),
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
