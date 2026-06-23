import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, resolve } from 'path';
import { cadastroUpper, cadastroUpperRequired } from '../common/cadastro-text';
import { normalizeFootballPositionCode } from '../common/football-positions.util';
import { mediaKeyFromStoredUrl } from '../common/media-key.util';
import { getPlayerPhotoDisplayName } from '../common/photo-display-name';
import { MediaMetaService } from '../media/media-meta.service';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { BeatscodeApiClient } from './beatscode-api.client';
import {
  mapBeatscodeAthleteRow,
  type MappedBeatscodePlayer,
} from './beatscode-athlete.mapper';
import { resolveBeatscodeCategoryKey } from './beatscode-category.util';
import {
  defaultBeatscodeLookupContext,
  normalizeBeatscodeJerseyNumber,
  resolveBeatscodeDominantFootId,
  resolveBeatscodePositionId,
} from './beatscode-lookups.util';
import { loadBeatscodeReferences } from './beatscode-reference.loader';
import { mergeBeatscodeSources } from './beatscode-row.util';
import {
  deserializeBeatscodeReferences,
  serializeBeatscodeReferences,
} from './beatscode-references.serialize';
import {
  type BeatscodeExportAthlete,
  type BeatscodeExportFile,
  isBeatscodeExportFile,
} from './beatscode-export.types';

export type BeatscodeImportResult = {
  importedAt: string;
  tenantSlug: string;
  source: 'beatscode_api' | 'export_file';
  categoriesProcessed: string[];
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  athletes: Array<{ beatscodeId: string; name: string; category: string; action: 'created' | 'updated' }>;
};

export const DEFAULT_BEATSCODE_EXPORT_PATH = 'data/beatscode-athletes-export.json';
/** Clube BCG Brasil (base Sub-14…20). Beatscode é a academia BR — não confundir com USA. */
export const DEFAULT_BEATSCODE_TENANT_SLUG = 'boston-city-fc-brasil';

export function resolveBeatscodeTenantSlug(explicit?: string | null): string {
  const raw =
    explicit?.trim() ||
    process.env.BEATSCODE_TENANT_SLUG?.trim() ||
    DEFAULT_BEATSCODE_TENANT_SLUG;
  /** Exports antigos gravavam USA por engano — Beatscode é a base BR. */
  if (raw === 'boston-city-fc-usa') return DEFAULT_BEATSCODE_TENANT_SLUG;
  return raw;
}

@Injectable()
export class BeatscodeImportService {
  private readonly log = new Logger(BeatscodeImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly mediaMeta: MediaMetaService,
  ) {}

  createClient(): BeatscodeApiClient {
    const baseUrl =
      process.env.BEATSCODE_API_URL?.trim() || 'https://bostoncityfc-api.beatscode.com';
    const username = process.env.BEATSCODE_USERNAME?.trim();
    const password = process.env.BEATSCODE_PASSWORD?.trim();
    if (!username || !password) {
      throw new Error(
        'Credenciais Beatscode ausentes. Defina BEATSCODE_USERNAME e BEATSCODE_PASSWORD no .env (só no export local).',
      );
    }
    return new BeatscodeApiClient(baseUrl, username, password);
  }

  hasBeatscodeCredentials(): boolean {
    return !!(
      process.env.BEATSCODE_USERNAME?.trim() && process.env.BEATSCODE_PASSWORD?.trim()
    );
  }

  /** Busca no Beatscode e grava JSON (uso local — credenciais só aqui). */
  async exportToFile(options?: {
    tenantSlug?: string;
    categoryKeys?: string[] | 'all';
    downloadPhotos?: boolean;
    outputPath?: string;
  }): Promise<{ filePath: string; export: BeatscodeExportFile }> {
    const exportData = await this.fetchExportData(options);
    const rel = options?.outputPath?.trim() || DEFAULT_BEATSCODE_EXPORT_PATH;
    const filePath = resolve(process.cwd(), rel);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf8');
    this.log.log(`Beatscode export: ${exportData.athletes.length} atleta(s) → ${filePath}`);
    return { filePath, export: exportData };
  }

  async readExportFile(filePath: string): Promise<BeatscodeExportFile> {
    const abs = resolve(process.cwd(), filePath);
    const raw = JSON.parse(await readFile(abs, 'utf8')) as unknown;
    if (!isBeatscodeExportFile(raw)) {
      throw new Error(`Arquivo inválido: ${abs}. Esperado BeatscodeExportFile v1.`);
    }
    return raw;
  }

