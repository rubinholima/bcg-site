import { formatCpfForDisplay } from "@/lib/format-cpf";
import type {
  HospedesReportDto,
  PassageirosReportDto,
  PrintPageSize,
  ProgramacaoSemanalReportDto,
  RelatorioPessoaRow,
  RelatorioHospedeRow,
} from "@/lib/futebol-relatorios.types";

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

function formatBrDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function pageCss(size: PrintPageSize): string {
  const pageSize = size === "Letter" ? "letter" : "A4";
  return `@page { size: ${pageSize}; margin: 14mm 12mm; }`;
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
    .top-bar {
      height: 5px;
      background: linear-gradient(90deg, #b45309 0%, #fcd34d 45%, #fef3c7 100%);
      border-radius: 3px;
      margin-bottom: 18px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      padding-bottom: 16px;
      margin-bottom: 18px;
      border-bottom: 2px solid #fde68a;
    }
    .brand-block { flex: 1; min-width: 0; }
    .brand {
      margin: 0 0 4px;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #92400e;
    }
    .club {
      margin: 0;
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #0f172a;
      line-height: 1.15;
    }
    .doc-title {
      margin: 6px 0 0;
      font-size: 15px;
      font-weight: 700;
      color: #b45309;
    }
    .badge {
      display: inline-block;
      margin-top: 8px;
      padding: 4px 10px;
      border-radius: 999px;
      background: #fffbeb;
      border: 1px solid #fcd34d;
      font-size: 11px;
      font-weight: 600;
      color: #92400e;
    }
    .logo-slot {
      width: 72px;
      height: 72px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
      background: #fafafa;
    }
    .logo-slot img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .logo-fallback {
      font-size: 10px;
      font-weight: 800;
      color: #b45309;
      text-align: center;
      padding: 6px;
      line-height: 1.2;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px 16px;
      margin-bottom: 20px;
      padding: 14px 16px;
      background: linear-gradient(135deg, #fffbeb 0%, #ffffff 100%);
      border: 1px solid #fde68a;
      border-radius: 10px;
    }
    .meta-item label {
      display: block;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #78716c;
      margin-bottom: 2px;
    }
    .meta-item span {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: #1e293b;
    }
    .meta-item.full { grid-column: 1 / -1; }
    .section { margin-bottom: 22px; break-inside: avoid; }
    .section-title {
      margin: 0 0 8px;
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #92400e;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section-title::after {
      content: "";
      flex: 1;
      height: 1px;
      background: linear-gradient(90deg, #fcd34d, transparent);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    thead th {
      background: linear-gradient(180deg, #fef3c7 0%, #fde68a 100%);
      color: #78350f;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 8px 8px;
      border: 1px solid #fcd34d;
      text-align: left;
    }
    tbody td {
      padding: 7px 8px;
      border: 1px solid #e2e8f0;
      vertical-align: middle;
    }
    tbody tr:nth-child(even) td { background: #fafafa; }
    .num { width: 36px; text-align: center; font-weight: 700; color: #64748b; }
    .empty {
      text-align: center;
      color: #94a3b8;
      font-style: italic;
      padding: 14px;
    }
    .footer {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      gap: 12px;
      font-size: 9px;
      color: #64748b;
    }
    .schedule-wrap { overflow: hidden; }
    .schedule-table { font-size: 9.5px; }
    .schedule-table thead th {
      text-align: center;
      padding: 6px 4px;
    }
    .schedule-table tbody td {
      vertical-align: top;
      min-width: 80px;
      padding: 6px 5px;
    }
    .day-cell {
      background: #fffbeb !important;
      font-weight: 700;
      color: #78350f;
      white-space: nowrap;
      width: 110px;
    }
    .act {
      margin-bottom: 6px;
      padding-bottom: 6px;
      border-bottom: 1px dashed #e2e8f0;
    }
    .act:last-child { margin-bottom: 0; padding-bottom: 0; border-bottom: 0; }
    .act-time {
      font-weight: 800;
      color: #b45309;
      font-size: 9px;
    }
    .act-title { font-weight: 600; color: #0f172a; line-height: 1.3; }
    .act-meta { font-size: 8.5px; color: #64748b; margin-top: 1px; }
  `;
}

function logoHtml(logoUrl: string | null | undefined, clubName: string): string {
  if (logoUrl?.trim()) {
    return `<div class="logo-slot"><img src="${escapeHtml(logoUrl)}" alt="" /></div>`;
  }
  const initials = clubName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase();
  return `<div class="logo-slot"><div class="logo-fallback">${escapeHtml(initials || "BCG")}</div></div>`;
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
  const transportLine = [
    travel.transportLabel,
    travel.transportDetails?.trim(),
  ]
    .filter(Boolean)
    .join(" — ");

  return `
    <div class="meta-grid">
      <div class="meta-item">
        <label>Categoria</label>
        <span>${escapeHtml(travel.categoryLabel)}</span>
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
      ${transportLine ? `<div class="meta-item full"><label>Transporte</label><span>${escapeHtml(transportLine)}</span></div>` : ""}
      ${
        travel.estimatedDeparture || travel.estimatedArrival
          ? `<div class="meta-item"><label>Saída prevista</label><span>${escapeHtml(formatBrDateTime(travel.estimatedDeparture))}</span></div>
             <div class="meta-item"><label>Chegada prevista</label><span>${escapeHtml(formatBrDateTime(travel.estimatedArrival))}</span></div>`
          : ""
      }
      ${
        travel.hotelName
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
  body: string,
  size: PrintPageSize,
): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>${baseStyles(size)}</style>
</head>
<body>
  <div class="page">
    <div class="top-bar"></div>
    <header class="header">
      <div class="brand-block">
        <p class="brand">Boston City Group · Depto Futebol</p>
        <h1 class="club">${escapeHtml(clubName)}</h1>
        <p class="doc-title">${escapeHtml(docTitle)}</p>
        <span class="badge">${escapeHtml(badge)}</span>
      </div>
      ${logoHtml(logoUrl, clubName)}
    </header>
    ${body}
    <footer class="footer">
      <span>Gerado em ${escapeHtml(new Date().toLocaleString("pt-BR"))}</span>
      <span>Boston City Group · Relatório oficial</span>
    </footer>
  </div>
</body>
</html>`;
}

export function buildPassageirosPrintHtml(
  data: PassageirosReportDto,
  size: PrintPageSize = "A4",
): string {
  const { travel } = data;
  const body = `
    ${travelMetaHtml(travel)}
    ${personTable("Atletas", data.athletes)}
    ${personTable("Comissão técnica", data.staff, true)}
    ${personTable("Convidados", data.guests)}
  `;
  const badge = travel.championshipName
    ? `${travel.categoryLabel} · ${travel.championshipName}`
    : travel.categoryLabel;

  return documentShell(
    `Relação de Passageiros — ${travel.tenant.name}`,
    travel.tenant.name,
    null,
    "Relação de Passageiros",
    badge,
    body,
    size,
  );
}

export function buildHospedesPrintHtml(
  data: HospedesReportDto,
  size: PrintPageSize = "A4",
): string {
  const { travel } = data;
  const checkIn = travel.estimatedArrival
    ? formatBrDateTime(travel.estimatedArrival)
    : formatBrDate(travel.matchDate);
  const checkOut = travel.estimatedDeparture
    ? formatBrDateTime(travel.estimatedDeparture)
    : "—";

  const extra = `
    <div class="meta-item"><label>Check-in previsto</label><span>${escapeHtml(checkIn)}</span></div>
    <div class="meta-item"><label>Check-out previsto</label><span>${escapeHtml(checkOut)}</span></div>
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
    ${travelMetaHtml(travel, extra)}
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
    null,
    "Relação de Hóspedes",
    travel.categoryLabel,
    body,
    size,
  );
}

export function buildProgramacaoPrintHtml(
  data: ProgramacaoSemanalReportDto,
  size: PrintPageSize = "A4",
): string {
  const catHeaders = data.categories
    .map(
      (c) =>
        `<th>${escapeHtml(data.categoryLabels[c] ?? c)}</th>`,
    )
    .join("");

  const rows = data.days
    .map((day) => {
      const cells = data.categories
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
      return `<tr>
        <td class="day-cell">${escapeHtml(day.weekdayLabel)}<br/><span style="font-weight:500;font-size:9px;color:#64748b">${escapeHtml(day.dateLabel)}</span></td>
        ${cells}
      </tr>`;
    })
    .join("");

  const body = `
    <div class="meta-grid">
      <div class="meta-item full">
        <label>Período</label>
        <span>${escapeHtml(data.period.label)}</span>
      </div>
      <div class="meta-item full">
        <label>Categorias</label>
        <span>${escapeHtml(
          data.categories.map((c) => data.categoryLabels[c] ?? c).join(" · ") || "Todas",
        )}</span>
      </div>
    </div>
    <section class="section schedule-wrap">
      <h2 class="section-title">Programação semanal</h2>
      <table class="schedule-table">
        <thead>
          <tr>
            <th>Dia</th>
            ${catHeaders}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>
  `;

  return documentShell(
    `Programação Semanal — ${data.tenant.name}`,
    data.tenant.name,
    null,
    "Programação Semanal",
    data.period.label,
    body,
    size,
  );
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

export function openReportPreview(html: string): void {
  if (typeof window === "undefined") return;
  const w = window.open("", "_blank", "noopener,noreferrer,width=920,height=720");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}
