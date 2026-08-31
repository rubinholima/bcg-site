import * as XLSX from "xlsx";
import type { DynamicReportResultDto } from "@/lib/dynamic-reports-print";

export function exportDynamicReportExcel(
  data: DynamicReportResultDto,
  filenameBase: string,
): void {
  const rows: Record<string, string | number>[] = [];

  for (const section of data.sections) {
    for (const group of section.groups) {
      for (const row of group.rows) {
        const record: Record<string, string | number> = {};
        if (data.sections.length > 1) {
          record.Seção = section.sectionTitle;
        }
        if (group.groupName && group.groupName !== "—") {
          record.Grupo = group.groupName;
        }
        for (const col of data.columns) {
          const val = row.values[col.key];
          if (col.key === "signature") {
            record[col.label] = "";
          } else if (val == null) {
            record[col.label] = "";
          } else {
            record[col.label] = val;
          }
        }
        rows.push(record);
      }
    }
  }

  const worksheet = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{}]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório");
  XLSX.writeFile(workbook, `${filenameBase}.xlsx`);
}
