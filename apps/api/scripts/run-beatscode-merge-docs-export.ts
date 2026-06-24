/**
 * Mescla documentos baixados (local DB) de volta no JSON de export para re-import na produção.
 * Uso: pnpm --filter api beatscode:merge-docs-export [export.json] [saida.json]
 */
import 'dotenv/config';
import { readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';
import { NestFactory } from '@nestjs/core';
import { PrismaService } from '../src/prisma/prisma.service';
import { BeatscodeImportScriptModule } from '../src/beatscode-import/beatscode-import-script.module';
import {
  DEFAULT_BEATSCODE_EXPORT_PATH,
  DEFAULT_BEATSCODE_TENANT_SLUG,
  resolveBeatscodeTenantSlug,
} from '../src/beatscode-import/beatscode-import.service';
import {
  isBeatscodeExportFile,
  type BeatscodeExportFile,
} from '../src/beatscode-import/beatscode-export.types';

async function main() {
  const inputPath = resolve(process.cwd(), process.argv[2]?.trim() || DEFAULT_BEATSCODE_EXPORT_PATH);
  const outputPath = resolve(
    process.cwd(),
    process.argv[3]?.trim() || inputPath.replace(/\.json$/i, '-with-docs.json'),
  );
  const tenantSlug = resolveBeatscodeTenantSlug(
    process.argv[4]?.trim() || process.env.BEATSCODE_TENANT_SLUG || DEFAULT_BEATSCODE_TENANT_SLUG,
  );

  const raw = JSON.parse(await readFile(inputPath, 'utf8')) as unknown;
  if (!isBeatscodeExportFile(raw)) {
    throw new Error(`Arquivo inválido: ${inputPath}`);
  }
  const exportFile = raw as BeatscodeExportFile;

  const app = await NestFactory.createApplicationContext(BeatscodeImportScriptModule, {
    logger: ['error', 'warn'],
  });

  try {
    const prisma = app.get(PrismaService);
    const tenant = await prisma.tenant.findFirst({ where: { slug: tenantSlug } });
    if (!tenant) throw new Error(`Tenant não encontrado: ${tenantSlug}`);

    const players = await prisma.player.findMany({
      where: { tenantId: tenant.id, externalId: { startsWith: 'beatscode-' } },
      select: { externalId: true, registrationProfile: true },
    });

    const docsByExternal = new Map<string, unknown>();
    for (const p of players) {
      if (!p.externalId) continue;
      const profile = p.registrationProfile as { documents?: unknown } | null;
      if (profile?.documents) docsByExternal.set(p.externalId, profile.documents);
    }

    let merged = 0;
    let withS3 = 0;
    const athletes = exportFile.athletes.map((athlete) => {
      const externalId = `beatscode-${athlete.beatscodeId}`;
      const documents = docsByExternal.get(externalId);
      if (!documents || !Array.isArray(documents) || !documents.length) return athlete;
      merged += 1;
      const s3Count = documents.filter(
        (d) =>
          d &&
          typeof d === 'object' &&
          !(d as { pendingDownload?: boolean }).pendingDownload &&
          String((d as { fileUrl?: string }).fileUrl ?? '').trim(),
      ).length;
      withS3 += s3Count;
      return {
        ...athlete,
        registrationProfile: {
          ...(athlete.registrationProfile ?? {}),
          documents,
        },
      };
    });

    const out: BeatscodeExportFile = {
      ...exportFile,
      exportedAt: new Date().toISOString(),
      athletes,
    };

    await writeFile(outputPath, JSON.stringify(out, null, 2), 'utf8');
    console.log(
      JSON.stringify(
        {
          ok: true,
          inputPath,
          outputPath,
          athletes: athletes.length,
          mergedProfiles: merged,
          documentsWithUrl: withS3,
        },
        null,
        2,
      ),
    );
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
