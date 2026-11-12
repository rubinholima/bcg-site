const RESERVED = new Set(["1", "2", "3", " "]);

export function detectShortcutConflicts(
  tags: Array<{ id: string; shortcutKey: string | null }>,
  candidate: { id?: string; shortcutKey: string | null },
): string[] {
  const key = candidate.shortcutKey?.trim().toLowerCase();
  if (!key) return [];
  const conflicts: string[] = [];
  if (RESERVED.has(key) && !["1", "2", "3"].includes(key)) {
    conflicts.push(key);
  }
  for (const t of tags) {
    if (candidate.id && t.id === candidate.id) continue;
    const k = t.shortcutKey?.trim().toLowerCase();
    if (k && k === key) conflicts.push(key);
  }
  return [...new Set(conflicts)];
}
