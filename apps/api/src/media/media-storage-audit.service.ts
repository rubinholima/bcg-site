import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import {
  collectMediaKeysFromJson,
  mediaKeyFromStoredUrl,
} from '../common/media-key.util';
import { MediaUrlReplaceService } from './media-url-replace.service';
import { MediaMetaService } from './media-meta.service';

export interface StorageAuditOrphan {
  key: string;
  url: string;
  size: number;
  lastModified: string;
  folder: string;
}

export interface StorageAuditDuplicateGroup {
  etag: string;
  size: number;
  totalWastedBytes: number;
  /** Key escolhida como canônica (mais referenciada). */
  keepKey: string;
  keys: string[];
  referenceCounts: Record<string, number>;
}

export interface StorageAuditResult {
  scannedAt: string;
  totalObjects: number;
  totalBytes: number;
  referencedKeys: number;
  orphanCount: number;
  orphanBytes: number;
  duplicateGroupCount: number;
  duplicateWastedBytes: number;
  orphans: StorageAuditOrphan[];
  duplicateGroups: StorageAuditDuplicateGroup[];
}

@Injectable()
export class MediaStorageAuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly urlReplace: MediaUrlReplaceService,
    private readonly mediaMeta: MediaMetaService,
  ) {}

  async runAudit(opts?: { orphanLimit?: number; duplicateLimit?: number }): Promise<StorageAuditResult> {
    const orphanLimit = opts?.orphanLimit ?? 200;
    const duplicateLimit = opts?.duplicateLimit ?? 100;

    const assets = await this.s3.listAllAssetsWithMeta();
    const { keys: referenced, counts } = await this.collectReferencedKeysWithCounts();

    const orphans: StorageAuditOrphan[] = [];
    let orphanBytes = 0;
    for (const a of assets) {
      if (referenced.has(a.key)) continue;
      orphans.push({
        key: a.key,
        url: a.url,
        size: a.size,
        lastModified: a.lastModified,
        folder: a.folder,
      });
      orphanBytes += a.size;
    }
    orphans.sort((x, y) => y.size - x.size);

    const byEtag = new Map<string, typeof assets>();
    for (const a of assets) {
      if (!a.etag || a.etag.includes('-')) continue;
      const group = byEtag.get(`${a.etag}:${a.size}`) ?? [];
      group.push(a);
      byEtag.set(`${a.etag}:${a.size}`, group);
    }

    const duplicateGroups: StorageAuditDuplicateGroup[] = [];
    let duplicateWastedBytes = 0;
    for (const [, group] of byEtag) {
      if (group.length < 2) continue;
      group.sort((a, b) => {
        const ca = counts.get(a.key) ?? 0;
        const cb = counts.get(b.key) ?? 0;
        if (cb !== ca) return cb - ca;
        return a.key.localeCompare(b.key);
      });
      const keepKey = group[0]!.key;
      const wasted = group.slice(1).reduce((s, g) => s + g.size, 0);
      duplicateWastedBytes += wasted;
      const referenceCounts: Record<string, number> = {};
      for (const g of group) referenceCounts[g.key] = counts.get(g.key) ?? 0;
      duplicateGroups.push({
        etag: group[0]!.etag,
        size: group[0]!.size,
        totalWastedBytes: wasted,
        keepKey,
        keys: group.map((g) => g.key),
        referenceCounts,
      });
    }
    duplicateGroups.sort((a, b) => b.totalWastedBytes - a.totalWastedBytes);

    const totalBytes = assets.reduce((s, a) => s + a.size, 0);

    return {
      scannedAt: new Date().toISOString(),
      totalObjects: assets.length,
      totalBytes,
      referencedKeys: referenced.size,
      orphanCount: orphans.length,
      orphanBytes,
      duplicateGroupCount: duplicateGroups.length,
      duplicateWastedBytes,
      orphans: orphans.slice(0, orphanLimit),
      duplicateGroups: duplicateGroups.slice(0, duplicateLimit),
    };
  }

  /** Remove órfãos (dryRun=true só simula). */
  async purgeOrphans(
    dryRun: boolean,
    opts?: { maxDelete?: number; keys?: string[] },
  ): Promise<{ dryRun: boolean; deleted: string[]; skipped: string[]; bytesFreed: number }> {
    const audit = await this.runAudit({ orphanLimit: 5000 });
    const targetKeys =
      opts?.keys?.length && opts.keys.length > 0
        ? opts.keys.filter((k) => audit.orphans.some((o) => o.key === k))
        : audit.orphans.map((o) => o.key);
    const maxDelete = opts?.maxDelete ?? 50;
    const toProcess = targetKeys.slice(0, maxDelete);

    const deleted: string[] = [];
    const skipped: string[] = [];
    let bytesFreed = 0;

    for (const key of toProcess) {
      const item = audit.orphans.find((o) => o.key === key);
      if (!item) {
        skipped.push(key);
        continue;
      }
      if (dryRun) {
        deleted.push(key);
        bytesFreed += item.size;
        continue;
      }
      try {
        await this.s3.deleteObject(key);
        await this.mediaMeta.removeByKey(key);
        deleted.push(key);
        bytesFreed += item.size;
      } catch {
        skipped.push(key);
      }
    }

    return { dryRun, deleted, skipped, bytesFreed };
  }

  /** Unifica duplicatas: aponta banco para keepKey e apaga cópias extras. */
  async consolidateDuplicates(
    dryRun: boolean,
    opts?: { maxGroups?: number },
  ): Promise<{
    dryRun: boolean;
    groupsProcessed: number;
    keysDeleted: string[];
    dbRowsUpdated: number;
    bytesFreed: number;
    errors: string[];
  }> {
    const audit = await this.runAudit({ duplicateLimit: opts?.maxGroups ?? 20 });
    const errors: string[] = [];
    const keysDeleted: string[] = [];
    let dbRowsUpdated = 0;
    let bytesFreed = 0;

    for (const group of audit.duplicateGroups) {
      const dupes = group.keys.filter((k) => k !== group.keepKey);
      for (const dup of dupes) {
        if (dryRun) {
          keysDeleted.push(dup);
          bytesFreed += group.size;
          continue;
        }
        try {
          const updated = await this.urlReplace.replaceMediaKeyInDatabase(dup, group.keepKey);
          dbRowsUpdated += updated;
          await this.s3.deleteObject(dup);
          await this.mediaMeta.removeByKey(dup);
          keysDeleted.push(dup);
          bytesFreed += group.size;
        } catch (e) {
          errors.push(`${dup}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }

    return {
      dryRun,
      groupsProcessed: audit.duplicateGroups.length,
      keysDeleted,
      dbRowsUpdated,
      bytesFreed,
      errors,
    };
  }

  private async collectReferencedKeysWithCounts(): Promise<{
    keys: Set<string>;
    counts: Map<string, number>;
  }> {
    const counts = new Map<string, number>();
    const add = (urlOrKey: string | null | undefined) => {
      const k = mediaKeyFromStoredUrl(urlOrKey);
      if (!k) return;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    };

    const [
      groups,
      tenants,
      events,
      championships,
      visitingTeams,
      players,
      medical,
      psych,
      technical,
      employees,
      assets,
      eventPhotos,
      pages,
      homeContents,
      marketingPosts,
    ] = await Promise.all([
      this.prisma.group.findMany({ select: { logoUrl: true, homeContent: true, moduleDefaults: true } }),
      this.prisma.tenant.findMany({ select: { logoUrl: true } }),
      this.prisma.event.findMany({ select: { logoUrl: true, content: true } }),
      this.prisma.championship.findMany({ select: { logoUrl: true } }),
      this.prisma.visitingTeam.findMany({ select: { logoUrl: true } }),
      this.prisma.player.findMany({ select: { photoUrl: true, images: true } }),
      this.prisma.medicalStaff.findMany({ select: { photoUrl: true } }),
      this.prisma.psychologist.findMany({ select: { photoUrl: true } }),
      this.prisma.technicalStaff.findMany({ select: { photoUrl: true } }),
      this.prisma.employee.findMany({
        select: {
          photoUrl: true,
          ctpsUrl: true,
          admissionMedicalExamFileUrl: true,
          dismissalMedicalExamFileUrl: true,
        },
      }),
      this.prisma.asset.findMany({ select: { photoUrl: true } }),
      this.prisma.eventPhoto.findMany({ select: { s3Key: true } }),
      this.prisma.page.findMany({ select: { content: true } }),
      this.prisma.homeContent.findMany({ select: { content: true } }),
      this.prisma.marketingPost.findMany({ select: { imageUrls: true } }),
    ]);

    for (const g of groups) {
      add(g.logoUrl);
      if (g.homeContent) this.addJsonKeys(g.homeContent, counts);
      if (g.moduleDefaults) this.addJsonKeys(g.moduleDefaults, counts);
    }
    for (const t of tenants) add(t.logoUrl);
    for (const e of events) {
      add(e.logoUrl);
      if (e.content) this.addJsonKeys(e.content, counts);
    }
    for (const c of championships) add(c.logoUrl);
    for (const v of visitingTeams) add(v.logoUrl);
    for (const p of players) {
      add(p.photoUrl);
      if (p.images) this.addJsonKeys(p.images, counts);
    }
    for (const m of medical) add(m.photoUrl);
    for (const p of psych) add(p.photoUrl);
    for (const t of technical) add(t.photoUrl);
    for (const e of employees) {
      add(e.photoUrl);
      add(e.ctpsUrl);
      add(e.admissionMedicalExamFileUrl);
      add(e.dismissalMedicalExamFileUrl);
    }
    for (const a of assets) add(a.photoUrl);
    for (const ph of eventPhotos) add(ph.s3Key);
    for (const p of pages) if (p.content) this.addJsonKeys(p.content, counts);
    for (const h of homeContents) if (h.content) this.addJsonKeys(h.content, counts);
    for (const mp of marketingPosts) if (mp.imageUrls) this.addJsonKeys(mp.imageUrls, counts);

    return { keys: new Set(counts.keys()), counts };
  }

  private addJsonKeys(value: unknown, counts: Map<string, number>): void {
    const found = new Set<string>();
    collectMediaKeysFromJson(value, found);
    for (const k of found) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
}
