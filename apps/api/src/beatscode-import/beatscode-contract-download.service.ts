import { Injectable, Logger } from '@nestjs/common';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import { BeatscodeApiClient } from './beatscode-api.client';
import {
  DEFAULT_BEATSCODE_CONTRACTS_EXPORT_PATH,
  type BeatscodeContractExportFile,
  isBeatscodeContractExportFile,
} from './beatscode-contract-export.types';
import {
  DEFAULT_CONTRACTS_DOWNLOAD_DIR,
  DEFAULT_CONTRACTS_MANIFEST_PATH,
  type BeatscodeContractDownloadEntry,
  type BeatscodeContractDownloadManifestFile,
  isBeatscodeContractDownloadManifest,
} from './beatscode-contract-download.types';
import {
  DEFAULT_BEATSCODE_EXPORT_PATH,
  DEFAULT_BEATSCODE_TENANT_SLUG,
  resolveBeatscodeTenantSlug,
} from './beatscode-import.service';
import { isBeatscodeExportFile, type BeatscodeExportFile } from './beatscode-export.types';
import { buildContractDocumentName } from './beatscode-contract-legal.util';

type SnapshotAttachmentLink = {
  attachmentId: number;
  link: string;
  documentName: string;
  beatscodeContractId: number;
  employeeId: number;
  playerName: string;
  athleteRecordId?: string;
  contractTypeName: string | null;
  contractNumber: string | null;
};

type DownloadQueueItem = {
  contract: BeatscodeContractExportFile['contracts'][number];
  attachmentId: number;
  snapshot: SnapshotAttachmentLink;
};

export type BeatscodeContractDownloadResult = {
  manifestPath: string;
  filesDir: string;
  employeesProcessed: number;
  filesDownloaded: number;
  filesSkipped: number;
  errors: string[];
};

@Injectable()
export class BeatscodeContractDownloadService {
  private readonly log = new Logger(BeatscodeContractDownloadService.name);

