import * as XLSX from "xlsx";
import {
  NEGOTIATION_STATUS_LABELS,
  NEGOTIATION_TYPE_LABELS,
  formatNegotiationMoney,
} from "@/lib/player-negotiation-labels";

export type NegotiationExportRow = {
  player: { name: string };
  negotiationType: string;
  status: string;
  counterpartyName: string;
  totalValue: number | null;
  currency: string;
  negotiatedPercentage: number | null;
  retainedPercentage: number | null;
  negotiatedAt: string | null;
};

export function exportNegotiationsXlsx(rows: NegotiationExportRow[], filenameBase: string) {
  const sheetRows = rows.map((n) => ({
    Atleta: n.player.name,
    Tipo: NEGOTIATION_TYPE_LABELS[n.negotiationType] ?? n.negotiationType,
    Status: NEGOTIATION_STATUS_LABELS[n.status] ?? n.status,
    Contraparte: n.counterpartyName,
    Valor: n.totalValue != null ? formatNegotiationMoney(n.totalValue, n.currency) : "",
    "Pct. negociada": n.negotiatedPercentage ?? "",
    "Pct. retida": n.retainedPercentage ?? "",
    "Data negociação": n.negotiatedAt ? n.negotiatedAt.slice(0, 10) : "",
  }));
  const worksheet = XLSX.utils.json_to_sheet(sheetRows.length ? sheetRows : [{}]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Negociações");
  XLSX.writeFile(workbook, `${filenameBase}.xlsx`);
}

export function downloadNegotiationsCsv(csvText: string, filenameBase: string) {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filenameBase}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
