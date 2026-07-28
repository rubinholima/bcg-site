import { Injectable, Logger } from '@nestjs/common';
import { cadastroUpperRequired } from '../common/cadastro-text';
import { MediaMetaService } from '../media/media-meta.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  normalizeTeamNameKeyForMerge,
  softNormalizeTeamNameKey,
} from '../public/visiting-team-logo-merge.util';
import { S3Service } from '../s3/s3.service';
import type { FmfParsedMatch } from './fmf-proxjogos.parser';
import { FmfScraperService, type FmfScraperStore } from './fmf-scraper.service';
import {
  FMF_SYNC_TENANT_DEFAULTS,
  FMF_SYNC_TENANT_SLUGS,
  isFmfSyncTenantSlug,
} from './fmf-sync-tenants.config';
import { isFmfTeamMatch } from './fmf-team-match.util';

export type FmfVisitingTeamsSyncResult = {
  syncedAt: string;
  teamsSeen: number;
  created: number;
  renamed: number;
  mergedDuplicates: number;
  skippedOurClubs: number;
  logosDownloaded: number;
  logosSkipped: number;
  errors: string[];
};

type TeamLogoCandidate = {
  name: string;
  logoUrl: string | null;
};

type VisitingRow = {
  id: string;
  name: string;
  logoUrl: string | null;
};

const ALLOWED_HOSTS = new Set([
  'esumula.fmf.com.br',
  'www.fmf.com.br',
  'fmf.com.br',
]);

