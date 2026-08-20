export type PlayerSubidaEventSource = "convocation" | "fmf_match";

export type PlayerSubidaEvent = {
  id: string;
  source: PlayerSubidaEventSource;
  date: string;
  eventCategory: string;
  eventCategories: string[];
  squadCategory: string | null;
  opponent: string | null;
  competition: string | null;
  played: boolean | null;
  minutesPlayed: number | null;
  travelId: string | null;
  fmfMatchId: string | null;
  link: string | null;
};

export type PlayerSubidaHistoryDto = {
  player: {
    id: string;
    name: string;
    category: string | null;
  };
  summary: {
    totalEvents: number;
    convocations: number;
    fmfMatches: number;
    byEventCategory: Array<{ category: string; count: number }>;
  };
  events: PlayerSubidaEvent[];
};
