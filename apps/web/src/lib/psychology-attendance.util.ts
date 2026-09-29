import type { PsychologyAttendanceRow } from "@/types/psychology-session";

export function isPsychologyAttendancePresent(row: PsychologyAttendanceRow): boolean {
  return row.present === true;
}

export function listPsychologyAbsentAttendance(
  rows: PsychologyAttendanceRow[] | null | undefined,
): PsychologyAttendanceRow[] {
  if (!rows?.length) return [];
  return rows.filter((r) => !isPsychologyAttendancePresent(r));
}

export function formatPsychologyAbsentListText(input: {
  date: string;
  categoryLabel: string;
  tenantName?: string;
  absent: PsychologyAttendanceRow[];
}): string {
  const header = [
    "Psicologia — atletas ausentes na chamada",
    input.tenantName ? `Clube: ${input.tenantName}` : null,
    `Data: ${input.date}`,
    `Categoria: ${input.categoryLabel}`,
    `Total ausentes: ${input.absent.length}`,
    "",
  ]
    .filter(Boolean)
    .join("\n");

  if (input.absent.length === 0) {
    return `${header}Nenhum ausente registrado.`;
  }

  const lines = input.absent.map(
    (row, i) => `${i + 1}. ${(row.playerName ?? "Atleta").trim()}`,
  );
  return `${header}${lines.join("\n")}`;
}
