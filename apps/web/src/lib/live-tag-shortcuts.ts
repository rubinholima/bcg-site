export const RESERVED_POSSESSION_KEYS = ["1", "2", "3"] as const;

export type PossessionShortcutKey = (typeof RESERVED_POSSESSION_KEYS)[number];

export const DEFAULT_POSSESSION_SHORTCUTS: Record<PossessionShortcutKey, "our" | "opponent" | "out"> = {
  "1": "our",
  "2": "opponent",
  "3": "out",
};

export function isFocusProtectedTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  return Boolean(
    target.closest(
      "[contenteditable='true'], [role='dialog'], [data-radix-collection-item], [data-skip-live-shortcuts='true']",
    ),
  );
}

export function findTagShortcutConflict(
  tags: Array<{ id: string; shortcutKey?: string | null }>,
  extraKeys: string[] = [],
): string[] {
  const seen = new Map<string, string>();
  const conflicts: string[] = [];
  for (const key of [...RESERVED_POSSESSION_KEYS, ...extraKeys]) {
    if (seen.has(key)) conflicts.push(key);
    else seen.set(key, "reserved");
  }
  for (const t of tags) {
    const k = t.shortcutKey?.trim().toLowerCase();
    if (!k) continue;
    if (seen.has(k)) conflicts.push(k);
    else seen.set(k, t.id);
  }
  return [...new Set(conflicts)];
}

export function shouldIgnoreKeyRepeat(e: KeyboardEvent): boolean {
  return e.repeat && (RESERVED_POSSESSION_KEYS as readonly string[]).includes(e.key);
}
