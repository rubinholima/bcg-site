export type AnalysisSessionKind = "MATCH" | "TRAINING" | "OPPONENT" | "OTHER";

export type AnalysisSessionListItem = {
  id: string;
  tenantId: string;
  kind: AnalysisSessionKind;
  title: string;
  status: string;
  category: string | null;
  season: number | null;
  fmfMatchReportId: string | null;
  travelLogisticsId: string | null;
  trainingSessionId: string | null;
  eventCount: number;
  videoSourceCount: number;
  updatedAt: string;
  createdAt: string;
};

export type AnalysisTagDefinition = {
  id: string;
  key: string;
  label: string;
  category: string;
  outcomes: string[] | unknown;
  sortOrder: number;
  active: boolean;
};

export type AnalysisVideoSourcePublic = {
  id: string;
  sourceType: string;
  title: string;
  cameraLabel: string | null;
  externalUrl: string | null;
  durationMs: number | null;
  mimeType: string | null;
  processingStatus: string;
  hasPrivateUpload: boolean;
  streamUrl: string | null;
};

export type AnalysisSessionDetail = {
  session: {
    id: string;
    tenantId: string;
    kind: string;
    title: string;
    status: string;
    category: string | null;
    season: number | null;
    fmfMatchReportId: string | null;
    travelLogisticsId: string | null;
    trainingSessionId: string | null;
    createdAt: string;
    updatedAt: string;
  };
  videoSources: AnalysisVideoSourcePublic[];
  tags: AnalysisTagDefinition[];
};

export type AnalysisEventRow = {
  id: string;
  tagDefinitionId: string;
  playerId: string | null;
  outcome: string | null;
  startMs: number;
  endMs: number | null;
  matchPeriod: string | null;
  matchClockSeconds: number | null;
  notes: string | null;
  source: string;
  tagDefinition?: { key: string; label: string };
  player?: { id: string; name: string } | null;
};

export type TeamMetrics = {
  totalTagged: number;
  byTag: Record<string, number>;
  passAttempts: number;
  passSuccess: number;
  passFailure: number;
  passAccuracyPct: number | null;
  shots: number;
  shotsOnGoal: number;
  recoveries: number;
  losses: number;
};

export type PlayerMetrics = TeamMetrics & {
  playerId: string;
  playerName?: string | null;
  duels: number;
  duelsWon: number;
};

export type AnalysisClipRow = {
  id: string;
  title: string;
  startMs: number;
  endMs: number;
  notes: string | null;
  videoSource?: { id: string; title: string; cameraLabel: string | null };
  events?: { event: { id: string; startMs: number } }[];
  players?: { player: { id: string; name: string } }[];
};

export function parseTagOutcomes(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((x) => typeof x === "string");
  return [];
}

export function youtubeEmbedUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  try {
    const u = new URL(url.trim());
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

export function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
