"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronRight, FileText, Loader2, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";
import { getCategoryLabel } from "@/lib/fixture-categories";
import {
  gameDetailPath,
  type FutebolGamesListResponse,
  type FutebolGameListItem,
} from "@/lib/futebol-jogos.types";
import { JogosFilters } from "./JogosFilters";

function resultBadge(result: FutebolGameListItem["result"]) {
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

function statusBadge(status: FutebolGameListItem["status"]) {
  return status === "upcoming" ? (
    <span className="rounded border border-sky-500/40 px-2 py-0.5 text-xs text-sky-400">
      Futuro
    </span>
  ) : (
    <span className="rounded border border-zinc-600 px-2 py-0.5 text-xs text-muted-foreground">
      Realizado
    </span>
  );
}

export function JogosDashboard() {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get("tenantId") ?? "";
  const category = searchParams.get("category") ?? undefined;
  const season = searchParams.get("season") ?? String(new Date().getFullYear());
  const status = searchParams.get("status") ?? undefined;

  const [data, setData] = useState<FutebolGamesListResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tenantId) {
      setData(null);
      return;
    }
    setLoading(true);
    const params = new URLSearchParams({ tenantId, season });
    if (category) params.set("category", category);
    if (status && status !== "all") params.set("status", status);
    api
      .get<FutebolGamesListResponse>(`/futebol-jogos?${params}`)
      .then(({ data: payload }) => setData(payload))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [tenantId, category, season, status]);

  return (
    <div className="space-y-6">
      <JogosFilters />

      {!tenantId ? (
        <p className="text-sm text-muted-foreground">Selecione um clube para ver os jogos.</p>
      ) : loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !data?.games.length ? (
        <p className="text-sm text-muted-foreground">Nenhum jogo encontrado para os filtros.</p>
      ) : (
        <ul className="space-y-3">
          {data.games.map((game) => (
            <li key={game.gameKey}>
              <Link href={`${gameDetailPath(game.gameKey)}?tenantId=${tenantId}`} className="group block">
                <Card className="transition-colors hover:border-[#C8102E]/40 hover:bg-[#C8102E]/5">
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {statusBadge(game.status)}
                        {resultBadge(game.result)}
                        <span className="font-semibold">{game.opponentName}</span>
                        {game.scoreLabel !== "—" ? (
                          <span className="text-muted-foreground">{game.scoreLabel}</span>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                        <span>{formatDateDayMonYear(new Date(game.matchDate))}</span>
                        {game.competition ? <span>{game.competition}</span> : null}
                        {game.category ? (
                          <span>{getCategoryLabel(game.category, "pt")}</span>
                        ) : null}
                        <span>{game.isHome ? "Casa" : "Fora"}</span>
                        {game.stadiumName ? (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {game.stadiumName}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {game.hasSumula ? (
                          <span className="inline-flex items-center rounded bg-[#C8102E]/15 px-2 py-0.5 text-xs text-[#C8102E]">
                            <FileText className="mr-1 h-3 w-3" />
                            Súmula
                          </span>
                        ) : null}
                        {game.yellowCards > 0 || game.redCards > 0 ? (
                          <span className="rounded bg-secondary px-2 py-0.5 text-xs">
                            {game.yellowCards}A · {game.redCards}V
                          </span>
                        ) : null}
                        {game.hasCoachReport ? (
                          <span className="rounded border border-border px-2 py-0.5 text-xs">
                            Relatório treinador
                          </span>
                        ) : null}
                        {game.incidentCount > 0 ? (
                          <span className="rounded border border-amber-500/40 px-2 py-0.5 text-xs text-amber-400">
                            {game.incidentCount} ocorrência(s)
                          </span>
                        ) : null}
                        {game.attachmentCount > 0 ? (
                          <span className="rounded border border-border px-2 py-0.5 text-xs">
                            {game.attachmentCount} anexo(s)
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <ChevronRight className="hidden h-5 w-5 shrink-0 text-[#C8102E] transition-transform group-hover:translate-x-0.5 sm:block" />
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
