import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, resolve } from 'path';
import { cadastroUpper, cadastroUpperRequired } from '../common/cadastro-text';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { BeatscodeApiClient } from './beatscode-api.client';
import {
  mapBeatscodeAthleteRow,
  mapBeatscodeCategoryName,
  type MappedBeatscodePlayer,
} from './beatscode-athlete.mapper';
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

@Injectable()
export class BeatscodeImportService {
  private readonly log = new Logger(BeatscodeImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
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
    categoryKeys?: string[];
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
    const tenantSlug = (options?.tenantSlug ?? exportFile.tenantSlug).trim();
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
        const action = await this.upsertFromMapped(tenant.id, athlete, athlete.photoUrl);
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
    categoryKeys?: string[];
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
    categoryKeys?: string[];
    downloadPhotos?: boolean;
  }): Promise<BeatscodeExportFile> {
    const tenantSlug = (options?.tenantSlug ?? process.env.BEATSCODE_TENANT_SLUG ?? 'boston-city-fc-usa').trim();
    const wantedCategories = options?.categoryKeys ?? ['sub20', 'sub17', 'sub15', 'sub14'];
    const downloadPhotos = options?.downloadPhotos !== false;

    const client = this.createClient();
    await client.login();

    const initial = await client.fetchInitialData();
    const categoryTargets = initial.categories
      .map((c) => ({ ...c, mapped: mapBeatscodeCategoryName(c.name) }))
      .filter((c) => c.mapped && wantedCategories.includes(c.mapped));

    if (categoryTargets.length === 0) {
      throw new Error(
        `Nenhuma categoria Beatscode compatível (${wantedCategories.join(', ')}). Disponíveis: ${initial.categories.map((c) => c.name).join(', ')}`,
      );
    }

    const athletes: BeatscodeExportAthlete[] = [];
    const errors: string[] = [];
    const categoriesProcessed: string[] = [];

    for (const cat of categoryTargets) {
      const categoryKey = cat.mapped!;
      categoriesProcessed.push(`${cat.name} → ${categoryKey}`);

      try {
        await client.setCategory(cat.id);
        await sleep(400);

        const rows = await client.listAthletes();
        const categoryRows = rows.filter((row) => rowMatchesCategory(row.categoryId, cat.id));
        this.log.log(`Beatscode ${cat.name}: ${categoryRows.length} atleta(s)`);

        for (const baseRow of categoryRows) {
          try {
            const idRaw = baseRow.id ?? baseRow.athleteId ?? baseRow.employeeId ?? baseRow.idPerson;
            let row = { ...baseRow };
            if (idRaw != null && (typeof idRaw === 'string' || typeof idRaw === 'number')) {
              const person = await client.getPersonDetail(idRaw);
              if (person && Object.keys(person).length > 0) {
                row = { ...row, ...person };
              }
            }

            const mapped = mapBeatscodeAthleteRow(row, categoryKey);
            if (!mapped) continue;

            let photoUrl: string | undefined;
            if (mapped.photoPath) {
              if (downloadPhotos) {
                photoUrl =
                  (await this.mirrorPhoto(client, mapped.photoPath, mapped.beatscodeId)) ??
                  undefined;
              } else {
                photoUrl = client.resolveFileUrl(mapped.photoPath);
              }
            }

            athletes.push({ ...mapped, photoUrl });
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

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      apiUrl: client.getBaseUrl(),
      tenantSlug,
      categoriesProcessed,
      athletes,
      errors,
    };
  }

  private async upsertFromMapped(
    tenantId: string,
    mapped: MappedBeatscodePlayer,
    photoUrl?: string | null,
  ): Promise<'created' | 'updated'> {
    const externalId = `beatscode-${mapped.beatscodeId}`;
    const name = cadastroUpperRequired(mapped.name);

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
      position: cadastroUpper(mapped.position),
      contactEmail: mapped.contactEmail ?? null,
      contactPhone: mapped.contactPhone ?? null,
      emergencyContactName: mapped.emergencyContactName ?? null,
      emergencyContactPhone: mapped.emergencyContactPhone ?? null,
      registrationProfile: mapped.registrationProfile as Prisma.InputJsonValue,
    };

    const existing = await this.prisma.player.findFirst({
      where: {
        tenantId,
        OR: [
          { externalId },
          { name: { equals: name, mode: 'insensitive' }, category: mapped.category },
        ],
      },
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
    beatscodeId: string,
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
        'players_beatscode',
        beatscodeId,
      );
      return uploaded.url;
    } catch (e) {
      this.log.warn(`Foto Beatscode ${beatscodeId}: ${e instanceof Error ? e.message : String(e)}`);
      return client.resolveFileUrl(path) ?? null;
    }
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
