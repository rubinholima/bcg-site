"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateDayMonYear } from "@/lib/format-date";
import { getCategoryLabel } from "@/lib/fixture-categories";
import type { CoachContextResponse } from "@/lib/treinadores-types";

function formatGameDate(value: string) {
  return formatDateDayMonYear(new Date(value));
}

interface Props {
  loading: boolean;
  context: CoachContextResponse | null;
}

export function TreinadoresInformacoesTab({ loading, context }: Props) {
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

  return (
    <div className="grid gap-6 lg:grid-cols-2">
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
          <CardTitle className="text-base">Jogos recentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {context.recentGames.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum jogo recente.</p>
          ) : (
            context.recentGames.map((g) => (
              <div key={g.id} className="rounded-lg border border-border/60 p-3 text-sm">
                <div className="font-medium">{g.opponentName ?? "Adversário"}</div>
                <div className="text-muted-foreground">
                  {formatGameDate(g.matchDate)} · {g.championshipName ?? "—"}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cartões da equipe</CardTitle>
        </CardHeader>
        <CardContent>
          {context.discipline.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum cartão registrado no cadastro.</p>
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
          <CardTitle className="text-base">Adversários</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {context.opponents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem adversários listados.</p>
          ) : (
            context.opponents.map((o) => (
              <div key={`${o.name}-${o.nextMatchDate ?? ""}`} className="text-sm">
                <span className="font-medium">{o.name}</span>
                {o.championship ? (
                  <span className="text-muted-foreground"> · {o.championship}</span>
                ) : null}
                {o.nextMatchDate ? (
                  <span className="text-muted-foreground"> · {formatGameDate(o.nextMatchDate)}</span>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Tabela</CardTitle>
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
