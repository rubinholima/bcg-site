import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

async function main() {
  const p = new PrismaClient();
  const localManifest = await p.legalDocument.count({
    where: { metadata: { path: ['importedFrom'], equals: 'local_manifest' } },
  });
  const beatscode = await p.legalDocument.count({
    where: { metadata: { path: ['source'], equals: 'beatscode' } },
  });
  const cfg = await p.integrationConfig.findUnique({
    where: { key: 'beatscode_contracts_manifest_import_last' },
  });
  console.log(JSON.stringify({ localManifest, beatscodeTotal: beatscode, lastImport: cfg?.config }, null, 2));
  await p.$disconnect();
}

main().catch(console.error);
