import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { BeatscodeApiClient } from './beatscode-api.client';
import { BeatscodeAttachmentService } from './beatscode-attachment.service';
import { BeatscodeBrowserScraperService } from './beatscode-browser-scraper.service';
import type { BeatscodeScrapedDocument } from './beatscode-browser-scraper.service';
import {
  buildBeatscodeDocumentName,
  mapBeatscodeDocumentTypeLabel,
  type BeatscodeDocumentsSyncResult,
} from './beatscode-document.types';
import {
  buildContractDocumentName,
  mapBeatscodeLegalDocStatus,
  mapBeatscodeLegalDocType,
} from './beatscode-contract-legal.util';
import { resolveBeatscodeTenantSlug } from './beatscode-import.service';

type StoredDoc = {
  id: string;
  name: string;
  documentType: string;
  documentCategory?: string;
  fileUrl: string;
  fileKey?: string;
  uploadedAt: string;
  beatscodeAttachmentId?: number;
  source?: string;
  pendingDownload?: boolean;
};

@Injectable()
export class BeatscodeDocumentsImportService {
  private readonly log = new Logger(BeatscodeDocumentsImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly attachments: BeatscodeAttachmentService,
    private readonly browserScraper: BeatscodeBrowserScraperService,
    private readonly s3: S3Service,
  ) {}

  hasApiCredentials(): boolean {
    return Boolean(
      process.env.BEATSCODE_USERNAME?.trim() && process.env.BEATSCODE_PASSWORD?.trim(),
    );
  }

  /** Pasta estável no S3 — usa externalId (beatscode-123) para valer igual em local e produção. */
  private documentStorageOwner(
    externalId: string | null | undefined,
    playerId: string,
  ): string {
    return externalId?.trim() || playerId;
  }

  /** URL já espelhada no nosso S3/CloudFront (não link temporário do Beatscode). */
  private isMirroredDocumentUrl(fileUrl: string | undefined): boolean {
    const u = fileUrl?.trim().toLowerCase() ?? '';
    if (!u) return false;
    if (u.includes('beatscode.com') || u.includes('beatscode')) return false;
    return (
      u.includes('bostoncitygroup') ||
      u.includes('cloudfront.net') ||
      u.includes('amazonaws.com') ||
      u.includes('/media/jogadores-documentos/')
    );
  }

  private documentNeedsMirror(doc: StoredDoc): boolean {
    if (doc.pendingDownload) return true;
    if (!doc.fileUrl?.trim()) return true;
    return !this.isMirroredDocumentUrl(doc.fileUrl);
  }

  private async downloadBeatscodeDocumentBuffer(
    client: BeatscodeApiClient,
    doc: StoredDoc,
  ): Promise<{ buffer: Buffer; filename: string; mimeType?: string } | null> {
    const rawUrl = doc.fileUrl?.trim();
    if (rawUrl && !this.isMirroredDocumentUrl(rawUrl)) {
      const buf = await client.downloadFile(rawUrl);
      if (buf?.length) {
        const filename =
          rawUrl.split('/').pop()?.split('?')[0] || `${doc.name || 'documento'}.pdf`;
        return {
          buffer: buf,
          filename,
          mimeType: filename.toLowerCase().endsWith('.pdf') ? 'application/pdf' : undefined,
        };
      }
    }

    if (Number.isFinite(doc.beatscodeAttachmentId)) {
      const downloaded = await this.attachments.downloadAttachment(
        client,
        doc.beatscodeAttachmentId!,
      );
      if (downloaded) {
        return {
          buffer: downloaded.buffer,
          filename: downloaded.meta.displayName,
          mimeType: downloaded.meta.mimeType,
        };
      }
    }

    return null;
  }

  /** Preenche fileUrl a partir de `/athlete-full` quando só temos beatscodeAttachmentId. */
  private async enrichDocumentsFromAthleteFull(
    client: BeatscodeApiClient,
    profile: Record<string, unknown>,
    docs: StoredDoc[],
  ): Promise<boolean> {
    const needsLink = docs.some(
      (d) => this.documentNeedsMirror(d) && !d.fileUrl?.trim() && d.beatscodeAttachmentId,
    );
    if (!needsLink) return false;

    const { athleteRecordId } = this.parseBeatscodeProfileMeta(profile);
    if (!athleteRecordId) return false;

    const full = await client.getAthleteFull(athleteRecordId);
    const data = full?.data as Record<string, unknown> | undefined;
    const attachment = data?.attachment as Record<string, unknown> | undefined;
    if (!attachment) return false;

    const linkById = new Map<number, string>();
    for (const entry of Object.values(attachment)) {
      if (!entry || typeof entry !== 'object') continue;
      const row = entry as Record<string, unknown>;
      const id = Number(row.id);
      const link = String(row.link ?? '').trim();
      if (Number.isFinite(id) && link) linkById.set(id, link);
    }

    let changed = false;
    for (const doc of docs) {
      if (!this.documentNeedsMirror(doc) || doc.fileUrl?.trim()) continue;
      const attId = doc.beatscodeAttachmentId;
      if (!Number.isFinite(attId)) continue;
      const link = linkById.get(attId!);
      if (!link) continue;
      doc.fileUrl = link;
      doc.pendingDownload = false;
      changed = true;
    }
    return changed;
  }