  /** Importa a partir do JSON exportado — sem credenciais Beatscode (ideal produção). */
  async importFromExport(
    exportFile: BeatscodeExportFile,
    options?: { tenantSlug?: string },
  ): Promise<BeatscodeImportResult> {
    const tenantSlug = resolveBeatscodeTenantSlug(options?.tenantSlug ?? exportFile.tenantSlug);
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug: { equals: tenantSlug, mode: 'insensitive' } },
      select: { id: true, slug: true },
    });
    if (!tenant) {
      throw new Error(`Tenant "${tenantSlug}" não encontrado.`);
    }

    const result: BeatscodeImportResult = {
      importedAt: new Date().toISOString(),
      tenantSlug: tenant.slug,
      source: 'export_file',
      categoriesProcessed: exportFile.categoriesProcessed,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [...exportFile.errors],
      athletes: [],
    };

    for (const athlete of exportFile.athletes) {
      try {
        const mapped = this.remapExportAthlete(athlete, exportFile);
        const action = await this.upsertFromMapped(tenant.id, mapped, athlete.photoUrl);
        if (action === 'created') result.created++;
        else result.updated++;
        result.athletes.push({
          beatscodeId: athlete.beatscodeId,
          name: athlete.name,
          category: athlete.category,
          action,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        result.errors.push(`${athlete.name}: ${msg}`);
        result.skipped++;
      }
    }

    await this.saveLastImport(result);
    return result;
  }

  async importFromFilePath(
    filePath: string,
    options?: { tenantSlug?: string },
  ): Promise<BeatscodeImportResult> {
    const exportFile = await this.readExportFile(filePath);
    return this.importFromExport(exportFile, options);
  }

  /** Atalho local: API → banco direto (exige credenciais no .env). */
  async runImport(options?: {
    tenantSlug?: string;
    categoryKeys?: string[] | 'all';
    downloadPhotos?: boolean;
  }): Promise<BeatscodeImportResult> {
    const exportData = await this.fetchExportData(options);
    const result = await this.importFromExport(exportData, {
      tenantSlug: options?.tenantSlug,
    });
    return { ...result, source: 'beatscode_api' };
  }

  private async fetchExportData(options?: {
    tenantSlug?: string;
    categoryKeys?: string[] | 'all';
    downloadPhotos?: boolean;
  }): Promise<BeatscodeExportFile> {
    const tenantSlug = resolveBeatscodeTenantSlug(options?.tenantSlug);
    const allCategories =
      options?.categoryKeys === 'all' ||
      process.env.BEATSCODE_ALL_CATEGORIES === '1' ||
      !options?.categoryKeys;
    const wantedCategories = allCategories
      ? null
      : (options?.categoryKeys as string[]);
    const downloadPhotos = options?.downloadPhotos !== false;

    const client = this.createClient();
    await client.login();

    const initial = await client.fetchInitialData();
    const refs = await loadBeatscodeReferences(client);
    this.log.log(
      `Beatscode refs: ${refs.lookups.contactById.size} contatos, ${refs.lookups.cityById.size} cidades, ${refs.characteristicsById.size} características, ${refs.documentTypes.length} tipos doc`,
    );
    const { personByEmployeeId, employeeByEmployeeId } = await client.loadEmployeeAndPersonMaps();
    this.log.log(`Beatscode: ${personByEmployeeId.size} pessoa(s) indexada(s) por employeeId`);

    const categoryTargets = initial.categories
      .map((c) => ({ ...c, mapped: resolveBeatscodeCategoryKey(c.name) }))
      .filter((c) => !wantedCategories || wantedCategories.includes(c.mapped));

    if (categoryTargets.length === 0) {
      throw new Error(
        `Nenhuma categoria Beatscode compatível. Disponíveis: ${initial.categories.map((c) => c.name).join(', ')}`,
      );
    }

    const athleteByKey = new Map<string, BeatscodeExportAthlete>();
    const errors: string[] = [];
    const categoriesProcessed: string[] = [];
    let processedRows = 0;

    for (const cat of categoryTargets) {
      const categoryKey = cat.mapped;
      categoriesProcessed.push(`${cat.name} → ${categoryKey}`);

      try {
        await client.setCategory(cat.id);
        await sleep(400);

        const rows = await client.listAthletes();
        const categoryRows = rows.filter((row) => rowMatchesCategory(row.categoryId, cat.id));
        this.log.log(`Beatscode ${cat.name}: ${categoryRows.length} atleta(s)`);

        for (const baseRow of categoryRows) {
          processedRows++;
          if (processedRows % 50 === 0) {
            this.log.log(`Beatscode export: ${processedRows} linha(s) processada(s)...`);
          }

          try {
            const idRaw =
              baseRow.employeeId ??
              baseRow.idEmployee ??
              baseRow.athleteId ??
              baseRow.idPerson ??
              baseRow.id;
            const employeeId = Number(idRaw);
            const person =
              Number.isFinite(employeeId) ? personByEmployeeId.get(employeeId) : undefined;
            const employee =
              Number.isFinite(employeeId) ? employeeByEmployeeId.get(employeeId) : undefined;
            const row = mergeBeatscodeSources(
              baseRow as Record<string, unknown>,
              person,
              employee,
            );

            const mapped = mapBeatscodeAthleteRow(row, categoryKey, {
              lookups: refs.lookups,
              characteristicsById: refs.characteristicsById,
            });
            if (!mapped) continue;

            let photoUrl: string | undefined;
            if (mapped.photoPath) {
              if (downloadPhotos) {
                photoUrl =
                  (await this.mirrorPhoto(
                    client,
                    mapped.photoPath,
                    mapped.name,
                    mapped.category,
                  )) ?? undefined;
              } else {
                photoUrl = client.resolveFileUrl(mapped.photoPath);
              }
            }

            const key = mapped.beatscodeId;
            const existing = athleteByKey.get(key);
            if (existing) {
              const categories = new Set([
                ...(existing.beatscodeCategories ?? [existing.category]),
                categoryKey,
              ]);
              athleteByKey.set(key, {
                ...existing,
                ...mapped,
                photoUrl: photoUrl ?? existing.photoUrl,
                beatscodeCategories: [...categories],
                registrationProfile: {
                  ...(mapped.registrationProfile as object),
                  categoryHistory: buildCategoryHistory(existing, mapped, categoryKey, cat.name),
                },
              });
            } else {
              athleteByKey.set(key, {
                ...mapped,
                photoUrl,
                beatscodeCategories: [categoryKey],
              });
            }
          } catch (e) {
            errors.push(
              `${cat.name}: ${String(baseRow.id ?? '?')} — ${e instanceof Error ? e.message : String(e)}`,
            );
          }
        }
      } catch (e) {
        errors.push(`Categoria ${cat.name}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    const athletes = [...athleteByKey.values()];
    this.log.log(`Beatscode export: ${athletes.length} atleta(s) único(s) de ${processedRows} linha(s)`);

    return {
      version: 2,
      exportedAt: new Date().toISOString(),
      apiUrl: client.getBaseUrl(),
      tenantSlug,
      categoriesProcessed,
      athletes,
      errors,
      references: serializeBeatscodeReferences(refs),
    };
  }

  private remapExportAthlete(
    athlete: BeatscodeExportAthlete,
    exportFile?: BeatscodeExportFile,
  ): MappedBeatscodePlayer {
    const profile = athlete.registrationProfile;
    const hasFullProfile =
      profile &&
      typeof profile === 'object' &&
      !Array.isArray(profile) &&
      (profile as { beatscode?: unknown }).beatscode != null;

    if (hasFullProfile) {
      return {
        ...athlete,
        jerseyNumber: normalizeBeatscodeJerseyNumber(athlete.jerseyNumber),
      };
    }

    const refs = exportFile?.references
      ? deserializeBeatscodeReferences(exportFile.references)
      : null;
    const ctx = refs
      ? { lookups: refs.lookups, characteristicsById: refs.characteristicsById }
      : { lookups: defaultBeatscodeLookupContext() };

    const raw = athlete.raw;
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const remapped = mapBeatscodeAthleteRow(raw as Record<string, unknown>, athlete.category, ctx);
      if (remapped) {
        return {
          ...remapped,
          beatscodeId: athlete.beatscodeId,
          name: athlete.name || remapped.name,
          photoPath: athlete.photoPath ?? remapped.photoPath,
        };
      }
    }

    return {
      ...athlete,
      jerseyNumber: normalizeBeatscodeJerseyNumber(athlete.jerseyNumber),
      position:
        athlete.position ??
        resolveBeatscodePositionId(
          (profile as { beatscode?: { snapshot?: { positionId?: unknown } } } | undefined)?.beatscode
            ?.snapshot?.positionId,
          ctx.lookups,
        ),
      preferredFoot:
        athlete.preferredFoot ??
        resolveBeatscodeDominantFootId(
          (profile as { beatscode?: { snapshot?: { dominantFootId?: unknown } } } | undefined)?.beatscode
            ?.snapshot?.dominantFootId,
          ctx.lookups,
        ),
    };
  }

  private async upsertFromMapped(
    tenantId: string,
    mapped: MappedBeatscodePlayer,
    photoUrl?: string | null,
  ): Promise<'created' | 'updated'> {
    const externalId = `beatscode-${mapped.beatscodeId}`;
    const name = cadastroUpperRequired(mapped.name);

    if (photoUrl?.trim()) {
      await this.applyPhotoDisplayName(photoUrl, name, mapped.category);
    }

    const data: Prisma.PlayerUncheckedCreateInput = {
      tenantId,
      name,
      category: mapped.category,
      externalId,
      photoUrl: photoUrl ?? null,
      birthDate: mapped.birthDate ?? null,
      nationality: cadastroUpper(mapped.nationality),
      height: mapped.height ?? null,
      weight: mapped.weight ?? null,
      preferredFoot: mapped.preferredFoot ?? null,
      jerseyNumber: mapped.jerseyNumber ?? null,
      position: normalizeFootballPositionCode(mapped.position) ?? cadastroUpper(mapped.position),
      contactEmail: mapped.contactEmail ?? null,
      contactPhone: mapped.contactPhone ?? null,
      emergencyContactName: mapped.emergencyContactName ?? null,
      emergencyContactPhone: mapped.emergencyContactPhone ?? null,
      status: mapped.status ?? null,
      registrationProfile: mapped.registrationProfile as Prisma.InputJsonValue,
    };

    const existing = await this.prisma.player.findFirst({
      where: { tenantId, externalId },
    });

    if (existing) {
      await this.prisma.player.update({
        where: { id: existing.id },
        data: {
          ...data,
          photoUrl: photoUrl ?? existing.photoUrl,
        },
      });
      return 'updated';
    }

    await this.prisma.player.create({ data });
    return 'created';
  }

  private async mirrorPhoto(
    client: BeatscodeApiClient,
    path: string,
    playerName: string,
    category: string,
  ): Promise<string | null> {
    try {
      const buf = await client.downloadFile(path);
      if (!buf?.length) return client.resolveFileUrl(path) ?? null;

      const ext = path.toLowerCase().includes('.png')
        ? 'png'
        : path.toLowerCase().includes('.webp')
          ? 'webp'
          : 'jpg';

      const uploaded = await this.s3.uploadMedia(
        buf,
        ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg',
        'jogadores',
      );
      await this.applyPhotoDisplayName(uploaded.url, playerName, category);
      return uploaded.url;
    } catch (e) {
      this.log.warn(
        `Foto Beatscode ${playerName}: ${e instanceof Error ? e.message : String(e)}`,
      );
      return client.resolveFileUrl(path) ?? null;
    }
  }

  /** Nome exibido na mídia: "NOME COMPLETO sub14" ou "NOME COMPLETO Jogadores". */
  private async applyPhotoDisplayName(
    photoUrl: string,
    playerName: string,
    category: string,
  ): Promise<void> {
    const key = mediaKeyFromStoredUrl(photoUrl);
    if (!key) return;
    const displayName = getPlayerPhotoDisplayName(playerName, category);
    await this.mediaMeta.setDisplayName(key, displayName);
  }

  private async saveLastImport(result: BeatscodeImportResult): Promise<void> {
    await this.prisma.integrationConfig.upsert({
      where: { key: 'beatscode_import_last' },
      create: { key: 'beatscode_import_last', config: result as object },
      update: { config: result as object },
    });
    this.log.log(
      `Beatscode import ${result.tenantSlug} (${result.source}): +${result.created} / ~${result.updated}`,
    );
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function rowMatchesCategory(categoryId: unknown, categoryIdWanted: number): boolean {
  if (Array.isArray(categoryId)) return categoryId.includes(categoryIdWanted);
  return Number(categoryId) === categoryIdWanted;
}

function buildCategoryHistory(
  existing: BeatscodeExportAthlete,
  mapped: MappedBeatscodePlayer,
  categoryKey: string,
  categoryLabel: string,
): unknown[] {
  const prevProfile = existing.registrationProfile as { categoryHistory?: unknown[] } | undefined;
  const prev = Array.isArray(prevProfile?.categoryHistory) ? prevProfile!.categoryHistory! : [];
  const entry = {
    id: `beatscode-${mapped.beatscodeId}-${categoryKey}`,
    category: categoryKey,
    categoryLabel,
    importedAt: new Date().toISOString(),
  };
  const withoutDup = prev.filter(
    (h) => (h as { category?: string })?.category !== categoryKey,
  );
  return [...withoutDup, entry];
}
