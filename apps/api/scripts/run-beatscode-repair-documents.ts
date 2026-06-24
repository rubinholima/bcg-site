/**
 * Corrige nomes/tipos de documentos importados do Beatscode:
 * - Remove falso "Documento pessoal" que era a foto do atleta
 * - RG → tipo rg (não documento esportivo)
 * - CPF, CTPS, etc. com nomes legíveis
 *
 * Uso:
 *   pnpm --filter api beatscode:repair-documents
 *   pnpm --filter api beatscode:repair-documents -- --dry-run
 *   pnpm --filter api beatscode:repair-documents -- --apply-db
 *   pnpm --filter api beatscode:repair-documents -- data/beatscode-athletes-export.json --apply-db
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
import {
  isGenericImportedDocumentName,
  rebuildBeatscodeDocumentsFromProfile,
  type BeatscodeStoredDocument,
} from '../src/beatscode-import/beatscode-document.types';

function docsSummary(docs: BeatscodeStoredDocument[]) {
  return docs.map((d) => ({
    name: d.name,
    type: d.documentType,
    id: d.beatscodeAttachmentId,
    hasFile: Boolean(d.fileUrl?.trim()),
  }));
}

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const dryRun = process.argv.includes('--dry-run');
  const applyDb = process.argv.includes('--apply-db');
  const inputPath = resolve(process.cwd(), args[0]?.trim() || DEFAULT_BEATSCODE_EXPORT_PATH);
  const tenantSlug = resolveBeatscodeTenantSlug(
    process.env.BEATSCODE_TENANT_SLUG || DEFAULT_BEATSCODE_TENANT_SLUG,
  );

  const raw = JSON.parse(await readFile(inputPath, 'utf8')) as unknown;
  if (!isBeatscodeExportFile(raw)) {
    throw new Error(`Arquivo inválido: ${inputPath}`);
  }
  const exportFile = raw as BeatscodeExportFile;

  let athletesChanged = 0;
  let docsRemoved = 0;
  let docsRenamed = 0;
  let rgFixed = 0;
  const samples: Array<{ name: string; before: unknown[]; after: unknown[] }> = [];

  const athletes = exportFile.athletes.map((athlete) => {
    const profile = (athlete.registrationProfile ?? {}) as Record<string, unknown>;
    const before = Array.isArray(profile.documents)
      ? (profile.documents as BeatscodeStoredDocument[])
      : [];
    const after = rebuildBeatscodeDocumentsFromProfile(profile);

    const changed =
      before.length !== after.length ||
      before.some((b, i) => {
        const a = after[i];
        return (
          !a ||
          b.beatscodeAttachmentId !== a.beatscodeAttachmentId ||
          b.name !== a.name ||
          b.documentType !== a.documentType
        );
      });

    if (!changed) return athlete;

    athletesChanged += 1;
    docsRemoved += Math.max(0, before.length - after.length);
    for (const b of before) {
      const a = after.find((x) => x.beatscodeAttachmentId === b.beatscodeAttachmentId);
      if (!a) continue;
      if (b.name !== a.name || isGenericImportedDocumentName(b.name)) docsRenamed += 1;
      if (b.documentType === 'documento_esportivo' && a.documentType === 'rg') rgFixed += 1;
    }

    if (samples.length < 8) {
      samples.push({
        name: athlete.name,
        before: docsSummary(before),
        after: docsSummary(after),
      });
    }

    return {
      ...athlete,
      registrationProfile: {
        ...profile,
        documents: after,
      },
    };
  });

  console.log(
    JSON.stringify(
      {
        inputPath,
        dryRun,
        applyDb,
        athletesTotal: exportFile.athletes.length,
        athletesChanged,
        docsRemoved,
        docsRenamed,
        rgFixed,
        samples,
      },
      null,
      2,
    ),
  );

  if (dryRun) return;

  await writeFile(
    inputPath,
    JSON.stringify({ ...exportFile, athletes, exportedAt: new Date().toISOString() }, null, 2),
    'utf8',
  );
  console.log(`Export atualizado: ${inputPath}`);

  if (!applyDb) return;

  const app = await NestFactory.createApplicationContext(BeatscodeImportScriptModule, {
    logger: ['error', 'warn'],
  });

  try {
    const prisma = app.get(PrismaService);
    const tenant = await prisma.tenant.findFirst({ where: { slug: tenantSlug } });
    if (!tenant) throw new Error(`Tenant não encontrado: ${tenantSlug}`);

    let dbUpdated = 0;
    for (const athlete of athletes) {
      const externalId = `beatscode-${athlete.beatscodeId}`;
      const player = await prisma.player.findFirst({
        where: { tenantId: tenant.id, externalId },
        select: { id: true, registrationProfile: true },
      });
      if (!player) continue;

      const profile = (player.registrationProfile ?? {}) as Record<string, unknown>;
      const rebuilt = rebuildBeatscodeDocumentsFromProfile({
        ...profile,
        beatscode: (athlete.registrationProfile as Record<string, unknown> | undefined)?.beatscode,
        documents: profile.documents,
      });

      await prisma.player.update({
        where: { id: player.id },
        data: {
          registrationProfile: {
            ...profile,
            documents: rebuilt,
          } as object,
        },
      });
      dbUpdated += 1;
    }

    console.log(`Banco atualizado: ${dbUpdated} atleta(s) em ${tenantSlug}`);
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
