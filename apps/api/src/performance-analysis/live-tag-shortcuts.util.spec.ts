// Testes do resolver de atalhos (espelho do cliente web).

const RESERVED_POSSESSION_KEYS = ['1', '2', '3'] as const;

function findTagShortcutConflictApi(
  tags: Array<{ id: string; shortcutKey?: string | null }>,
  extraKeys: string[] = [],
): string[] {
  const seen = new Map<string, string>();
  const conflicts: string[] = [];
  for (const key of [...RESERVED_POSSESSION_KEYS, ...extraKeys]) {
    if (seen.has(key)) conflicts.push(key);
    else seen.set(key, 'reserved');
  }
  for (const t of tags) {
    const k = t.shortcutKey?.trim().toLowerCase();
    if (!k) continue;
    if (seen.has(k)) conflicts.push(k);
    else seen.set(k, t.id);
  }
  return [...new Set(conflicts)];
}

function isFocusProtectedTarget(target: { tagName?: string; isContentEditable?: boolean } | null): boolean {
  if (!target?.tagName) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  return false;
}

describe('live-tag-shortcuts', () => {
  it('detecta conflito entre atalho de tag e posse 1/2/3', () => {
    const conflicts = findTagShortcutConflictApi([{ id: 't1', shortcutKey: '1' }]);
    expect(conflicts).toContain('1');
  });

  it('protege foco em input', () => {
    const input = { tagName: 'INPUT', isContentEditable: false, closest: () => null } as unknown as HTMLElement;
    expect(isFocusProtectedTarget(input)).toBe(true);
  });

});