  private async mirrorDocumentToS3(
    client: BeatscodeApiClient,
    doc: StoredDoc,
    storageOwner: string,
    result: BeatscodeDocumentsSyncResult,
  ): Promise<boolean> {
    const downloaded = await this.downloadBeatscodeDocumentBuffer(client, doc);
    if (!downloaded) return false;

    const mapped = mapBeatscodeDocumentTypeLabel(downloaded.filename || doc.name);
    const uploaded = await this.s3.uploadPlayerRegistrationDocument(
      downloaded.buffer,
      storageOwner,
      downloaded.filename.endsWith('.pdf') ? downloaded.filename : `${downloaded.filename}.pdf`,
      downloaded.mimeType ?? 'application/pdf',
    );

    doc.name =
      doc.name ||
      downloaded.filename.replace(/\.(pdf|png|jpe?g|webp)$/i, '').trim() ||
      'Documento pessoal';
    doc.documentType = mapped.documentType;
    doc.documentCategory = mapped.documentCategory;
    doc.fileUrl = uploaded.url;
    doc.fileKey = uploaded.key;
    doc.pendingDownload = false;
    doc.uploadedAt = new Date().toISOString();
    doc.source = 'beatscode';
    result.filesDownloaded += 1;
    result.documentsUpdated += 1;
    return true;
  }

