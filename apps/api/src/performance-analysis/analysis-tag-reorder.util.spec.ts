describe('tag reorder', () => {
  function applyOrder(ids: string[], ordered: string[]) {
    const valid = new Set(ids);
    return ordered.filter((id) => valid.has(id)).map((id, index) => ({ id, sortOrder: (index + 1) * 10 }));
  }

  it('preserva ordem solicitada', () => {
    const r = applyOrder(['a', 'b', 'c'], ['c', 'a', 'b']);
    expect(r.map((x) => x.id)).toEqual(['c', 'a', 'b']);
    expect(r[0].sortOrder).toBe(10);
  });
});
