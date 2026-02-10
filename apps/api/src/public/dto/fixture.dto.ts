/** Fixture retornada pelo endpoint público de próximos jogos. */
export interface FixtureDto {
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
  featured?: boolean;
  /** Manual: posição do clube (true = casa, false = fora). */
  isOurTeamHome?: boolean;
  /** Manual: logo do time da casa (URL). */
  homeTeamLogoUrl?: string;
  /** Manual: logo do time visitante (URL). */
  awayTeamLogoUrl?: string;
}
