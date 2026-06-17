import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { BeatscodeImportScriptModule } from '../src/beatscode-import/beatscode-import-script.module';
import { BeatscodeBrowserScraperService } from '../src/beatscode-import/beatscode-browser-scraper.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { S3Service } from '../src/s3/s3.service';

const TEST_NAME = process.argv[2] ?? 'João Pedro Pimentel';

async function main() {
  const app = await NestFactory.createApplicationContext(BeatscodeImportScriptModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const prisma = app.get(PrismaService);
    const scraper = app.get(BeatscodeBrowserScraperService);
    const s3 = app.get(S3Service);

    const player = await prisma.player.findFirst({
      where: {
        externalId: { startsWith: 'beatscode-' },
        name: { contains: TEST_NAME.split(' ')[0], mode: 'insensitive' },
      },
      select: { id: true, name: true, externalId: true, registrationProfile: true },
    });
    if (!player) {
      console.error('Jogador não encontrado para', TEST_NAME);
      process.exit(1);
    }
    console.log('Testando:', player.name, player.externalId);

    const scraped = await scraper.scrapePersonDocuments({ playerName: player.name });
    console.log('Scraped:', scraped.documents.length, 'erros:', scraped.errors);

    for (const doc of scraped.documents) {
      const uploaded = await s3.uploadPlayerRegistrationDocument(
        doc.buffer,
        player.id,
        `${doc.name}.pdf`,
        'application/pdf',
      );
      console.log('S3 OK:', doc.name, uploaded.url);
    }
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
