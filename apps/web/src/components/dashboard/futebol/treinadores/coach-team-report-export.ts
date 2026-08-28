import * as XLSX from "xlsx";
import type { TeamReportEvaluationRow } from "./CoachTeamReportPlayerDetailSheet";

export function exportTeamReportEvaluationsExcel(
  rows: TeamReportEvaluationRow[],
  periodLabel: string,
  periodKey: string,
) {
  const data = rows.map((row, idx) => ({
    "#": idx + 1,
    Atleta: row.name,
    "Min. jogo": row.gamesMinutes,
    "Min. treino": row.trainingMinutes,
    Nota: row.coachFinalRating ?? "",
    Observação: row.individualObservation ?? "",
  }));
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, periodLabel.slice(0, 31) || "Relatório");
  XLSX.writeFile(workbook, `relatorio-equipe-${periodKey}.xlsx`);
}
