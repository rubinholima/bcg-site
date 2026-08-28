"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { authFetch } from "@/lib/authFetch";

export type PersonalDisciplineHistoryEntry = {
  eventId: string;
  factType: string;
  cardLabel: "Amarelo" | "Vermelho";
  matchId: string;
  matchDate: string;
  opponentName: string;
  competition: string;
  season: number;
  phase: string | null;
  round: number | null;
  matchCategory: string;
  matchCategoryLabel: string;
  sourceClock: string | null;
  period: string | null;
  timingLabel: string;
  jerseyNumber: number | null;
  sourceRoleLabel: string | null;
  sourceUrl: string | null;
};

export type PersonalDisciplineHistory = {
  personId: string;
  personName: string;
  personKind: "player" | "staff";
  summary: {
    yellowCards: number;
    redCards: number;
    matchCount: number;
    categories: string[];
  };
  entries: PersonalDisciplineHistoryEntry[];
};

function formatDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function cardBadgeClass(label: "Amarelo" | "Vermelho"): string {
  return label === "Vermelho"
    ? "bg-red-500/20 text-red-300 border-red-500/40"
    : "bg-amber-500/20 text-amber-200 border-amber-500/40";
}

type Props = {
  personId: string;
  personKind: "player" | "staff";
  apiPath: string;
};

export function PersonalDisciplineHistorySection({ personId, personKind, apiPath }: Props) {
  const [data, setData] = useState<PersonalDisciplineHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [seasonFilter, setSeasonFilter] = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (categoryFilter !== "all") params.set("category", categoryFilter);
    if (seasonFilter !== "all") params.set("season", seasonFilter);
    const qs = params.toString();
    try {
      const response = await authFetch(
        `${apiPath}${qs ? `?${qs}` : ""}`,
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message ?? "Erro ao carregar histórico de cartões.");
      }
      setData(payload as PersonalDisciplineHistory);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Erro ao carregar histórico.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [apiPath, categoryFilter, seasonFilter]);

  useEffect(() => {
    void load();
  }, [load, personId]);

  const seasonOptions = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.entries.map((e) => e.season))].sort((a, b) => b - a);
  }, [data]);

  const categoryOptions = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, string>();
    for (const entry of data.entries) {
      map.set(entry.matchCategory, entry.matchCategoryLabel);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  }, [data]);

  if (loading && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de Cartões</CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-32 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Carregando histórico…
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de Cartões</CardTitle>
        </CardHeader>
        <CardContent className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const summaryItems = [
    ["Amarelos", data.summary.yellowCards],
    ["Vermelhos", data.summary.redCards],
    ["Categorias", data.summary.categories.length],
    ["Partidas com cartão", data.summary.matchCount],
  ] as const;

  return (
    <Card>
      <CardHeader className="space-y-4">
        <CardTitle className="text-base">Histórico de Cartões</CardTitle>
        {(categoryOptions.length > 1 || seasonOptions.length > 1) && (
          <div className="flex flex-col gap-3 sm:flex-row">
            {categoryOptions.length > 1 ? (
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas categorias</SelectItem>
                  {categoryOptions.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            {seasonOptions.length > 1 ? (
              <Select value={seasonFilter} onValueChange={setSeasonFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Temporada" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas temporadas</SelectItem>
                  {seasonOptions.map((season) => (
                    <SelectItem key={season} value={String(season)}>
                      {season}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {summaryItems.map(([label, value]) => (
            <div key={label} className="rounded-xl border border-border bg-muted/20 p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Adversário</TableHead>
                <TableHead>Competição</TableHead>
                <TableHead>Categoria</TableHead>
                {personKind === "staff" ? <TableHead>Função</TableHead> : <TableHead>Camisa</TableHead>}
                <TableHead>Cartão</TableHead>
                <TableHead>Min.</TableHead>
                <TableHead className="text-right">Súmula</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.entries.map((entry) => (
                <TableRow key={entry.eventId}>
                  <TableCell>{formatDate(entry.matchDate)}</TableCell>
                  <TableCell>{entry.opponentName}</TableCell>
                  <TableCell>
                    <div>{entry.competition}</div>
                    {entry.phase || entry.round ? (
                      <div className="text-xs text-muted-foreground">
                        {[entry.phase, entry.round ? `Rod. ${entry.round}` : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell>{entry.matchCategoryLabel}</TableCell>
                  {personKind === "staff" ? (
                    <TableCell>{entry.sourceRoleLabel ?? "—"}</TableCell>
                  ) : (
                    <TableCell>{entry.jerseyNumber ?? "—"}</TableCell>
                  )}
                  <TableCell>
                    <span
                      className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-medium ${cardBadgeClass(entry.cardLabel)}`}
                    >
                      {entry.cardLabel}
                    </span>
                  </TableCell>
                  <TableCell>{entry.timingLabel || "—"}</TableCell>
                  <TableCell className="text-right">
                    {entry.sourceUrl ? (
                      <a
                        href={entry.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border hover:bg-muted"
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span className="sr-only">Abrir súmula</span>
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {data.entries.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={personKind === "staff" ? 8 : 8}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Nenhum cartão oficial registrado.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export function PlayerDisciplineHistorySection({ playerId }: { playerId: string }) {
  return (
    <PersonalDisciplineHistorySection
      personId={playerId}
      personKind="player"
      apiPath={`/api/players/${encodeURIComponent(playerId)}/discipline-history`}
    />
  );
}

export function StaffDisciplineHistorySection({ staffId }: { staffId: string }) {
  return (
    <PersonalDisciplineHistorySection
      personId={staffId}
      personKind="staff"
      apiPath={`/api/technical-staff/${encodeURIComponent(staffId)}/discipline-history`}
    />
  );
}