  async downloadAll(options?: {
    contractsExportPath?: string;
    athletesExportPath?: string;
    outputDir?: string;
    manifestPath?: string;
    tenantSlug?: string;
    /** Limite de anexos (não de employees). */
    limit?: number;
    offset?: number;
    /** @deprecated use limit — mantido por compatibilidade com scripts antigos. */
    employeeLimit?: number;
    employeeOffset?: number;
  }): Promise<BeatscodeContractDownloadResult> {
    const contractsPath = resolve(
      process.cwd(),
      options?.contractsExportPath?.trim() || DEFAULT_BEATSCODE_CONTRACTS_EXPORT_PATH,
    );
    const athletesPath = resolve(
      process.cwd(),
      options?.athletesExportPath?.trim() || DEFAULT_BEATSCODE_EXPORT_PATH,
    );
    const filesDir = resolve(
      process.cwd(),
      options?.outputDir?.trim() || DEFAULT_CONTRACTS_DOWNLOAD_DIR,
      'files',
    );
    const manifestPath = resolve(
      process.cwd(),
      options?.manifestPath?.trim() || DEFAULT_CONTRACTS_MANIFEST_PATH,
    );
    const tenantSlug = resolveBeatscodeTenantSlug(
      options?.tenantSlug || process.env.BEATSCODE_TENANT_SLUG || DEFAULT_BEATSCODE_TENANT_SLUG,
    );

    const exportFile = await this.readContractsExport(contractsPath);
    const linkIndex = await this.buildSnapshotLinkIndex(athletesPath);
    const queue = this.buildDownloadQueue(exportFile, linkIndex);

    const manifest = await this.loadManifest(manifestPath, {
      tenantSlug,
      contractsExportPath: contractsPath,
      athletesExportPath: athletesPath,
      filesDir,
      attachmentsTotal: queue.length,
    });

    const doneKeys = new Set(
      manifest.entries.map((e) => `${e.beatscodeContractId}:${e.attachmentId}`),
    );

    const offset = Math.max(0, options?.offset ?? options?.employeeOffset ?? 0);
    const limit = options?.limit ?? options?.employeeLimit;
    const pending = queue.filter(
      (item) => !doneKeys.has(`${item.contract.beatscodeId}:${item.attachmentId}`),
    );
    const slice = pending.slice(offset, limit ? offset + limit : undefined);

    const result: BeatscodeContractDownloadResult = {
      manifestPath,
      filesDir,
      employeesProcessed: 0,
      filesDownloaded: 0,
      filesSkipped: 0,
      errors: [],
    };

    if (!slice.length) {
      this.log.log('Nenhum contrato pendente para download.');
      return result;
    }

    const client = new BeatscodeApiClient(
      process.env.BEATSCODE_API_URL!.trim(),
      process.env.BEATSCODE_USERNAME!.trim(),
      process.env.BEATSCODE_PASSWORD!.trim(),
    );
    await client.login();

    await mkdir(filesDir, { recursive: true });
    await mkdir(dirname(manifestPath), { recursive: true });

    const employeesTouched = new Set<number>();
    let downloadsSinceLogin = 0;
    const reloginEvery = Number(process.env.BEATSCODE_CONTRACT_RELOGIN_EVERY ?? 80);

    for (const item of slice) {
      const key = `${item.contract.beatscodeId}:${item.attachmentId}`;
      if (doneKeys.has(key)) {
        result.filesSkipped += 1;
        continue;
      }

      if (downloadsSinceLogin >= reloginEvery) {
        await client.login();
        downloadsSinceLogin = 0;
      }

      try {
        let buffer = await client.downloadFile(item.snapshot.link);
        if (!buffer?.length) {
          await client.login();
          downloadsSinceLogin = 0;
          buffer = await client.downloadFile(item.snapshot.link);
        }
        if (!buffer?.length) {
          result.errors.push(
            `contract ${item.contract.beatscodeId} att ${item.attachmentId}: download vazio`,
          );
          continue;
        }

        downloadsSinceLogin += 1;

        const fileName = this.buildFileName({
          employeeId: item.snapshot.employeeId,
          playerName: item.snapshot.playerName,
          contract: item.contract,
          attachmentId: item.attachmentId,
          documentName: item.snapshot.documentName,
        });
        const relPath = join('files', fileName);
        const absPath = resolve(dirname(filesDir), relPath);
        await writeFile(absPath, buffer);

        const entry: BeatscodeContractDownloadEntry = {
          beatscodeContractId: item.contract.beatscodeId,
          employeeId: item.snapshot.employeeId,
          playerName: item.snapshot.playerName,
          athleteRecordId: item.snapshot.athleteRecordId,
          contractTypeName: item.contract.contractTypeName,
          contractNumber: item.contract.number,
          contractStatus: item.contract.status,
          contractStatusLabel: item.contract.statusLabel,
          initialDate: item.contract.initialDate,
          finalDate: item.contract.finalDate,
          menuCategory: item.contract.menuCategory,
          attachmentId: item.attachmentId,
          documentName: item.snapshot.documentName,
          localFilePath: relPath.replace(/\\/g, '/'),
          fileSize: buffer.length,
          downloadedAt: new Date().toISOString(),
          source: 'export_snapshot',
        };

        manifest.entries.push(entry);
        doneKeys.add(key);
        employeesTouched.add(item.snapshot.employeeId);
        result.filesDownloaded += 1;

        if (result.filesDownloaded % 25 === 0) {
          manifest.stats.filesDownloaded = manifest.entries.length;
          manifest.stats.employeesDone = employeesTouched.size;
          manifest.updatedAt = new Date().toISOString();
          await this.saveManifest(manifestPath, manifest);
          this.log.log(`Contratos: ${result.filesDownloaded} PDF(s) baixado(s)...`);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        result.errors.push(`contract ${item.contract.beatscodeId} att ${item.attachmentId}: ${msg}`);
      }
    }

    result.employeesProcessed = employeesTouched.size;
    manifest.stats.employeesDone = employeesTouched.size;
    manifest.stats.filesDownloaded = manifest.entries.length;
    manifest.stats.filesSkipped = result.filesSkipped;
    manifest.stats.errors = result.errors.length;
    manifest.stats.contractsLinked = manifest.entries.length;
    manifest.updatedAt = new Date().toISOString();
    await this.saveManifest(manifestPath, manifest);

    this.log.log(
      `Concluído: ${result.filesDownloaded} baixado(s), ${result.filesSkipped} ignorado(s), ${result.errors.length} erro(s).`,
    );

    return result;
  }

  private buildDownloadQueue(
    exportFile: BeatscodeContractExportFile,
    linkIndex: Map<number, SnapshotAttachmentLink>,
  ): DownloadQueueItem[] {
    const out: DownloadQueueItem[] = [];
    for (const contract of exportFile.contracts) {
      const attachmentIds = [...contract.attachmentIds, ...contract.extraFileIds];
      for (const attachmentId of attachmentIds) {
        const snapshot = linkIndex.get(attachmentId);
        if (!snapshot) continue;
        out.push({ contract, attachmentId, snapshot });
      }
    }
    return out.sort(
      (a, b) =>
        a.snapshot.employeeId - b.snapshot.employeeId ||
        a.contract.beatscodeId - b.contract.beatscodeId ||
        a.attachmentId - b.attachmentId,
    );
  }

  private async buildSnapshotLinkIndex(
    athletesPath: string,
  ): Promise<Map<number, SnapshotAttachmentLink>> {
    const raw = JSON.parse(await readFile(athletesPath, 'utf8')) as unknown;
    if (!isBeatscodeExportFile(raw)) {
      throw new Error(`Export de atletas inválido: ${athletesPath}`);
    }
    const exportFile = raw as BeatscodeExportFile;
    const map = new Map<number, SnapshotAttachmentLink>();

    for (const athlete of exportFile.athletes) {
      const beatscode = (athlete.registrationProfile as { beatscode?: Record<string, unknown> } | undefined)
        ?.beatscode;
      const employeeId = Number(beatscode?.employeeId ?? athlete.beatscodeId);
      if (!Number.isFinite(employeeId)) continue;

      const athleteRecordId = String(beatscode?.athleteRecordId ?? athlete.beatscodeId);
      const snapshot = beatscode?.snapshot as { beatscodeContracts?: unknown[] } | undefined;
      const contracts = snapshot?.beatscodeContracts;
      if (!Array.isArray(contracts)) continue;

      for (const row of contracts) {
        if (!row || typeof row !== 'object') continue;
        const contract = row as Record<string, unknown>;
        const beatscodeContractId = Number(contract.id);
        if (!Number.isFinite(beatscodeContractId)) continue;

        const contractTypeName =
          (typeof contract.contractType === 'string' ? contract.contractType : null) ??
          (typeof contract.contractTypeName === 'string' ? contract.contractTypeName : null);
        const contractNumber =
          typeof contract.number === 'string' ? contract.number.trim() : null;

        const attachments: Array<{ id?: number; link?: string; name?: string }> = [];
        if (Array.isArray(contract.attachment)) attachments.push(...contract.attachment);
        for (const key of ['extraFile', 'extraFile2'] as const) {
          const extra = contract[key];
          if (extra && typeof extra === 'object' && !Array.isArray(extra)) {
            attachments.push(extra as { id?: number; link?: string; name?: string });
          }
        }

        for (const att of attachments) {
          const attachmentId = Number(att.id);
          const link = typeof att.link === 'string' ? att.link.trim() : '';
          if (!Number.isFinite(attachmentId) || !link) continue;

          const documentName =
            (typeof att.name === 'string' && att.name.trim()) ||
            buildContractDocumentName(contractTypeName, contractNumber, beatscodeContractId, attachmentId);

          map.set(attachmentId, {
            attachmentId,
            link,
            documentName,
            beatscodeContractId,
            employeeId,
            playerName: athlete.name,
            athleteRecordId,
            contractTypeName,
            contractNumber,
          });
        }
      }
    }

    if (!map.size) {
      throw new Error(
        'Nenhum link de contrato em registrationProfile.beatscode.snapshot.beatscodeContracts — reexporte atletas.',
      );
    }

    this.log.log(`Índice de anexos: ${map.size} link(s) no export de atletas.`);
    return map;
  }

  private buildFileName(args: {
    employeeId: number;
    playerName: string;
    contract: BeatscodeContractExportFile['contracts'][number];
    attachmentId: number;
    documentName: string;
  }): string {
    const slug = (value: string, max = 36) =>
      value
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase()
        .slice(0, max) || 'doc';

    const player = slug(args.playerName, 28);
    const type = slug(args.contract.contractTypeName ?? 'contrato', 24);
    const number = slug(args.contract.number ?? 'sem-numero', 20);
    const label = slug(
      buildContractDocumentName(
        args.contract.contractTypeName,
        args.contract.number,
        args.contract.beatscodeId,
        args.attachmentId,
      ),
      40,
    );
    const doc = slug(args.documentName.replace(/\.pdf$/i, ''), 32);
    return `emp${args.employeeId}_${player}_c${args.contract.beatscodeId}_att${args.attachmentId}_${type}_${number}_${doc || label}.pdf`;
  }

  private async readContractsExport(filePath: string): Promise<BeatscodeContractExportFile> {
    const raw = JSON.parse(await readFile(filePath, 'utf8')) as unknown;
    if (!isBeatscodeContractExportFile(raw)) {
      throw new Error(`Export de contratos inválido: ${filePath}`);
    }
    return raw;
  }

  private async loadManifest(
    manifestPath: string,
    seed: {
      tenantSlug: string;
      contractsExportPath: string;
      athletesExportPath: string;
      filesDir: string;
      attachmentsTotal: number;
    },
  ): Promise<BeatscodeContractDownloadManifestFile> {
    try {
      const raw = JSON.parse(await readFile(manifestPath, 'utf8')) as unknown;
      if (isBeatscodeContractDownloadManifest(raw)) return raw;
    } catch {
      /* novo manifest */
    }
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      tenantSlug: seed.tenantSlug,
      contractsExportPath: seed.contractsExportPath,
      athletesExportPath: seed.athletesExportPath,
      filesDir: seed.filesDir,
      stats: {
        employeesTotal: seed.attachmentsTotal,
        employeesDone: 0,
        filesDownloaded: 0,
        filesSkipped: 0,
        contractsLinked: 0,
        errors: 0,
      },
      entries: [],
    };
  }

  private async saveManifest(
    manifestPath: string,
    manifest: BeatscodeContractDownloadManifestFile,
  ): Promise<void> {
    manifest.updatedAt = new Date().toISOString();
    manifest.stats.filesDownloaded = manifest.entries.length;
    manifest.stats.contractsLinked = manifest.entries.length;
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  }
}
