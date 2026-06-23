export function resolveBeatscodeWebUrl(): string {
  const explicit = process.env.BEATSCODE_WEB_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');

  const api = process.env.BEATSCODE_API_URL?.trim() || 'https://bostoncityfc-api.beatscode.com';
  if (api.includes('-api.')) {
    return api.replace('-api.', '.').replace(/\/+$/, '');
  }
  return 'https://bostoncityfc.beatscode.com';
}

export function resolveBeatscodeApiUrl(): string {
  return (
    process.env.BEATSCODE_API_URL?.trim() || 'https://bostoncityfc-api.beatscode.com'
  ).replace(/\/+$/, '');
}

export type BeatscodeSniffedAttachment = {
  id: number;
  storagePath: string;
  displayName: string;
};

/** Extrai todos os anexos de uma resposta JSON (sniffer de rede no painel). */
export function extractAllAttachmentsFromJson(body: string): BeatscodeSniffedAttachment[] {
  const byId = new Map<number, BeatscodeSniffedAttachment>();
  if (!body.trim()) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return [];
  }

  const visit = (node: unknown, depth = 0): void => {
    if (depth > 14 || node == null) return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item, depth + 1);
      return;
    }
    if (typeof node !== 'object') return;
    const obj = node as Record<string, unknown>;
    const id = Number(obj.id ?? obj.attachmentId);
    const path = pickStoragePath(obj);
    if (Number.isFinite(id) && path && !byId.has(id)) {
      byId.set(id, {
        id,
        storagePath: path,
        displayName: pickDisplayName(obj, path, id),
      });
    }
    for (const v of Object.values(obj)) visit(v, depth + 1);
  };

  visit(parsed);
  return [...byId.values()];
}

/** Extrai metadados de anexo de respostas JSON / dict do Beatscode. */
export function extractAttachmentMetaFromJson(
  body: string,
  targetIds: Set<number>,
): Array<{ id: number; storagePath: string; displayName: string }> {
  const found: Array<{ id: number; storagePath: string; displayName: string }> = [];
  if (!body.trim()) return found;

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return found;
  }

  const visit = (node: unknown, depth = 0): void => {
    if (depth > 12 || node == null) return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item, depth + 1);
      return;
    }
    if (typeof node !== 'object') return;
    const obj = node as Record<string, unknown>;
    const id = Number(obj.id ?? obj.attachmentId);
    const path = pickStoragePath(obj);
    if (Number.isFinite(id) && targetIds.has(id) && path) {
      found.push({
        id,
        storagePath: path,
        displayName: pickDisplayName(obj, path, id),
      });
    }
    for (const v of Object.values(obj)) visit(v, depth + 1);
  };

  visit(parsed);
  return found;
}

function pickStoragePath(obj: Record<string, unknown>): string | null {
  const candidates = [
    obj.file,
    obj.path,
    obj.filename,
    obj.link,
    obj.url,
    obj.hash,
    obj.fileName,
  ];
  for (const c of candidates) {
    if (typeof c !== 'string' || !c.trim()) continue;
    const v = c.trim();
    if (v.startsWith('http')) {
      const m = v.match(/files\/[^\s?#]+/i);
      if (m) return m[0]!;
      return v;
    }
    if (v.includes('.pdf') || v.includes('.jpg') || v.includes('.png') || v.startsWith('files/')) {
      return v.replace(/^\/+/, '');
    }
  }
  return null;
}

function pickDisplayName(obj: Record<string, unknown>, path: string, id: number): string {
  for (const k of ['name', 'title', 'label', 'originalName', 'fileName']) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  const base = path.split('/').pop();
  return base && base.includes('.') ? base : `anexo-${id}.pdf`;
}
