export type AgendaConflictCandidate = {
  id: string;
  title: string;
  category: string | null;
  type: string;
  startAt: Date;
  endAt: Date | null;
  allDay: boolean;
};

export function resolveAgendaEnd(startAt: Date, endAt: Date | null, allDay: boolean): Date {
  if (endAt && endAt.getTime() > startAt.getTime()) return endAt;
  if (allDay) {
    const end = new Date(startAt);
    end.setHours(23, 59, 59, 999);
    return end;
  }
  const end = new Date(startAt);
  end.setHours(end.getHours() + 1);
  return end;
}

export function agendaTimesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function findSpaceConflicts(
  candidates: AgendaConflictCandidate[],
  input: {
    startAt: Date;
    endAt: Date | null;
    allDay: boolean;
    category: string | null;
    excludeEntryId?: string;
  },
): AgendaConflictCandidate[] {
  const inputEnd = resolveAgendaEnd(input.startAt, input.endAt, input.allDay);
  return candidates.filter((c) => {
    if (input.excludeEntryId && c.id === input.excludeEntryId) return false;
    if (c.category && input.category && c.category === input.category) return false;
    const cEnd = resolveAgendaEnd(c.startAt, c.endAt, c.allDay);
    return agendaTimesOverlap(input.startAt, inputEnd, c.startAt, cEnd);
  });
}
