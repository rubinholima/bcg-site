/** Programa ACTIVE sem nenhuma sessão registrada = encaminhamento aguardando 1ª ação da Performance. */
export function isNewTransitionReferral(sessionCount: number, status: string): boolean {
  return status === 'active' && sessionCount === 0;
}

export function parseMonthKey(month: string): { year: number; month: number } | null {
  const m = month.trim().match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const monthNum = Number(m[2]);
  if (monthNum < 1 || monthNum > 12) return null;
  return { year, month: monthNum };
}

export function monthDateRange(month: string): {
  monthKey: string;
  from: string;
  to: string;
  start: Date;
  end: Date;
} | null {
  const parsed = parseMonthKey(month);
  if (!parsed) return null;
  const { year, month: monthNum } = parsed;
  const from = `${year}-${String(monthNum).padStart(2, '0')}-01`;
  const lastDay = new Date(Date.UTC(year, monthNum, 0)).getUTCDate();
  const to = `${year}-${String(monthNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return {
    monthKey: `${year}-${String(monthNum).padStart(2, '0')}`,
    from,
    to,
    start: new Date(`${from}T00:00:00.000Z`),
    end: new Date(`${to}T23:59:59.999Z`),
  };
}

export function dateKeyInMonth(sessionDate: string, month: string): boolean {
  return sessionDate.startsWith(`${month}-`) || sessionDate.slice(0, 7) === month;
}

export type TransitionReportProgramInput = {
  id: string;
  playerId: string;
  playerName: string;
  category: string | null;
  status: string;
  startedAt: Date;
  completedAt: Date | null;
  originSummary: string;
  entries: Array<{
    sessionDate: string;
    durationMinutes: number;
    objective: string | null;
    activities: string | null;
    evolutionNote: string | null;
    needsNewSession: boolean;
  }>;
};

export type TransitionMonthlyProgramRow = {
  programId: string;
  playerId: string;
  playerName: string;
  category: string | null;
  originSummary: string;
  startedAt: string;
  completedAt: string | null;
  programStatus: string;
  enteredInMonth: boolean;
  releasedInMonth: boolean;
  activeAtMonthEnd: boolean;
  hadActivityInMonth: boolean;
  sessionsInMonth: number;
  durationMinutesInMonth: number;
  totalProgramSessions: number;
  totalProgramDurationMinutes: number;
  monthEvolutionNotes: string[];
};

export type TransitionMonthlyReportResult = {
  month: string;
  from: string;
  to: string;
  summary: {
    enteredInMonth: number;
    withActivityInMonth: number;
    releasedInMonth: number;
    activeAtMonthEnd: number;
    sessionsInMonth: number;
    durationMinutesInMonth: number;
  };
  programs: TransitionMonthlyProgramRow[];
};

function isWithinRange(date: Date, start: Date, end: Date): boolean {
  return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
}

export function programActiveAtMonthEnd(
  program: Pick<TransitionReportProgramInput, 'status' | 'startedAt' | 'completedAt'>,
  monthEnd: Date,
): boolean {
  if (program.status === 'cancelled') return false;
  if (program.startedAt.getTime() > monthEnd.getTime()) return false;
  if (!program.completedAt) return program.status === 'active';
  return program.completedAt.getTime() > monthEnd.getTime();
}

export function buildTransitionMonthlyReport(
  programs: TransitionReportProgramInput[],
  month: string,
): TransitionMonthlyReportResult | null {
  const range = monthDateRange(month);
  if (!range) return null;

  const rows: TransitionMonthlyProgramRow[] = [];

  for (const program of programs) {
    const monthEntries = program.entries.filter((e) => dateKeyInMonth(e.sessionDate, range.monthKey));
    const sessionsInMonth = monthEntries.length;
    const durationMinutesInMonth = monthEntries.reduce((n, e) => n + (e.durationMinutes ?? 0), 0);
    const enteredInMonth = isWithinRange(program.startedAt, range.start, range.end);
    const releasedInMonth =
      program.status === 'completed' &&
      !!program.completedAt &&
      isWithinRange(program.completedAt, range.start, range.end);
    const activeAtMonthEnd = programActiveAtMonthEnd(program, range.end);
    const hadActivityInMonth =
      enteredInMonth || releasedInMonth || sessionsInMonth > 0 || activeAtMonthEnd;

    if (!hadActivityInMonth) continue;

    const monthEvolutionNotes = monthEntries
      .map((e) => e.evolutionNote?.trim())
      .filter((n): n is string => !!n);

    rows.push({
      programId: program.id,
      playerId: program.playerId,
      playerName: program.playerName,
      category: program.category,
      originSummary: program.originSummary,
      startedAt: program.startedAt.toISOString(),
      completedAt: program.completedAt?.toISOString() ?? null,
      programStatus: program.status,
      enteredInMonth,
      releasedInMonth,
      activeAtMonthEnd,
      hadActivityInMonth,
      sessionsInMonth,
      durationMinutesInMonth,
      totalProgramSessions: program.entries.length,
      totalProgramDurationMinutes: program.entries.reduce((n, e) => n + (e.durationMinutes ?? 0), 0),
      monthEvolutionNotes,
    });
  }

  rows.sort((a, b) => a.playerName.localeCompare(b.playerName, 'pt-BR'));

  const summary = {
    enteredInMonth: rows.filter((r) => r.enteredInMonth).length,
    withActivityInMonth: rows.length,
    releasedInMonth: rows.filter((r) => r.releasedInMonth).length,
    activeAtMonthEnd: rows.filter((r) => r.activeAtMonthEnd).length,
    sessionsInMonth: rows.reduce((n, r) => n + r.sessionsInMonth, 0),
    durationMinutesInMonth: rows.reduce((n, r) => n + r.durationMinutesInMonth, 0),
  };

  return {
    month: range.monthKey,
    from: range.from,
    to: range.to,
    summary,
    programs: rows,
  };
}
