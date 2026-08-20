"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { getCategoryLabel } from "@/lib/fixture-categories";
import { useFixtureCategories } from "@/hooks/useFixtureCategories";
import type { PlayerSubidaHistoryDto } from "@/lib/player-subida-history";

function formatDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

export function PlayerSubidaHistorySection({ playerId }: { playerId: string }) {
  const { categories: allCats } = useFixtureCategories();
  const [data, setData] = useState<PlayerSubidaHistoryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get<PlayerSubidaHistoryDto>(`/players/${playerId}/subida-history`)
      .then(({ data: payload }) => {
        if (!cancelled) setData(payload);
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
          setError("Não foi possível carregar o histórico de subidas.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [playerId]);

  const categoryLabel = (value: string | null | undefined) =>
    value ? getCategoryLabel(value, "pt", allCats) : "—";

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Carregando histórico de subidas…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">{error}</div>
    );
  }

  if (!data) return null;

  return (
    <Card className="border-zinc-800 bg-zinc-950/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Atuações em outra categoria</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          <div className="rounded-lg border border-border/70 p-3">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-xl font-semibold">{data.summary.totalEvents}</p>
          </div>
          <div className="rounded-lg border border-border/70 p-3">
            <p className="text-xs text-muted-foreground">Jogos oficiais</p>
            <p className="text-xl font-semibold">{data.summary.fmfMatches}</p>
          </div>
          <div className="rounded-lg border border-border/70 p-3">
            <p className="text-xs text-muted-foreground">Convocações</p>
            <p className="text-xl font-semibold">{data.summary.convocations}</p>
          </div>
          <div className="rounded-lg border border-border/70 p-3">
            <p className="text-xs text-muted-foreground">Cadastro</p>
            <p className="text-sm font-medium">{categoryLabel(data.player.category)}</p>
          </div>
        </div>

        {data.summary.byEventCategory.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            Por categoria de jogo:{" "}
            {data.summary.byEventCategory
              .map((row) => `${categoryLabel(row.category)} (${row.count})`)
              .join(" · ")}
          </p>
        ) : null}

        {data.events.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            Nenhuma convocação ou jogo oficial em categoria diferente do cadastro.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Categoria do jogo</TableHead>
                  <TableHead>Adversário / competição</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>{formatDate(event.date)}</TableCell>
                    <TableCell>
                      {event.source === "fmf_match" ? "Jogo oficial" : "Convocação"}
                      {event.played === true ? " · entrou" : null}
                      {event.minutesPlayed != null && event.minutesPlayed > 0
                        ? ` · ${event.minutesPlayed} min`
                        : null}
                    </TableCell>
                    <TableCell>{categoryLabel(event.eventCategory)}</TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        {event.opponent ? <span>{event.opponent}</span> : null}
                        {event.competition ? (
                          <p className="text-xs text-muted-foreground">{event.competition}</p>
                        ) : null}
                        {!event.opponent && !event.competition ? "—" : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      {event.link ? (
                        event.link.startsWith("http") ? (
                          <a
                            href={event.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex text-muted-foreground hover:text-foreground"
                            title="Abrir súmula"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        ) : (
                          <Link
                            href={event.link}
                            className="inline-flex text-muted-foreground hover:text-foreground"
                            title="Abrir viagem"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        )
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
