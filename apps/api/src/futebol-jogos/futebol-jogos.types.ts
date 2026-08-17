import type { CoachCompletedGame } from '../futebol-treinadores/coach-context.helper';
import type { SumulaCartoesMatchDto } from '../futebol-relatorios/futebol-relatorios.types';

export type FutebolGameStatus = 'upcoming' | 'completed';

export type FutebolGameListItem = {
  gameKey: string;
  status: FutebolGameStatus;
  matchDate: string;
  opponentName: string;
  competition: string | null;
  category: string | null;
  isHome: boolean;
  homeTeam: string;
  awayTeam: string;
  scoreLabel: string;
  result: 'V' | 'E' | 'D' | null;
  hasSumula: boolean;
  fmfMatchReportId: string | null;
  travelLogisticsId: string | null;
  yellowCards: number;
  redCards: number;
  stadiumName: string | null;
  city: string | null;
  hasCoachReport: boolean;
  incidentCount: number;
  attachmentCount: number;
  possessionPct: number | null;
  setPiecesFor: number | null;
  setPiecesAgainst: number | null;
};

export type FutebolMatchIncidentDto = {
  id: string;
  source: 'fmf' | 'manual';
  kind: string;
  description: string;
  minute: number | null;
  period: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FutebolMatchAttachmentDto = {
  id: string;
  label: string | null;
  fileUrl: string;
  kind: string | null;
  createdAt: string;
};

export type FutebolGameCoachReport = {
  id: string;
  status: string;
  matchDate: string | null;
  opponentName: string | null;
  teamReport: string | null;
  generalNotes: string | null;
  attachments: Array<{
    id: string;
    label: string | null;
    fileUrl: string;
    kind: string | null;
  }>;
  playerRatings: Array<{
    playerId: string;
    name: string;
    jerseyNumber: number | null;
    rating: number | null;
    individualReport: string | null;
  }>;
};

export type FutebolMatchStatOverrideDto = {
  goalsFor: number | null;
  goalsAgainst: number | null;
  yellowCards: number | null;
  redCards: number | null;
  possessionPct: number | null;
  setPiecesFor: number | null;
  setPiecesAgainst: number | null;
  notes: string | null;
};

export type FutebolGameDetailDto = {
  tenant: { id: string; name: string; slug: string };
  game: FutebolGameListItem & CoachCompletedGame;
  sourceUrl: string | null;
  kickoffTime: string | null;
  firstHalfMinutes: number | null;
  secondHalfMinutes: number | null;
  totalMinutes: number | null;
  occurrencesText: string | null;
  statOverrideNotes: string | null;
  matchStatOverride: FutebolMatchStatOverrideDto | null;
  coachReport: FutebolGameCoachReport | null;
  sumulaMatch: SumulaCartoesMatchDto | null;
  disciplineForMatch: Array<{
    playerId: string;
    name: string;
    jerseyNumber: number | null;
    yellowCards: number;
    redCards: number;
  }>;
  incidents: FutebolMatchIncidentDto[];
  matchAttachments: FutebolMatchAttachmentDto[];
};

export type FutebolGamesListDto = {
  tenant: { id: string; name: string; slug: string };
  filters: {
    category: string | null;
    season: number;
    status: string | null;
  };
  games: FutebolGameListItem[];
};

export type GameLinkRefs = {
  fmfMatchReportId: string | null;
  travelLogisticsId: string | null;
};
