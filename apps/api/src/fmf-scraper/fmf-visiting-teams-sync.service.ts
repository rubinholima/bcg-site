import { Injectable, Logger } from '@nestjs/common';
import { cadastroUpperRequired } from '../common/cadastro-text';
import { MediaMetaService } from '../media/media-meta.service';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeTeamNameKeyForMerge } from '../public/visiting-team-logo-merge.util';
import { S3Service } from '../s3/s3.service';
import type { FmfParsedMatch } from './fmf-proxjogos.parser';
import { FmfScraperService, type FmfScraperStore } from './fmf-scraper.service';

export type FmfVisitingTeamsSyncResult = {
  syncedAt: string;
  teamsSeen: number;
  created: number;
  renamed: number;
  logosDownloaded: number;
  logosSkipped: number;
  errors: string[];
};

type TeamLogoCandidate = {
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
    const nk = normalizeTeamNameKeyForMerge(name);
    if (!nk) return;
    const prev = byKey.get(nk);
    if (!prev) {
      byKey.set(nk, { name, logoUrl: logoUrl?.trim() || null });
      return;
    }
    // Prefere o nome mais “longo”/completo da FMF; logo se ainda não tiver
    if (name.length > prev.name.length) prev.name = name;
    if (!prev.logoUrl && logoUrl?.trim()) prev.logoUrl = logoUrl.trim();
  };

  for (const m of matches) {
    upsert(m.homeName, m.homeLogoUrl);
    upsert(m.awayName, m.awayLogoUrl);
  }
  return byKey;
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

    const candidates = collectTeamsFromMatches(allMatches);
    const existing = await this.prisma.visitingTeam.findMany();
    const byExact = new Map(existing.map((t) => [t.name.trim().toUpperCase(), t]));
    const byNorm = new Map<string, (typeof existing)[number]>();
    for (const t of existing) {
      const nk = normalizeTeamNameKeyForMerge(t.name);
      if (nk && !byNorm.has(nk)) byNorm.set(nk, t);
    }

    let created = 0;
    let renamed = 0;
    let logosDownloaded = 0;
    let logosSkipped = 0;
    const errors: string[] = [];

    for (const [nk, cand] of candidates) {
      const exactName = cadastroUpperRequired(cand.name);
      let row = byExact.get(exactName) ?? byNorm.get(nk) ?? null;

      try {
        if (!row) {
          row = await this.prisma.visitingTeam.create({
            data: { name: exactName, logoUrl: null },
          });
          byExact.set(exactName, row);
          byNorm.set(nk, row);
          created++;
        } else if (row.name.trim().toUpperCase() !== exactName) {
          // Nome exatamente como na FMF
          const conflict = byExact.get(exactName);
          if (conflict && conflict.id !== row.id) {
            // Já existe outro com o nome FMF — usa esse e não renomeia
            row = conflict;
          } else {
            row = await this.prisma.visitingTeam.update({
              where: { id: row.id },
              data: { name: exactName },
            });
            byExact.set(exactName, row);
            byNorm.set(nk, row);
            renamed++;
          }
        }

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

        await this.prisma.visitingTeam.update({
          where: { id: row.id },
          data: { logoUrl: uploaded.url },
        });
        row.logoUrl = uploaded.url;
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
      logosDownloaded,
      logosSkipped,
      errors,
    };
    this.log.log(
      `FMF→adversários: vistos=${result.teamsSeen} +${created} rename=${renamed} logos=${logosDownloaded}`,
    );
    return result;
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
