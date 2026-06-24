import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

async function main() {
  const p = new PrismaClient();
  const players = await p.player.findMany({
    where: { externalId: { startsWith: 'beatscode-' } },
    select: { externalId: true, registrationProfile: true },
    take: 537,
  });
  let s3 = 0;
  let beatscode = 0;
  for (const pl of players) {
    const docs = (pl.registrationProfile as { documents?: Array<{ fileUrl?: string }> })?.documents ?? [];
    for (const d of docs) {
      const u = String(d.fileUrl ?? '');
      if (u.includes('bostoncitygroup') || u.includes('cloudfront') || u.includes('amazonaws'))
        s3++;
      else if (u.includes('beatscode.com')) beatscode++;
    }
  }
  console.log(JSON.stringify({ players: players.length, s3Urls: s3, beatscodeUrls: beatscode }));
  await p.$disconnect();
}

main().catch(console.error);
