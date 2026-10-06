import { PRE_MATCH_SECTION_KEYS } from './performance-analysis-workflows.constants';

export function selectPreMatchPresentationVersion<
  T extends { id: string; lifecycle: string; versionNumber: number },
>(versions: T[]): T | null {
  if (!versions.length) return null;
  const sorted = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);
  return (
    sorted.find((v) => v.lifecycle === 'PRESENTED') ??
    sorted.find((v) => v.lifecycle === 'APPROVED') ??
    sorted[0]
  );
}

export function presentationSectionKeys(hiddenSections: unknown): string[] {
  const hidden = new Set(Array.isArray(hiddenSections) ? (hiddenSections as string[]) : []);
  return PRE_MATCH_SECTION_KEYS.filter((k) => !hidden.has(k));
}

export function orderedSelectedClipIds(selectedClipIds: unknown): string[] {
  if (!Array.isArray(selectedClipIds)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of selectedClipIds) {
    if (typeof raw !== 'string') continue;
    const id = raw.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}
