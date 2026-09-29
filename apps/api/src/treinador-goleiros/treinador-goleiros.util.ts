import { normalizeFootballPositionCode } from '../common/football-positions.util';

export function isGoalkeeperPosition(position: string | null | undefined): boolean {
  if (!position?.trim()) return false;
  const code = normalizeFootballPositionCode(position);
  return code === 'GOLEIRO';
}

const YOUTUBE_RE =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/)|youtu\.be\/)[\w-]+/i;

export function normalizeYoutubeUrl(url: string | null | undefined): string | null {
  const t = url?.trim();
  if (!t) return null;
  if (!YOUTUBE_RE.test(t)) return null;
  if (t.startsWith('http')) return t;
  return `https://${t}`;
}

export function crossCategoryLabel(
  playerCategory: string | null | undefined,
  sessionCategory: string | null | undefined,
): string | null {
  if (!playerCategory?.trim() || !sessionCategory?.trim()) return null;
  if (playerCategory.trim() === sessionCategory.trim()) return null;
  return `${playerCategory.trim()} · treinou com ${sessionCategory.trim()}`;
}
