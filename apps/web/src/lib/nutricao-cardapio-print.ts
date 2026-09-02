import { ReportLegacyDocument } from "@/lib/report-print-layout";
import { formatDateDayMonYear } from "@/lib/format-date";
import { printHtmlDocument } from "@/lib/futebol-relatorios-print";
import type { KitchenMenuReport, KitchenPrintPeriod } from "@/lib/nutricao-types";

function esc(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function periodLabel(period: KitchenPrintPeriod): string {
  if (period === "day") return "Dia";
  if (period === "week") return "Semana";
  return "Mês";
}

function dayContextLabel(ctx: string | null | undefined): string {
  if (ctx === "treino") return "Treino";
  if (ctx === "jogo") return "Jogo";
  if (ctx === "folga") return "Folga";
  return ctx ?? "—";
}

export function buildKitchenMenuPrintHtml(
  report: KitchenMenuReport,
  period: KitchenPrintPeriod,
): string {
  const title = `Cardápio — ${report.category.name} — ${periodLabel(period)}`;
  const range = `${formatDateDayMonYear(new Date(`${report.startDate}T12:00:00`))} a ${formatDateDayMonYear(new Date(`${report.endDate}T12:00:00`))}`;

  const mealOrder = report.mealTypes.map((m) => m.id);
  const mealName = (id: string) => report.mealTypes.find((m) => m.id === id)?.name ?? "Refeição";

  const daysHtml =
    report.days.length === 0
      ? `<p class="muted">Nenhum cardápio cadastrado no período.</p>`
      : report.days
          .map((day) => {
            const grouped = new Map<string, typeof day.menu.items>();
            for (const item of day.menu.items) {
              const list = grouped.get(item.mealType.id) ?? [];
              list.push(item);
              grouped.set(item.mealType.id, list);
            }
            const orderedMealIds = [...grouped.keys()].sort(
              (a, b) => mealOrder.indexOf(a) - mealOrder.indexOf(b),
            );

            const mealsBlock =
              orderedMealIds.length === 0
                ? `<p class="muted">Cardápio sem itens cadastrados.</p>`
                : orderedMealIds
                    .map((mealId) => {
                      const items = grouped.get(mealId) ?? [];
                      const rows = items
                        .map(
                          (item) => `<tr>
                            <td>${esc(item.description)}</td>
                            <td class="num">${item.calories ?? "—"}</td>
                            <td class="num">${item.proteinG ?? "—"}</td>
                            <td class="num">${item.carbsG ?? "—"}</td>
                            <td class="num">${item.fatsG ?? "—"}</td>
                          </tr>`,
                        )
                        .join("");
                      return `<h3>${esc(mealName(mealId))}</h3>
                        <table>
                          <thead><tr>
                            <th>Prato / preparo</th>
                            <th>kcal</th>
                            <th>Prot (g)</th>
                            <th>Carb (g)</th>
                            <th>Gord (g)</th>
                          </tr></thead>
                          <tbody>${rows}</tbody>
                        </table>`;
                    })
                    .join("");

            return `<section class="day-block">
              <h2>${formatDateDayMonYear(new Date(day.date))} — ${esc(day.menu.name)}</h2>
              <p class="meta">Contexto: ${esc(dayContextLabel(day.dayContext))}${day.notes ? ` · ${esc(day.notes)}` : ""}</p>
              ${mealsBlock}
            </section>`;
          })
          .join("");

  const body = `<h1>${esc(title)}</h1>
    <p class="meta">${esc(report.tenant.name)} · ${range}</p>
    <p class="meta">Documento para cozinha / refeitório</p>
    ${daysHtml}`;

  return ReportLegacyDocument(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${esc(title)}</title>
<style>
  @page { size: A4; margin: 12mm; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #111; }
  h1 { font-size: 16px; margin: 0 0 4px; }
  h2 { font-size: 13px; margin: 18px 0 6px; page-break-after: avoid; }
  h3 { font-size: 12px; margin: 10px 0 4px; }
  .meta { color: #444; margin: 0 0 8px; }
  .muted { color: #666; }
  .day-block { page-break-inside: avoid; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0 10px; }
  th, td { border: 1px solid #ccc; padding: 4px 6px; vertical-align: top; }
  th { background: #f3f3f3; text-align: left; }
  .num { text-align: right; white-space: nowrap; }
</style>
</head>
<body>${body}</body>
</html>`);
}

export function printKitchenMenuReport(report: KitchenMenuReport, period: KitchenPrintPeriod): void {
  const title = `Cardápio — ${report.category.name} — ${period}`;
  printHtmlDocument(buildKitchenMenuPrintHtml(report, period), title);
}

export function getKitchenDateRange(
  anchorDate: string,
  period: KitchenPrintPeriod,
): { startDate: string; endDate: string } {
  const base = new Date(`${anchorDate}T12:00:00`);
  if (period === "day") {
    const d = anchorDate.slice(0, 10);
    return { startDate: d, endDate: d };
  }
  if (period === "week") {
    const day = base.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const start = new Date(base);
    start.setDate(start.getDate() + diff);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    };
  }
  const start = new Date(base.getFullYear(), base.getMonth(), 1);
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}
