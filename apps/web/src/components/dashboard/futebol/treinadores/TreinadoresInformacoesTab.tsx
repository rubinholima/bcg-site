"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatDateDayMonYear } from "@/lib/format-date";
import { getCategoryLabel } from "@/lib/fixture-categories";
import type { CoachContextResponse } from "@/lib/treinadores-types";
import { TreinadoresMatchStatsEditor } from "./TreinadoresMatchStatsEditor";

function formatGameDate(value: string) {
  return formatDateDayMonYear(new Date(value));
}

function resultBadge(result: "V" | "E" | "D" | null) {
  if (!result) return null;
  const cls =
    result === "V"
      ? "bg-emerald-500/15 text-emerald-400"
      : result === "E"
        ? "bg-amber-500/15 text-amber-400"
        : "bg-red-500/15 text-red-400";
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${cls}`}>{result}</span>
  );
}

interface Props {
  tenantId: string;
  category?: string;
  loading: boolean;
  context: CoachContextResponse | null;
  onRefresh: () => void;
}

export function TreinadoresInformacoesTab({
  tenantId,
  category,
  loading,
  context,
  onRefresh,
}: Props) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!context) {
    return <p className="text-sm text-muted-foreground">Selecione um clube para ver as informações.</p>;
  }

  const completedGames = context.completedGames ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Jogos realizados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {completedGames.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum jogo realizado encontrado.</p>
          ) : (
            completedGames.map((g) => {
              const open = expandedKey === g.gameKey;
              return (
                <div key={g.gameKey} className="rounded-lg border border-border/60 text-sm">
                  <div className="flex flex-wrap items-center gap-2 p-3">
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => setExpandedKey(open ? null : g.gameKey)}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{g.opponentName}</span>
                        {resultBadge(g.result)}
                        <span className="text-muted-foreground">{g.scoreLabel}</span>
                      </div>
                      <div className="text-muted-foreground">
                        {formatGameDate(g.matchDate)}
                        {g.competition ? ` · ${g.competition}` : ""}
                        {g.round != null ? ` · Rod. ${g.round}` : ""}
                        {g.isHome ? " · Casa" : " · Fora"}
                      </div>
                    </button>
                    <TreinadoresMatchStatsEditor
                      tenantId={tenantId}
                      category={category}
                      game={g}
                      onSaved={onRefresh}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setExpandedKey(open ? null : g.gameKey)}
                    >
                      {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                  {open ? (
                    <div className="border-t border-border/60 px-3 py-3 text-muted-foreground grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      <div>Placar: {g.scoreLabel}</div>
                      <div>Cartões: {g.yellowCards}A · {g.redCards}V</div>
                      <div>
                        Posse: {g.possessionPct != null ? `${g.possessionPct}%` : "—"}
                      </div>
                      <div>
                        Bolas paradas: {g.setPiecesFor ?? "—"} a favor · {g.setPiecesAgainst ?? "—"} contra
                      </div>
                      {g.travelLogisticsId ? (
                        <Link
                          href={`/dashboard/futebol/logistica/${g.travelLogisticsId}/edit`}
                          className="text-primary hover:underline sm:col-span-2"
                        >
                          Ver viagem
                        </Link>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Próximos jogos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {context.upcomingGames.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum jogo programado.</p>
          ) : (
            context.upcomingGames.map((g) => (
              <div key={g.id} className="rounded-lg border border-border/60 p-3 text-sm">
                <div className="font-medium">{g.opponentName ?? "Adversário"}</div>
                <div className="text-muted-foreground">
                  {formatGameDate(g.matchDate)} · {g.championshipName ?? "—"}
                </div>
                <div className="text-muted-foreground">
                  {g.isHomeMatch ? "Mandante" : "Visitante"}
                  {g.stadiumName ? ` · ${g.stadiumName}` : ""}
                  {g.category ? ` · ${getCategoryLabel(g.category, "pt")}` : ""}
                </div>
                <Link
                  href={`/dashboard/futebol/logistica/${g.id}/edit`}
                  className="mt-2 inline-block text-xs text-primary hover:underline"
                >
                  Ver viagem
                </Link>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Elenco disponível para treino</CardTitle>
        </CardHeader>
        <CardContent>
          {(context.availableSquad ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum atleta disponível.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {context.availableSquad.map((p) => (
                <span
                  key={p.id}
                  className="rounded-md border border-border/60 px-2 py-1 text-xs"
                >
                  {p.jerseyNumber != null ? `#${p.jerseyNumber} ` : ""}
                  {p.name}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Em tratamento</CardTitle>
        </CardHeader>
        <CardContent>
          {context.inTreatment.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum atleta em tratamento.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {context.inTreatment.map((t) => (
                <li key={t.playerId} className="rounded-lg border border-border/60 p-3">
                  <div className="font-medium">
                    {t.jerseyNumber != null ? `#${t.jerseyNumber} ` : ""}
                    {t.name}
                  </div>
                  <div className="text-muted-foreground">{t.reason}</div>
                  {t.estimatedEndDate ? (
                    <div className="text-xs text-muted-foreground">
                      Previsão: {formatGameDate(t.estimatedEndDate)}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cartões da equipe</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {context.discipline.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum cartão registrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Atleta</TableHead>
                  <TableHead className="text-center">Amarelos</TableHead>
                  <TableHead className="text-center">Vermelhos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {context.discipline.map((d) => (
                  <TableRow key={d.playerId}>
                    <TableCell>
                      {d.jerseyNumber != null ? `#${d.jerseyNumber} ` : ""}
                      {d.name}
                    </TableCell>
                    <TableCell className="text-center">{d.yellowCards}</TableCell>
                    <TableCell className="text-center">{d.redCards}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Última rodada
            {context.lastRound?.round != null ? ` (${context.lastRound.round})` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!context.lastRound?.matches?.length ? (
            <p className="text-sm text-muted-foreground">Rodada indisponível.</p>
          ) : (
            context.lastRound.matches.map((m, i) => (
              <div
                key={`${m.homeTeam}-${m.awayTeam}-${i}`}
                className={`rounded-lg border p-3 text-sm ${m.isClubMatch ? "border-primary/40 bg-primary/5" : "border-border/60"}`}
              >
                <div className="font-medium">
                  {m.homeTeam} {m.scoreLabel} {m.awayTeam}
                </div>
                {m.matchDate ? (
                  <div className="text-muted-foreground">{formatGameDate(m.matchDate)}</div>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Tabela da competição</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {context.standings.length === 0 ? (
            <p className="text-sm text-muted-foreground">Tabela indisponível para esta categoria.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Equipe</TableHead>
                  <TableHead className="text-center">Pts</TableHead>
                  <TableHead className="text-center">J</TableHead>
                  <TableHead className="text-center">V</TableHead>
                  <TableHead className="text-center">E</TableHead>
                  <TableHead className="text-center">D</TableHead>
                  <TableHead className="text-center">GP</TableHead>
                  <TableHead className="text-center">GC</TableHead>
                  <TableHead className="text-center">SG</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {context.standings.map((row) => (
                  <TableRow key={`${row.position}-${row.team}`} className={row.isClub ? "bg-primary/5" : ""}>
                    <TableCell>{row.position}</TableCell>
                    <TableCell className="font-medium">{row.team}</TableCell>
                    <TableCell className="text-center">{row.points}</TableCell>
                    <TableCell className="text-center">{row.matches}</TableCell>
                    <TableCell className="text-center">{row.wins}</TableCell>
                    <TableCell className="text-center">{row.draws}</TableCell>
                    <TableCell className="text-center">{row.losses}</TableCell>
                    <TableCell className="text-center">{row.goalsFor}</TableCell>
                    <TableCell className="text-center">{row.goalsAgainst}</TableCell>
                    <TableCell className="text-center">{row.goalDiff}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