function guessContentType(url: string, header: string | null): string | null {
  const h = (header ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
  if (h === 'image/png' || h === 'image/jpeg' || h === 'image/jpg' || h === 'image/webp') {
    return h === 'image/jpg' ? 'image/jpeg' : h;
  }
  if (h === 'image/x-png') return 'image/png';
  const lower = url.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  return null;
}

function collectTeamsFromMatches(matches: FmfParsedMatch[]): Map<string, TeamLogoCandidate> {
  const byKey = new Map<string, TeamLogoCandidate>();

  const upsert = (nameRaw: string, logoUrl: string | null) => {
    const name = nameRaw.trim();
    if (!name) return;
    const soft = softNormalizeTeamNameKey(name);
    if (!soft) return;
    const prev = byKey.get(soft);
    if (!prev) {
      byKey.set(soft, { name, logoUrl: logoUrl?.trim() || null });
      return;
    }
    // Mantém o primeiro nome FMF visto; só completa logo se faltar
    if (!prev.logoUrl && logoUrl?.trim()) prev.logoUrl = logoUrl.trim();
  };

  for (const m of matches) {
    upsert(m.homeName, m.homeLogoUrl);
    upsert(m.awayName, m.awayLogoUrl);
  }
  return byKey;
}

function pickCanonical(rows: VisitingRow[], preferredName?: string): VisitingRow {
  const preferred = preferredName?.trim().toUpperCase();
  if (preferred) {
    const exact = rows.find((r) => r.name.trim().toUpperCase() === preferred);
    if (exact) return exact;
  }
  const withLogo = rows.filter((r) => r.logoUrl?.trim());
  if (withLogo.length === 1) return withLogo[0]!;
  if (withLogo.length > 1) {
    return [...withLogo].sort((a, b) => a.name.length - b.name.length)[0]!;
  }
  return [...rows].sort((a, b) => a.name.length - b.name.length)[0]!;
}

@Injectable()
export class FmfVisitingTeamsSyncService {
  private readonly log = new Logger(FmfVisitingTeamsSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fmfScraper: FmfScraperService,
    private readonly s3: S3Service,
    private readonly mediaMeta: MediaMetaService,
  ) {}

  async syncFromStore(store?: FmfScraperStore): Promise<FmfVisitingTeamsSyncResult> {
    const status = store ?? ((await this.fmfScraper.getStatus()) as FmfScraperStore);
    if (!status.updatedAt) {
      throw new Error('Nenhum dado FMF importado. Execute a importação FMF antes.');
    }

    const allMatches: FmfParsedMatch[] = [];
    for (const snap of Object.values(status.categories)) {
      if (!snap?.matches?.length) continue;
      allMatches.push(...snap.matches);
    }

    const ourClubMatchers = await this.loadOurClubMatchers();
    const candidates = collectTeamsFromMatches(allMatches);

    let created = 0;
    let renamed = 0;
    let mergedDuplicates = 0;
    let skippedOurClubs = 0;
    let logosDownloaded = 0;
    let logosSkipped = 0;
    const errors: string[] = [];

    // 1) Limpa duplicados já existentes no cadastro (mesma chave soft)
    mergedDuplicates += await this.mergeExistingDuplicates();

    let existing: VisitingRow[] = (
      await this.prisma.visitingTeam.findMany({ orderBy: { name: 'asc' } })
    ).map((t) => ({ id: t.id, name: t.name, logoUrl: t.logoUrl }));

    for (const [, cand] of candidates) {
      const exactName = cadastroUpperRequired(cand.name);

      if (this.isOurClub(cand.name, ourClubMatchers)) {
        skippedOurClubs++;
        continue;
      }

      try {
        const soft = softNormalizeTeamNameKey(exactName);
        const hard = normalizeTeamNameKeyForMerge(exactName);

        const matches = existing.filter((t) => {
          const tSoft = softNormalizeTeamNameKey(t.name);
          const tHard = normalizeTeamNameKeyForMerge(t.name);
          return (
            t.name.trim().toUpperCase() === exactName ||
            (soft && tSoft === soft) ||
            (hard && tHard === hard)
          );
        });

        let row: VisitingRow | null = null;

        if (matches.length === 0) {
          row = await this.prisma.visitingTeam.create({
            data: { name: exactName, logoUrl: null },
          });
          existing.push(row);
          created++;
        } else {
          const canonical = pickCanonical(matches, exactName);
          row = canonical;

          // Remove duplicados extras
          for (const extra of matches) {
            if (extra.id === canonical.id) continue;
            if (!canonical.logoUrl?.trim() && extra.logoUrl?.trim()) {
              row = await this.prisma.visitingTeam.update({
                where: { id: canonical.id },
                data: { logoUrl: extra.logoUrl },
              });
            }
            await this.prisma.visitingTeam.delete({ where: { id: extra.id } });
            existing = existing.filter((e) => e.id !== extra.id);
            mergedDuplicates++;
          }

          if (row.name.trim().toUpperCase() !== exactName) {
            const conflict = existing.find(
              (e) => e.id !== row!.id && e.name.trim().toUpperCase() === exactName,
            );
            if (conflict) {
              // Já existe o nome FMF — funde neste e apaga o canônico antigo
              if (!conflict.logoUrl?.trim() && row.logoUrl?.trim()) {
                await this.prisma.visitingTeam.update({
                  where: { id: conflict.id },
                  data: { logoUrl: row.logoUrl },
                });
              }
              await this.prisma.visitingTeam.delete({ where: { id: row.id } });
              existing = existing.filter((e) => e.id !== row!.id);
              row = existing.find((e) => e.id === conflict.id) ?? conflict;
              mergedDuplicates++;
            } else {
              row = await this.prisma.visitingTeam.update({
                where: { id: row.id },
                data: { name: exactName },
              });
              existing = existing.map((e) => (e.id === row!.id ? row! : e));
              renamed++;
            }
          }
        }

        if (!row) continue;

        if (row.logoUrl?.trim()) {
          logosSkipped++;
          continue;
        }
        if (!cand.logoUrl) {
          logosSkipped++;
          continue;
        }

        const uploaded = await this.downloadAndUploadLogo(cand.logoUrl, exactName);
        if (!uploaded) {
          logosSkipped++;
          continue;
        }

        row = await this.prisma.visitingTeam.update({
          where: { id: row.id },
          data: { logoUrl: uploaded.url },
        });
        existing = existing.map((e) => (e.id === row!.id ? row! : e));
        logosDownloaded++;
      } catch (e) {
        const msg = `${exactName}: ${e instanceof Error ? e.message : String(e)}`;
        errors.push(msg);
        this.log.warn(`FMF visiting teams: ${msg}`);
      }
    }

    const result: FmfVisitingTeamsSyncResult = {
      syncedAt: new Date().toISOString(),
      teamsSeen: candidates.size,
      created,
      renamed,
      mergedDuplicates,
      skippedOurClubs,
      logosDownloaded,
      logosSkipped,
      errors,
    };
    this.log.log(
      `FMF→adversários: vistos=${result.teamsSeen} +${created} rename=${renamed} merge=${mergedDuplicates} skipClubes=${skippedOurClubs} logos=${logosDownloaded}`,
    );
    return result;
  }

  /** Funde registros já duplicados no cadastro (mesma chave soft). */
  private async mergeExistingDuplicates(): Promise<number> {
    const all = await this.prisma.visitingTeam.findMany({ orderBy: { name: 'asc' } });
    const groups = new Map<string, VisitingRow[]>();
    for (const t of all) {
      const soft = softNormalizeTeamNameKey(t.name);
      if (!soft) continue;
      const list = groups.get(soft) ?? [];
      list.push(t);
      groups.set(soft, list);
    }

    let merged = 0;
    for (const [, rows] of groups) {
      if (rows.length < 2) continue;
      const canonical = pickCanonical(rows);
      for (const extra of rows) {
        if (extra.id === canonical.id) continue;
        if (!canonical.logoUrl?.trim() && extra.logoUrl?.trim()) {
          await this.prisma.visitingTeam.update({
            where: { id: canonical.id },
            data: { logoUrl: extra.logoUrl },
          });
          canonical.logoUrl = extra.logoUrl;
        }
        await this.prisma.visitingTeam.delete({ where: { id: extra.id } });
        merged++;
        this.log.log(
          `FMF adversários: uniu duplicado "${extra.name}" → "${canonical.name}"`,
        );
      }
    }
    return merged;
  }

  private async loadOurClubMatchers(): Promise<Array<{ name: string; aliases: string[] }>> {
    const clubs = await this.prisma.tenant.findMany({
      where: { slug: { in: [...FMF_SYNC_TENANT_SLUGS] } },
      select: { name: true, slug: true },
    });
    return clubs.map((c) => ({
      name: c.name,
      aliases: isFmfSyncTenantSlug(c.slug)
        ? FMF_SYNC_TENANT_DEFAULTS[c.slug].fmfTeamNames
        : [],
    }));
  }

  private isOurClub(
    teamName: string,
    matchers: Array<{ name: string; aliases: string[] }>,
  ): boolean {
    return matchers.some((m) => isFmfTeamMatch(teamName, m.name, m.aliases));
  }

  private async downloadAndUploadLogo(
    sourceUrl: string,
    teamName: string,
  ): Promise<{ key: string; url: string } | null> {
    let parsed: URL;
    try {
      parsed = new URL(sourceUrl);
    } catch {
      return null;
    }
    if (!ALLOWED_HOSTS.has(parsed.hostname.toLowerCase())) {
      this.log.warn(`Logo FMF host não permitido: ${parsed.hostname}`);
      return null;
    }

    const res = await fetch(sourceUrl, {
      headers: {
        'user-agent': 'BCGPlatform/1.0 (importacao interna FMF; contato operador)',
        accept: 'image/*,*/*;q=0.8',
      },
    });
    if (!res.ok) {
      this.log.warn(`Falha download logo FMF HTTP ${res.status}: ${sourceUrl}`);
      return null;
    }

    const contentType = guessContentType(sourceUrl, res.headers.get('content-type'));
    if (!contentType) {
      this.log.warn(`Tipo de imagem desconhecido: ${sourceUrl}`);
      return null;
    }

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 32 || buf.length > 5_000_000) {
      this.log.warn(`Logo FMF tamanho inválido (${buf.length}): ${sourceUrl}`);
      return null;
    }

    const uploaded = await this.s3.uploadLogoExternal(buf, contentType);
    await this.mediaMeta.setDisplayName(uploaded.key, teamName);
    return uploaded;
  }
}
