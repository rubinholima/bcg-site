import {
  buildHighlightItems,
  normalizePsychologyRecords,
  resolveAssists,
} from './player-dossier-content.util';

describe('player-dossier-content.util', () => {
  it('normaliza registros psicológicos com observações', () => {
    const records = normalizePsychologyRecords([
      {
        date: '2025-03-10',
        kind: 'anamnese',
        evaluator: 'Dra. Silva',
        objetivoPrincipal: 'Jogar profissionalmente',
        pressaoJogo: 'Lida bem sob pressão',
      },
    ]);
    expect(records).toHaveLength(1);
    expect(records[0].evaluator).toBe('Dra. Silva');
    expect(records[0].observations.length).toBeGreaterThan(0);
  });

  it('monta highlights de URLs e imagens', () => {
    const items = buildHighlightItems({
      highlights: ['https://youtube.com/watch?v=abc'],
      images: [{ url: 'https://example.com/foto.jpg', type: 'Ação' }],
    });
    expect(items).toHaveLength(2);
    expect(items[0].kind).toBe('video');
    expect(items[1].kind).toBe('image');
  });

  it('resolve assistências do perfil ou avaliações CT', () => {
    expect(resolveAssists({ profileAssists: 3, coachEvaluations: [] })).toBe(3);
    expect(
      resolveAssists({
        profileAssists: null,
        coachEvaluations: [{ assists: 2 }, { assists: 1 }],
      }),
    ).toBe(3);
    expect(resolveAssists({ profileAssists: null, coachEvaluations: [] })).toBeNull();
  });

  it('inclui registros de presença quando não há anamnese textual', () => {
    const records = normalizePsychologyRecords([
      {
        date: '2025-04-01',
        kind: 'atendimento_grupo',
        evaluator: 'Dra. Silva',
        present: true,
        category: 'sub20',
      },
    ]);
    expect(records).toHaveLength(1);
    expect(records[0].observations.some((o) => o.label === 'Presença')).toBe(true);
  });
});
