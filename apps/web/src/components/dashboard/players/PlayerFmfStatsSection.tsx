"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ExternalLink, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { authFetch } from "@/lib/authFetch";

interface Summary {
  matchesListed: number;
  matchesPlayed: number;
  starts: number;
  minutesPlayed: number;
  goals: number;
  penaltyGoals: number;
  ownGoals: number;
  yellowCards: number;
  redCards: number;
}

interface PlayerFmfStats {
  player: {
    id: string;
    name: string;
    cbfRegistration: string | null;
  };
  total: Summary;
  years: Array<Summary & { year: number }>;
  seasons: Array<
    Summary & {
      key: string;
      year: number;
      competition: string;
      category: string;
    }
  >;
  matches: Array<{
    id: string;
    match: {
      id: string;
      competition: string;
      phase: string | null;
      round: number | null;
      category: string;
      season: number;
      matchDate: string;
      homeTeam: string;
      awayTeam: string;
      homeScore: number | null;
      awayScore: number | null;
      sourceUrl: string;
    };
    jerseyNumber: number | null;
    starter: boolean;
    listed: boolean;
    played: boolean;
    minutesPlayed: number;
    goals: number;
    yellowCards: number;
    redCards: number;
  }>;
}

function formatDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function SummaryCards({ summary }: { summary: Summary }) {
  const items = [
    ["Jogos", summary.matchesPlayed],
    ["Titular", summary.starts],
    ["Minutos", summary.minutesPlayed],
    ["Gols", summary.goals],
    ["Amarelos", summary.yellowCards],
    ["Vermelhos", summary.redCards],
  ] as const;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-xl border border-border bg-muted/20 p-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
        </div>
      ))}
    </div>
  );
}

export function PlayerFmfStatsSection({ playerId }: { playerId: string }) {
  const [data, setData] = useState<PlayerFmfStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await authFetch(`/api/players/${encodeURIComponent(playerId)}/fmf-stats`);
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.message ?? "Erro ao carregar estatísticas.");
        if (!cancelled) setData(payload as PlayerFmfStats);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Erro ao carregar estatísticas.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [playerId]);

  if (loading) {
    return (
      <div className="flex min-h-48 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando estatísticas…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        {error ?? "Estatísticas indisponíveis."}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {!data.player.cbfRegistration ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Registro CBF ausente no cadastro. As súmulas não podem ser vinculadas a este atleta.
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">
          Registro CBF: <strong className="text-foreground">{data.player.cbfRegistration}</strong>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Total oficial FMF</CardTitle>
        </CardHeader>
        <CardContent>
          <SummaryCards summary={data.total} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Por temporada</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Temporada</TableHead>
                <TableHead>Competição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>J</TableHead>
                <TableHead>Tit.</TableHead>
                <TableHead>Min.</TableHead>
                <TableHead>G</TableHead>
                <TableHead>CA</TableHead>
                <TableHead>CV</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.seasons.map((season) => (
                <TableRow key={season.key}>
                  <TableCell>{season.year}</TableCell>
                  <TableCell>{season.competition}</TableCell>
                  <TableCell className="uppercase">{season.category}</TableCell>
                  <TableCell>{season.matchesPlayed}</TableCell>
                  <TableCell>{season.starts}</TableCell>
                  <TableCell>{season.minutesPlayed}</TableCell>
                  <TableCell>{season.goals}</TableCell>
                  <TableCell>{season.yellowCards}</TableCell>
                  <TableCell>{season.redCards}</TableCell>
                </TableRow>
              ))}
              {data.seasons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                    Nenhuma súmula vinculada.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Por ano</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.years.map((year) => (
            <div key={year.year} className="space-y-2">
              <div className="text-sm font-semibold">{year.year}</div>
              <SummaryCards summary={year} />
            </div>
          ))}
          {data.years.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhuma súmula vinculada.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Jogos</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Jogo</TableHead>
                <TableHead>Condição</TableHead>
                <TableHead>Min.</TableHead>
                <TableHead>G</TableHead>
                <TableHead>CA</TableHead>
                <TableHead>CV</TableHead>
                <TableHead className="text-right">Súmula</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.matches.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{formatDate(row.match.matchDate)}</TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {row.match.homeTeam} {row.match.homeScore ?? "—"} ×{" "}
                      {row.match.awayScore ?? "—"} {row.match.awayTeam}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {row.match.competition}
                    </div>
                  </TableCell>
                  <TableCell>
                    {row.starter ? "Titular" : row.played ? "Entrou" : "Relacionado"}
                  </TableCell>
                  <TableCell>{row.minutesPlayed}</TableCell>
                  <TableCell>{row.goals}</TableCell>
                  <TableCell>{row.yellowCards}</TableCell>
                  <TableCell>{row.redCards}</TableCell>
                  <TableCell className="text-right">
                    <a
                      href={row.match.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border hover:bg-muted"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span className="sr-only">Abrir súmula</span>
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
