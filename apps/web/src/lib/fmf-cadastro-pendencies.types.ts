export type FmfCadastroPendencyMatchRef = {
  externalMatchId: string;
  matchDate: string | null;
  category: string;
  label: string;
  reportUrl: string | null;
};

export type FmfCadastroPendencyPlayerRef = {
  id: string;
  name: string;
  category: string | null;
  cbfRegistration: string | null;
  hasCbfInProfile: boolean;
};

export type FmfCadastroPendencyItem = {
  key: string;
  cbfRegistration: string;
  sourceName: string;
  reason: string;
  fixHint: string;
  matchCount: number;
  matches: FmfCadastroPendencyMatchRef[];
  candidatePlayers: FmfCadastroPendencyPlayerRef[];
};

export type FmfCadastroPendenciesReport = {
  tenantId: string;
  tenantName: string;
  generatedAt: string;
  items: FmfCadastroPendencyItem[];
  totals: {
    pendingGroups: number;
    pendingReferences: number;
    affectedMatches: number;
  };
};

export type FmfCadastroPendencyAction = {
  label: string;
  href: string;
  variant?: "default" | "outline";
};
