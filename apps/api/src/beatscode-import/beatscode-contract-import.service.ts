import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { access } from 'fs/promises';
import { constants as fsConstants } from 'fs';
import { dirname, resolve } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { BeatscodeApiClient } from './beatscode-api.client';
import { BeatscodeAttachmentService } from './beatscode-attachment.service';
import {
  DEFAULT_BEATSCODE_CONTRACTS_EXPORT_PATH,
  type BeatscodeContractExportFile,
  isBeatscodeContractExportFile,
} from './beatscode-contract-export.types';
import {
  mapBeatscodeContractRow,
  toStoredBeatscodeContract,
  type StoredBeatscodeContract,
} from './beatscode-contract.mapper';
import {
  DEFAULT_BEATSCODE_TENANT_SLUG,
  resolveBeatscodeTenantSlug,
} from './beatscode-import.service';
import {
  buildContractDocumentName,
  mapBeatscodeLegalDocStatus,
  mapBeatscodeLegalDocType,
} from './beatscode-contract-legal.util';
import {
  DEFAULT_CONTRACTS_MANIFEST_PATH,
  type BeatscodeContractDownloadEntry,
  type BeatscodeContractDownloadManifestFile,
  isBeatscodeContractDownloadManifest,
} from './beatscode-contract-download.types';

export type BeatscodeContractImportResult = {
  importedAt: string;
  tenantSlug: string;
  source: 'beatscode_api' | 'export_file' | 'local_manifest';
  contractsTotal: number;
  playersUpdated: number;
  contractsLinked: number;
  filesDownloaded: number;
  legalDocumentsCreated: number;
  skippedNoPlayer: number;
  skippedExisting?: number;
  skippedNoFile?: number;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
  errors: string[];
};

@Injectable()
export class BeatscodeContractImportService {
  private readonly log = new Logger(BeatscodeContractImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly attachments: BeatscodeAttachmentService,
    private readonly s3: S3Service,
  ) {}

  createClient(): BeatscodeApiClient {
    const baseUrl =
      process.env.BEATSCODE_API_URL?.trim() || 'https://bostoncityfc-api.beatscode.com';
    const username = process.env.BEATSCODE_USERNAME?.trim();
    const password = process.env.BEATSCODE_PASSWORD?.trim();
    if (!username || !password) {
      throw new Error('BEATSCODE_USERNAME e BEATSCODE_PASSWORD obrigatórios.');
    }
    return new BeatscodeApiClient(baseUrl, username, password);
  }

  async exportToFile(options?: {
    tenantSlug?: string;
    outputPath?: string;
  }): Promise<{ filePath: string; export: BeatscodeContractExportFile }> {
    const exportData = await this.fetchExportData(options);
    const rel = options?.outputPath?.trim() || DEFAULT_BEATSCODE_CONTRACTS_EXPORT_PATH;
    const filePath = resolve(process.cwd(), rel);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf8');
    this.log.log(
      `Beatscode contratos: ${exportData.contracts.length} → ${filePath}`,
    );
    return { filePath, export: exportData };
  }

  async readExportFile(filePath: string): Promise<BeatscodeContractExportFile> {
    const abs = resolve(process.cwd(), filePath);
    const raw = JSON.parse(await readFile(abs, 'utf8')) as unknown;
    if (!isBeatscodeContractExportFile(raw)) {
      throw new Error(`Arquivo inválido: ${abs}`);
    }
    return raw;
  }

