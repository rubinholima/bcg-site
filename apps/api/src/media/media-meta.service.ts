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

  /** Remove metadados quando o objeto foi apagado do S3 (evita nomes órfãos). */
  async removeByKey(key: string): Promise<void> {
    const k = key?.trim();
    if (!k) return;
    await this.prisma.mediaMeta.deleteMany({ where: { key: k } });
  }

  /** Migra metadados de logos/external → logos/clubes-adv (mesmo arquivo, nova key). */
  async migrateMediaKey(oldKey: string, newKey: string): Promise<void> {
    const ok = oldKey?.trim();
    const nk = newKey?.trim();
    if (!ok || !nk) return;
    const oldRow = await this.prisma.mediaMeta.findUnique({ where: { key: ok } });
    const newRow = await this.prisma.mediaMeta.findUnique({ where: { key: nk } });
    const displayName =
      oldRow?.displayName?.trim() || newRow?.displayName?.trim() || null;
    await this.prisma.mediaMeta.deleteMany({ where: { key: ok } });
    if (displayName !== null || oldRow || newRow) {
      await this.prisma.mediaMeta.upsert({
        where: { key: nk },
        create: { key: nk, displayName },
        update: { displayName: displayName ?? undefined },
      });
    }
  }
}
