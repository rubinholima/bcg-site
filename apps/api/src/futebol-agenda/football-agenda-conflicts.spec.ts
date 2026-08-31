import {
  findSpaceConflicts,
  type AgendaConflictCandidate,
} from './football-agenda-conflicts';

const SPACE_MULTIUSO = 'space-multiuso';
const SPACE_CAMPO_1 = 'space-campo-1';

function candidate(
  overrides: Partial<AgendaConflictCandidate> & Pick<AgendaConflictCandidate, 'id'>,
): AgendaConflictCandidate {
  return {
    title: 'Treino',
    category: 'u15',
    type: 'treino',
    startAt: new Date('2026-08-31T14:00:00-03:00'),
    endAt: new Date('2026-08-31T15:00:00-03:00'),
    allDay: false,
    spaceId: SPACE_CAMPO_1,
    ...overrides,
  };
}

describe('findSpaceConflicts', () => {
  const inputBase = {
    spaceId: SPACE_MULTIUSO,
    startAt: new Date('2026-08-31T14:00:00-03:00'),
    endAt: new Date('2026-08-31T15:00:00-03:00'),
    allDay: false,
  };

  it('A) mesmo horário + espaços diferentes => sem conflito', () => {
    const rows = [
      candidate({ id: 'u17', category: 'u17', spaceId: SPACE_CAMPO_1 }),
    ];
    expect(findSpaceConflicts(rows, inputBase)).toEqual([]);
  });

  it('B) horários sobrepostos + mesmo espaço => conflito', () => {
    const rows = [
      candidate({
        id: 'u15-other',
        category: 'u15',
        spaceId: SPACE_MULTIUSO,
        startAt: new Date('2026-08-31T14:00:00-03:00'),
        endAt: new Date('2026-08-31T16:00:00-03:00'),
      }),
    ];
    expect(findSpaceConflicts(rows, inputBase).map((c) => c.id)).toEqual(['u15-other']);
  });

  it('C) mesmo espaço + horários sem sobreposição => sem conflito', () => {
    const rows = [
      candidate({
        id: 'later',
        spaceId: SPACE_MULTIUSO,
        startAt: new Date('2026-08-31T16:00:00-03:00'),
        endAt: new Date('2026-08-31T17:00:00-03:00'),
      }),
    ];
    expect(findSpaceConflicts(rows, inputBase)).toEqual([]);
  });

  it('D) edição exclui o próprio evento', () => {
    const rows = [
      candidate({
        id: 'self',
        spaceId: SPACE_MULTIUSO,
      }),
    ];
    expect(
      findSpaceConflicts(rows, {
        ...inputBase,
        excludeEntryId: 'self',
      }),
    ).toEqual([]);
  });

  it('ignora candidatos sem spaceId quando o recurso é cadastrado', () => {
    const rows = [
      candidate({ id: 'legacy', spaceId: null, category: 'u17' }),
    ];
    expect(findSpaceConflicts(rows, inputBase)).toEqual([]);
  });
});
