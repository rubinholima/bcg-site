describe('validação jogador próprio vs adversário', () => {
  function validatePlayerSides(input: { playerId?: string; opponentPlayerId?: string }) {
    if (input.playerId?.trim() && input.opponentPlayerId?.trim()) {
      throw new Error('Use apenas jogador do elenco ou adversário, não ambos.');
    }
    return true;
  }

  it('rejeita Player e opponentPlayer no mesmo evento', () => {
    expect(() => validatePlayerSides({ playerId: 'p1', opponentPlayerId: 'o1' })).toThrow();
  });

  it('aceita só elenco próprio', () => {
    expect(validatePlayerSides({ playerId: 'p1' })).toBe(true);
  });

  it('aceita só adversário', () => {
    expect(validatePlayerSides({ opponentPlayerId: 'o1' })).toBe(true);
  });
});
