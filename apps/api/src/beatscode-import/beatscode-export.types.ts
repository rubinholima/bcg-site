import type { MappedBeatscodePlayer } from './beatscode-athlete.mapper';
import type { SerializedBeatscodeReferences } from './beatscode-references.serialize';

/** Arquivo gerado localmente (export) e importado na produção sem credenciais Beatscode. */
export type BeatscodeExportAthlete = MappedBeatscodePlayer & {
  /** URL pública (S3) já espelhada no export local; opcional. */
  photoUrl?: string;
  /** Categorias Beatscode onde o atleta apareceu (deduplicação). */
  beatscodeCategories?: string[];
};

export type BeatscodeExportFile = {
  version: 1 | 2;
  exportedAt: string;
  apiUrl: string;
  tenantSlug: string;
  categoriesProcessed: string[];
  athletes: BeatscodeExportAthlete[];
  errors: string[];
  /** v2: tabelas de lookup para reimport idêntico sem credenciais. */
  references?: SerializedBeatscodeReferences;
};

export function isBeatscodeExportFile(v: unknown): v is BeatscodeExportFile {
  if (!v || typeof v !== 'object') return false;
  const o = v as BeatscodeExportFile;
  return (
    (o.version === 1 || o.version === 2) &&
    typeof o.exportedAt === 'string' &&
    Array.isArray(o.athletes) &&
    typeof o.tenantSlug === 'string'
  );
}
