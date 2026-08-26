export function computeTeamRatingAverage(ratings: Array<{ rating: number | null }>): number | null {
  const nums = ratings
    .map((r) => r.rating)
    .filter((v): v is number => v != null && Number.isFinite(v));
  if (nums.length === 0) return null;
  const avg = nums.reduce((sum, n) => sum + n, 0) / nums.length;
  return Math.round(avg * 10) / 10;
}

export function computeMatchBestFlags(ratings: Array<{ rating: number | null }>): boolean[] {
  const nums = ratings
    .map((r) => r.rating)
    .filter((v): v is number => v != null && Number.isFinite(v));
  if (nums.length === 0) return ratings.map(() => false);
  const max = Math.max(...nums);
  return ratings.map((r) => r.rating != null && r.rating === max);
}

export type CoachOpponentHighlight = {
  id?: string;
  jerseyNumber: number | null;
  position: string | null;
  notes: string | null;
  sortOrder?: number;
};

export function resolveOpponentBestPlayers(row: {
  opponentBestJersey: number | null;
  opponentBestPosition: string | null;
  opponentBestNotes: string | null;
  opponentHighlights?: Array<{
    id: string;
    jerseyNumber: number | null;
    position: string | null;
    notes: string | null;
    sortOrder: number;
  }>;
}): CoachOpponentHighlight[] {
  if (row.opponentHighlights && row.opponentHighlights.length > 0) {
    return [...row.opponentHighlights]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(({ id, jerseyNumber, position, notes, sortOrder }) => ({
        id,
        jerseyNumber,
        position,
        notes,
        sortOrder,
      }));
  }
  if (
    row.opponentBestJersey != null ||
    row.opponentBestPosition?.trim() ||
    row.opponentBestNotes?.trim()
  ) {
    return [
      {
        jerseyNumber: row.opponentBestJersey,
        position: row.opponentBestPosition,
        notes: row.opponentBestNotes,
        sortOrder: 0,
      },
    ];
  }
  return [];
}

export function normalizeOpponentBestPlayersInput(input: {
  opponentBestPlayers?: Array<{
    jerseyNumber?: number | null;
    position?: string | null;
    notes?: string | null;
  }>;
  opponentBestJersey?: number | null;
  opponentBestPosition?: string | null;
  opponentBestNotes?: string | null;
}): Array<{
  sortOrder: number;
  jerseyNumber: number | null;
  position: string | null;
  notes: string | null;
}> {
  let rows = input.opponentBestPlayers;
  if (rows === undefined) {
    if (
      input.opponentBestJersey != null ||
      input.opponentBestPosition?.trim() ||
      input.opponentBestNotes?.trim()
    ) {
      rows = [
        {
          jerseyNumber: input.opponentBestJersey,
          position: input.opponentBestPosition,
          notes: input.opponentBestNotes,
        },
      ];
    } else {
      rows = [];
    }
  }

  return rows
    .map((row, sortOrder) => ({
      sortOrder,
      jerseyNumber:
        row.jerseyNumber != null && Number.isFinite(row.jerseyNumber)
          ? Math.trunc(row.jerseyNumber)
          : null,
      position: row.position?.trim() || null,
      notes: row.notes?.trim() || null,
    }))
    .filter((row) => row.jerseyNumber != null || row.position || row.notes);
}

export function enrichCoachMatchReport<
  T extends {
    opponentBestJersey: number | null;
    opponentBestPosition: string | null;
    opponentBestNotes: string | null;
    opponentHighlights?: Array<{
      id: string;
      jerseyNumber: number | null;
      position: string | null;
      notes: string | null;
      sortOrder: number;
    }>;
    playerRatings: Array<{
      rating: number | null;
      isMatchBest?: boolean;
      player?: { id: string; name: string; jerseyNumber: number | null };
      playerId?: string;
    }>;
  },
>(row: T) {
  const teamRatingAverage = computeTeamRatingAverage(row.playerRatings);
  const matchBestPlayerIds = row.playerRatings
    .filter((r) => r.isMatchBest)
    .map((r) => r.playerId ?? r.player?.id)
    .filter((id): id is string => !!id);

  return {
    ...row,
    opponentBestPlayers: resolveOpponentBestPlayers(row),
    teamRatingAverage,
    matchBestPlayerIds,
  };
}
