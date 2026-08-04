/**
 * Seed: catálogo de vestuário/uniformes (Beatscode) — grupos, categorias,
 * tipos de uniforme, peças e kits.
 *
 * Fonte (JSON já raspado do Beatscode):
 *   apps/api/data/beatscode-clothing/api-clothing-groups.json
 *   apps/api/data/beatscode-clothing/api-clothing-types.json
 *   apps/api/data/beatscode-clothing/api-material-types.json
 *   apps/api/data/beatscode-clothing/api-clothing.json
 *   apps/api/data/beatscode-clothing/api-clothing-sets.json
 *   apps/api/data/beatscode-clothing/files/clothing_{id}.{png|jpeg}
 *
 * Imagem de cada peça/kit:
 *   1. Se AWS_S3_BUCKET estiver definido → upload para o S3 (media/logistica_uniformes/).
 *   2. Senão → copia o arquivo local para apps/web/public/media/logistica-uniforms/
 *      com nome estável (clothing-{beatscodeId}.{ext} / kit-{beatscodeId}.{ext}) e usa
 *      "/media/logistica-uniforms/..." como imageUrl.
 *   3. Sem arquivo local (nem S3) → usa a URL original do Beatscode como último fallback.
 * Kit: imagem = imagem da primeira peça do kit (clothing[0]).
 *
 * Upsert idempotente por beatscodeId — pode rodar quantas vezes precisar.
 *
 * Pré-requisito: o client Prisma precisa já ter os models novos gerados
 * (LogisticsClothingGroup/Category/Item, LogisticsUniformType, LogisticsUniformKit/Item).
 * Se ainda não gerou: pare a API, rode `pnpm --filter api run prisma:generate`
 * e aplique a migration (`prisma migrate dev`) antes de rodar este seed.
 *
 * Rodar (monorepo, a partir da raiz):
 *   pnpm --filter api run seed:logistica-uniforms
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const cwd = process.cwd();
dotenv.config({ path: path.resolve(cwd, '.env') });
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(cwd, '../../.env') });
}

const { PrismaClient } =
  require('@prisma/client') as typeof import('@prisma/client');
const prisma = new PrismaClient();

const DATA_DIR = path.resolve(cwd, 'data/beatscode-clothing');
const FILES_DIR = path.join(DATA_DIR, 'files');
const PUBLIC_MEDIA_DIR = path.resolve(
  cwd,
  '../web/public/media/logistica-uniforms',
);
const PUBLIC_MEDIA_URL_PREFIX = '/media/logistica-uniforms';

const CADASTRO_LOCALE = 'pt-BR';
function upper(value: string | null | undefined): string | null {
  if (value == null) return null;
  const t = value.trim();
  return t ? t.toLocaleUpperCase(CADASTRO_LOCALE) : null;
}
function upperRequired(value: string): string {
  return value.trim().toLocaleUpperCase(CADASTRO_LOCALE);
}

interface ClothingGroupRow {
  id: number;
  name: string;
  active?: boolean;
}
interface ClothingTypeRow {
  id: number;
  name: string;
  clothingGroupId: number;
  active?: boolean;
}
interface MaterialTypeRow {
  id: number;
  name: string;
  active?: boolean;
}
interface ClothingRow {
  id: number;
  name: string;
  clothingTypeId?: number;
  clothingGroupId?: number;
  image?: { id: number; link: string };
  active?: boolean;
  seasonName?: string;
  clothingMaterialTypeId?: number;
}
interface ClothingSetRow {
  id: number;
  name: string;
  active?: boolean;
  clothingId?: number[];
  clothing?: Array<{ id: number; image?: { id: number; link: string } }>;
  seasonName?: string;
  clothingMaterialTypeId?: number;
}

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf-8')) as T;
}

function byId<T extends { id: number }>(rows: T[]): T[] {
  return rows.slice().sort((a, b) => a.id - b.id);
}

const LOCAL_IMAGE_EXTS = ['.png', '.jpeg', '.jpg', '.webp'];

function findLocalImageFile(clothingId: number): string | null {
  for (const ext of LOCAL_IMAGE_EXTS) {
    const p = path.join(FILES_DIR, `clothing_${clothingId}${ext}`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

const S3_BUCKET = (process.env.AWS_S3_BUCKET ?? '').trim();
const S3_REGION = (
  process.env.AWS_REGION ??
  process.env.AWS_DEFAULT_REGION ??
  'us-east-1'
).trim();
const PUBLIC_MEDIA_ORIGIN = (process.env.PUBLIC_MEDIA_ORIGIN ?? '').replace(
  /\/$/,
  '',
);
const s3Client = S3_BUCKET ? new S3Client({ region: S3_REGION }) : null;

function s3PublicUrl(key: string): string {
  if (PUBLIC_MEDIA_ORIGIN) return `${PUBLIC_MEDIA_ORIGIN}/${key}`;
  return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`;
}

async function uploadToS3(localFile: string, key: string): Promise<string> {
  const buffer = fs.readFileSync(localFile);
  const ext = path.extname(localFile).toLowerCase();
  const contentType = CONTENT_TYPE_BY_EXT[ext] ?? 'application/octet-stream';
  await s3Client!.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );
  return s3PublicUrl(key);
}

function ensurePublicMediaDir() {
  fs.mkdirSync(PUBLIC_MEDIA_DIR, { recursive: true });
}

/**
 * Resolve a URL final da imagem de uma peça ou kit.
 * `sourceClothingId` = id (Beatscode) da peça cuja imagem local será usada
 * (para kit, é a primeira peça do conjunto).
 */
