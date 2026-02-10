import { Injectable } from '@nestjs/common';

/** Fixture normalizada para o front (igual ao DTO público). */
export interface NormalizedFixture {
  externalId: string;
  startISO: string;
  status: 'SCHEDULED' | 'LIVE' | 'FINAL';
  competitionName: string;
  competitionLogoUrl?: string;
  venueName?: string;
  homeTeamName: string;
  awayTeamName: string;
  watchUrl?: string;
  ticketUrl?: string;
  /** Posição do nosso time (time da requisição): true = mandante, false = visitante. */
  isOurTeamHome?: boolean;
  /** Logo do time da casa (SofaScore ou montada a partir do id). */
  homeTeamLogoUrl?: string;
  /** Logo do time visitante (SofaScore ou montada a partir do id). */
  awayTeamLogoUrl?: string;
}

/** Cache em memória: key = teamId, value = { at, data } */
const cache = new Map<string, { at: number; data: NormalizedFixture[] }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 min

/** Monta URL de logo do time/competição se a API devolver só id ou path relativo. */
function toLogoUrl(
  baseUrl: string,
  kind: 'team' | 'unique-tournament',
  id: string | number | undefined,
  existingUrl?: string,
): string | undefined {
  if (existingUrl && String(existingUrl).startsWith('http')) return existingUrl;
  if (id == null || String(id).trim() === '') return undefined;
  const slug = String(id).trim();
  return `${baseUrl}/${kind}/${slug}/image`;
}

@Injectable()
export class SofaScoreService {
  private readonly baseUrl =
    process.env.SOFASCORE_API_URL || 'https://api.sofascore.com/api/v1';

  /**
   * Busca próximos jogos do time (SofaScore).
   * Inclui logos quando a API devolver (image/logo/id); senão tenta URL por id.
   * Cache 10 min. Em falha retorna [].
   */
  async getUpcomingByTeamId(
    teamId: string,
    options?: { daysAhead?: number; maxItems?: number },
  ): Promise<NormalizedFixture[]> {
    const daysAhead = options?.daysAhead ?? 30;
    const maxItems = options?.maxItems ?? 20;
    const cacheKey = `upcoming:${teamId}:${daysAhead}:${maxItems}`;
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
      return hit.data;
    }

    try {
      const url = `${this.baseUrl}/team/${teamId}/events/upcoming`;
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent':
            'Mozilla/5.0 (compatible; BCGSite/1.0; +https://bostoncitygroup.biz)',
        },
      });
      if (!res.ok) {
        return [];
      }
      const json = (await res.json()) as {
        events?: Array<{
          id?: number;
          startTimestamp?: number;
          tournament?: {
            name?: string;
            category?: { name?: string };
            slug?: string;
            uniqueId?: number;
            id?: number;
            image?: string;
          };
          homeTeam?: { id?: number; name?: string; image?: string; logo?: string };
          awayTeam?: { id?: number; name?: string; image?: string; logo?: string };
          venue?: { name?: string; stadium?: { name?: string } };
          status?: { type?: string };
        }>;
      };
      const events = Array.isArray(json?.events) ? json.events : [];
      const list: NormalizedFixture[] = events.slice(0, maxItems).map((e) => {
        const startTimestamp = e.startTimestamp ?? 0;
        const statusType = (e.status?.type ?? '').toUpperCase();
        let status: NormalizedFixture['status'] = 'SCHEDULED';
        if (statusType === 'LIVE' || statusType === 'INPROGRESS') status = 'LIVE';
        else if (statusType === 'FINISHED' || statusType === 'ENDED') status = 'FINAL';
        const tournamentName =
          e.tournament?.name ?? e.tournament?.category?.name ?? '';
        const venueName =
          e.venue?.name ?? e.venue?.stadium?.name ?? undefined;
        const homeId = e.homeTeam?.id;
        const awayId = e.awayTeam?.id;
        const isOurTeamHome = String(homeId) === String(teamId);
        const homeLogo =
          e.homeTeam?.image ?? e.homeTeam?.logo
          ?? toLogoUrl(this.baseUrl, 'team', homeId);
        const awayLogo =
          e.awayTeam?.image ?? e.awayTeam?.logo
          ?? toLogoUrl(this.baseUrl, 'team', awayId);
        const tournamentLogo =
          e.tournament?.image
          ?? toLogoUrl(
              this.baseUrl,
              'unique-tournament',
              e.tournament?.uniqueId ?? e.tournament?.id,
            );
        return {
          externalId: String(e.id ?? ''),
          startISO: new Date(startTimestamp * 1000).toISOString(),
          status,
          competitionName: tournamentName,
          competitionLogoUrl: tournamentLogo,
          venueName: venueName || undefined,
          homeTeamName: e.homeTeam?.name ?? '',
          awayTeamName: e.awayTeam?.name ?? '',
          isOurTeamHome,
          homeTeamLogoUrl: homeLogo,
          awayTeamLogoUrl: awayLogo,
        };
      });
      cache.set(cacheKey, { at: Date.now(), data: list });
      return list;
    } catch {
      return [];
    }
  }
}
