import { Injectable, Logger } from '@nestjs/common';
import { createPool, type Pool, type RowDataPacket } from 'mysql2/promise';
import { BeatscodeApiClient } from './beatscode-api.client';

export type BeatscodeAttachmentMeta = {
  id: number;
  storagePath: string;
  displayName: string;
  mimeType?: string;
};

type AttachmentTableConfig = {
  table: string;
  idColumn: string;
  pathColumn: string;
  nameColumn?: string;
};

const CANDIDATE_TABLES: AttachmentTableConfig[] = [
  { table: 'attachment', idColumn: 'id', pathColumn: 'file', nameColumn: 'name' },
  { table: 'attachment', idColumn: 'id', pathColumn: 'filename', nameColumn: 'name' },
  { table: 'attachment', idColumn: 'id', pathColumn: 'path', nameColumn: 'name' },
  { table: 'attachment', idColumn: 'id', pathColumn: 'link', nameColumn: 'name' },
  { table: 'attachment', idColumn: 'id', pathColumn: 'hash', nameColumn: 'name' },
  { table: 'file', idColumn: 'id', pathColumn: 'file', nameColumn: 'name' },
  { table: 'file', idColumn: 'id', pathColumn: 'filename', nameColumn: 'name' },
  { table: 'files', idColumn: 'id', pathColumn: 'file', nameColumn: 'name' },
  { table: 'beatscore_attachment', idColumn: 'id', pathColumn: 'file', nameColumn: 'name' },
  { table: 'bs_attachment', idColumn: 'id', pathColumn: 'file', nameColumn: 'name' },
];

@Injectable()
export class BeatscodeAttachmentService {
  private readonly log = new Logger(BeatscodeAttachmentService.name);
  private pool: Pool | null = null;
  private resolvedTable: AttachmentTableConfig | null = null;
  private metaCache = new Map<number, BeatscodeAttachmentMeta | null>();

  hasDatabaseConfigured(): boolean {
    return Boolean(process.env.BEATSCODE_DATABASE_URL?.trim());
  }

  async discoverSchema(): Promise<{
    configured: boolean;
    table?: string;
    sample?: BeatscodeAttachmentMeta;
    tables: string[];
  }> {
    const pool = await this.getPool();
    if (!pool) return { configured: false, tables: [] };

    const [tables] = await pool.query<RowDataPacket[]>(
      `SHOW TABLES LIKE '%attach%'`,
    );
    const [fileTables] = await pool.query<RowDataPacket[]>(
      `SHOW TABLES LIKE '%file%'`,
    );
    const names = [...tables, ...fileTables].map((r) => Object.values(r)[0] as string);

    const sampleId = Number(process.env.BEATSCODE_ATTACHMENT_SAMPLE_ID ?? 1668);
    const sample = await this.resolveAttachmentMeta(sampleId);
    return {
      configured: true,
      table: this.resolvedTable?.table,
      sample: sample ?? undefined,
      tables: names,
    };
  }

