import {
  buildTransitionMonthlyReport,
  dateKeyInMonth,
  isNewTransitionReferral,
  monthDateRange,
  programActiveAtMonthEnd,
} from './fisiologia-transition.util';

describe('isNewTransitionReferral', () => {
  it('marca encaminhamento sem sessão como novo', () => {
    expect(isNewTransitionReferral(0, 'active')).toBe(true);
    expect(isNewTransitionReferral(1, 'active')).toBe(false);
    expect(isNewTransitionReferral(0, 'completed')).toBe(false);
  });
});

describe('month boundary semantics — caso I (Ago/Set)', () => {
  const program = {
    id: 'p1',
    playerId: 'pl1',
    playerName: 'Atleta Teste',
    category: 'U17',
    status: 'completed' as string,
    startedAt: new Date('2025-08-25T12:00:00.000Z'),
    completedAt: new Date('2025-09-05T12:00:00.000Z'),
    originSummary: 'Joelho',
    entries: [
      {
        sessionDate: '2025-08-27',
        durationMinutes: 45,
        objective: 'Obj Ago',
        activities: 'Ativ Ago',
        evolutionNote: 'Evo Ago',
        needsNewSession: true,
      },
      {
        sessionDate: '2025-09-02',
        durationMinutes: 30,
        objective: 'Obj Set1',
        activities: null,
        evolutionNote: null,
        needsNewSession: true,
      },
      {
        sessionDate: '2025-09-05',
        durationMinutes: 40,
        objective: 'Alta',
        activities: null,
        evolutionNote: 'Liberado',
        needsNewSession: false,
      },
    ],
  };

  it('relatório de agosto', () => {
    const aug = buildTransitionMonthlyReport([program], '2025-08');
    expect(aug).not.toBeNull();
    expect(aug!.summary.enteredInMonth).toBe(1);
    expect(aug!.summary.sessionsInMonth).toBe(1);
    expect(aug!.summary.durationMinutesInMonth).toBe(45);
    expect(aug!.summary.releasedInMonth).toBe(0);
    expect(aug!.programs[0]!.activeAtMonthEnd).toBe(true);
    expect(aug!.programs[0]!.enteredInMonth).toBe(true);
    expect(aug!.programs[0]!.sessionsInMonth).toBe(1);
  });

  it('relatório de setembro', () => {
    const sep = buildTransitionMonthlyReport([program], '2025-09');
    expect(sep).not.toBeNull();
    expect(sep!.summary.enteredInMonth).toBe(0);
    expect(sep!.summary.sessionsInMonth).toBe(2);
    expect(sep!.summary.durationMinutesInMonth).toBe(70);
    expect(sep!.summary.releasedInMonth).toBe(1);
    expect(sep!.programs[0]!.activeAtMonthEnd).toBe(false);
    expect(sep!.programs[0]!.enteredInMonth).toBe(false);
  });

  it('dateKeyInMonth respeita mês calendário', () => {
    expect(dateKeyInMonth('2025-08-27', '2025-08')).toBe(true);
    expect(dateKeyInMonth('2025-09-02', '2025-08')).toBe(false);
  });

  it('programActiveAtMonthEnd em 31/08', () => {
    const endAug = monthDateRange('2025-08')!.end;
    expect(programActiveAtMonthEnd(program, endAug)).toBe(true);
    const endSep = monthDateRange('2025-09')!.end;
    expect(programActiveAtMonthEnd(program, endSep)).toBe(false);
  });
});

describe('programas cancelados', () => {
  it('não contam como ativos no fim do mês', () => {
    const end = monthDateRange('2025-08')!.end;
    expect(
      programActiveAtMonthEnd(
        {
          status: 'cancelled',
          startedAt: new Date('2025-08-01T12:00:00.000Z'),
          completedAt: null,
        },
        end,
      ),
    ).toBe(false);
  });
});