async function resolveImageUrl(
  prefix: 'clothing' | 'kit',
  beatscodeId: number,
  sourceClothingId: number,
  fallbackLink?: string,
): Promise<string | null> {
  const localFile = findLocalImageFile(sourceClothingId);
  if (!localFile) return fallbackLink?.trim() || null;

  const ext = path.extname(localFile).toLowerCase();

  if (s3Client) {
    const key = `media/logistica_uniformes/${prefix}-${beatscodeId}${ext}`;
    return uploadToS3(localFile, key);
  }

  ensurePublicMediaDir();
  const destName = `${prefix}-${beatscodeId}${ext}`;
  fs.copyFileSync(localFile, path.join(PUBLIC_MEDIA_DIR, destName));
  return `${PUBLIC_MEDIA_URL_PREFIX}/${destName}`;
}

async function main() {
  const groups = byId(readJson<ClothingGroupRow[]>('api-clothing-groups.json'));
  const types = byId(readJson<ClothingTypeRow[]>('api-clothing-types.json'));
  const materials = byId(
    readJson<MaterialTypeRow[]>('api-material-types.json'),
  );
  const clothing = byId(readJson<ClothingRow[]>('api-clothing.json'));
  const sets = byId(readJson<ClothingSetRow[]>('api-clothing-sets.json'));

  console.log('Vestuário/uniformes — Beatscode');
  console.log(
    `  Grupos: ${groups.length} | Categorias: ${types.length} | Tipos de uniforme: ${materials.length}`,
  );
  console.log(`  Peças: ${clothing.length} | Kits: ${sets.length}`);
  console.log(
    s3Client
      ? '  Imagens → S3 (media/logistica_uniformes/)'
      : `  Imagens → apps/web/public${PUBLIC_MEDIA_URL_PREFIX}/ (AWS_S3_BUCKET não definido)`,
  );
  console.log('');

  // ——— Grupos ———
  const groupIdByBeatscodeId = new Map<number, string>();
  for (const [idx, g] of groups.entries()) {
    const name = upperRequired(g.name);
    const row = await prisma.logisticsClothingGroup.upsert({
      where: { beatscodeId: g.id },
      create: {
        name,
        beatscodeId: g.id,
        isSystem: true,
        active: g.active ?? true,
        sortOrder: idx,
      },
      update: { name, active: g.active ?? true, sortOrder: idx },
    });
    groupIdByBeatscodeId.set(g.id, row.id);
  }
  console.log(`  ✓ ${groupIdByBeatscodeId.size} grupos sincronizados`);

  // ——— Categorias (clothing types) ———
  const categoryIdByBeatscodeId = new Map<number, string>();
  for (const [idx, t] of types.entries()) {
    const groupId = groupIdByBeatscodeId.get(t.clothingGroupId);
    if (!groupId) {
      console.warn(
        `  ! categoria "${t.name}" (id ${t.id}) sem grupo válido (clothingGroupId ${t.clothingGroupId}) — ignorada`,
      );
      continue;
    }
    const name = upperRequired(t.name);
    const row = await prisma.logisticsClothingCategory.upsert({
      where: { beatscodeId: t.id },
      create: {
        name,
        groupId,
        beatscodeId: t.id,
        isSystem: true,
        active: t.active ?? true,
        sortOrder: idx,
      },
      update: { name, groupId, active: t.active ?? true, sortOrder: idx },
    });
    categoryIdByBeatscodeId.set(t.id, row.id);
  }
  console.log(`  ✓ ${categoryIdByBeatscodeId.size} categorias sincronizadas`);

  // ——— Tipos de uniforme (material types: Jogo, Passeio, Treino, Viagem) ———
  const uniformTypeIdByBeatscodeId = new Map<number, string>();
  for (const [idx, m] of materials.entries()) {
    const name = upperRequired(m.name);
    const row = await prisma.logisticsUniformType.upsert({
      where: { beatscodeId: m.id },
      create: {
        name,
        beatscodeId: m.id,
        isSystem: true,
        active: m.active ?? true,
        sortOrder: idx,
      },
      update: { name, active: m.active ?? true, sortOrder: idx },
    });
    uniformTypeIdByBeatscodeId.set(m.id, row.id);
  }
  console.log(
    `  ✓ ${uniformTypeIdByBeatscodeId.size} tipos de uniforme sincronizados`,
  );

  // ——— Peças ———
  const clothingItemIdByBeatscodeId = new Map<number, string>();
  let withLocalImage = 0;
  let withFallbackImage = 0;
  for (const [idx, c] of clothing.entries()) {
    const name = upperRequired(c.name);
    const categoryId = c.clothingTypeId
      ? (categoryIdByBeatscodeId.get(c.clothingTypeId) ?? null)
      : null;
    const groupId = c.clothingGroupId
      ? (groupIdByBeatscodeId.get(c.clothingGroupId) ?? null)
      : null;
    const uniformTypeId = c.clothingMaterialTypeId
      ? (uniformTypeIdByBeatscodeId.get(c.clothingMaterialTypeId) ?? null)
      : null;

    const hasLocalFile = Boolean(findLocalImageFile(c.id));
    const imageUrl = await resolveImageUrl(
      'clothing',
      c.id,
      c.id,
      c.image?.link,
    );
    if (hasLocalFile) withLocalImage += 1;
    else if (imageUrl) withFallbackImage += 1;

    const row = await prisma.logisticsClothingItem.upsert({
      where: { beatscodeId: c.id },
      create: {
        name,
        categoryId,
        groupId,
        uniformTypeId,
        season: upper(c.seasonName),
        imageUrl,
        beatscodeId: c.id,
        isSystem: true,
        active: c.active ?? true,
        sortOrder: idx,
      },
      update: {
        name,
        categoryId,
        groupId,
        uniformTypeId,
        season: upper(c.seasonName),
        imageUrl,
        active: c.active ?? true,
        sortOrder: idx,
      },
    });
    clothingItemIdByBeatscodeId.set(c.id, row.id);
  }
  console.log(
    `  ✓ ${clothingItemIdByBeatscodeId.size} peças sincronizadas (${withLocalImage} com imagem local, ${withFallbackImage} com URL original de fallback)`,
  );

  // ——— Kits ———
  let kitsSynced = 0;
  for (const [idx, s] of sets.entries()) {
    const name = upperRequired(s.name);
    const uniformTypeId = s.clothingMaterialTypeId
      ? (uniformTypeIdByBeatscodeId.get(s.clothingMaterialTypeId) ?? null)
      : null;
    const firstPiece = s.clothing?.[0];
    const imageUrl = firstPiece
      ? await resolveImageUrl(
          'kit',
          s.id,
          firstPiece.id,
          firstPiece.image?.link,
        )
      : null;

    const kit = await prisma.logisticsUniformKit.upsert({
      where: { beatscodeId: s.id },
      create: {
        name,
        uniformTypeId,
        season: upper(s.seasonName),
        imageUrl,
        beatscodeId: s.id,
        isSystem: true,
        active: s.active ?? true,
        sortOrder: idx,
      },
      update: {
        name,
        uniformTypeId,
        season: upper(s.seasonName),
        imageUrl,
        active: s.active ?? true,
        sortOrder: idx,
      },
    });

    const beatscodeClothingIds =
      s.clothingId ?? s.clothing?.map((c) => c.id) ?? [];
    const clothingItemIds = beatscodeClothingIds
      .map((bcId) => clothingItemIdByBeatscodeId.get(bcId))
      .filter((id): id is string => Boolean(id));

    await prisma.logisticsUniformKitItem.deleteMany({
      where: { kitId: kit.id },
    });
    if (clothingItemIds.length) {
      await prisma.logisticsUniformKitItem.createMany({
        data: clothingItemIds.map((clothingItemId, i) => ({
          kitId: kit.id,
          clothingItemId,
          sortOrder: i,
        })),
      });
    }
    kitsSynced += 1;
  }
  console.log(
    `  ✓ ${kitsSynced} kits sincronizados (peças vinculadas por beatscodeId)`,
  );

  console.log('');
  console.log('Concluído.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