  /** Sincroniza PDFs/anexos dos atletas Beatscode → S3 → registrationProfile.documents + LegalDocument (contratos). */
  async syncTenantDocuments(options?: {
    tenantSlug?: string;
    downloadFiles?: boolean;
    useBrowser?: boolean;
  }): Promise<BeatscodeDocumentsSyncResult> {
    if (this.shouldUseBrowser(options) && options?.downloadFiles !== false) {
      return this.syncTenantDocumentsViaBrowser(options);
    }

    const tenantSlug = resolveBeatscodeTenantSlug(options?.tenantSlug);
    const tenant = await this.prisma.tenant.findFirst({ where: { slug: tenantSlug } });
    if (!tenant) throw new Error(`Tenant não encontrado: ${tenantSlug}`);

    const downloadFiles = options?.downloadFiles !== false;
    const result: BeatscodeDocumentsSyncResult = {
      importedAt: new Date().toISOString(),
      tenantSlug,
      playersProcessed: 0,
      documentsUpdated: 0,
      filesDownloaded: 0,
      legalDocumentsCreated: 0,
      skippedNoPath: 0,
      errors: [],
    };

    const documentTypes = await this.loadDocumentTypeMap();
    const players = await this.prisma.player.findMany({
      where: { tenantId: tenant.id, externalId: { startsWith: 'beatscode-' } },
      select: { id: true, externalId: true, registrationProfile: true },
    });

    const allAttachmentIds = new Set<number>();
    for (const p of players) {
      this.collectAttachmentIds(this.parseProfile(p.registrationProfile), allAttachmentIds);
    }
    await this.attachments.preloadAttachmentMeta([...allAttachmentIds]);

    let client: BeatscodeApiClient | null = null;
    let apiSessionStartedAt = 0;
    const apiSessionMaxMs = Number(
      process.env.BEATSCODE_BROWSER_SESSION_MAX_MS ?? 9 * 60 * 1000,
    );
    if (downloadFiles && this.hasApiCredentials()) {
      client = new BeatscodeApiClient(
        process.env.BEATSCODE_API_URL?.trim() || 'https://bostoncityfc-api.beatscode.com',
        process.env.BEATSCODE_USERNAME!.trim(),
        process.env.BEATSCODE_PASSWORD!.trim(),
      );
      await client.login();
      apiSessionStartedAt = Date.now();
    }

    this.log.log(
      `Beatscode documentos: modo API (${players.length} jogador(es), sem browser)`,
    );

    for (const player of players) {
      try {
        if (
          client &&
          apiSessionMaxMs > 0 &&
          apiSessionStartedAt > 0 &&
          Date.now() - apiSessionStartedAt >= apiSessionMaxMs
        ) {
          this.log.log('Beatscode documentos: renovando token API (~9 min)');
          await client.login();
          apiSessionStartedAt = Date.now();
        }

        if (result.playersProcessed > 0 && result.playersProcessed % 25 === 0) {
          this.log.log(
            `Beatscode documentos API: ${result.filesDownloaded} arquivo(s), ${result.playersProcessed} jogador(es)…`,
          );
        }

        const profile = this.parseProfile(player.registrationProfile);
        const docs = this.normalizeDocs(profile.documents);
        if (!docs.some((d) => this.documentNeedsMirror(d))) continue;

        const contracts = this.getBeatscodeContracts(profile);
        let changed = false;

        if (client) {
          await this.enrichDocumentsFromAthleteFull(client, profile, docs);
        }

        const personalIds = docs
          .map((d) => d.beatscodeAttachmentId)
          .filter((id): id is number => Number.isFinite(id));

        for (let i = 0; i < docs.length; i++) {
          const doc = docs[i]!;
          const attId = doc.beatscodeAttachmentId;
          if (!attId && !this.documentNeedsMirror(doc)) continue;
          if (!this.documentNeedsMirror(doc)) continue;

          if (client && downloadFiles && this.documentNeedsMirror(doc)) {
            const mirrored = await this.mirrorDocumentToS3(
              client,
              doc,
              this.documentStorageOwner(player.externalId, player.id),
              result,
            );
            if (mirrored) {
              changed = true;
              continue;
            }
          }

          if (!attId) continue;

          const meta = await this.attachments.resolveAttachmentMeta(attId);
          const typeName = meta?.displayName
            ? documentTypes.get(this.guessTypeIdFromMeta(meta))
            : undefined;
          const mapped = mapBeatscodeDocumentTypeLabel(typeName ?? meta?.displayName);
          const ordinal = personalIds.indexOf(attId) + 1 || i + 1;
          const name = buildBeatscodeDocumentName(meta ?? undefined, attId, ordinal);

          doc.name = name;
          doc.documentType = mapped.documentType;
          doc.documentCategory = mapped.documentCategory;
          doc.source = 'beatscode';
          changed = true;

          if (!downloadFiles || !client || !meta?.storagePath) {
            if (!meta?.storagePath) {
              doc.pendingDownload = true;
              result.skippedNoPath += 1;
            }
            continue;
          }

          const buf = await client.downloadFile(meta.storagePath);
          if (!buf?.length) {
            doc.pendingDownload = true;
            result.errors.push(`${player.externalId}: falha download anexo ${attId}`);
            continue;
          }

          const uploaded = await this.s3.uploadPlayerRegistrationDocument(
            buf,
            this.documentStorageOwner(player.externalId, player.id),
            meta.displayName || `beatscode-${attId}.pdf`,
            meta.mimeType,
          );

          doc.fileUrl = uploaded.url;
          doc.fileKey = uploaded.key;
          doc.pendingDownload = false;
          doc.uploadedAt = new Date().toISOString();
          result.filesDownloaded += 1;
          result.documentsUpdated += 1;
          changed = true;
        }

        for (const contract of contracts) {
          const attIds = [
            ...(contract.attachmentIds ?? []),
            ...(contract.extraFileIds ?? []),
          ];
          for (const attId of attIds) {
            const created = await this.syncContractLegalDocument(
              player.id,
              contract,
              attId,
              client,
              downloadFiles,
              result,
            );
            if (created) changed = true;
          }
        }

        if (changed) {
          await this.prisma.player.update({
            where: { id: player.id },
            data: {
              registrationProfile: {
                ...profile,
                documents: docs,
              } as Prisma.InputJsonValue,
            },
          });
          result.playersProcessed += 1;
        }
      } catch (e) {
        result.errors.push(
          `${player.externalId}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    await this.prisma.integrationConfig.upsert({
      where: { key: 'beatscode_documents_sync_last' },
      create: { key: 'beatscode_documents_sync_last', config: result as object },
      update: { config: result as object },
    });

    this.log.log(
      `Beatscode documentos: ${result.filesDownloaded} arquivo(s), ${result.playersProcessed} jogador(es)`,
    );
    return result;
  }

  private shouldUseBrowser(options?: { useBrowser?: boolean }): boolean {
    if (options?.useBrowser === false) return false;
    if (options?.useBrowser === true) return true;
    if (process.env.BEATSCODE_USE_BROWSER === '0') return false;
    if (process.env.BEATSCODE_USE_BROWSER === '1') return true;
    /** Com credenciais API, download direto (URLs do export) — sem Playwright. */
    if (this.hasApiCredentials()) return false;
    return !this.attachments.hasDatabaseConfigured();
  }

  /** Painel Beatscode (Playwright): login → atleta → Documentos/Anexos/Contrato → S3. */
  private async syncTenantDocumentsViaBrowser(options?: {
    tenantSlug?: string;
    playerLimit?: number;
  }): Promise<BeatscodeDocumentsSyncResult> {
    const tenantSlug = resolveBeatscodeTenantSlug(options?.tenantSlug);
    const tenant = await this.prisma.tenant.findFirst({ where: { slug: tenantSlug } });
    if (!tenant) throw new Error(`Tenant não encontrado: ${tenantSlug}`);

    const limit = Number(
      options?.playerLimit ??
        process.env.BEATSCODE_BROWSER_PLAYER_LIMIT ??
        0,
    );
    const maxSuccess = Number(process.env.BEATSCODE_BROWSER_MAX_SUCCESS ?? 0);

    const result: BeatscodeDocumentsSyncResult = {
      importedAt: new Date().toISOString(),
      tenantSlug,
      playersProcessed: 0,
      documentsUpdated: 0,
      filesDownloaded: 0,
      legalDocumentsCreated: 0,
      skippedNoPath: 0,
      errors: [],
    };

    if (!this.browserScraper.hasCredentials()) {
      throw new Error('BEATSCODE_USERNAME/PASSWORD obrigatórios para sync via navegador.');
    }

    const players = await this.prisma.player.findMany({
      where: { tenantId: tenant.id, externalId: { startsWith: 'beatscode-' } },
      select: { id: true, name: true, externalId: true, registrationProfile: true },
      orderBy: { name: 'asc' },
      ...(limit > 0 ? { take: limit } : {}),
    });

    const retryOnly = process.env.BEATSCODE_BROWSER_RETRY_ERRORS === '1';
    const skipNotFound =
      process.env.BEATSCODE_BROWSER_SKIP_NOT_FOUND !== '0' && !retryOnly;
    const knownNotFound = skipNotFound ? await this.loadLastSyncNotFoundIds() : new Set<string>();
    const lastErrors = retryOnly ? knownNotFound : new Set<string>();
    const orderedPlayers = retryOnly
      ? [
          ...players.filter((p) => lastErrors.has(p.externalId ?? '')),
          ...players.filter((p) => !lastErrors.has(p.externalId ?? '')),
        ]
      : [
          ...players.filter((p) => this.playerNeedsDocumentSync(p.registrationProfile)),
          ...players.filter((p) => !this.playerNeedsDocumentSync(p.registrationProfile)),
        ];

    const pendingTotal = orderedPlayers.filter((p) =>
      this.playerNeedsDocumentSync(p.registrationProfile),
    ).length;
    if (knownNotFound.size && skipNotFound) {
      this.log.log(
        `Beatscode sync: ${pendingTotal} pendente(s); pulando ${knownNotFound.size} já marcados como não encontrados`,
      );
    }

    let apiResolver: BeatscodeApiClient | null = null;
    let athleteRecordByEmployee = new Map<number, string>();
    let apiSessionStartedAt = 0;
    const apiSessionMaxMs = Number(
      process.env.BEATSCODE_BROWSER_SESSION_MAX_MS ?? 9 * 60 * 1000,
    );
    const checkpointEvery = Number(process.env.BEATSCODE_BROWSER_CHECKPOINT_EVERY ?? 10);
    let attempted = 0;

    if (this.hasApiCredentials()) {
      apiResolver = new BeatscodeApiClient(
        process.env.BEATSCODE_API_URL?.trim() || 'https://bostoncityfc-api.beatscode.com',
        process.env.BEATSCODE_USERNAME!.trim(),
        process.env.BEATSCODE_PASSWORD!.trim(),
      );
      await apiResolver.login();
      apiSessionStartedAt = Date.now();
      athleteRecordByEmployee = await this.buildAthleteRecordIdMap(apiResolver);
      this.log.log(
        `Beatscode sync: ${athleteRecordByEmployee.size} athleteRecordId(s) indexados pela API`,
      );
    }

    try {
      for (const player of orderedPlayers) {
        if (maxSuccess > 0 && result.playersProcessed >= maxSuccess) break;
        if (!this.playerNeedsDocumentSync(player.registrationProfile)) continue;
        if (skipNotFound && knownNotFound.has(player.externalId ?? '')) continue;

        attempted += 1;
        const label = `[${attempted}/${pendingTotal}] ${player.externalId} ${player.name}`;
        this.log.log(`Beatscode sync ${label}…`);
        const started = Date.now();

        try {
          const sessionRecycled = await this.browserScraper.beforePlayerScrape();
          if (sessionRecycled && apiResolver) {
            await apiResolver.login();
            apiSessionStartedAt = Date.now();
          } else if (
            apiResolver &&
            apiSessionMaxMs > 0 &&
            apiSessionStartedAt > 0 &&
            Date.now() - apiSessionStartedAt >= apiSessionMaxMs
          ) {
            this.log.log('Beatscode sync: renovando token API (~9 min)');
            await apiResolver.login();
            apiSessionStartedAt = Date.now();
          }

          const profile = this.parseProfile(player.registrationProfile);
          const docs = this.normalizeDocs(profile.documents);
          const contracts = this.getBeatscodeContracts(profile);

          const employeeId = this.parseBeatscodeEmployeeId(player.externalId ?? '');
          let beatscodeMeta = this.parseBeatscodeProfileMeta(profile);
          const mappedRecordId =
            employeeId != null ? athleteRecordByEmployee.get(employeeId) : undefined;
          if (!beatscodeMeta.athleteRecordId && mappedRecordId) {
            beatscodeMeta = { ...beatscodeMeta, athleteRecordId: mappedRecordId };
          }
          if (!beatscodeMeta.athleteRecordId && employeeId && apiResolver) {
            const resolved = await this.resolveAthleteRecordId(apiResolver, employeeId);
            if (resolved) {
              beatscodeMeta = { ...beatscodeMeta, athleteRecordId: resolved };
              athleteRecordByEmployee.set(employeeId, resolved);
            }
          }

          if (apiResolver) {
            let apiDone = false;
            try {
              apiDone = await this.trySyncPlayerDocumentsViaApi(
                player.id,
                player.externalId,
                profile,
                docs,
                contracts,
                apiResolver,
                result,
              );
            } catch (e) {
              const msg = e instanceof Error ? e.message : String(e);
              if (/token inv[aá]lido|unauthorized|401/i.test(msg)) {
                this.log.warn(`Beatscode sync ${label}: token expirado — relogin API`);
                await apiResolver.login();
                apiSessionStartedAt = Date.now();
                apiDone = await this.trySyncPlayerDocumentsViaApi(
                  player.id,
                  player.externalId,
                  profile,
                  docs,
                  contracts,
                  apiResolver,
                  result,
                );
              } else {
                throw e;
              }
            }
            if (apiDone) {
              const refreshed = await this.prisma.player.findUnique({
                where: { id: player.id },
                select: { registrationProfile: true },
              });
              if (refreshed) player.registrationProfile = refreshed.registrationProfile;
              this.log.log(
                `Beatscode sync ${label}: só API (${Math.round((Date.now() - started) / 1000)}s)`,
              );
              continue;
            }
          }

          const scraped = await this.browserScraper.scrapePersonDocuments({
            playerName: player.name,
            employeeId,
            athleteRecordId: beatscodeMeta.athleteRecordId,
            aliasNames: beatscodeMeta.aliasNames,
          });
          result.errors.push(
            ...scraped.errors.map((e) => `${player.externalId}: ${e}`),
          );
          if (!scraped.documents.length) {
            if (!scraped.errors.length) result.skippedNoPath += 1;
            this.log.log(
              `Beatscode sync ${label}: sem PDF (${Math.round((Date.now() - started) / 1000)}s)`,
            );
            continue;
          }

          let changed = false;
          for (const file of scraped.documents) {
            if (file.documentCategory === 'contrato' || file.tab === 'Contrato') {
              const created = await this.saveScrapedContractDocument(
                player.id,
                file,
                result,
              );
              if (created) changed = true;
              continue;
            }

            const updated = await this.applyScrapedPersonalDocument(
              this.documentStorageOwner(player.externalId, player.id),
              docs,
              file,
              result,
            );
            if (updated) changed = true;
          }

          if (changed) {
            const profileUpdate: Record<string, unknown> = {
              ...profile,
              documents: docs,
            };
            if (beatscodeMeta.athleteRecordId) {
              const beatscode = (profile.beatscode as Record<string, unknown> | undefined) ?? {};
              profileUpdate.beatscode = {
                ...beatscode,
                athleteRecordId: beatscodeMeta.athleteRecordId,
              };
            }
            await this.prisma.player.update({
              where: { id: player.id },
              data: {
                registrationProfile: profileUpdate as Prisma.InputJsonValue,
              },
            });
            result.playersProcessed += 1;
            this.log.log(
              `Beatscode sync ${label}: +${scraped.documents.length} arquivo(s) (${Math.round((Date.now() - started) / 1000)}s)`,
            );
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          result.errors.push(`${player.externalId}: ${msg}`);
          this.log.warn(`Beatscode sync ${label} falhou: ${msg}`);
          if (/timeout|signin|sessão|session|unauthorized|401/i.test(msg)) {
            await this.browserScraper.resetSession(msg);
            if (apiResolver) {
              await apiResolver.login();
              apiSessionStartedAt = Date.now();
            }
          }
        }

        if (checkpointEvery > 0 && attempted % checkpointEvery === 0) {
          await this.saveSyncCheckpoint(result, {
            attempted,
            pendingTotal,
            lastPlayerExternalId: player.externalId ?? undefined,
          });
        }
      }
    } finally {
      await this.browserScraper.close();
    }

    await this.prisma.integrationConfig.upsert({
      where: { key: 'beatscode_documents_sync_last' },
      create: { key: 'beatscode_documents_sync_last', config: result as object },
      update: { config: result as object },
    });

    this.log.log(
      `Beatscode browser: ${result.filesDownloaded} arquivo(s), ${result.playersProcessed} jogador(es)`,
    );
    return result;
  }

  private playerNeedsDocumentSync(registrationProfile: unknown): boolean {
    const profile = this.parseProfile(registrationProfile);
    const docs = this.normalizeDocs(profile.documents);
    const hasPending =
      docs.some((d) => this.documentNeedsMirror(d)) || docs.length === 0;
    const contracts = this.getBeatscodeContracts(profile);
    const hasContractPending = contracts.some(
      (c) => (c.attachmentIds?.length ?? 0) + (c.extraFileIds?.length ?? 0) > 0,
    );
    return hasPending || hasContractPending;
  }

  private parseBeatscodeEmployeeId(externalId: string): number | undefined {
    const m = externalId.match(/beatscode-(\d+)/i);
    const id = m ? Number(m[1]) : NaN;
    return Number.isFinite(id) ? id : undefined;
  }

  private parseBeatscodeProfileMeta(profile: Record<string, unknown>): {
    athleteRecordId?: string;
    aliasNames: string[];
  } {
    const beatscode = profile.beatscode as Record<string, unknown> | undefined;
    const snapshot = beatscode?.snapshot as Record<string, unknown> | undefined;
    const aliasNames: string[] = [];
    const push = (v: unknown) => {
      if (typeof v === 'string' && v.trim()) aliasNames.push(v.trim());
    };
    push(snapshot?.name);
    push(snapshot?.nickname);
    push(snapshot?.socialName);
    push(beatscode?.displayName);
    const athleteRecordId =
      typeof beatscode?.athleteRecordId === 'string' || typeof beatscode?.athleteRecordId === 'number'
        ? String(beatscode.athleteRecordId)
        : typeof snapshot?.id === 'string' || typeof snapshot?.id === 'number'
          ? String(snapshot.id)
          : undefined;
    return { athleteRecordId, aliasNames };
  }

  private async loadLastSyncNotFoundIds(): Promise<Set<string>> {
    const last = await this.prisma.integrationConfig.findUnique({
      where: { key: 'beatscode_documents_sync_last' },
    });
    const cfg = last?.config as { errors?: string[] } | null;
    const ids = new Set<string>();
    for (const err of cfg?.errors ?? []) {
      const m = err.match(/^(beatscode-\d+):.*Não encontrado no painel/i);
      if (m) ids.add(m[1]!);
    }
    if (ids.size && process.env.BEATSCODE_BROWSER_RETRY_ERRORS === '1') {
      this.log.log(`Beatscode retry: ${ids.size} atleta(s) com falha de match na última passagem`);
    }
    return ids;
  }

  private async saveSyncCheckpoint(
    result: BeatscodeDocumentsSyncResult,
    extra: {
      attempted: number;
      pendingTotal: number;
      lastPlayerExternalId?: string;
    },
  ): Promise<void> {
    await this.prisma.integrationConfig.upsert({
      where: { key: 'beatscode_documents_sync_checkpoint' },
      create: {
        key: 'beatscode_documents_sync_checkpoint',
        config: {
          updatedAt: new Date().toISOString(),
          ...extra,
          playersProcessed: result.playersProcessed,
          filesDownloaded: result.filesDownloaded,
          documentsUpdated: result.documentsUpdated,
          errorCount: result.errors.length,
        },
      },
      update: {
        config: {
          updatedAt: new Date().toISOString(),
          ...extra,
          playersProcessed: result.playersProcessed,
          filesDownloaded: result.filesDownloaded,
          documentsUpdated: result.documentsUpdated,
          errorCount: result.errors.length,
        },
      },
    });
  }

  private async buildAthleteRecordIdMap(
    client: BeatscodeApiClient,
  ): Promise<Map<number, string>> {
    const map = new Map<number, string>();
    try {
      const initial = await client.fetchInitialData('/person/athlete');
      for (const cat of initial.categories) {
        try {
          await client.setCategory(cat.id, '/person/athlete');
          const rows = await client.listAthletes();
          for (const row of rows) {
            const emp = Number(row.employeeId ?? row.idEmployee);
            const recId = row.id ?? row.athleteId;
            if (Number.isFinite(emp) && recId != null && String(recId).trim()) {
              map.set(emp, String(recId).trim());
            }
          }
        } catch {
          /* categoria opcional */
        }
      }
    } catch (e) {
      this.log.warn(
        `Índice athleteRecordId falhou: ${e instanceof Error ? e.message : e}`,
      );
    }
    return map;
  }

  /**
   * Tenta concluir o jogador só com API (IDs de anexo no cadastro).
   * Retorna true se não precisa abrir o browser para este atleta.
   */
  private async trySyncPlayerDocumentsViaApi(
    playerId: string,
    externalId: string | null | undefined,
    profile: Record<string, unknown>,
    docs: StoredDoc[],
    contracts: ReturnType<BeatscodeDocumentsImportService['getBeatscodeContracts']>,
    client: BeatscodeApiClient,
    result: BeatscodeDocumentsSyncResult,
  ): Promise<boolean> {
    const storageOwner = this.documentStorageOwner(externalId, playerId);
    await this.enrichDocumentsFromAthleteFull(client, profile, docs);
    const pendingDocs = docs.filter((d) => this.documentNeedsMirror(d));
    const hasContractIds = contracts.some(
      (c) => (c.attachmentIds?.length ?? 0) + (c.extraFileIds?.length ?? 0) > 0,
    );
    if (!pendingDocs.length && !hasContractIds) {
      return this.countPendingDocuments({ ...profile, documents: docs }) === 0;
    }

    let changed = false;
    for (const doc of pendingDocs) {
      const mirrored = await this.mirrorDocumentToS3(client, doc, storageOwner, result);
      if (mirrored) changed = true;
    }

    for (const contract of contracts) {
      const attIds = [...(contract.attachmentIds ?? []), ...(contract.extraFileIds ?? [])];
      for (const attId of attIds) {
        const created = await this.syncContractLegalDocument(
          playerId,
          contract,
          attId,
          client,
          true,
          result,
        );
        if (created) changed = true;
      }
    }

    if (!changed) return false;

    await this.prisma.player.update({
      where: { id: playerId },
      data: {
        registrationProfile: {
          ...profile,
          documents: docs,
        } as Prisma.InputJsonValue,
      },
    });
    result.playersProcessed += 1;

    return this.countPendingDocuments({
      ...profile,
      documents: docs,
    }) === 0;
  }

  private countPendingDocuments(profile: Record<string, unknown>): number {
    const docs = this.normalizeDocs(profile.documents);
    return docs.filter((d) => this.documentNeedsMirror(d)).length;
  }

  private async resolveAthleteRecordId(
    client: BeatscodeApiClient,
    employeeId: number,
  ): Promise<string | undefined> {
    try {
      const detail = await client.getAthleteDetail(employeeId);
      const id = detail.id ?? detail.athleteId;
      if (id != null && String(id).trim()) return String(id).trim();
    } catch {
      /* tenta listagem */
    }
    try {
      const athletes = await client.listAthletes();
      for (const row of athletes) {
        const emp = Number(row.employeeId ?? row.idEmployee);
        if (emp === employeeId) {
          const id = row.id ?? row.athleteId;
          if (id != null && String(id).trim()) return String(id).trim();
        }
      }
    } catch {
      /* ignore */
    }
    return undefined;
  }

  private async applyScrapedPersonalDocument(
    storageOwner: string,
    docs: StoredDoc[],
    file: BeatscodeScrapedDocument,
    result: BeatscodeDocumentsSyncResult,
  ): Promise<boolean> {
    const normName = file.name.toLowerCase().trim();
    let doc = docs.find(
      (d) =>
        d.name.toLowerCase().trim() === normName ||
        d.documentType === file.documentType ||
        (file.rowKey && d.documentType === file.rowKey),
    );

    if (!doc) {
      doc = {
        id: `beatscode-browser-${randomUUID()}`,
        name: file.name,
        documentType: file.documentType,
        documentCategory: file.documentCategory,
        fileUrl: '',
        uploadedAt: file.uploadedAt ?? new Date().toISOString(),
        source: 'beatscode',
        pendingDownload: true,
      };
      docs.push(doc);
    }

    if (this.isMirroredDocumentUrl(doc.fileUrl) && !doc.pendingDownload) return false;

    const uploaded = await this.s3.uploadPlayerRegistrationDocument(
      file.buffer,
      storageOwner,
      `${file.name}.pdf`,
      'application/pdf',
    );

    doc.name = file.name;
    doc.documentType = file.documentType;
    doc.documentCategory = file.documentCategory;
    doc.fileUrl = uploaded.url;
    doc.fileKey = uploaded.key;
    doc.pendingDownload = false;
    doc.source = 'beatscode';
    doc.uploadedAt = file.uploadedAt ?? new Date().toISOString();
    result.filesDownloaded += 1;
    result.documentsUpdated += 1;
    return true;
  }

  private async saveScrapedContractDocument(
    playerId: string,
    file: BeatscodeScrapedDocument,
    result: BeatscodeDocumentsSyncResult,
  ): Promise<boolean> {
    const existing = await this.prisma.legalDocument.findFirst({
      where: {
        playerId,
        name: file.name,
      },
    });
    if (existing?.fileUrl) return false;

    const uploaded = await this.s3.uploadLegalDocument(
      file.buffer,
      playerId,
      `${file.name}.pdf`,
    );

    await this.prisma.legalDocument.create({
      data: {
        playerId,
        type: 'contrato',
        name: file.name,
        fileKey: uploaded.key,
        fileUrl: uploaded.url,
        status: 'ativo',
        metadata: {
          source: 'beatscode',
          storagePath: file.storagePath,
          tab: file.tab,
        },
      },
    });

    result.filesDownloaded += 1;
    result.legalDocumentsCreated += 1;
    return true;
  }

  private async syncContractLegalDocument(
    playerId: string,
    contract: {
      beatscodeId: number;
      contractTypeName: string | null;
      number: string | null;
      status: string;
      initialDate: string | null;
      finalDate: string | null;
      menuCategory?: string;
      attachmentIds?: number[];
      extraFileIds?: number[];
    },
    attachmentId: number,
    client: BeatscodeApiClient | null,
    downloadFiles: boolean,
    result: BeatscodeDocumentsSyncResult,
  ): Promise<boolean> {
    const existing = await this.prisma.legalDocument.findFirst({
      where: {
        playerId,
        metadata: { path: ['beatscodeAttachmentId'], equals: attachmentId },
      },
    });
    if (existing?.fileUrl) return false;

    const meta =
      (await this.attachments.resolveAttachmentMeta(attachmentId)) ??
      (client
        ? await this.attachments.resolveAttachmentMetaViaApi(client, attachmentId)
        : null);
    if (!downloadFiles || !client || !meta?.storagePath) {
      if (!meta?.storagePath) result.skippedNoPath += 1;
      return false;
    }

    const buf = await client.downloadFile(meta.storagePath);
    if (!buf?.length) {
      result.errors.push(`Contrato ${contract.beatscodeId}: download ${attachmentId} falhou`);
      return false;
    }

    const uploaded = await this.s3.uploadLegalDocument(
      buf,
      playerId,
      meta.displayName || `contrato-${contract.beatscodeId}.pdf`,
    );

    await this.prisma.legalDocument.create({
      data: {
        playerId,
        type: mapBeatscodeLegalDocType(contract.contractTypeName, contract.status),
        name: buildContractDocumentName(
          contract.contractTypeName,
          contract.number,
          contract.beatscodeId,
          attachmentId,
        ),
        fileKey: uploaded.key,
        fileUrl: uploaded.url,
        status: mapBeatscodeLegalDocStatus(contract.status),
        validFrom: contract.initialDate ? new Date(`${contract.initialDate}T12:00:00`) : null,
        validUntil: contract.finalDate ? new Date(`${contract.finalDate}T12:00:00`) : null,
        metadata: {
          source: 'beatscode',
          beatscodeContractId: contract.beatscodeId,
          beatscodeAttachmentId: attachmentId,
          menuCategory: contract.menuCategory,
        },
      },
    });

    result.filesDownloaded += 1;
    result.legalDocumentsCreated += 1;
    return true;
  }

  private async loadDocumentTypeMap(): Promise<Map<number, string>> {
    const map = new Map<number, string>();
    if (!this.hasApiCredentials()) return map;
    try {
      const client = new BeatscodeApiClient(
        process.env.BEATSCODE_API_URL!.trim(),
        process.env.BEATSCODE_USERNAME!.trim(),
        process.env.BEATSCODE_PASSWORD!.trim(),
      );
      await client.login();
      const rows = await client.listByPath('/document-type', '/document');
      for (const r of rows) {
        const id = Number(r.id);
        const name = String(r.name ?? '').trim();
        if (Number.isFinite(id) && name) map.set(id, name);
      }
    } catch {
      /* opcional */
    }
    return map;
  }

  private guessTypeIdFromMeta(_meta: { displayName: string }): number {
    return 0;
  }

  private collectAttachmentIds(profile: Record<string, unknown>, out: Set<number>) {
    const docs = profile.documents;
    if (Array.isArray(docs)) {
      for (const d of docs) {
        if (!d || typeof d !== 'object') continue;
        const id = Number((d as { beatscodeAttachmentId?: number }).beatscodeAttachmentId);
        if (Number.isFinite(id)) out.add(id);
      }
    }
    const contracts = (profile.contracts as { beatscode?: Array<{ attachmentIds?: number[]; extraFileIds?: number[] }> } | undefined)?.beatscode;
    if (Array.isArray(contracts)) {
      for (const c of contracts) {
        for (const id of [...(c.attachmentIds ?? []), ...(c.extraFileIds ?? [])]) {
          if (Number.isFinite(id)) out.add(id);
        }
      }
    }
  }

  private getBeatscodeContracts(profile: Record<string, unknown>) {
    const block = profile.contracts as { beatscode?: Array<Record<string, unknown>> } | undefined;
    if (!Array.isArray(block?.beatscode)) return [];
    return block.beatscode.map((c) => ({
      beatscodeId: Number(c.beatscodeId),
      contractTypeName: (c.contractTypeName as string | null) ?? null,
      number: (c.number as string | null) ?? null,
      status: String(c.status ?? 'unknown'),
      initialDate: (c.initialDate as string | null) ?? null,
      finalDate: (c.finalDate as string | null) ?? null,
      menuCategory: c.menuCategory as string | undefined,
      attachmentIds: Array.isArray(c.attachmentIds) ? c.attachmentIds.map(Number) : [],
      extraFileIds: Array.isArray(c.extraFileIds) ? c.extraFileIds.map(Number) : [],
    }));
  }

  private normalizeDocs(raw: unknown): StoredDoc[] {
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((d) => d && typeof d === 'object')
      .map((d) => {
        const row = d as StoredDoc;
        return {
          id: row.id ?? `beatscode-att-${row.beatscodeAttachmentId ?? randomUUID()}`,
          name: row.name ?? 'Documento',
          documentType: row.documentType ?? 'outro',
          documentCategory: row.documentCategory,
          fileUrl: row.fileUrl ?? '',
          fileKey: row.fileKey,
          uploadedAt: row.uploadedAt ?? new Date().toISOString(),
          beatscodeAttachmentId: row.beatscodeAttachmentId,
          source: row.source,
          pendingDownload: row.pendingDownload ?? !row.fileUrl,
        };
      });
  }

  private parseProfile(raw: unknown): Record<string, unknown> {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    return { ...(raw as Record<string, unknown>) };
  }
}
