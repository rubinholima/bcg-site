import {
  printHtmlDocument,
  resolveLogoUrlForPrint,
} from "@/lib/futebol-relatorios-print";
import { getFormation, pitchChipTranslateY } from "@/lib/press-kit-formations";
import { cadastroPositionAbbrev } from "@/lib/press-kit-lineup";
import { getStaffRoleLabel } from "@/lib/staff-roles";
import type {
  GuiaAgendaDay,
  GuiaCampaignLine,
  GuiaLineup,
  GuiaLineupPlayer,
  GuiaMatchLine,
  GuiaPartidaReportDto,
  GuiaRankingRow,
  GuiaSquadPlayer,
  GuiaStandingRow,
  PrintPageSize,
  RelatorioPessoaRow,
} from "@/lib/futebol-relatorios.types";

/** Identidade visual do guia — vermelho e azul Boston City Group. */
const C = {
  red: "#C8102E",
  redDark: "#8E0A20",
  navy: "#00205B",
  navyDeep: "#001338",
  navyMid: "#003087",
  ink: "#0B1220",
  line: "#D7DEEA",
  soft: "#F2F5FA",
  softer: "#F8FAFD",
  muted: "#5B6B85",
  gold: "#F2B705",
} as const;

const POSITION_GROUP_LABEL: Record<string, string> = {
  GOL: "Goleiros",
  DEF: "Defensores",
  MEI: "Meio-campo",
  ATA: "Ataque",
};

