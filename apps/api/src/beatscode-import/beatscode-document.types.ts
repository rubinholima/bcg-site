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

export type BeatscodeStoredDocument = {
  id: string;
  name: string;
  documentType: string;
  documentCategory?: 'pessoal' | 'contrato' | 'medico' | 'outro';
  fileUrl: string;
  fileKey?: string;
  uploadedAt: string;
  beatscodeAttachmentId?: number;
  source?: string;
  pendingDownload?: boolean;
};

const PHOTO_ATTACHMENT_KEYS = new Set(['photo', 'avatar', 'foto', 'imagem']);

export const PLAYER_DOCUMENT_DISPLAY_NAMES: Record<string, string> = {
  rg: 'Registro Geral',
  cpf: 'CPF',
  ctps: 'CTPS',
  certidao: 'Certidão',
  comprovante_residencia: 'Comprovante de residência',
  documento_esportivo: 'Documento esportivo',
  contrato: 'Contrato',
  outro: 'Outros',
};

const GENERIC_IMPORTED_DOC_NAME = /^Documento pessoal \d+$/i;

export function isGenericImportedDocumentName(name: string | null | undefined): boolean {
  return GENERIC_IMPORTED_DOC_NAME.test((name ?? '').trim());
}

export function documentTypeDisplayName(documentType: string): string {
  return PLAYER_DOCUMENT_DISPLAY_NAMES[documentType] ?? documentType;
}

export function isPhotoAttachmentFieldKey(key: string): boolean {
  return PHOTO_ATTACHMENT_KEYS.has(key.toLowerCase().trim());
}

export function mapBeatscodeDocumentTypeLabel(
  raw: string | null | undefined,
): { documentType: string; documentCategory: 'pessoal' | 'contrato' | 'medico' | 'outro' } {
  const name = (raw ?? '').toLowerCase().trim();
  if (!name) return { documentType: 'outro', documentCategory: 'outro' };

  if (name === 'rg' || name === 'rne' || name === 'identitycard') {
    return { documentType: 'rg', documentCategory: 'pessoal' };
  }
  if (name === 'cpf' || name === 'cni' || name === 'cpfcni') {
    return { documentType: 'cpf', documentCategory: 'pessoal' };
  }
  if (name === 'ctps' || name === 'workcard' || name === 'carteiradetrabalho') {
    return { documentType: 'ctps', documentCategory: 'pessoal' };
  }
  if (isPhotoAttachmentFieldKey(name)) {
    return { documentType: 'photo', documentCategory: 'outro' };
  }

  if (name.includes('cbf') || name.includes('registro esportivo') || name.includes('documento esportivo')) {
    return { documentType: 'documento_esportivo', documentCategory: 'pessoal' };
  }
  if (name.includes('registro geral') || name === 'registro geral') {
    return { documentType: 'rg', documentCategory: 'pessoal' };
  }
  if (name.includes('cpf') || name.includes('cadastro de pessoa física') || name.includes('cnpj/cpf')) {
    return { documentType: 'cpf', documentCategory: 'pessoal' };
  }
  if (name.includes('ctps') || name.includes('carteira de trabalho')) {
    return { documentType: 'ctps', documentCategory: 'pessoal' };
  }
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

export function resolveBeatscodeDocumentName(
  fieldKey: string | null | undefined,
  att?: Record<string, unknown> | BeatscodeAttachmentMeta,
  ordinal = 1,
): string {
  const key = (fieldKey ?? '').trim();
  const mapped = mapBeatscodeDocumentTypeLabel(key);
  if (mapped.documentType !== 'outro' && mapped.documentType !== 'photo') {
    return documentTypeDisplayName(mapped.documentType);
  }

  const rawName =
    att && typeof att === 'object'
      ? String(
          ('displayName' in att ? att.displayName : undefined) ??
            ('name' in att ? att.name : undefined) ??
            '',
        ).trim()
      : '';
  if (rawName && !/^imagem$/i.test(rawName) && !/^anexo[- ]?\d+/i.test(rawName)) {
    const fromLabel = mapBeatscodeDocumentTypeLabel(rawName);
    if (fromLabel.documentType !== 'outro') {
      return documentTypeDisplayName(fromLabel.documentType);
    }
    return rawName.replace(/\.(pdf|png|jpe?g|webp)$/i, '').trim();
  }

  if (key && !isPhotoAttachmentFieldKey(key)) {
    const fromKey = mapBeatscodeDocumentTypeLabel(key);
    if (fromKey.documentType !== 'outro') {
      return documentTypeDisplayName(fromKey.documentType);
    }
  }

  return `Documento pessoal ${ordinal}`;
}

export function buildBeatscodeDocumentName(
  meta: BeatscodeAttachmentMeta | undefined,
  attachmentId: number,
  ordinal: number,
): string {
  return resolveBeatscodeDocumentName(undefined, meta, ordinal);
}

function readAttachmentMap(source: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!source || typeof source !== 'object') return undefined;
  const map =
    source.attachment ??
    source.beatscodeAttachmentMap ??
    (source.data as Record<string, unknown> | undefined)?.attachment;
  return map && typeof map === 'object' && !Array.isArray(map)
    ? (map as Record<string, unknown>)
    : undefined;
}

