"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ExternalLink,
  FileText,
  Loader2,
  MapPin,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { formatDateDayMonYear } from "@/lib/format-date";
import { getCategoryLabel } from "@/lib/fixture-categories";
import { printSumulaCartoesReport } from "@/lib/futebol-relatorios-print";
import type { SumulaCartoesReportDto } from "@/lib/futebol-relatorios.types";
import {
  encodeGameKey,
  type FutebolGameDetail,
} from "@/lib/futebol-jogos.types";
import { useAuth } from "@/context/AuthContext";
import { JogosOcorrenciasPanel } from "./JogosOcorrenciasPanel";
import { JogosAnexosPanel } from "./JogosAnexosPanel";

interface Props {
  gameKey: string;
}

function resultBadge(result: FutebolGameDetail["game"]["result"]) {
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

function SumulaRosterTable({
  title,
  teamName,
  score,
  players,
}: {
  title: string;
  teamName: string;
  score: number | null;
  players: Array<{
    jerseyNumber: number | null;
    name: string;
    starter: boolean;
    minutesPlayed: number;
    goals: number;
    yellowCards: number;
    redCards: number;
  }>;
}) {
  return (
    <div className="space-y-2">
      <h4 className="font-medium">
        {title}: {teamName}
        {score != null ? ` (${score})` : ""}
      </h4>
      <div className="overflow-x-auto rounded-lg border border-border/60">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Atleta</TableHead>
              <TableHead className="w-16">Min</TableHead>
              <TableHead className="w-12">G</TableHead>
              <TableHead className="w-12">A</TableHead>
              <TableHead className="w-12">V</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {players.map((p, i) => (
              <TableRow key={`${p.name}-${i}`}>
                <TableCell>{p.jerseyNumber ?? "—"}</TableCell>
                <TableCell>
                  {p.name}
                  {p.starter ? (
                    <span className="ml-2 text-xs text-muted-foreground">titular</span>
                  ) : null}
                </TableCell>
                <TableCell>{p.minutesPlayed}</TableCell>
                <TableCell>{p.goals || "—"}</TableCell>
                <TableCell>{p.yellowCards || "—"}</TableCell>
                <TableCell>{p.redCards || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

type DetailTab = "resumo" | "sumula" | "cartoes" | "ocorrencias" | "relatorio" | "anexos";

export function JogosDetailView({ gameKey }: Props) {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get("tenantId") ?? "";
  const initialTab = (searchParams.get("tab") ?? "resumo") as DetailTab;
  const { canAccessModule } = useAuth();

  const [detail, setDetail] = useState<FutebolGameDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DetailTab>(initialTab);

  const canEditCoach = canAccessModule("futebol_treinadores");

  const loadDetail = () => {
    if (!tenantId || !gameKey) {
      setDetail(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const encoded = encodeGameKey(gameKey);
    api
      .get<FutebolGameDetail>(`/futebol-jogos/${encoded}?tenantId=${tenantId}`)
      .then(({ data }) => setDetail(data))
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDetail();
  }, [tenantId, gameKey]);

  const printPayload = useMemo((): SumulaCartoesReportDto | null => {
    if (!detail?.sumulaMatch || !detail.tenant) return null;
    return {
      tenant: {
        id: detail.tenant.id,
        name: detail.tenant.name,
        logoUrl: null,
      },
      filters: {
        season: detail.sumulaMatch.season,
        category: detail.sumulaMatch.category,
        categoryLabel: detail.sumulaMatch.categoryLabel,
        matchId: detail.sumulaMatch.id,
      },
      match: detail.sumulaMatch,
      discipline: [],
      generatedAt: new Date().toISOString(),
    };
  }, [detail]);

  const handlePrintSumula = () => {
    if (printPayload) printSumulaCartoesReport(printPayload, "A4");
  };

  if (!tenantId) {
    return (
      <p className="text-sm text-muted-foreground">
        Volte à lista e selecione um clube.{" "}
        <Link href="/dashboard/futebol/jogos" className="text-primary hover:underline">
          Ir para Jogos
        </Link>
      </p>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!detail) {
    return (
      <p className="text-sm text-muted-foreground">
        Jogo não encontrado.{" "}
        <Link href={`/dashboard/futebol/jogos?tenantId=${tenantId}`} className="text-primary hover:underline">
          Voltar
        </Link>
      </p>
    );
  }

  const { game } = detail;
  const listBack = `/dashboard/futebol/jogos?tenantId=${tenantId}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {game.status === "upcoming" ? (
              <span className="rounded border border-sky-500/40 px-2 py-0.5 text-xs text-sky-400">
                Futuro
              </span>
            ) : (
              <span className="rounded border border-border px-2 py-0.5 text-xs text-muted-foreground">
                Realizado
              </span>
            )}
            {resultBadge(game.result)}
            <h2 className="text-xl font-semibold">{game.opponentName}</h2>
            {game.scoreLabel !== "—" ? (
              <span className="text-lg text-muted-foreground">{game.scoreLabel}</span>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">
            {formatDateDayMonYear(new Date(game.matchDate))}
            {detail.kickoffTime ? ` · ${detail.kickoffTime}` : ""}
            {game.competition ? ` · ${game.competition}` : ""}
            {game.category ? ` · ${getCategoryLabel(game.category, "pt")}` : ""}
            {game.round != null ? ` · Rod. ${game.round}` : ""}
            {game.isHome ? " · Casa" : " · Fora"}
          </p>
          {game.stadiumName || game.city ? (
            <p className="inline-flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {[game.stadiumName, game.city].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {detail.sourceUrl ? (
            <Button variant="outline" size="sm" className="min-h-[44px]" asChild>
              <a href={detail.sourceUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                PDF oficial
              </a>
            </Button>
          ) : null}
          {printPayload ? (
            <Button variant="outline" size="sm" className="min-h-[44px]" onClick={handlePrintSumula}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimir súmula
            </Button>
          ) : null}
          {game.travelLogisticsId ? (
            <Button variant="outline" size="sm" className="min-h-[44px]" asChild>
              <Link href={`/dashboard/futebol/logistica/${game.travelLogisticsId}/edit`}>Viagem</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: "resumo" as const, label: "Resumo", disabled: false },
              { id: "sumula" as const, label: "Súmula", disabled: !detail.sumulaMatch },
              {
                id: "cartoes" as const,
                label: "Cartões",
                disabled: detail.disciplineForMatch.length === 0,
              },
              {
                id: "ocorrencias" as const,
                label: "Ocorrências",
                disabled: false,
              },
              { id: "relatorio" as const, label: "Relatório", disabled: !detail.coachReport },
              {
                id: "anexos" as const,
                label: "Anexos",
                disabled: false,
              },
            ] as const
          ).map((item) => (
            <Button
              key={item.id}
              type="button"
              size="sm"
              variant={activeTab === item.id ? "default" : "outline"}
              className="min-h-[44px]"
              disabled={item.disabled}
              onClick={() => setActiveTab(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </div>

        {activeTab === "resumo" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Partida</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  {game.homeTeam} x {game.awayTeam}
                </div>
                <div>Placar: {game.scoreLabel}</div>
                <div>
                  Cartões: {game.yellowCards} amarelo(s) · {game.redCards} vermelho(s)
                </div>
                {game.possessionPct != null ? <div>Posse: {game.possessionPct}%</div> : null}
                {game.setPiecesFor != null || game.setPiecesAgainst != null ? (
                  <div>
                    Bolas paradas: {game.setPiecesFor ?? "—"} a favor · {game.setPiecesAgainst ?? "—"}{" "}
                    contra
                  </div>
                ) : null}
                {detail.statOverrideNotes ? (
                  <div className="rounded-md border border-border/60 p-3 text-muted-foreground">
                    {detail.statOverrideNotes}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tempos oficiais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {detail.firstHalfMinutes != null || detail.secondHalfMinutes != null ? (
                  <>
                    <div>1º tempo: {detail.firstHalfMinutes ?? "—"} min</div>
                    <div>2º tempo: {detail.secondHalfMinutes ?? "—"} min</div>
                    <div>Total: {detail.totalMinutes ?? "—"} min</div>
                    {(detail.firstHalfMinutes != null && detail.firstHalfMinutes > 45) ||
                    (detail.secondHalfMinutes != null && detail.secondHalfMinutes > 45) ? (
                      <p className="text-amber-400">
                        Acréscimo registrado na súmula (tempo acima de 45 min).
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p>Sem dados de tempo na súmula importada.</p>
                )}
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Registros disponíveis</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {game.hasSumula ? (
                  <span className="inline-flex items-center rounded bg-[#C8102E]/15 px-2 py-0.5 text-xs text-[#C8102E]">
                    <FileText className="mr-1 h-3 w-3" />
                    Súmula FMF
                  </span>
                ) : (
                  <span className="rounded border border-border px-2 py-0.5 text-xs text-muted-foreground">
                    Sem súmula importada
                  </span>
                )}
                {detail.coachReport ? (
                  <span className="rounded border border-border px-2 py-0.5 text-xs">Relatório do treinador</span>
                ) : canEditCoach ? (
                  <Button variant="link" className="h-auto p-0 text-primary" asChild>
                    <Link href={`/dashboard/futebol/treinadores?tenantId=${tenantId}&tab=pos-jogo`}>
                      Cadastrar relatório pós-jogo
                    </Link>
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          </div>
        ) : null}

        {activeTab === "sumula" && detail.sumulaMatch ? (
            <div className="space-y-6">
              <SumulaRosterTable
                title="Mandante"
                teamName={detail.sumulaMatch.home.teamName}
                score={detail.sumulaMatch.home.score}
                players={detail.sumulaMatch.home.players}
              />
              <SumulaRosterTable
                title="Visitante"
                teamName={detail.sumulaMatch.away.teamName}
                score={detail.sumulaMatch.away.score}
                players={detail.sumulaMatch.away.players}
              />
            </div>
        ) : null}

        {activeTab === "cartoes" && detail.disciplineForMatch.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Atleta</TableHead>
                    <TableHead className="w-20">Amarelos</TableHead>
                    <TableHead className="w-20">Vermelhos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.disciplineForMatch.map((row) => (
                    <TableRow key={row.playerId || row.name}>
                      <TableCell>{row.jerseyNumber ?? "—"}</TableCell>
                      <TableCell>
                        {row.playerId ? (
                          <Link
                            href={`/dashboard/cadastros/jogadores/${row.playerId}/edit`}
                            className="text-primary hover:underline"
                          >
                            {row.name}
                          </Link>
                        ) : (
                          row.name
                        )}
                      </TableCell>
                      <TableCell>{row.yellowCards}</TableCell>
                      <TableCell>{row.redCards}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
        ) : null}

        {activeTab === "ocorrencias" ? (
          <JogosOcorrenciasPanel
            tenantId={tenantId}
            gameKey={gameKey}
            incidents={detail.incidents}
            occurrencesText={detail.occurrencesText}
            onChanged={loadDetail}
          />
        ) : null}

        {activeTab === "relatorio" && detail.coachReport ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded border border-border px-2 py-0.5 text-xs capitalize">
                  {detail.coachReport.status}
                </span>
                {canEditCoach ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/futebol/treinadores?tenantId=${tenantId}&tab=pos-jogo`}>
                      Editar em Treinadores
                    </Link>
                  </Button>
                ) : null}
              </div>
              {detail.coachReport.teamReport ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Relatório da equipe</CardTitle>
                  </CardHeader>
                  <CardContent className="whitespace-pre-wrap text-sm">
                    {detail.coachReport.teamReport}
                  </CardContent>
                </Card>
              ) : null}
              {detail.coachReport.generalNotes ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Observações gerais</CardTitle>
                  </CardHeader>
                  <CardContent className="whitespace-pre-wrap text-sm">
                    {detail.coachReport.generalNotes}
                  </CardContent>
                </Card>
              ) : null}
              {detail.coachReport.playerRatings.some((r) => r.rating != null || r.individualReport) ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Avaliações individuais</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {detail.coachReport.playerRatings
                      .filter((r) => r.rating != null || r.individualReport)
                      .map((r) => (
                        <div key={r.playerId} className="rounded-lg border border-border/60 p-3 text-sm">
                          <div className="font-medium">
                            {r.jerseyNumber != null ? `#${r.jerseyNumber} ` : ""}
                            {r.name}
                            {r.rating != null ? ` · Nota ${r.rating}` : ""}
                          </div>
                          {r.individualReport ? (
                            <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                              {r.individualReport}
                            </p>
                          ) : null}
                        </div>
                      ))}
                  </CardContent>
                </Card>
              ) : null}
            </div>
        ) : null}

        {activeTab === "anexos" ? (
          <JogosAnexosPanel
            tenantId={tenantId}
            gameKey={gameKey}
            matchAttachments={detail.matchAttachments}
            coachReport={detail.coachReport}
            onChanged={loadDetail}
          />
        ) : null}
      </div>

      <Button variant="outline" asChild>
        <Link href={listBack}>Voltar à lista</Link>
      </Button>
    </div>
  );
}