function esc(text: string | number | null | undefined): string {
  if (text == null) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

function crest(name: string, logoUrl: string | null | undefined, className: string): string {
  const src = resolveLogoUrlForPrint(logoUrl);
  if (src) return `<img class="${className}" src="${esc(src)}" alt="" />`;
  return `<div class="${className} crest-fallback">${esc(initials(name))}</div>`;
}

function photo(url: string | null | undefined, name: string, className: string): string {
  const src = resolveLogoUrlForPrint(url);
  if (src) return `<img class="${className}" src="${esc(src)}" alt="" />`;
  return `<div class="${className} photo-fallback">${esc(initials(name))}</div>`;
}

function formatBirth(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
}

function sheet(inner: string, extraClass = ""): string {
  return `<section class="sheet ${extraClass}">${inner}</section>`;
}

function sectionTitle(title: string, subtitle?: string | null): string {
  return `<header class="sec-head">
    <h2>${esc(title)}</h2>
    ${subtitle ? `<p>${esc(subtitle)}</p>` : ""}
  </header>`;
}

function campaignTable(lines: GuiaCampaignLine[]): string {
  if (lines.length === 0) {
    return `<p class="empty">Sem partidas registradas na temporada.</p>`;
  }
  const rows = lines
    .map(
      (line) => `<tr>
      <th scope="row">${esc(line.label)}</th>
      <td>${line.matches}</td>
      <td class="pos">${line.wins}</td>
      <td>${line.draws}</td>
      <td class="neg">${line.losses}</td>
      <td>${line.goalsFor}</td>
      <td>${line.goalsAgainst}</td>
      <td>${line.goalDiff > 0 ? "+" : ""}${line.goalDiff}</td>
      <td class="hi">${line.winRate}%</td>
    </tr>`,
    )
    .join("");
  return `<table class="grid">
    <thead>
      <tr>
        <th class="left">Recorte</th>
        <th>J</th><th>V</th><th>E</th><th>D</th><th>GP</th><th>GC</th><th>SG</th><th>APR.</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function resultBadge(line: GuiaMatchLine): string {
  if (!line.result) return `<span class="res res-n">—</span>`;
  const cls = line.result === "V" ? "res-v" : line.result === "E" ? "res-e" : "res-d";
  return `<span class="res ${cls}">${line.result}</span>`;
}

function matchRows(lines: GuiaMatchLine[]): string {
  if (lines.length === 0) return `<p class="empty">Sem partidas registradas.</p>`;
  return `<ul class="match-list">
    ${lines
      .map(
        (line) => `<li>
      ${resultBadge(line)}
      <div class="match-main">
        <strong>${esc(line.homeTeam)} <span class="score">${esc(line.scoreLabel)}</span> ${esc(line.awayTeam)}</strong>
        <span>${esc([line.dateLabel, line.competition, line.phase].filter(Boolean).join(" · "))}</span>
      </div>
    </li>`,
      )
      .join("")}
  </ul>`;
}

function rankingBlock(title: string, rows: GuiaRankingRow[], suffix = ""): string {
  const body =
    rows.length === 0
      ? `<p class="empty">Sem dados na temporada.</p>`
      : `<ol class="rank">
      ${rows
        .map(
          (row) => `<li>
        <span class="rank-name">${row.jerseyNumber != null ? `<b>${row.jerseyNumber}</b>` : ""}${esc(firstLastName(row.name) || row.shortName)}</span>
        ${row.detail ? `<span class="rank-detail">${esc(row.detail)}</span>` : ""}
        <span class="rank-value">${row.value}${suffix}</span>
      </li>`,
        )
        .join("")}
    </ol>`;
  return `<div class="panel"><h3>${esc(title)}</h3>${body}</div>`;
}

function playerCard(player: GuiaSquadPlayer): string {
  const bio = [
    player.age != null ? `${player.age} anos` : null,
    player.height ? `${(player.height / 100).toFixed(2).replace(".", ",")} m` : null,
    player.weight ? `${player.weight} kg` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const lines = [player.season, ...player.byCompetition];
  const statRows = lines
    .map(
      (line, index) => `<tr class="${index === 0 ? "total" : ""}">
      <th scope="row">${esc(index === 0 ? "Geral" : line.label)}</th>
      <td>${line.matches}</td>
      <td>${line.goals}</td>
      <td>${line.minutes}</td>
    </tr>`,
    )
    .join("");

  const nick = athletePrintName(player);
  const cardClass =
    (player.status ?? "").toLowerCase() === "suspended" ? "pcard suspended" : "pcard";
  return `<article class="${cardClass}">
    <div class="pcard-photo">
      ${photo(player.photoUrl, player.name, "pcard-img")}
      <span class="pcard-pos">${esc(player.positionLabel)}</span>
    </div>
    <div class="pcard-body">
      <div class="pcard-head">
        <span class="pcard-num">${player.jerseyNumber != null ? player.jerseyNumber : "—"}</span>
        <div>
          <strong>${esc(nick)}</strong>
          <span>${esc(bio || formatBirth(player.birthDate) || "—")}</span>
        </div>
      </div>
      <table class="pstats">
        <thead><tr><th class="left">Temporada</th><th>J</th><th>G</th><th>MIN</th></tr></thead>
        <tbody>${statRows}</tbody>
      </table>
      <p class="pcard-foot">Carreira no clube: ${player.career.matches} J · ${player.career.goals} G · ${player.career.minutes} min</p>
    </div>
  </article>`;
}

function firstLastName(full: string | null | undefined): string {
  const cleaned = (full ?? "")
    .replace(/\u2026/g, "")
    .replace(/\.{2,}/g, "")
    .trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0]!.toLocaleUpperCase("pt-BR");
  return `${parts[0]} ${parts[parts.length - 1]}`.toLocaleUpperCase("pt-BR");
}

function athletePrintName(player: {
  nickname?: string | null;
  shortName?: string;
  name: string;
}): string {
  // Sempre primeiro + último (sem reticências / sem apelido longo truncado)
  return firstLastName(player.name) || firstLastName(player.shortName) || firstLastName(player.nickname);
}

function staffPrintName(full: string): string {
  return firstLastName(full);
}

function surname(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts[parts.length - 1] ?? name;
}

function pitchHtml(starters: GuiaLineupPlayer[]): string {
  const order = ["GOL", "DEF", "MEI", "ATA"] as const;
  const rowsTop: Record<(typeof order)[number], number> = {
    GOL: 86,
    DEF: 64,
    MEI: 42,
    ATA: 18,
  };
  const chips = order
    .flatMap((group) => {
      const list = starters.filter((p) => p.positionGroup === group);
      if (list.length === 0) return [];
      const width = Math.floor(94 / list.length);
      return list.map((player, index) => {
        const left = ((index + 0.5) / list.length) * 100;
        return `<div class="chip" style="top:${rowsTop[group]}%;left:${left}%;width:${width}%">
          <span class="chip-num">${player.jerseyNumber != null ? player.jerseyNumber : "—"}</span>
          <span class="chip-name">${esc(firstLastName(player.name) || surname(player.name))}</span>
        </div>`;
      });
    })
    .join("");

  return `<div class="pitch">
    <div class="pl pl-mid"></div>
    <div class="pl pl-circle"></div>
    <div class="pl pl-box-top"></div>
    <div class="pl pl-box-bottom"></div>
    ${chips}
  </div>`;
}

function lineupColumn(lineup: GuiaLineup): string {
  const rows = [
    ...lineup.starters.map((p) => ({ p, sub: false })),
    ...lineup.bench.map((p) => ({ p, sub: true })),
  ]
    .map(
      ({ p, sub }) => `<tr class="${sub ? "sub" : ""}">
      <td class="num">${p.jerseyNumber != null ? p.jerseyNumber : "—"}</td>
      <td class="left">${esc(firstLastName(p.name) || p.shortName)}${sub ? ` <span class="tag">${p.enteredMinute != null ? `${p.enteredMinute}'` : "sub"}</span>` : ""}</td>
      <td>${p.minutes}</td>
      <td>${p.goals || ""}</td>
    </tr>`,
    )
    .join("");

  return `<div class="lineup">
    <div class="lineup-head">
      <strong>${esc(lineup.match.isHome ? lineup.match.awayTeam : lineup.match.homeTeam)}</strong>
      <span>${esc(lineup.match.scoreLabel)} · ${esc(lineup.match.dateLabel)}</span>
    </div>
    ${pitchHtml(lineup.starters)}
    <table class="grid tight">
      <thead><tr><th>#</th><th class="left">Atleta</th><th>MIN</th><th>G</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function agendaTable(days: GuiaAgendaDay[]): string {
  const withItems = days.filter((day) => day.items.length > 0 || day.isMatchDay);
  if (withItems.length === 0) return `<p class="empty">Sem compromissos registrados na semana.</p>`;
  return `<div class="agenda-wrap">
    ${withItems
      .map((day) => {
        const rows =
          day.items.length === 0
            ? `<tr><td class="left muted" colspan="3">Sem atividades lançadas</td></tr>`
            : day.items
                .map(
                  (item) => `<tr>
            <td class="left">${esc(item.time || "—")}</td>
            <td class="left">${esc(item.title)}<span class="muted"> · ${esc(item.typeLabel)}</span></td>
            <td class="left">${esc(item.location ?? "—")}</td>
          </tr>`,
                )
                .join("");
        return `<div class="agenda-day${day.isMatchDay ? " is-match" : ""}">
          <div class="agenda-day-head">${esc(day.weekdayLabel)} · ${esc(day.dateLabel)}${day.isMatchDay ? " · Dia de jogo" : ""}</div>
          <table class="grid agenda">
            <thead><tr><th class="left">Horário</th><th class="left">Atividade</th><th class="left">Local</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
      })
      .join("")}
  </div>`;
}

function standingsTable(rows: GuiaStandingRow[]): string {
  if (rows.length === 0) return "";
  return `<table class="grid standings">
    <thead>
      <tr>
        <th>#</th><th class="left">Equipe</th><th>P</th><th>J</th><th>V</th><th>E</th><th>D</th><th>GP</th><th>GC</th><th>SG</th><th>%</th>
      </tr>
    </thead>
    <tbody>
      ${rows
        .map(
          (row) => `<tr class="${row.isClub ? "club" : ""}">
        <td>${row.position}</td>
        <td class="left">${esc(row.team)}</td>
        <td class="hi">${row.points}</td>
        <td>${row.matches}</td>
        <td>${row.wins}</td>
        <td>${row.draws}</td>
        <td>${row.losses}</td>
        <td>${row.goalsFor}</td>
        <td>${row.goalsAgainst}</td>
        <td>${row.goalDiff > 0 ? "+" : ""}${row.goalDiff}</td>
        <td>${row.winRate}</td>
      </tr>`,
        )
        .join("")}
    </tbody>
  </table>`;
}

function styles(size: PrintPageSize): string {
  const pageSize = size === "Letter" ? "letter" : "A4";
  return `
    @page { size: ${pageSize} portrait; margin: 16mm 14mm 18mm; }
    @page cover { size: ${pageSize} portrait; margin: 0; }
    @page content { size: ${pageSize} portrait; margin: 16mm 14mm 18mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; }
    body {
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      color: ${C.ink};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet {
      position: relative;
      page: content;
      width: 100%;
      padding: 2mm 1mm 10mm;
      margin: 0 auto;
      background: #fff;
      page-break-after: always;
      break-after: page;
      overflow: visible;
      box-sizing: border-box;
    }
    .sheet.cover-sheet {
      page: cover;
      width: 210mm;
      height: 297mm;
      max-height: 297mm;
      min-height: 297mm;
      overflow: hidden;
      padding: 0;
    }
    .sheet:last-of-type { page-break-after: auto; break-after: auto; }

    /* ---------- Capa ---------- */
    .cover {
      padding: 0;
      color: #fff;
      background:
        radial-gradient(120% 80% at 15% 0%, ${C.navyMid} 0%, ${C.navyDeep} 55%, #000818 100%);
    }
    .cover-inner { position: relative; height: 296mm; padding: 20mm 16mm 16mm; display: flex; flex-direction: column; }
    .cover-stripe { position: absolute; top: 0; left: 0; right: 0; height: 10mm; background: linear-gradient(90deg, ${C.red} 0%, ${C.red} 50%, ${C.navyMid} 50%, ${C.navyMid} 100%); }
    .cover-glow { position: absolute; right: -40mm; top: 60mm; width: 150mm; height: 150mm; border-radius: 50%; background: radial-gradient(circle, rgba(200,16,46,0.35) 0%, rgba(200,16,46,0) 70%); }
    .cover-kicker { font-size: 11pt; letter-spacing: .38em; text-transform: uppercase; color: ${C.gold}; font-weight: 700; }
    .cover-title { margin: 6mm 0 0; font-size: 46pt; line-height: .92; font-weight: 900; letter-spacing: -.02em; text-transform: uppercase; }
    .cover-title span { display: block; color: ${C.gold}; }
    .cover-sub { margin-top: 4mm; font-size: 12pt; color: #C9D6EC; letter-spacing: .06em; text-transform: uppercase; }
    .cover-watermark { position: absolute; left: 50%; top: 40%; transform: translate(-50%, -50%); opacity: .07; }
    .cover-watermark-crest { width: 130mm; height: 130mm; object-fit: contain; }
    .cover-watermark .crest-fallback { width: 130mm; height: 130mm; font-size: 60pt; }
    .cover-match { position: relative; margin-top: 22mm; display: flex; align-items: center; justify-content: center; gap: 10mm; padding: 10mm 6mm; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.16); border-radius: 6mm; }
    .cover-facts { position: relative; margin-top: auto; display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; }
    .cover-facts div { padding: 4mm; text-align: center; background: rgba(255,255,255,0.05); border-top: 2px solid ${C.gold}; border-radius: 0 0 2mm 2mm; }
    .cover-facts span { display: block; font-size: 6.8pt; letter-spacing: .16em; text-transform: uppercase; color: #9FB3D4; }
    .cover-facts strong { display: block; margin: 1.5mm 0; font-size: 20pt; font-weight: 900; color: #fff; line-height: 1; }
    .cover-facts em { font-style: normal; font-size: 7.5pt; color: #C9D6EC; }
    .cover-team { flex: 1; text-align: center; }
    .cover-crest { width: 34mm; height: 34mm; object-fit: contain; display: block; margin: 0 auto 4mm; }
    .crest-fallback { display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.12); border-radius: 50%; font-weight: 800; font-size: 16pt; color: #fff; }
    .cover-team strong { display: block; font-size: 15pt; line-height: 1.15; text-transform: uppercase; }
    .cover-team span { font-size: 8.5pt; letter-spacing: .22em; text-transform: uppercase; color: #9FB3D4; }
    .cover-vs { font-size: 24pt; font-weight: 900; color: ${C.gold}; }
    .cover-info { position: relative; margin-top: 5mm; display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; }
    .cover-info div { padding: 4mm; background: rgba(255,255,255,0.07); border-left: 3px solid ${C.red}; border-radius: 2mm; }
    .cover-info span { display: block; font-size: 7.5pt; letter-spacing: .2em; text-transform: uppercase; color: #9FB3D4; }
    .cover-info strong { font-size: 11pt; }
    .cover-foot { position: relative; margin-top: 6mm; display: flex; align-items: center; justify-content: space-between; font-size: 8.5pt; color: #9FB3D4; letter-spacing: .1em; text-transform: uppercase; }
    .cover-foot img { height: 12mm; object-fit: contain; }

    /* ---------- Seções ---------- */
    .sec-head { border-bottom: 3px solid ${C.red}; padding-bottom: 2mm; margin-bottom: 4mm; }
    .sec-head h2 { margin: 0; font-size: 18pt; font-weight: 900; text-transform: uppercase; letter-spacing: -.01em; color: ${C.navy}; }
    .sec-head p { margin: 1mm 0 0; font-size: 8pt; color: ${C.muted}; text-transform: uppercase; letter-spacing: .12em; }
    .sheet-tag { position: absolute; right: 1mm; top: 0; font-size: 7pt; letter-spacing: .18em; text-transform: uppercase; color: ${C.muted}; }
    .cols-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; }
    .cols-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5mm; }
    .panel { border: 1px solid ${C.line}; border-radius: 3mm; padding: 4mm 4.5mm; background: ${C.softer}; break-inside: avoid; }
    .panel h3 { margin: 0 0 3mm; font-size: 10pt; text-transform: uppercase; letter-spacing: .14em; color: ${C.navy}; border-bottom: 1px solid ${C.line}; padding-bottom: 2mm; }
    .empty { margin: 0; font-size: 8.5pt; color: ${C.muted}; font-style: italic; }
    .muted { color: ${C.muted}; }

    /* ---------- Tabelas ---------- */
    table.grid { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
    table.grid th, table.grid td { border: 1px solid ${C.line}; padding: 1.6mm 2mm; text-align: center; }
    table.grid thead th { background: ${C.navy}; color: #fff; text-transform: uppercase; font-size: 7.5pt; letter-spacing: .1em; border-color: ${C.navy}; }
    table.grid tbody th { background: ${C.soft}; text-align: left; font-weight: 700; }
    table.grid .left { text-align: left; }
    table.grid .hi { font-weight: 800; color: ${C.navy}; }
    table.grid .pos { color: #15803D; font-weight: 700; }
    table.grid .neg { color: ${C.red}; font-weight: 700; }
    table.grid.tight th, table.grid.tight td { padding: 1.1mm 1.4mm; font-size: 7.5pt; }
    table.grid tr.sub td { background: ${C.softer}; color: ${C.muted}; }
    table.grid .tag { font-size: 6.5pt; color: ${C.red}; font-weight: 700; }
    table.agenda th[scope="row"] span { display: block; font-weight: 400; font-size: 7.5pt; color: ${C.muted}; }
    .agenda-wrap { display: flex; flex-direction: column; gap: 3.5mm; }
    .agenda-day {
      break-inside: avoid;
      page-break-inside: avoid;
      border: 1px solid ${C.line};
      border-radius: 2mm;
      overflow: hidden;
      background: #fff;
      margin: 0 0 1mm;
    }
    thead { display: table-header-group; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    .agenda-day-head {
      padding: 1.6mm 2.5mm;
      background: ${C.navy};
      color: #fff;
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .06em;
    }
    .agenda-day.is-match .agenda-day-head { background: ${C.red}; }
    .agenda-day table.agenda { margin: 0; border: 0; }
    .agenda-day table.agenda th, .agenda-day table.agenda td { border-color: ${C.line}; }
    table.standings tr.club td { background: ${C.navy}; color: #fff; font-weight: 700; border-color: ${C.navy}; }
    table.standings tr.club .hi { color: ${C.gold}; }

    /* ---------- Ficha do jogo ---------- */
    .match-hero { display: flex; align-items: center; gap: 6mm; padding: 5mm; border: 1px solid ${C.line}; border-radius: 3mm; background: linear-gradient(120deg, ${C.soft} 0%, #fff 60%); margin-bottom: 6mm; }
    .match-hero .side { flex: 1; text-align: center; }
    .match-hero .side img, .match-hero .side .crest-fallback { width: 22mm; height: 22mm; object-fit: contain; margin: 0 auto 2mm; }
    .match-hero .side .crest-fallback { color: ${C.navy}; background: ${C.soft}; }
    .match-hero .side strong { display: block; font-size: 11pt; text-transform: uppercase; color: ${C.navy}; }
    .match-hero .side span { font-size: 7.5pt; letter-spacing: .2em; text-transform: uppercase; color: ${C.muted}; }
    .match-hero .vs { font-size: 18pt; font-weight: 900; color: ${C.red}; }
    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 3mm; margin-bottom: 6mm; }
    .info-grid div { padding: 3mm 3.5mm; border-left: 3px solid ${C.red}; background: ${C.softer}; border-radius: 0 2mm 2mm 0; }
    .info-grid span { display: block; font-size: 7pt; letter-spacing: .18em; text-transform: uppercase; color: ${C.muted}; }
    .info-grid strong { font-size: 10pt; color: ${C.ink}; }
    .uniform-kit { display: flex; align-items: center; gap: 5mm; margin: 0 0 6mm; padding: 4mm; border: 1px solid ${C.line}; border-radius: 3mm; background: ${C.soft}; }
    .uniform-kit-main { width: 30mm; height: 30mm; object-fit: contain; border-radius: 2mm; background: #fff; }
    .uniform-kit-copy { flex: 1; }
    .uniform-kit-copy span { display: block; font-size: 7pt; letter-spacing: .18em; text-transform: uppercase; color: ${C.muted}; }
    .uniform-kit-copy strong { display: block; margin: 1mm 0 2mm; font-size: 13pt; color: ${C.navy}; text-transform: uppercase; }
    .uniform-kit-items { display: flex; gap: 2mm; }
    .uniform-kit-items img { width: 14mm; height: 14mm; object-fit: contain; border: 1px solid ${C.line}; border-radius: 1.5mm; background: #fff; }
    .people { list-style: none; margin: 0; padding: 0; font-size: 8.5pt; }
    .people li { display: flex; justify-content: space-between; gap: 3mm; padding: 1.6mm 0; border-bottom: 1px dotted ${C.line}; }
    .people li:last-child { border-bottom: none; }
    .people b { font-weight: 700; }
    .people span { color: ${C.muted}; text-align: right; }
    .people-photos li { justify-content: flex-start; align-items: center; gap: 2mm; }
    .people-photos li > div { display: flex; flex-direction: column; min-width: 0; flex: 1; }
    .people-photos li span { text-align: left; }
    .people-photo {
      width: 8mm; height: 10.5mm; object-fit: cover; object-position: center 12%;
      border-radius: 1mm; border: 1px solid ${C.line}; background: ${C.soft}; flex: none;
    }
    .people-photo-fallback {
      display: flex; align-items: center; justify-content: center;
      font-size: 7pt; font-weight: 800; color: ${C.navy};
    }

    /* ---------- Resultados ---------- */
    .match-list { list-style: none; margin: 0; padding: 0; }
    .match-list li { display: flex; align-items: center; gap: 3mm; padding: 2mm 0; border-bottom: 1px solid ${C.line}; }
    .match-list li:last-child { border-bottom: none; }
    .match-main { display: flex; flex-direction: column; font-size: 8.5pt; }
    .match-main strong { font-weight: 700; }
    .match-main .score { color: ${C.red}; font-weight: 900; padding: 0 1mm; }
    .match-main span { font-size: 7.5pt; color: ${C.muted}; text-transform: uppercase; letter-spacing: .06em; }
    .res { display: inline-flex; align-items: center; justify-content: center; width: 7mm; height: 7mm; border-radius: 50%; font-size: 8pt; font-weight: 900; color: #fff; flex: none; }
    .res-v { background: #15803D; } .res-e { background: #94A3B8; } .res-d { background: ${C.red}; } .res-n { background: #CBD5E1; color: ${C.muted}; }

    .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3mm; margin-bottom: 5mm; }
    .kpi { padding: 4mm 3mm; text-align: center; border-radius: 3mm; background: ${C.navy}; color: #fff; }
    .kpi strong { display: block; font-size: 20pt; font-weight: 900; line-height: 1; }
    .kpi span { font-size: 7.5pt; letter-spacing: .18em; text-transform: uppercase; color: #A9BCDC; }
    .kpi.alt { background: ${C.red}; } .kpi.alt span { color: #FAD3DA; }

    /* ---------- Rankings ---------- */
    ol.rank { list-style: none; margin: 0; padding: 0; counter-reset: rank; font-size: 8.5pt; }
    ol.rank li { display: flex; align-items: baseline; gap: 2mm; padding: 1.7mm 0; border-bottom: 1px dotted ${C.line}; }
    ol.rank li:last-child { border-bottom: none; }
    .rank-name {
      flex: 1;
      font-weight: 600;
      text-transform: uppercase;
      overflow: visible;
      white-space: normal;
      line-height: 1.15;
    }
    .rank-name b { display: inline-block; min-width: 5mm; color: ${C.red}; }
    .rank-detail { font-size: 7pt; color: ${C.muted}; text-transform: uppercase; }
    .rank-value { font-weight: 900; color: ${C.navy}; min-width: 10mm; text-align: right; }

    /* ---------- Elenco ---------- */
    .group-band {
      margin: 4mm 0 3mm; padding: 2mm 3mm; background: ${C.navy}; color: #fff;
      font-size: 8.5pt; text-transform: uppercase; letter-spacing: .14em; font-weight: 700;
      border-radius: 1.5mm; break-after: avoid; page-break-after: avoid;
    }
    .group-band:first-of-type { margin-top: 1mm; }
    .squad-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm 3.5mm; margin-bottom: 2mm; }
    .pcard { display: flex; gap: 2.5mm; border: 1px solid ${C.line}; border-radius: 2mm; overflow: hidden; background: #fff; break-inside: avoid; page-break-inside: avoid; min-height: 34mm; height: auto; }
    .pcard.suspended { border-color: #FECACA; }
    .pcard-photo { position: relative; width: 22mm; flex: none; min-height: 34mm; align-self: stretch; background: linear-gradient(160deg, ${C.navy} 0%, ${C.navyDeep} 100%); }
    .pcard-img { width: 100%; height: 100%; object-fit: cover; object-position: center 18%; display: block; }
    .photo-fallback { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 800; font-size: 12pt; }
    .pcard-pos { position: absolute; left: 0; bottom: 0; right: 0; padding: .7mm; font-size: 5.5pt; text-transform: uppercase; letter-spacing: .08em; text-align: center; background: ${C.red}; color: #fff; }
    .pcard-body { flex: 1; padding: 1.6mm 2mm 1.2mm; min-width: 0; display: flex; flex-direction: column; }
    .pcard-head { display: flex; align-items: center; gap: 2mm; margin-bottom: 1mm; }
    .pcard-num { font-size: 14pt; font-weight: 900; color: ${C.red}; line-height: 1; min-width: 7mm; text-align: center; }
    .pcard-head strong {
      display: block; font-size: 8pt; text-transform: uppercase; color: ${C.navy}; line-height: 1.15;
      overflow: visible; white-space: normal; word-break: break-word;
    }
    .pcard-head span { font-size: 6pt; color: ${C.muted}; }
    table.pstats { width: 100%; border-collapse: collapse; font-size: 6pt; }
    table.pstats th, table.pstats td { border: 1px solid ${C.line}; padding: .6mm 1mm; text-align: center; }
    table.pstats thead th { background: ${C.soft}; color: ${C.navy}; text-transform: uppercase; font-size: 5.5pt; letter-spacing: .05em; }
    table.pstats tbody th { text-align: left; font-weight: 600; font-size: 5.8pt; }
    table.pstats tr.total th, table.pstats tr.total td { background: ${C.navy}; color: #fff; font-weight: 700; border-color: ${C.navy}; }
    .pcard-foot { margin: auto 0 0; font-size: 5.5pt; color: ${C.muted}; }

    /* ---------- Escalações ---------- */
    .lineups { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; }
    .lineup { break-inside: avoid; }
    .lineup-head { text-align: center; padding: 2mm; background: ${C.navy}; color: #fff; border-radius: 2mm 2mm 0 0; }
    .lineup-head strong { display: block; font-size: 8.5pt; text-transform: uppercase; }
    .lineup-head span { font-size: 7pt; color: #A9BCDC; }
    .pitch { position: relative; height: 62mm; background: repeating-linear-gradient(180deg, #1B7A3E 0 8mm, #176E37 8mm 16mm); border: 1px solid #0F5228; }
    .pl { position: absolute; border: 1px solid rgba(255,255,255,.5); }
    .pl-mid { left: 0; right: 0; top: 50%; height: 0; border-width: 1px 0 0; }
    .pl-circle { left: 50%; top: 50%; width: 16mm; height: 16mm; margin: -8mm 0 0 -8mm; border-radius: 50%; }
    .pl-box-top { left: 50%; top: 0; width: 26mm; height: 8mm; margin-left: -13mm; border-top: none; }
    .pl-box-bottom { left: 50%; bottom: 0; width: 26mm; height: 8mm; margin-left: -13mm; border-bottom: none; }
    .chip { position: absolute; transform: translate(-50%, -50%); text-align: center; }
    .chip-num { display: block; width: 5.6mm; height: 5.6mm; margin: 0 auto; border-radius: 50%; background: #fff; color: ${C.navy}; font-size: 6pt; font-weight: 900; line-height: 5.6mm; border: 1px solid ${C.navy}; }
    .vis-layout { display: block; }
    .vis-stage {
      display: flex;
      flex-direction: column;
      gap: 3mm;
      align-items: stretch;
    }
    .vis-field-row {
      display: flex;
      flex-direction: row;
      flex-wrap: nowrap;
      justify-content: center;
      align-items: stretch;
      gap: 3mm;
      width: max-content;
      max-width: 100%;
      margin: 0 auto;
    }
    .vis-field-row > .vis-staff-side {
      width: 46mm;
      flex: 0 0 46mm;
    }
    .vis-field-row > .vis-pitch-wrap {
      flex: 0 0 auto;
    }
    .vis-staff-side {
      display: flex;
      flex-direction: column;
      gap: 2.2mm;
      padding: 3.5mm 3mm;
      border: 1px solid ${C.line};
      border-radius: 2mm;
      background: ${C.softer};
      break-inside: avoid;
    }
    .vis-staff-side-title {
      margin: 0 0 2mm;
      font-size: 7.5pt;
      font-weight: 800;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: ${C.navy};
      border-bottom: 2px solid ${C.red};
      padding-bottom: 1.5mm;
    }
    .vis-staff-side-row {
      display: flex;
      gap: 1.8mm;
      align-items: flex-start;
    }
    .vis-staff-side-photo {
      width: 8mm; height: 10.5mm; object-fit: cover; object-position: center 12%;
      border-radius: 1mm; border: 1px solid ${C.line}; background: ${C.soft}; flex: none;
    }
    .vis-staff-side-photo.photo-fallback {
      display: flex; align-items: center; justify-content: center;
      font-size: 6pt; font-weight: 800; color: ${C.navy};
    }
    .vis-staff-side-row strong {
      display: block; font-size: 6.2pt; line-height: 1.15; color: ${C.ink}; text-transform: uppercase;
      overflow: visible; white-space: normal;
    }
    .vis-staff-side-row span {
      display: block; font-size: 5.2pt; color: ${C.muted}; text-transform: uppercase; line-height: 1.15;
      overflow: visible; white-space: normal;
    }
    .vis-pitch-wrap {
      position: relative;
      width: 185mm;
      max-width: 185mm;
      aspect-ratio: 78 / 100;
      border-radius: 3mm;
      overflow: hidden;
      border: 2.5px solid #14532d;
      background: repeating-linear-gradient(90deg, #15803d 0 11.1%, #16a34a 11.1% 22.2%);
    }
    .vis-pitch-players {
      position: absolute;
      inset: 0 6%;
      z-index: 2;
    }
    .vis-pitch-mark { position: absolute; border: 2px solid rgba(255,255,255,0.55); pointer-events: none; }
    .vis-pitch-wrap .pl-half { left: 0; right: 0; top: 50%; border-width: 0 0 2px 0; }
    .vis-pitch-wrap .pl-circle { left: 50%; top: 50%; width: 16mm; height: 16mm; margin: -8mm 0 0 -8mm; border-radius: 50%; }
    .vis-pitch-wrap .pl-box-top { left: 22%; right: 22%; top: 0; height: 14%; border-top: 0; }
    .vis-pitch-wrap .pl-box-bottom { left: 22%; right: 22%; bottom: 0; height: 14%; border-bottom: 0; }
    .vis-pitch-wrap .pl-goal-top { left: 36%; right: 36%; top: 0; height: 6%; border-top: 0; }
    .vis-pitch-wrap .pl-goal-bottom { left: 36%; right: 36%; bottom: 0; height: 6%; border-bottom: 0; }
    .vis-chip {
      position: absolute;
      transform: translate(-50%, -50%);
      width: 20mm;
      text-align: center;
      z-index: 2;
    }
    .vis-photo-wrap {
      position: relative;
      width: 11mm;
      height: 14.5mm;
      margin: 0 auto 0.8mm;
      background: transparent;
    }
    .vis-photo {
      width: 11mm;
      height: 14.5mm;
      object-fit: cover;
      object-position: center 12%;
      border-radius: 1mm;
      display: block;
      background: transparent;
      box-shadow: none;
    }
    .vis-photo.photo-fallback {
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-weight: 800; font-size: 8pt; background: rgba(0,0,0,.45);
      mix-blend-mode: normal;
    }
    .vis-nick {
      font-size: 6pt; font-weight: 800; color: #fde68a;
      text-shadow: 0 0 2px #000, 0 1px 2px rgba(0,0,0,.95);
      text-transform: uppercase; line-height: 1.1;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .vis-pos {
      font-size: 5.5pt; font-weight: 800; color: #fff;
      text-shadow: 0 0 2px #000, 0 1px 2px rgba(0,0,0,.95);
      text-transform: uppercase; line-height: 1.1;
    }
    .vis-birth {
      font-size: 5pt; font-weight: 700; color: #fff;
      text-shadow: 0 0 2px #000, 0 1px 2px rgba(0,0,0,.95);
      line-height: 1.1;
    }
    .vis-bench {
      border: 1.5px solid #EA580C; border-radius: 2.5mm; padding: 3.5mm 3.5mm;
      background: linear-gradient(180deg, #FFF7ED 0%, #FFEDD5 100%);
      break-inside: avoid;
    }
    .vis-bench h3 {
      margin: 0 0 2.5mm; font-size: 9pt; text-transform: uppercase; letter-spacing: .08em;
      color: #C2410C; border-bottom: 2px solid #EA580C; padding-bottom: 1.5mm;
    }
    .vis-bench-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2.5mm 3mm; }
    .vis-bench-row { display: flex; gap: 1.5mm; align-items: flex-start; font-size: 7.5pt; }
    .vis-bench-photo {
      width: 7mm; height: 9.5mm; object-fit: cover; object-position: center 12%;
      border-radius: 1mm; border: 1px solid #FDBA74; background: ${C.soft}; flex: none;
    }
    .vis-bench-photo.photo-fallback {
      display: flex; align-items: center; justify-content: center;
      font-size: 6pt; font-weight: 800; color: #C2410C;
    }
    .vis-bench-num {
      min-width: 5mm; height: 5mm; border-radius: 1mm; background: #EA580C; color: #fff;
      font-weight: 800; font-size: 6.5pt; display: inline-flex; align-items: center; justify-content: center;
      flex: none;
    }
    .vis-bench-row strong {
      display: block; font-size: 6.5pt; line-height: 1.15; color: ${C.ink}; text-transform: uppercase;
      overflow: visible; white-space: normal;
    }
    .vis-bench-row span { display: block; font-size: 5.5pt; color: #9A3412; }
    .discipline-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; margin-top: 5mm; }
    .discipline-grid .panel.danger { border-color: #FECACA; background: #FEF2F2; }
    .discipline-grid .panel.warn { border-color: #FDE68A; background: #FFFBEB; }
    .discipline-grid .panel h3 { color: ${C.red}; }
    .discipline-grid .panel.warn h3 { color: #B45309; }
    .chip-name { display: block; margin-top: .5mm; font-size: 4.9pt; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,.9); text-transform: uppercase; line-height: 1.05; overflow: visible; white-space: normal; }

    .note { margin-top: 3mm; font-size: 6.5pt; color: ${C.muted}; font-style: italic; }
    .page-foot {
      margin-top: 5mm;
      display: flex;
      justify-content: space-between;
      font-size: 6.5pt;
      color: ${C.muted};
      text-transform: uppercase;
      letter-spacing: .1em;
      border-top: 1px solid ${C.line};
      padding-top: 1.5mm;
    }
  `;
}

function pageFoot(club: string, opponent: string, label: string): string {
  return `<div class="page-foot"><span>${esc(club)} × ${esc(opponent)}</span><span>${esc(label)}</span></div>`;
}

export function buildGuiaPartidaPrintHtml(
  data: GuiaPartidaReportDto,
  size: PrintPageSize = "A4",
): string {
  const { travel, config } = data;
  const club = travel.tenant.tradeName?.trim() || travel.tenant.name;
  const opponent = travel.opponentName?.trim() || "Adversário";
  const clubLogo = travel.tenant.logoUrl;
  const homeName = travel.isHomeMatch ? club : opponent;
  const awayName = travel.isHomeMatch ? opponent : club;
  const homeLogo = travel.isHomeMatch ? clubLogo : data.opponentLogoUrl;
  const awayLogo = travel.isHomeMatch ? data.opponentLogoUrl : clubLogo;
  const matchDateLabel = travel.matchDate
    ? travel.matchDate.split("-").reverse().join("/")
    : "—";
  const kickoff = [matchDateLabel, config.matchTime].filter(Boolean).join(" · ");
  const competition = [travel.championshipName, config.phase].filter(Boolean).join(" · ");
  const foot = (label: string) => pageFoot(club, opponent, label);

  /* ---------------- Capa ---------------- */
  const topScorer = data.topScorers[0];
  const coverFacts = [
    {
      label: "Aproveitamento na temporada",
      value: `${data.campaign.overall.winRate}%`,
      hint: `${data.campaign.overall.matches} jogos · ${data.campaign.overall.wins}V ${data.campaign.overall.draws}E ${data.campaign.overall.losses}D`,
    },
    {
      label: "Artilheiro",
      value: topScorer ? `${topScorer.value}` : "—",
      hint: topScorer ? topScorer.shortName : "Sem gols registrados",
    },
    {
      label: `Retrospecto vs ${opponent}`,
      value:
        data.headToHead.played > 0
          ? `${data.headToHead.wins}-${data.headToHead.draws}-${data.headToHead.losses}`
          : "—",
      hint:
        data.headToHead.played > 0
          ? `${data.headToHead.played} jogos · ${data.headToHead.goalsFor}x${data.headToHead.goalsAgainst}`
          : "Primeiro confronto",
    },
  ];

  const cover = sheet(
    `<div class="cover-inner">
      <div class="cover-stripe"></div>
      <div class="cover-glow"></div>
      <div class="cover-watermark">${crest(club, clubLogo, "cover-watermark-crest")}</div>
      <p class="cover-kicker">${esc(travel.categoryLabel)} · Temporada ${data.season}</p>
      <h1 class="cover-title">Press<span>Kit</span></h1>
      <p class="cover-sub">${esc(competition || "Relatório de imprensa")}</p>

      <div class="cover-match">
        <div class="cover-team">
          ${crest(homeName, homeLogo, "cover-crest")}
          <strong>${esc(homeName)}</strong>
          <span>Mandante</span>
        </div>
        <div class="cover-vs">×</div>
        <div class="cover-team">
          ${crest(awayName, awayLogo, "cover-crest")}
          <strong>${esc(awayName)}</strong>
          <span>Visitante</span>
        </div>
      </div>

      <div class="cover-facts">
        ${coverFacts
          .map(
            (fact) => `<div>
          <span>${esc(fact.label)}</span>
          <strong>${esc(fact.value)}</strong>
          <em>${esc(fact.hint)}</em>
        </div>`,
          )
          .join("")}
      </div>

      <div class="cover-info">
        <div><span>Data e horário</span><strong>${esc(kickoff || "—")}</strong></div>
        <div><span>Local</span><strong>${esc(travel.stadiumName || travel.city || "A definir")}</strong></div>
        <div><span>Categoria</span><strong>${esc(travel.categoryLabel)}</strong></div>
      </div>

      <div class="cover-foot">
        ${crest(club, clubLogo, "cover-foot-crest")}
        <span>Assessoria de Imprensa · Boston City Group</span>
      </div>
    </div>`,
    "cover cover-sheet",
  );

  /* ---------------- A partida ---------------- */
  const refereesHtml = config.referees.filter((r) => r.name.trim());
  const directorsHtml = config.directors.filter((d) => d.name.trim());

  const matchSheet = sheet(
    `<div class="sheet-tag">A partida</div>
    ${sectionTitle("O confronto", competition || null)}
    <div class="match-hero">
      <div class="side">
        ${crest(homeName, homeLogo, "hero-crest")}
        <strong>${esc(homeName)}</strong>
        <span>Mandante</span>
      </div>
      <div class="vs">×</div>
      <div class="side">
        ${crest(awayName, awayLogo, "hero-crest")}
        <strong>${esc(awayName)}</strong>
        <span>Visitante</span>
      </div>
    </div>

    <div class="info-grid">
      <div><span>Data</span><strong>${esc(matchDateLabel)}</strong></div>
      <div><span>Horário</span><strong>${esc(config.matchTime || "A definir")}</strong></div>
      <div><span>Estádio</span><strong>${esc(travel.stadiumName || "A definir")}</strong></div>
      <div><span>Cidade</span><strong>${esc([travel.city, travel.country].filter(Boolean).join(" / ") || "—")}</strong></div>
      <div><span>Competição</span><strong>${esc(travel.championshipName || "—")}</strong></div>
      <div><span>Fase / rodada</span><strong>${esc(config.phase || "—")}</strong></div>
    </div>
    ${
      data.uniformKit
        ? `<div class="uniform-kit">
      ${
        data.uniformKit.imageUrl
          ? `<img class="uniform-kit-main" src="${esc(resolveLogoUrlForPrint(data.uniformKit.imageUrl) || data.uniformKit.imageUrl)}" alt="" />`
          : ""
      }
      <div class="uniform-kit-copy">
        <span>Uniforme da partida</span>
        <strong>${esc(data.uniformKit.name)}</strong>
        <div class="uniform-kit-items">
          ${data.uniformKit.items
            .filter((item) => item.imageUrl)
            .slice(0, 3)
            .map(
              (item) =>
                `<img src="${esc(resolveLogoUrlForPrint(item.imageUrl!) || item.imageUrl!)}" alt="${esc(item.name)}" />`,
            )
            .join("")}
        </div>
      </div>
    </div>`
        : ""
    }

    <div class="cols-2">
      <div class="panel">
        <h3>Arbitragem</h3>
        ${
          refereesHtml.length > 0
            ? `<ul class="people people-photos">${refereesHtml
                .map((r) => {
                  const src = r.photoUrl
                    ? resolveLogoUrlForPrint(r.photoUrl) || r.photoUrl
                    : null;
                  const photo = src
                    ? `<img class="people-photo" src="${esc(src)}" alt="" />`
                    : `<span class="people-photo people-photo-fallback">${esc(r.name.slice(0, 1))}</span>`;
                  return `<li>${photo}<div><b>${esc(r.name)}</b><span>${esc(r.role)}</span></div></li>`;
                })
                .join("")}</ul>`
            : `<p class="empty">Escala não divulgada.</p>`
        }
      </div>
      <div class="panel">
        <h3>Diretoria</h3>
        ${
          directorsHtml.length > 0
            ? `<ul class="people">${directorsHtml.map((d) => `<li><b>${esc(d.name)}</b><span>${esc(d.role)}</span></li>`).join("")}</ul>`
            : `<p class="empty">—</p>`
        }
      </div>
    </div>

    <div class="panel" style="margin-top:6mm">
      <h3>Retrospecto contra ${esc(opponent)}</h3>
      ${
        data.headToHead.played > 0
          ? `<div class="kpi-row">
              <div class="kpi"><strong>${data.headToHead.played}</strong><span>Jogos</span></div>
              <div class="kpi"><strong>${data.headToHead.wins}</strong><span>Vitórias</span></div>
              <div class="kpi"><strong>${data.headToHead.draws}</strong><span>Empates</span></div>
              <div class="kpi alt"><strong>${data.headToHead.losses}</strong><span>Derrotas</span></div>
            </div>
            ${matchRows(data.headToHead.matches)}`
          : `<p class="empty">Sem confrontos anteriores com ${esc(opponent)}.</p>`
      }
    </div>
    ${foot("A partida")}`,
  );

  /* ---------------- Números ---------------- */
  const numbersSheet = sheet(
    `<div class="sheet-tag">Desempenho</div>
    ${sectionTitle(`Números na temporada ${data.season}`, travel.categoryLabel)}
    <div class="kpi-row">
      <div class="kpi"><strong>${data.campaign.overall.matches}</strong><span>Jogos</span></div>
      <div class="kpi"><strong>${data.campaign.overall.wins}</strong><span>Vitórias</span></div>
      <div class="kpi"><strong>${data.campaign.overall.goalsFor}</strong><span>Gols pró</span></div>
      <div class="kpi alt"><strong>${data.campaign.overall.winRate}%</strong><span>Aproveitamento</span></div>
    </div>

    ${campaignTable([
      data.campaign.overall,
      ...data.campaign.byCompetition,
      data.campaign.home,
      data.campaign.away,
    ])}

    <div class="cols-2" style="margin-top:6mm">
      <div class="panel">
        <h3>Últimos resultados</h3>
        ${matchRows(data.recentResults)}
      </div>
      <div class="panel">
        <h3>Próximos compromissos</h3>
        ${
          data.nextMatches.length > 0
            ? `<ul class="people">${data.nextMatches
                .map(
                  (m) =>
                    `<li><b>${esc(m.isHome ? `${club} × ${m.opponent}` : `${m.opponent} × ${club}`)}</b><span>${esc([m.dateLabel, m.competition].filter(Boolean).join(" · "))}</span></li>`,
                )
                .join("")}</ul>`
            : `<p class="empty">Sem jogos futuros lançados.</p>`
        }
      </div>
    </div>

    <div class="cols-3" style="margin-top:6mm">
      ${rankingBlock("Artilharia", data.topScorers)}
      ${rankingBlock("Mais minutos", data.topMinutes, "'")}
      ${rankingBlock("Cartões", data.topCards)}
    </div>

    <div class="discipline-grid">
      <div class="panel danger">
        <h3>Suspensos / não aptos</h3>
        ${
          (data.discipline?.suspended ?? []).length > 0
            ? `<ul class="people">${(data.discipline?.suspended ?? [])
                .map(
                  (p) =>
                    `<li><b>${p.jerseyNumber != null ? `${p.jerseyNumber} · ` : ""}${esc(firstLastName(p.name) || p.shortName)}</b><span>${esc(p.reason)}</span></li>`,
                )
                .join("")}</ul>`
            : `<p class="empty">Nenhum suspenso no plantel relacionado.</p>`
        }
      </div>
      <div class="panel warn">
        <h3>Cartões amarelos</h3>
        ${
          (data.discipline?.withYellowCards ?? []).length > 0
            ? `<ul class="people">${(data.discipline?.withYellowCards ?? [])
                .map(
                  (p) =>
                    `<li><b>${p.jerseyNumber != null ? `${p.jerseyNumber} · ` : ""}${esc(firstLastName(p.name) || p.shortName)}</b><span>${esc(p.reason)}</span></li>`,
                )
                .join("")}</ul>`
            : `<p class="empty">Sem cartões no plantel relacionado.</p>`
        }
      </div>
    </div>
    ${foot("Desempenho")}`,
  );

  /* ---------------- Elenco (fluxo contínuo — browser pagina sem buraco) ---------------- */
  const squadBlocks: string[] = [];
  {
    let currentGroup: GuiaSquadPlayer["positionGroup"] | null = null;
    let buffer: GuiaSquadPlayer[] = [];
    const flush = () => {
      if (buffer.length === 0) return;
      squadBlocks.push(
        `<p class="group-band">${esc(POSITION_GROUP_LABEL[currentGroup ?? ""] ?? "Elenco")}</p>
         <div class="squad-grid">${buffer.map(playerCard).join("")}</div>`,
      );
      buffer = [];
    };
    for (const player of data.squad) {
      if (player.positionGroup !== currentGroup) {
        flush();
        currentGroup = player.positionGroup;
      }
      buffer.push(player);
    }
    flush();
  }
  const squadSheets = [
    sheet(
      `<div class="sheet-tag">Elenco relacionado</div>
      ${sectionTitle("Elenco", `${data.squad.length} atletas relacionados · ${travel.categoryLabel}`)}
      ${squadBlocks.join("")}
      <p class="note">J = jogos · G = gols · MIN = minutos. Temporada ${data.season}.</p>
      ${foot("Elenco")}`,
    ),
  ];

  /* ---------------- Escalações ---------------- */
  const lineupSheet =
    data.lastLineups.length > 0
      ? sheet(
          `<div class="sheet-tag">Escalações</div>
          ${sectionTitle("Últimas escalações", `Três partidas mais recentes · ${travel.categoryLabel}`)}
          <div class="lineups">${data.lastLineups.map(lineupColumn).join("")}</div>
          <p class="note">O gráfico mostra a distribuição dos titulares por setor, a partir da posição de cadastro — não representa o esquema tático utilizado. Atletas em cinza entraram durante a partida.</p>
          ${foot("Escalações")}`,
        )
      : "";

  /* ---------------- Agenda + classificação ---------------- */
  const closingSheet = sheet(
    `<div class="sheet-tag">Agenda</div>
    ${sectionTitle("Semana do jogo", travel.categoryLabel)}
    ${agendaTable(data.agenda)}
    ${
      data.standings.length > 0
        ? `<div style="margin-top:7mm">${sectionTitle("Classificação", travel.championshipName ?? null)}${standingsTable(data.standings)}</div>`
        : ""
    }
    <div class="panel" style="margin-top:7mm">
      <h3>Contato para imprensa</h3>
      <p style="margin:0;font-size:9pt">${esc(config.contactLine || `Assessoria de Comunicação · ${club}`)}</p>
    </div>
    ${foot("Agenda")}`,
  );

  /* ---------------- Escalação visual (última página) ---------------- */
  const formation = getFormation(config.formation);
  const squadById = new Map(
    data.squad.filter((p) => p.playerId).map((p) => [p.playerId!, p]),
  );
  const starterIdSet = new Set(config.starterPlayerIds.filter(Boolean));
  const visualPlayers = formation.slots
    .map((slot, i) => {
      const slotId = config.starterPlayerIds[i];
      const p = slotId ? squadById.get(slotId) : undefined;
      if (!p) return "";
      const nickRaw = (
        p.nickname?.trim() ||
        firstLastName(p.name) ||
        p.shortName ||
        ""
      ).toLocaleUpperCase("pt-BR");
      const nickOnly = nickRaw.length > 12 ? `${nickRaw.slice(0, 11)}…` : nickRaw;
      const pos = cadastroPositionAbbrev(p.position || p.positionLabel);
      const birth = formatBirth(p.birthDate);
      const ty = pitchChipTranslateY(slot.top);
      return `<div class="vis-chip" style="top:${slot.top}%;left:${slot.left}%;transform:translate(-50%,${ty})">
        <div class="vis-photo-wrap">
          ${photo(p.photoUrl, p.name, "vis-photo")}
        </div>
        <div class="vis-nick">${esc(nickOnly)}</div>
        ${pos && pos !== "—" ? `<div class="vis-pos">${esc(pos)}</div>` : ""}
        ${birth ? `<div class="vis-birth">${esc(birth)}</div>` : ""}
      </div>`;
    })
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
  const staffBeside = [...data.staff]
    .sort((a, b) => {
      const d = staffRank(a) - staffRank(b);
      if (d !== 0) return d;
      return a.name.localeCompare(b.name, "pt-BR");
    })
    .map((s) => {
      const role = s.role ? getStaffRoleLabel(s.role) : "Comissão";
      const short = staffPrintName(s.name);
      return `<div class="vis-staff-side-row">
        ${photo(s.photoUrl, s.name, "vis-staff-side-photo")}
        <div><strong>${esc(short)}</strong><span>${esc(role)}</span></div>
      </div>`;
    })
    .join("");
  const benchPlayers = data.squad.filter(
    (p) => p.playerId && !starterIdSet.has(p.playerId),
  );
  const benchHtml = benchPlayers
    .map((p) => {
      const n = p.jerseyNumber != null ? String(p.jerseyNumber) : "—";
      const nick = athletePrintName(p);
      return `<div class="vis-bench-row">
        ${photo(p.photoUrl, p.name, "vis-bench-photo")}
        <span class="vis-bench-num">${esc(n)}</span>
        <div><strong>${esc(nick)}</strong><span>${esc(p.positionLabel)}</span></div>
      </div>`;
    })
    .join("");
  const visualSheet = sheet(
    `<div class="sheet-tag">Escalação</div>
    ${sectionTitle("Escalação visual", `${formation.label} · ${travel.categoryLabel}`)}
    <div class="vis-stage">
      <div class="vis-field-row">
        <aside class="vis-staff-side">
          <p class="vis-staff-side-title">Comissão</p>
          ${staffBeside || `<p class="empty">—</p>`}
        </aside>
        <div class="vis-pitch-wrap">
          <div class="vis-pitch-mark pl-half"></div>
          <div class="vis-pitch-mark pl-circle"></div>
          <div class="vis-pitch-mark pl-box-top"></div>
          <div class="vis-pitch-mark pl-goal-top"></div>
          <div class="vis-pitch-mark pl-box-bottom"></div>
          <div class="vis-pitch-mark pl-goal-bottom"></div>
          <div class="vis-pitch-players">${visualPlayers}</div>
        </div>
      </div>
      <div class="vis-bench">
        <h3>Reservas · banco</h3>
        ${
          benchHtml
            ? `<div class="vis-bench-grid">${benchHtml}</div>`
            : `<p class="empty">Sem reservas.</p>`
        }
      </div>
    </div>
    <p class="note">No gramado só os titulares. Comissão ao lado do campo.</p>
    ${foot("Escalação visual")}`,
  );

  const body = [cover, matchSheet, numbersSheet, ...squadSheets, lineupSheet, closingSheet, visualSheet]
    .filter(Boolean)
    .join("\n");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${esc(`Press Kit — ${homeName} x ${awayName}`)}</title>
  <style>${styles(size)}
    .hero-crest { width: 22mm; height: 22mm; object-fit: contain; display: block; margin: 0 auto 2mm; }
    .cover-foot-crest { height: 12mm; width: auto; object-fit: contain; }
  </style>
</head>
<body>${body}</body>
</html>`;
}

export function printGuiaPartidaReport(
  data: GuiaPartidaReportDto,
  size: PrintPageSize = "A4",
): void {
  printHtmlDocument(buildGuiaPartidaPrintHtml(data, size), "Impressão — Press Kit");
}
