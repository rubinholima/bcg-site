import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MediaMetaService {
  constructor(private readonly prisma: PrismaService) {}

  /** Retorna um mapa key -> displayName para as keys fornecidas. */
  async getDisplayNames(keys: string[]): Promise<Record<string, string>> {
    if (keys.length === 0) return {};
    const rows = await this.prisma.mediaMeta.findMany({
      where: { key: { in: keys } },
      select: { key: true, displayName: true },
    });
    const out: Record<string, string> = {};
    for (const row of rows) {
      if (row.displayName?.trim()) out[row.key] = row.displayName.trim();
    }
    return out;
  }

  /** Define ou remove o nome exibido de um item (key = caminho S3). */
  async setDisplayName(key: string, displayName: string | null): Promise<void> {
    const k = key?.trim();
    if (!k) return;
    const name = displayName?.trim() || null;
    await this.prisma.mediaMeta.upsert({
      where: { key: k },
      create: { key: k, displayName: name },
      update: { displayName: name },
    });
  }
}