  async preloadAttachmentMeta(ids: number[]): Promise<void> {
    const unique = [...new Set(ids.filter((id) => Number.isFinite(id)))];
    if (!unique.length) return;
    const pool = await this.getPool();
    if (!pool) return;

    const config = await this.resolveTableConfig(pool, unique[0]!);
    if (!config) return;

    const nameCol = config.nameColumn ? `, \`${config.nameColumn}\`` : '';
    const chunks: number[][] = [];
    for (let i = 0; i < unique.length; i += 200) {
      chunks.push(unique.slice(i, i + 200));
    }

    for (const chunk of chunks) {
      const placeholders = chunk.map(() => '?').join(',');
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT \`${config.idColumn}\`, \`${config.pathColumn}\`${nameCol} FROM \`${config.table}\` WHERE \`${config.idColumn}\` IN (${placeholders})`,
        chunk,
      );
      for (const row of rows) {
        const id = Number(row[config.idColumn]);
        const storagePath = String(row[config.pathColumn] ?? '').trim();
        if (!Number.isFinite(id) || !storagePath) continue;
        const displayName =
          (config.nameColumn ? String(row[config.nameColumn] ?? '').trim() : '') ||
          storagePath.split('/').pop() ||
          `anexo-${id}.pdf`;
        this.metaCache.set(id, {
          id,
          storagePath,
          displayName,
          mimeType: displayName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : undefined,
        });
      }
    }
  }

  async resolveAttachmentMeta(attachmentId: number): Promise<BeatscodeAttachmentMeta | null> {
    if (!Number.isFinite(attachmentId)) return null;
    if (this.metaCache.has(attachmentId)) return this.metaCache.get(attachmentId) ?? null;

    const pool = await this.getPool();
    if (pool) {
      const fromDb = await this.resolveAttachmentMetaFromDb(pool, attachmentId);
      if (fromDb) return fromDb;
    }

    this.metaCache.set(attachmentId, null);
    return null;
  }

  /** Resolve metadados do anexo pela API (sem MySQL). */
  async resolveAttachmentMetaViaApi(
    client: BeatscodeApiClient,
    attachmentId: number,
  ): Promise<BeatscodeAttachmentMeta | null> {
    if (!Number.isFinite(attachmentId)) return null;
    if (this.metaCache.has(attachmentId)) {
      const cached = this.metaCache.get(attachmentId);
      if (cached) return cached;
    }

    const routeCandidates = [
      `/attachment/id/${attachmentId}`,
      `/archive/id/${attachmentId}`,
      `/file/id/${attachmentId}`,
    ];
    const pathCandidates = ['/attachment', '/archive', '/file', '/document'];

    for (const path of pathCandidates) {
      for (const route of routeCandidates) {
        try {
          const one = await client.getByRoute(path, route);
          if (!one || typeof one !== 'object') continue;
          const storagePath = this.pickStoragePathFromObject(one);
          if (!storagePath) continue;
          const displayName =
            this.pickNameFromObject(one, storagePath, attachmentId);
          const meta: BeatscodeAttachmentMeta = {
            id: attachmentId,
            storagePath,
            displayName,
            mimeType: displayName.toLowerCase().endsWith('.pdf')
              ? 'application/pdf'
              : undefined,
          };
          this.metaCache.set(attachmentId, meta);
          return meta;
        } catch {
          /* tenta próxima rota */
        }
      }
    }

    this.metaCache.set(attachmentId, null);
    return null;
  }

  async downloadAttachment(
    client: BeatscodeApiClient,
    attachmentId: number,
  ): Promise<{ buffer: Buffer; meta: BeatscodeAttachmentMeta } | null> {
    const meta =
      (await this.resolveAttachmentMeta(attachmentId)) ??
      (await this.resolveAttachmentMetaViaApi(client, attachmentId));
    if (!meta) return null;

    const buf = await client.downloadFile(meta.storagePath);
    if (!buf?.length) return null;
    return { buffer: buf, meta };
  }

  private pickStoragePathFromObject(obj: Record<string, unknown>): string | null {
    const candidates = [
      obj.file,
      obj.path,
      obj.filename,
      obj.link,
      obj.url,
      obj.hash,
      obj.fileName,
      obj.name,
    ];
    for (const c of candidates) {
      if (typeof c !== 'string' || !c.trim()) continue;
      const v = c.trim();
      if (v.startsWith('http')) {
        const m = v.match(/files\/[^\s?#]+/i);
        if (m) return m[0]!;
        return v;
      }
      if (
        v.includes('.pdf') ||
        v.includes('.jpg') ||
        v.includes('.png') ||
        v.startsWith('files/')
      ) {
        return v.replace(/^\/+/, '');
      }
    }
    return null;
  }

  private pickNameFromObject(
    obj: Record<string, unknown>,
    path: string,
    id: number,
  ): string {
    for (const k of ['name', 'title', 'label', 'originalName', 'fileName']) {
      const v = obj[k];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    const base = path.split('/').pop();
    return base && base.includes('.') ? base : `anexo-${id}.pdf`;
  }

  private async resolveAttachmentMetaFromDb(
    pool: Pool,
    attachmentId: number,
  ): Promise<BeatscodeAttachmentMeta | null> {
    const config = await this.resolveTableConfig(pool, attachmentId);
    if (!config) {
      return null;
    }

    const cols = [config.pathColumn, config.nameColumn].filter(Boolean).join(', ');
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT ${cols} FROM \`${config.table}\` WHERE \`${config.idColumn}\` = ? LIMIT 1`,
      [attachmentId],
    );
    const row = rows[0];
    if (!row) {
      return null;
    }

    const storagePath = String(row[config.pathColumn] ?? '').trim();
    if (!storagePath) {
      return null;
    }

    const displayName =
      (config.nameColumn ? String(row[config.nameColumn] ?? '').trim() : '') ||
      storagePath.split('/').pop() ||
      `anexo-${attachmentId}.pdf`;

    const meta: BeatscodeAttachmentMeta = {
      id: attachmentId,
      storagePath,
      displayName,
      mimeType: displayName.toLowerCase().endsWith('.pdf')
        ? 'application/pdf'
        : undefined,
    };
    this.metaCache.set(attachmentId, meta);
    return meta;
  }

  private async getPool(): Promise<Pool | null> {
    const url = process.env.BEATSCODE_DATABASE_URL?.trim();
    if (!url) return null;
    if (!this.pool) {
      this.pool = createPool(url);
    }
    return this.pool;
  }

  private async resolveTableConfig(
    pool: Pool,
    probeId: number,
  ): Promise<AttachmentTableConfig | null> {
    if (this.resolvedTable) return this.resolvedTable;

    for (const candidate of CANDIDATE_TABLES) {
      try {
        const [exists] = await pool.query<RowDataPacket[]>(
          `SHOW TABLES LIKE ?`,
          [candidate.table],
        );
        if (!exists.length) continue;

        const cols = [candidate.pathColumn, candidate.nameColumn]
          .filter(Boolean)
          .join(', ');
        const [rows] = await pool.query<RowDataPacket[]>(
          `SELECT ${cols} FROM \`${candidate.table}\` WHERE \`${candidate.idColumn}\` = ? LIMIT 1`,
          [probeId],
        );
        const row = rows[0];
        if (row && String(row[candidate.pathColumn] ?? '').trim()) {
          this.resolvedTable = candidate;
          this.log.log(
            `Beatscode DB: anexos em ${candidate.table}.${candidate.pathColumn}`,
          );
          return candidate;
        }
      } catch {
        /* tenta próximo */
      }
    }

    // fallback: qualquer tabela %attachment% com colunas comuns
    const [tables] = await pool.query<RowDataPacket[]>(
      `SHOW TABLES LIKE '%attachment%'`,
    );
    for (const t of tables) {
      const table = Object.values(t)[0] as string;
      try {
        const [desc] = await pool.query<RowDataPacket[]>(`DESCRIBE \`${table}\``);
        const columns = desc.map((r) => String(r.Field));
        const idColumn = columns.find((c) => c === 'id') ?? columns[0];
        const pathColumn = columns.find((c) =>
          /^(file|filename|path|link|hash|attachment|file_name)$/i.test(c),
        );
        const nameColumn = columns.find((c) => /^(name|title|label)$/i.test(c));
        if (!idColumn || !pathColumn) continue;

        const [rows] = await pool.query<RowDataPacket[]>(
          `SELECT \`${pathColumn}\`${
            nameColumn ? `, \`${nameColumn}\`` : ''
          } FROM \`${table}\` WHERE \`${idColumn}\` = ? LIMIT 1`,
          [probeId],
        );
        const row = rows[0];
        if (row && String(row[pathColumn] ?? '').trim()) {
          this.resolvedTable = {
            table,
            idColumn,
            pathColumn,
            nameColumn,
          };
          this.log.log(
            `Beatscode DB: anexos em ${table}.${pathColumn} (auto-detectado)`,
          );
          return this.resolvedTable;
        }
      } catch {
        /* ignore */
      }
    }

    this.log.warn('Beatscode DB: não foi possível localizar tabela de anexos.');
    return null;
  }
}
