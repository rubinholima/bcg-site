import { formatDateDayMonYear } from "@/lib/format-date";
import { printHtmlDocument } from "@/lib/futebol-relatorios-print";
import { REPORT_PRINT_BREAK_CSS, wrapPrintRootDocument } from "@/lib/report-print-layout";
import type { ComprasEstoqueReport } from "@/lib/compras-relatorios-types";
import { scopeLabel } from "@/lib/compras-relatorios-types";

const ADM = {
  emerald: "#059669",
  emeraldDark: "#047857",
  sky: "#0284c7",
  skyLight: "#E0F2FE",
  emeraldLight: "#D1FAE5",
} as const;

function esc(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtMoney(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtQty(qty: number, unit: string | null): string {
  const sign = qty > 0 ? "+" : "";
  const u = unit?.trim() ? ` ${unit.trim()}` : "";
  return `${sign}${qty}${u}`;
}

function periodText(report: ComprasEstoqueReport): string {
  const { from, to } = report.period;
  if (from && to) {
    return `${formatDateDayMonYear(new Date(`${from}T12:00:00`))} a ${formatDateDayMonYear(new Date(`${to}T12:00:00`))}`;
  }
  if (from) return `A partir de ${formatDateDayMonYear(new Date(`${from}T12:00:00`))}`;
  if (to) return `Até ${formatDateDayMonYear(new Date(`${to}T12:00:00`))}`;
  return "Período completo";
}

function summaryCards(report: ComprasEstoqueReport): string {
  const s = report.summary;
  return `<div class="summary-grid">
    <div class="summary-card"><span class="summary-label">Movimentos</span><strong>${s.movementCount}</strong></div>
    <div class="summary-card"><span class="summary-label">Entradas</span><strong>${s.entriesCount}</strong><small>+${s.totalEntryQty} un.</small></div>
    <div class="summary-card"><span class="summary-label">Saídas</span><strong>${s.exitsCount}</strong><small>−${s.totalExitQty} un.</small></div>
    <div class="summary-card"><span class="summary-label">Requisições</span><strong>${s.requisitionCount}</strong></div>
    <div class="summary-card"><span class="summary-label">Pedidos</span><strong>${s.orderCount}</strong></div>
  </div>`;
}

function movementsTable(rows: ComprasEstoqueReport["movements"]): string {
  if (rows.length === 0) {
    return `<p class="muted">Nenhuma movimentação no período/filtro.</p>`;
  }
  const body = rows
    .map(
      (r) => `<tr>
        <td>${esc(formatDateDayMonYear(new Date(r.date)))}</td>
        <td><span class="badge ${r.quantity > 0 ? "badge-in" : "badge-out"}">${esc(r.direction)}</span></td>
        <td>${esc(r.productName)}${r.sku ? `<div class="muted">${esc(r.sku)}</div>` : ""}</td>
        <td>${esc(r.inventoryKindLabel)}</td>
        <td class="num">${esc(fmtQty(r.quantity, r.unit))}</td>
        <td class="num">${esc(fmtMoney(r.unitPrice))}</td>
        <td class="num">${esc(fmtMoney(r.totalValue))}</td>
        <td>${esc(r.departmentName ?? "—")}</td>
        <td>${esc(r.notes ?? r.referenceLabel ?? "—")}</td>
      </tr>`,
    )
    .join("");
  return `<table class="data">
    <thead><tr>
      <th>Data</th><th>Tipo</th><th>Produto</th><th>Categoria</th><th>Qtd</th><th>Unit.</th><th>Total</th><th>Dept.</th><th>Obs.</th>
    </tr></thead>
    <tbody>${body}</tbody>
  </table>`;
}

function requisitionsTable(rows: ComprasEstoqueReport["requisitions"]): string {
  if (rows.length === 0) return `<p class="muted">Nenhuma requisição no período.</p>`;
  const body = rows
    .map(
      (r) => `<tr>
        <td>${esc(formatDateDayMonYear(new Date(r.date)))}</td>
        <td>${esc(r.departmentName ?? "—")}</td>
        <td>${esc(r.requestedByName ?? "—")}</td>
        <td>${esc(r.statusLabel)}</td>
        <td class="num">${esc(fmtMoney(r.approvedTotal ?? r.totalEstimated))}</td>
        <td>${esc(r.itemsSummary)}</td>
      </tr>`,
    )
    .join("");
  return `<table class="data">
    <thead><tr>
      <th>Data</th><th>Departamento</th><th>Solicitante</th><th>Status</th><th>Valor</th><th>Itens</th>
    </tr></thead>
    <tbody>${body}</tbody>
  </table>`;
}

function ordersTable(rows: ComprasEstoqueReport["orders"]): string {
  if (rows.length === 0) return `<p class="muted">Nenhum pedido no período.</p>`;
  const body = rows
    .map(
      (r) => `<tr>
        <td>${esc(formatDateDayMonYear(new Date(r.date)))}</td>
        <td>${esc(r.orderNumber ?? r.id.slice(0, 8))}</td>
        <td>${esc(r.supplierName)}</td>
        <td>${esc(r.statusLabel)}</td>
        <td>${esc(r.requisitionDepartment ?? "—")}</td>
        <td class="num">${esc(fmtMoney(r.totalAmount))}</td>
        <td>${esc(r.itemsSummary)}</td>
      </tr>`,
    )
    .join("");
  return `<table class="data">
    <thead><tr>
      <th>Data</th><th>Pedido</th><th>Fornecedor</th><th>Status</th><th>Dept.</th><th>Valor</th><th>Itens</th>
    </tr></thead>
    <tbody>${body}</tbody>
  </table>`;
}

export function buildComprasEstoquePrintHtml(report: ComprasEstoqueReport): string {
  const title = `Estoque e Compras — ${report.tenant.name}`;
  const scope = scopeLabel(report.scope);
  const dept = report.filters.departmentName ? ` · Dept. ${report.filters.departmentName}` : "";

  const showMovements =
    report.scope === "geral" ||
    report.scope === "entradas" ||
    report.scope === "saidas" ||
    report.scope === "saidas_departamento" ||
    report.scope === "cozinha";
  const showRequisitions = report.scope === "geral" || report.scope === "requisicoes";
  const showOrders = report.scope === "geral" || report.scope === "compras" || report.scope === "entradas";

  const sections: string[] = [];
  if (showMovements) {
    sections.push(`<section class="section"><h2>Movimentações de estoque</h2>${movementsTable(report.movements)}</section>`);
  }
  if (showRequisitions) {
    sections.push(`<section class="section"><h2>Requisições de compra</h2>${requisitionsTable(report.requisitions)}</section>`);
  }
  if (showOrders) {
    sections.push(`<section class="section"><h2>Pedidos de compra</h2>${ordersTable(report.orders)}</section>`);
  }

  const styles = `
    @page { size: A4 landscape; margin: 10mm; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #111; margin: 0; }
    h1 { font-size: 18px; margin: 0 0 4px; color: ${ADM.emeraldDark}; }
    h2 { font-size: 13px; margin: 18px 0 8px; color: ${ADM.sky}; border-bottom: 2px solid ${ADM.emeraldLight}; padding-bottom: 4px; }
    .brand-bar { height: 4px; background: linear-gradient(90deg, ${ADM.emerald}, ${ADM.sky}); margin-bottom: 10px; border-radius: 2px; }
    .meta { color: #444; margin-bottom: 10px; line-height: 1.5; }
    .summary-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin: 12px 0 16px; }
    .summary-card { border: 1px solid #d1d5db; border-radius: 8px; padding: 8px 10px; background: ${ADM.emeraldLight}; }
    .summary-card:nth-child(even) { background: ${ADM.skyLight}; }
    .summary-label { display: block; font-size: 9px; color: #555; text-transform: uppercase; letter-spacing: 0.04em; }
    .summary-card strong { font-size: 16px; color: #111; }
    .summary-card small { display: block; color: #666; margin-top: 2px; }
    table.data { width: 100%; border-collapse: collapse; }
    table.data th, table.data td { border: 1px solid #ccc; padding: 5px 6px; vertical-align: top; }
    table.data th { background: #f3f4f6; text-align: left; font-size: 9px; text-transform: uppercase; }
    .num { text-align: right; white-space: nowrap; }
    .muted { color: #666; font-size: 9px; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; }
    .badge-in { background: ${ADM.emeraldLight}; color: ${ADM.emeraldDark}; }
    .badge-out { background: #FEE2E2; color: #991B1B; }
    .section { margin-bottom: 8px; }
    ${REPORT_PRINT_BREAK_CSS}
  `;

  const headerHtml = `
    <div class="brand-bar"></div>
    <h1>${esc(title)}</h1>
  `;

  const metaHtml = `
    <div class="meta">
      <div><strong>Escopo:</strong> ${esc(scope)}${esc(dept)}</div>
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
    footerHtml: `<div style="font-size:9px;color:#666;padding-top:8px;">Boston City Group — Estoque e Compras</div>`,
  });
}

export function printComprasEstoqueReport(report: ComprasEstoqueReport): void {
  printHtmlDocument(buildComprasEstoquePrintHtml(report), "Relatório — Estoque e Compras");
}
