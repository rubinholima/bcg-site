import type { BeatscodeAttachmentMeta } from './beatscode-attachment.service';

/** Índice id → arquivo no Beatscode (hash.pdf). Preenchido no export local com acesso ao MySQL. */
export type BeatscodeAttachmentIndex = Record<
  string,
  {
    storagePath: string;
    displayName: string;
    mimeType?: string;
    documentTypeName?: string;
  }
>;

export type BeatscodeDocumentsExportFile = {
  version: 1;
  exportedAt: string;
  tenantSlug: string;
  attachmentIndex?: BeatscodeAttachmentIndex;
  players: Array<{
    beatscodeEmployeeId: number;
    playerExternalId: string;
    documents: Array<{
      beatscodeAttachmentId: number;
      name: string;
      documentType: string;
      documentCategory: 'pessoal' | 'contrato' | 'medico' | 'outro';
      storagePath?: string;
      fileUrl?: string;
      fileKey?: string;
      legalDocumentId?: string;
    }>;
  }>;
};

export type BeatscodeDocumentsSyncResult = {
  importedAt: string;
  tenantSlug: string;
  playersProcessed: number;
  documentsUpdated: number;
  filesDownloaded: number;
  legalDocumentsCreated: number;
  skippedNoPath: number;
  errors: string[];
};

export function mapBeatscodeDocumentTypeLabel(
  raw: string | null | undefined,
): { documentType: string; documentCategory: 'pessoal' | 'contrato' | 'medico' | 'outro' } {
  const name = (raw ?? '').toLowerCase().trim();
  if (!name) return { documentType: 'outro', documentCategory: 'outro' };
  if (name.includes('cbf') || name.includes('registro') || name === 'rg') {
    return { documentType: 'documento_esportivo', documentCategory: 'pessoal' };
  }
  if (name.includes('cpf')) return { documentType: 'cpf', documentCategory: 'pessoal' };
  if (name.includes('ctps')) return { documentType: 'ctps', documentCategory: 'pessoal' };
  if (name.includes('certid')) return { documentType: 'certidao', documentCategory: 'pessoal' };
  if (name.includes('resid') || name.includes('comprov')) {
    return { documentType: 'comprovante_residencia', documentCategory: 'pessoal' };
  }
  if (name.includes('contrat')) return { documentType: 'contrato', documentCategory: 'contrato' };
  if (name.includes('atest') || name.includes('medic') || name.includes('laudo')) {
    return { documentType: 'outro', documentCategory: 'medico' };
  }
  return { documentType: 'outro', documentCategory: 'outro' };
}

export function buildBeatscodeDocumentName(
  meta: BeatscodeAttachmentMeta | undefined,
  attachmentId: number,
  ordinal: number,
): string {
  if (meta?.displayName && !meta.displayName.match(/^anexo[- ]?\d+/i)) {
    return meta.displayName.replace(/\.(pdf|png|jpe?g|webp)$/i, '').trim();
  }
  return `Documento pessoal ${ordinal}`;
}
