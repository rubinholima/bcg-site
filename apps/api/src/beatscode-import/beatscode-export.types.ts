import type { MappedBeatscodePlayer } from './beatscode-athlete.mapper';

/** Arquivo gerado localmente (export) e importado na produção sem credenciais Beatscode. */
export type BeatscodeExportAthlete = MappedBeatscodePlayer & {
  /** URL pública (S3) já espelhada no export local; opcional. */
  photoUrl?: string;
};

export type BeatscodeExportFile = {
  version: 1;
  exportedAt: string;
  apiUrl: string;
  tenantSlug: string;
  categoriesProcessed: string[];
  athletes: BeatscodeExportAthlete[];
  errors: string[];
};

export function isBeatscodeExportFile(v: unknown): v is BeatscodeExportFile {
  if (!v || typeof v !== 'object') return false;
  const o = v as BeatscodeExportFile;
  return (
    o.version === 1 &&
    typeof o.exportedAt === 'string' &&
    Array.isArray(o.athletes) &&
    typeof o.tenantSlug === 'string'
  );
}