function readAttachmentIdList(source: Record<string, unknown> | undefined): number[] {
  if (!source || typeof source !== 'object') return [];
  const raw =
    source.attachmentId ??
    (source.data as Record<string, unknown> | undefined)?.attachmentId;
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => Number(x)).filter((n) => Number.isFinite(n));
}

function mergeExistingFileFields(
  next: BeatscodeStoredDocument,
  existing: BeatscodeStoredDocument | undefined,
): BeatscodeStoredDocument {
  if (!existing) return next;
  const fileUrl = existing.fileUrl?.trim() || next.fileUrl?.trim() || '';
  return {
    ...next,
    id: existing.id || next.id,
    fileUrl,
    fileKey: existing.fileKey ?? next.fileKey,
    uploadedAt: existing.uploadedAt || next.uploadedAt,
    pendingDownload: existing.pendingDownload ?? (!fileUrl ? next.pendingDownload : false),
    source: existing.source ?? next.source,
  };
}

/** Reconstrói documentos a partir do snapshot/attachment do Beatscode, preservando arquivos já espelhados. */
export function rebuildBeatscodeDocuments(
  source: Record<string, unknown> | undefined,
  existingDocs: BeatscodeStoredDocument[] = [],
): BeatscodeStoredDocument[] {
  const now = new Date().toISOString();
  const attachmentMap = readAttachmentMap(source);
  const attachmentIdList = readAttachmentIdList(source);
  const docs: BeatscodeStoredDocument[] = [];
  const photoIds = new Set<number>();
  const knownIds = new Set<number>();

  if (attachmentMap) {
    for (const [key, raw] of Object.entries(attachmentMap)) {
      if (!raw || typeof raw !== 'object') continue;
      const att = raw as Record<string, unknown>;
      const num = Number(att.id);
      if (!Number.isFinite(num)) continue;

      if (isPhotoAttachmentFieldKey(key)) {
        photoIds.add(num);
        continue;
      }

      const mapped = mapBeatscodeDocumentTypeLabel(key);
      if (mapped.documentType === 'photo') {
        photoIds.add(num);
        continue;
      }

      const existing = existingDocs.find((d) => d.beatscodeAttachmentId === num);
      const link = String(att.link ?? '').trim();
      const merged = mergeExistingFileFields(
        {
          id: existing?.id ?? `beatscode-att-${key}-${num}`,
          name: resolveBeatscodeDocumentName(key, att),
          documentType: mapped.documentType,
          documentCategory: mapped.documentCategory,
          fileUrl: link,
          uploadedAt: existing?.uploadedAt ?? now,
          beatscodeAttachmentId: num,
          source: existing?.source ?? 'beatscode',
          pendingDownload: !link && !existing?.fileUrl?.trim(),
        },
        existing,
      );
      docs.push(merged);
      knownIds.add(num);
    }
  }

  for (const rawId of attachmentIdList) {
    if (knownIds.has(rawId) || photoIds.has(rawId)) continue;

    const existing = existingDocs.find((d) => d.beatscodeAttachmentId === rawId);
    if (existing?.fileUrl?.trim()) {
      const mapped = mapBeatscodeDocumentTypeLabel(existing.documentType || existing.name);
      docs.push(
        mergeExistingFileFields(
          {
            ...existing,
            name: isGenericImportedDocumentName(existing.name)
              ? documentTypeDisplayName(mapped.documentType)
              : existing.name,
            documentType:
              existing.documentType === 'outro' && mapped.documentType !== 'outro'
                ? mapped.documentType
                : existing.documentType,
            documentCategory: existing.documentCategory ?? mapped.documentCategory,
          },
          existing,
        ),
      );
      knownIds.add(rawId);
      continue;
    }

    if (existing && !isGenericImportedDocumentName(existing.name)) {
      docs.push(existing);
      knownIds.add(rawId);
    }
  }

  for (const existing of existingDocs) {
    const id = existing.beatscodeAttachmentId;
    if (id != null && (knownIds.has(id) || photoIds.has(id))) continue;
    if (!existing.fileUrl?.trim()) continue;
    docs.push(existing);
    if (id != null) knownIds.add(id);
  }

  return docs;
}

export function rebuildBeatscodeDocumentsFromProfile(
  profile: Record<string, unknown> | undefined,
): BeatscodeStoredDocument[] {
  if (!profile || typeof profile !== 'object') return [];
  const existing = Array.isArray(profile.documents)
    ? (profile.documents as BeatscodeStoredDocument[])
    : [];
  const beatscode = profile.beatscode as Record<string, unknown> | undefined;
  const snapshot = beatscode?.snapshot as Record<string, unknown> | undefined;
  const source = snapshot ?? profile;
  return rebuildBeatscodeDocuments(source, existing);
}
