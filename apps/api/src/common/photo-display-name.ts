/** Espelha apps/web/src/lib/utils.ts — padrão único de nome de foto na mídia. */
export const PHOTO_DEPARTMENT_JOGADORES = 'Jogadores';

export function getPhotoDisplayName(name: string, department?: string | null): string {
  const n = (name ?? '').trim();
  const d = (department ?? '').trim();
  return [n, d].filter(Boolean).join(' ');
}

/** Jogadores: nome + categoria (sub14…) ou "Jogadores" se sem categoria. */
export function getPlayerPhotoDisplayName(name: string, category?: string | null): string {
  return getPhotoDisplayName(name, category?.trim() || PHOTO_DEPARTMENT_JOGADORES);
}