  async fetchExportData(options?: {
    tenantSlug?: string;
  }): Promise<BeatscodeContractExportFile> {
    const client = this.createClient();
    await client.login();

    const [types, contractsRaw, endReasons, technicalCommittee] = await Promise.all([
      client.listByPath('/contract-type', '/contract'),
      client.listByPath('/contract', '/contract'),
      client.listByPath('/contract-end-reason', '/contract'),
      client.listByPath('/technical-committee', '/contract'),
    ]);

    const typeById = new Map(
      types.map((t) => [Number(t.id), String(t.name ?? '')]),
    );
    const endReasonById = new Map(
      endReasons.map((r) => [Number(r.id), String(r.name ?? '')]),
    );
    const tcEmployeeIds = new Set(
      technicalCommittee
        .map((r) => Number(r.employeeId))
        .filter((n) => Number.isFinite(n)),
    );

    const contracts = contractsRaw
      .map((row) =>
        mapBeatscodeContractRow(row, typeById, endReasonById, tcEmployeeIds),
      )
      .filter((r): r is NonNullable<typeof r> => r != null);

    const attachmentIndex = await this.buildAttachmentIndex(contracts);

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      tenantSlug: resolveBeatscodeTenantSlug(options?.tenantSlug),
      sourceApi: client.getBaseUrl(),
      contractTypes: types,
      contractEndReasons: endReasons,
      technicalCommitteeEmployeeIds: [...tcEmployeeIds],
      attachmentIndex,
      contracts,
    };
  }

  private async buildAttachmentIndex(
    contracts: BeatscodeContractExportFile['contracts'],
    existing?: BeatscodeContractExportFile['attachmentIndex'],
  ): Promise<BeatscodeContractExportFile['attachmentIndex']> {
    const index: NonNullable<BeatscodeContractExportFile['attachmentIndex']> = {
      ...(existing ?? {}),
    };
    const ids = new Set<number>();
    for (const c of contracts) {
      for (const id of [...c.attachmentIds, ...c.extraFileIds]) ids.add(id);
    }
    for (const id of ids) {
      const key = String(id);
      if (index[key]) continue;
      const meta = await this.attachments.resolveAttachmentMeta(id);
      if (meta) {
        index[key] = {
          storagePath: meta.storagePath,
          displayName: meta.displayName,
          mimeType: meta.mimeType,
        };
        continue;
      }
      const client = this.createClientOptional();
      if (client) {
        await client.login();
        const viaApi = await this.attachments.resolveAttachmentMetaViaApi(client, id);
        if (viaApi) {
          index[key] = {
            storagePath: viaApi.storagePath,
            displayName: viaApi.displayName,
            mimeType: viaApi.mimeType,
          };
        }
      }
    }
    return Object.keys(index).length ? index : undefined;
  }

  hasBeatscodeCredentials(): boolean {
    return Boolean(
      process.env.BEATSCODE_USERNAME?.trim() && process.env.BEATSCODE_PASSWORD?.trim(),
    );
  }

  private createClientOptional(): BeatscodeApiClient | null {
    if (!this.hasBeatscodeCredentials()) return null;
    try {
      return this.createClient();
    } catch {
      return null;
    }
  }

  async importFromExport(
    exportFile: BeatscodeContractExportFile,
    options?: { tenantSlug?: string; downloadAttachments?: boolean },
  ): Promise<BeatscodeContractImportResult> {
    const tenantSlug = resolveBeatscodeTenantSlug(
      options?.tenantSlug ?? exportFile.tenantSlug,
    );
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug: tenantSlug },
    });
    if (!tenant) throw new Error(`Tenant não encontrado: ${tenantSlug}`);

    const players = await this.prisma.player.findMany({
      where: { tenantId: tenant.id, externalId: { startsWith: 'beatscode-' } },
      select: { id: true, externalId: true, registrationProfile: true },
    });

    const playerByEmployeeId = new Map<number, (typeof players)[0]>();
    for (const p of players) {
      const m = p.externalId?.match(/^beatscode-(\d+)$/);
      if (m) playerByEmployeeId.set(Number(m[1]), p);
    }

    const byEmployee = new Map<number, BeatscodeContractExportFile['contracts']>();
    for (const c of exportFile.contracts) {
      if (c.employeeId == null) continue;
      const list = byEmployee.get(c.employeeId) ?? [];
      list.push(c);
      byEmployee.set(c.employeeId, list);
    }

    const result: BeatscodeContractImportResult = {
      importedAt: new Date().toISOString(),
      tenantSlug,
      source: 'export_file',
      contractsTotal: exportFile.contracts.length,
      playersUpdated: 0,
      contractsLinked: 0,
      filesDownloaded: 0,
      legalDocumentsCreated: 0,
      skippedNoPlayer: 0,
      byCategory: {},
      byStatus: {},
      errors: [],
    };

    const downloadAttachments = options?.downloadAttachments !== false;
    const attachmentIndex = await this.buildAttachmentIndex(
      exportFile.contracts,
      exportFile.attachmentIndex,
    );
    let apiClient: BeatscodeApiClient | null = null;
    if (downloadAttachments && (attachmentIndex || this.attachments.hasDatabaseConfigured())) {
      apiClient = this.createClientOptional();
      if (apiClient) await apiClient.login();
    }

    for (const c of exportFile.contracts) {
      result.byCategory[c.menuCategory] = (result.byCategory[c.menuCategory] ?? 0) + 1;
      result.byStatus[c.status] = (result.byStatus[c.status] ?? 0) + 1;
    }

    for (const [employeeId, contractRows] of byEmployee) {
      const player = playerByEmployeeId.get(employeeId);
      if (!player) {
        result.skippedNoPlayer += contractRows.length;
        continue;
      }

      try {
        const profile = this.parseProfile(player.registrationProfile);
        const stored: StoredBeatscodeContract[] = [];

        for (const row of contractRows) {
          const base = toStoredBeatscodeContract(row);
          const files = await this.syncContractFiles(
            player.id,
            row,
            base,
            apiClient,
            attachmentIndex,
            downloadAttachments,
            result,
          );
          stored.push({ ...base, files: files.length ? files : undefined });
        }

        const contractsBlock = {
          ...(typeof profile.contracts === 'object' && profile.contracts
            ? (profile.contracts as Record<string, unknown>)
            : {}),
          beatscode: stored,
          beatscodeSyncedAt: new Date().toISOString(),
        };

        const active = stored
          .filter((c) => c.status === 'active')
          .sort((a, b) => (b.initialDate ?? '').localeCompare(a.initialDate ?? ''))[0];

        const sports =
          typeof profile.sports === 'object' && profile.sports
            ? { ...(profile.sports as Record<string, unknown>) }
            : {};

        if (active) {
          sports.contractSituation = active.statusLabel;
          sports.contractSituationCode = active.status;
          sports.contractTypeName = active.contractTypeName;
          sports.contractNumber = active.number;
          sports.contractValidUntil = active.finalDate;
        }

        await this.prisma.player.update({
          where: { id: player.id },
          data: {
            registrationProfile: {
              ...profile,
              contracts: contractsBlock,
              sports,
              beatscode: {
                ...(typeof profile.beatscode === 'object' && profile.beatscode
                  ? (profile.beatscode as Record<string, unknown>)
                  : {}),
                contractsCount: stored.length,
                lastContractSyncAt: new Date().toISOString(),
              },
            } as Prisma.InputJsonValue,
          },
        });

        result.playersUpdated += 1;
        result.contractsLinked += stored.length;
      } catch (e) {
        result.errors.push(
          `employeeId ${employeeId}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    await this.prisma.integrationConfig.upsert({
      where: { key: 'beatscode_contracts_import_last' },
      create: {
        key: 'beatscode_contracts_import_last',
        config: result as object,
      },
      update: { config: result as object },
    });

    return result;
  }

  async importFromApi(options?: {
    tenantSlug?: string;
    downloadAttachments?: boolean;
  }): Promise<BeatscodeContractImportResult> {
    const exportData = await this.fetchExportData(options);
    return this.importFromExport(exportData, options);
  }

  /** Sobe PDFs locais (manifest do beatscode:download-contracts) → S3 + LegalDocument + profile. */
  async importFromDownloadManifest(options?: {
    tenantSlug?: string;
    manifestPath?: string;
    contractsExportPath?: string;
    dryRun?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<BeatscodeContractImportResult> {
    const manifestPath = resolve(
      process.cwd(),
      options?.manifestPath?.trim() || DEFAULT_CONTRACTS_MANIFEST_PATH,
    );
    const rawManifest = JSON.parse(await readFile(manifestPath, 'utf8')) as unknown;
    if (!isBeatscodeContractDownloadManifest(rawManifest)) {
      throw new Error(`Manifest inválido: ${manifestPath}`);
    }
    const manifest = rawManifest as BeatscodeContractDownloadManifestFile;
    const contractsPath = resolve(
      process.cwd(),
      options?.contractsExportPath?.trim() || manifest.contractsExportPath,
    );
    const exportFile = await this.readExportFile(contractsPath);
    const manifestBaseDir = dirname(manifestPath);

    const offset = Math.max(0, options?.offset ?? 0);
    const limit = options?.limit;
    const manifestEntries = manifest.entries.slice(
      offset,
      limit ? offset + limit : undefined,
    );

    const entryByKey = new Map<string, BeatscodeContractDownloadEntry>();
    for (const entry of manifestEntries) {
      entryByKey.set(`${entry.beatscodeContractId}:${entry.attachmentId}`, entry);
    }

    const employeeIds = new Set(manifestEntries.map((e) => e.employeeId));
    const exportByEmployee = new Map<number, BeatscodeContractExportFile['contracts']>();
    for (const c of exportFile.contracts) {
      if (c.employeeId == null || !employeeIds.has(c.employeeId)) continue;
      const list = exportByEmployee.get(c.employeeId) ?? [];
      list.push(c);
      exportByEmployee.set(c.employeeId, list);
    }

    const tenantSlug = resolveBeatscodeTenantSlug(
      options?.tenantSlug ?? manifest.tenantSlug ?? exportFile.tenantSlug,
    );
    const tenant = await this.prisma.tenant.findFirst({ where: { slug: tenantSlug } });
    if (!tenant) throw new Error(`Tenant não encontrado: ${tenantSlug}`);

    const players = await this.prisma.player.findMany({
      where: { tenantId: tenant.id, externalId: { startsWith: 'beatscode-' } },
      select: { id: true, externalId: true, registrationProfile: true },
    });
    const playerByEmployeeId = new Map<number, (typeof players)[0]>();
    for (const p of players) {
      const m = p.externalId?.match(/^beatscode-(\d+)$/);
      if (m) playerByEmployeeId.set(Number(m[1]), p);
    }

    const result: BeatscodeContractImportResult = {
      importedAt: new Date().toISOString(),
      tenantSlug,
      source: 'local_manifest',
      contractsTotal: exportFile.contracts.length,
      playersUpdated: 0,
      contractsLinked: 0,
      filesDownloaded: 0,
      legalDocumentsCreated: 0,
      skippedNoPlayer: 0,
      skippedExisting: 0,
      skippedNoFile: 0,
      byCategory: {},
      byStatus: {},
      errors: [],
    };

    for (const c of exportFile.contracts) {
      result.byCategory[c.menuCategory] = (result.byCategory[c.menuCategory] ?? 0) + 1;
      result.byStatus[c.status] = (result.byStatus[c.status] ?? 0) + 1;
    }

    const dryRun = options?.dryRun === true;

    for (const employeeId of [...employeeIds].sort((a, b) => a - b)) {
      const contractRows = exportByEmployee.get(employeeId);
      if (!contractRows?.length) {
        result.errors.push(`employeeId ${employeeId}: sem contratos no export`);
        continue;
      }

      const player = playerByEmployeeId.get(employeeId);
      if (!player) {
        result.skippedNoPlayer += contractRows.length;
        continue;
      }

      try {
        const profile = this.parseProfile(player.registrationProfile);
        const stored: StoredBeatscodeContract[] = [];

        for (const row of contractRows) {
          const base = toStoredBeatscodeContract(row);
          const files = await this.syncContractFilesFromManifest(
            player.id,
            row,
            entryByKey,
            manifestBaseDir,
            dryRun,
            result,
          );
          stored.push({ ...base, files: files.length ? files : undefined });
        }

        if (dryRun) {
          result.playersUpdated += 1;
          result.contractsLinked += stored.length;
          continue;
        }

        const contractsBlock = {
          ...(typeof profile.contracts === 'object' && profile.contracts
            ? (profile.contracts as Record<string, unknown>)
            : {}),
          beatscode: stored,
          beatscodeSyncedAt: new Date().toISOString(),
        };

        const active = stored
          .filter((c) => c.status === 'active')
          .sort((a, b) => (b.initialDate ?? '').localeCompare(a.initialDate ?? ''))[0];

        const sports =
          typeof profile.sports === 'object' && profile.sports
            ? { ...(profile.sports as Record<string, unknown>) }
            : {};

        if (active) {
          sports.contractSituation = active.statusLabel;
          sports.contractSituationCode = active.status;
          sports.contractTypeName = active.contractTypeName;
          sports.contractNumber = active.number;
          sports.contractValidUntil = active.finalDate;
        }

        await this.prisma.player.update({
          where: { id: player.id },
          data: {
            registrationProfile: {
              ...profile,
              contracts: contractsBlock,
              sports,
              beatscode: {
                ...(typeof profile.beatscode === 'object' && profile.beatscode
                  ? (profile.beatscode as Record<string, unknown>)
                  : {}),
                contractsCount: stored.length,
                lastContractSyncAt: new Date().toISOString(),
              },
            } as Prisma.InputJsonValue,
          },
        });

        result.playersUpdated += 1;
        result.contractsLinked += stored.length;
      } catch (e) {
        result.errors.push(
          `employeeId ${employeeId}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    if (!dryRun) {
      await this.prisma.integrationConfig.upsert({
        where: { key: 'beatscode_contracts_manifest_import_last' },
        create: {
          key: 'beatscode_contracts_manifest_import_last',
          config: result as object,
        },
        update: { config: result as object },
      });
    }

    this.log.log(
      `Contratos manifest → S3: ${result.filesDownloaded} arquivo(s), ${result.legalDocumentsCreated} LegalDocument(s), ${result.playersUpdated} jogador(es)`,
    );

    return result;
  }

  private async syncContractFilesFromManifest(
    playerId: string,
    row: BeatscodeContractExportFile['contracts'][number],
    entryByKey: Map<string, BeatscodeContractDownloadEntry>,
    manifestBaseDir: string,
    dryRun: boolean,
    result: BeatscodeContractImportResult,
  ): Promise<NonNullable<StoredBeatscodeContract['files']>> {
    const files: NonNullable<StoredBeatscodeContract['files']> = [];
    const attachmentIds = [...row.attachmentIds, ...row.extraFileIds];

    for (const attachmentId of attachmentIds) {
      const manifestEntry = entryByKey.get(`${row.beatscodeId}:${attachmentId}`);

      const existing = await this.prisma.legalDocument.findFirst({
        where: {
          playerId,
          metadata: {
            path: ['beatscodeAttachmentId'],
            equals: attachmentId,
          },
        },
      });

      if (existing?.fileUrl) {
        files.push({
          attachmentId,
          fileUrl: existing.fileUrl,
          fileKey: existing.fileKey,
          name: existing.name,
          legalDocumentId: existing.id,
        });
        result.skippedExisting = (result.skippedExisting ?? 0) + 1;
        continue;
      }

      if (!manifestEntry) continue;

      const absPath = resolve(manifestBaseDir, manifestEntry.localFilePath);
      try {
        await access(absPath, fsConstants.R_OK);
      } catch {
        result.skippedNoFile = (result.skippedNoFile ?? 0) + 1;
        result.errors.push(
          `Contrato ${row.beatscodeId} att ${attachmentId}: arquivo não encontrado (${absPath})`,
        );
        continue;
      }

      const displayName = buildContractDocumentName(
        row.contractTypeName,
        row.number,
        row.beatscodeId,
        attachmentId,
      );
      const uploadName =
        manifestEntry.documentName && !/^imagem$/i.test(manifestEntry.documentName.trim())
          ? manifestEntry.documentName.endsWith('.pdf')
            ? manifestEntry.documentName
            : `${manifestEntry.documentName}.pdf`
          : `${displayName}.pdf`;

      if (dryRun) {
        files.push({
          attachmentId,
          fileUrl: `(dry-run) ${absPath}`,
          name: displayName,
        });
        result.filesDownloaded += 1;
        continue;
      }

      const buf = await readFile(absPath);
      if (!buf.length) {
        result.errors.push(`Contrato ${row.beatscodeId} att ${attachmentId}: PDF vazio`);
        continue;
      }

      const uploaded = await this.s3.uploadLegalDocument(buf, playerId, uploadName);

      const doc = await this.prisma.legalDocument.create({
        data: {
          playerId,
          type: mapBeatscodeLegalDocType(row.contractTypeName, row.status),
          name: displayName,
          fileKey: uploaded.key,
          fileUrl: uploaded.url,
          status: mapBeatscodeLegalDocStatus(row.status),
          validFrom: row.initialDate ? new Date(`${row.initialDate}T12:00:00`) : null,
          validUntil: row.finalDate ? new Date(`${row.finalDate}T12:00:00`) : null,
          metadata: {
            source: 'beatscode',
            beatscodeContractId: row.beatscodeId,
            beatscodeAttachmentId: attachmentId,
            beatscodeContractNumber: row.number,
            menuCategory: row.menuCategory,
            importedFrom: 'local_manifest',
          },
        },
      });

      files.push({
        attachmentId,
        fileUrl: uploaded.url,
        fileKey: uploaded.key,
        name: doc.name,
        legalDocumentId: doc.id,
      });
      result.filesDownloaded += 1;
      result.legalDocumentsCreated += 1;
    }

    return files;
  }

  private async syncContractFiles(
    playerId: string,
    row: BeatscodeContractExportFile['contracts'][number],
    stored: StoredBeatscodeContract,
    client: BeatscodeApiClient | null,
    attachmentIndex: BeatscodeContractExportFile['attachmentIndex'],
    downloadAttachments: boolean,
    result: BeatscodeContractImportResult,
  ): Promise<NonNullable<StoredBeatscodeContract['files']>> {
    const files: NonNullable<StoredBeatscodeContract['files']> = [];
    const attachmentIds = [...row.attachmentIds, ...row.extraFileIds];

    for (const attachmentId of attachmentIds) {
      const existing = await this.prisma.legalDocument.findFirst({
        where: {
          playerId,
          metadata: {
            path: ['beatscodeAttachmentId'],
            equals: attachmentId,
          },
        },
      });

      if (existing?.fileUrl) {
        files.push({
          attachmentId,
          fileUrl: existing.fileUrl,
          fileKey: existing.fileKey,
          name: existing.name,
          legalDocumentId: existing.id,
        });
        continue;
      }

      if (!downloadAttachments || !client) continue;

      let storagePath = attachmentIndex?.[String(attachmentId)]?.storagePath;
      let displayName =
        attachmentIndex?.[String(attachmentId)]?.displayName ??
        buildContractDocumentName(row.contractTypeName, row.number, row.beatscodeId, attachmentId);

      if (!storagePath) {
        const meta = await this.attachments.resolveAttachmentMeta(attachmentId);
        storagePath = meta?.storagePath;
        if (meta?.displayName) displayName = meta.displayName;
      }

      if (!storagePath) {
        result.errors.push(
          `Contrato ${row.beatscodeId}: anexo ${attachmentId} sem caminho (configure BEATSCODE_DATABASE_URL).`,
        );
        continue;
      }

      const buf = await client.downloadFile(storagePath);
      if (!buf?.length) {
        result.errors.push(
          `Contrato ${row.beatscodeId}: falha ao baixar anexo ${attachmentId} (${storagePath}).`,
        );
        continue;
      }

      const ext = storagePath.toLowerCase().includes('.pdf')
        ? 'pdf'
        : storagePath.toLowerCase().includes('.png')
          ? 'png'
          : 'pdf';
      const uploaded = await this.s3.uploadLegalDocument(
        buf,
        playerId,
        displayName.endsWith(`.${ext}`) ? displayName : `${displayName}.${ext}`,
      );

      const doc = await this.prisma.legalDocument.create({
        data: {
          playerId,
          type: mapBeatscodeLegalDocType(row.contractTypeName, row.status),
          name: buildContractDocumentName(
            row.contractTypeName,
            row.number,
            row.beatscodeId,
            attachmentId,
          ),
          fileKey: uploaded.key,
          fileUrl: uploaded.url,
          status: mapBeatscodeLegalDocStatus(row.status),
          validFrom: row.initialDate ? new Date(`${row.initialDate}T12:00:00`) : null,
          validUntil: row.finalDate ? new Date(`${row.finalDate}T12:00:00`) : null,
          metadata: {
            source: 'beatscode',
            beatscodeContractId: row.beatscodeId,
            beatscodeAttachmentId: attachmentId,
            beatscodeContractNumber: row.number,
            menuCategory: row.menuCategory,
          },
        },
      });

      files.push({
        attachmentId,
        fileUrl: uploaded.url,
        fileKey: uploaded.key,
        name: doc.name,
        legalDocumentId: doc.id,
      });
      result.filesDownloaded += 1;
      result.legalDocumentsCreated += 1;
    }

    return files;
  }

  private parseProfile(raw: unknown): Record<string, unknown> {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    return { ...(raw as Record<string, unknown>) };
  }
}
