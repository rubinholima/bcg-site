"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, Loader2, Search, Send, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Cup360PageShell, PageSection } from "@/components/dashboard/cup360/Cup360PageShell";
import { DashboardFilterBar, FilterBarField } from "@/components/dashboard/cup360/DashboardFilterBar";
import { KpiCard } from "@/components/dashboard/cup360/KpiCard";
import { DashboardLoadingState } from "@/components/dashboard/DashboardDeptHeader";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";
import { useAuth } from "@/context/AuthContext";
import type {
  BostonCitySeasonRow,
  OpponentRadarRow,
  SeasonHighlightsSummary,
} from "@/lib/season-highlights-types";
import {
  downloadSeasonHighlightsCsv,
  downloadSeasonHighlightsXlsx,
} from "@/lib/season-highlights-export";

type TabId = "boston" | "opponent";

interface Props {
  tenantId: string;
  category?: string;
}

export function MelhoresTemporadaPanel({ tenantId, category }: Props) {
  const { canAccessModule } = useAuth();
  const canCaptacao = canAccessModule("futebol_captacao");

  const currentYear = new Date().getFullYear();
  const [tab, setTab] = useState<TabId>("boston");
  const [season, setSeason] = useState(String(currentYear));
  const [competition, setCompetition] = useState("");
  const [club, setClub] = useState("");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SeasonHighlightsSummary | null>(null);
  const [boston, setBoston] = useState<BostonCitySeasonRow[]>([]);
  const [opponents, setOpponents] = useState<OpponentRadarRow[]>([]);

  const [selectedBoston, setSelectedBoston] = useState<BostonCitySeasonRow | null>(null);
  const [selectedOpponent, setSelectedOpponent] = useState<OpponentRadarRow | null>(null);
  const [mgmtNotes, setMgmtNotes] = useState("");
  const [sendingCaptacao, setSendingCaptacao] = useState(false);
  const [feedback, setFeedback] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: "",
  });

  const queryBase = useMemo(() => {
    const params = new URLSearchParams({ tenantId });
    if (season) params.set("season", season);
    if (category) params.set("category", category);
    if (competition.trim()) params.set("competition", competition.trim());
    if (club.trim()) params.set("club", club.trim());
    if (search.trim()) params.set("search", search.trim());
    return params.toString();
  }, [tenantId, season, category, competition, club, search]);

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const [sumRes, bostonRes, oppRes] = await Promise.all([
        api.get<SeasonHighlightsSummary>(`/futebol-treinadores/season-highlights/summary?${queryBase}`),
        api.get<BostonCitySeasonRow[]>(`/futebol-treinadores/season-highlights/boston-city?${queryBase}`),
        api.get<OpponentRadarRow[]>(`/futebol-treinadores/season-highlights/opponent-radar?${queryBase}`),
      ]);
      setSummary(sumRes.data);
      setBoston(bostonRes.data);
      setOpponents(oppRes.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar Melhores da Temporada.");
    } finally {
      setLoading(false);
    }
  }, [tenantId, queryBase]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setMgmtNotes(selectedOpponent?.managementNotes ?? "");
  }, [selectedOpponent]);

  const handleExport = async (format: "csv" | "xlsx") => {
    try {
      const params = new URLSearchParams({ tenantId, season, tab: tab === "opponent" ? "opponent" : "boston" });
      const { data } = await api.get<{ rows: Record<string, string | number>[] }>(
        `/futebol-treinadores/season-highlights/export?${params.toString()}`,
      );
      const base = `melhores-temporada-${season}-${tab}`;
      if (format === "xlsx") downloadSeasonHighlightsXlsx(data.rows, base);
      else downloadSeasonHighlightsCsv(data.rows, base);
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Falha na exportação.",
      });
    }
  };

  const saveManagement = async () => {
    if (!selectedOpponent) return;
    try {
      await api.patch(
        `/futebol-treinadores/season-highlights/opponent-radar/${selectedOpponent.id}/management?tenantId=${tenantId}`,
        { managementNotes: mgmtNotes },
      );
      setFeedback({ open: true, title: "Salvo", message: "Notas de acompanhamento atualizadas." });
      await load();
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível salvar.",
      });
    }
  };

  const sendToCaptacao = async () => {
    if (!selectedOpponent || !canCaptacao) return;
    setSendingCaptacao(true);
    try {
      const { data } = await api.post<{
        prospect: { id: string; name: string };
        created: boolean;
      }>(
        `/futebol-treinadores/season-highlights/opponent-radar/${selectedOpponent.id}/send-to-captacao?tenantId=${tenantId}`,
      );
      setFeedback({
        open: true,
        title: data.created ? "Enviado para Captação" : "Já vinculado",
        message: data.created
          ? "Prospect criado a partir do radar adversário."
          : "Este atleta já está na Captação.",
      });
      await load();
      setSelectedOpponent(null);
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível enviar para Captação.",
      });
    } finally {
      setSendingCaptacao(false);
    }
  };

  if (loading && !summary) {
    return <DashboardLoadingState label="Carregando Melhores da Temporada…" />;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 space-y-3">
        <p className="text-sm text-destructive">{error}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => load()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <Cup360PageShell
      actions={
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => handleExport("csv")}>
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => handleExport("xlsx")}>
            <Download className="mr-2 h-4 w-4" />
            XLSX
          </Button>
        </div>
      }
    >
      <DashboardFilterBar>
        <FilterBarField label="Temporada">
          <Input
            type="number"
            className="h-9 w-28 text-foreground"
            value={season}
            onChange={(e) => setSeason(e.target.value)}
          />
        </FilterBarField>
        <FilterBarField label="Competição">
          <Input
            className="h-9 min-w-[140px]"
            placeholder="Filtrar…"
            value={competition}
            onChange={(e) => setCompetition(e.target.value)}
          />
        </FilterBarField>
        {tab === "opponent" ? (
          <FilterBarField label="Clube">
            <Input
              className="h-9 min-w-[140px]"
              placeholder="Adversário…"
              value={club}
              onChange={(e) => setClub(e.target.value)}
            />
          </FilterBarField>
        ) : null}
        <FilterBarField label="Busca">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="h-9 pl-8 min-w-[160px]"
              placeholder="Nome…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </FilterBarField>
      </DashboardFilterBar>

      {summary ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Destaques elenco" value={summary.ourStandoutSelections} />
          <KpiCard label="Perfis radar" value={summary.opponentProfiles} />
          <KpiCard label="Adversários 2+ jogos" value={summary.opponentRecurrent} />
          <KpiCard
            label="CBF confirmado"
            value={summary.opponentCbfConfirmed}
            hint={`${summary.opponentUnresolved} sem CBF`}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 border-b border-border/60 pb-2">
        <Button
          type="button"
          size="sm"
          variant={tab === "boston" ? "default" : "outline"}
          onClick={() => setTab("boston")}
        >
          Boston City
        </Button>
        <Button
          type="button"
          size="sm"
          variant={tab === "opponent" ? "default" : "outline"}
          onClick={() => setTab("opponent")}
        >
          Adversários / Radar
        </Button>
      </div>

      {tab === "boston" ? (
        <PageSection title="Elenco">
          {boston.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nenhum destaque nesta temporada.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Atleta</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Pos.</TableHead>
                    <TableHead className="text-center">Seleções</TableHead>
                    <TableHead className="text-center">Nota média</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {boston.map((row) => (
                    <TableRow
                      key={row.playerId}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => setSelectedBoston(row)}
                    >
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell>{row.category ?? "—"}</TableCell>
                      <TableCell>{row.position ?? "—"}</TableCell>
                      <TableCell className="text-center tabular-nums">{row.selectionCount}</TableCell>
                      <TableCell className="text-center tabular-nums">{row.averageRating ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </PageSection>
      ) : (
        <PageSection title="Radar adversário">
          {opponents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nenhum perfil de radar adversário.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CBF</TableHead>
                    <TableHead>Clube</TableHead>
                    <TableHead className="text-center">Destaques</TableHead>
                    <TableHead>Identidade</TableHead>
                    <TableHead>Captação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {opponents.map((row) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => setSelectedOpponent(row)}
                    >
                      <TableCell className="font-medium">{row.displayName}</TableCell>
                      <TableCell className="tabular-nums text-xs">{row.cbfRegistration ?? "—"}</TableCell>
                      <TableCell className="max-w-[160px] truncate">{row.lastKnownClub ?? "—"}</TableCell>
                      <TableCell className="text-center tabular-nums">{row.highlightCount}</TableCell>
                      <TableCell className="text-xs capitalize">{row.identityConfidence}</TableCell>
                      <TableCell className="text-xs">
                        {row.scoutingProspectId ? (
                          <Link
                            href={`/dashboard/futebol/captacao?prospect=${row.scoutingProspectId}`}
                            className="text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Na Captação
                          </Link>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </PageSection>
      )}

      {selectedBoston ? (
        <PageSection
          title={selectedBoston.name}
          action={
            <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedBoston(null)}>
              Fechar
            </Button>
          }
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <KpiCard label="Seleções" value={selectedBoston.selectionCount} />
            <KpiCard label="Nota média" value={selectedBoston.averageRating ?? "—"} />
            {selectedBoston.seasonStatsOfficial ? (
              <KpiCard
                label="Súmula (temporada)"
                value={selectedBoston.seasonStatsOfficial.matches}
                hint={`${selectedBoston.seasonStatsOfficial.goals}G · ${selectedBoston.seasonStatsOfficial.assists}A`}
              />
            ) : null}
          </div>
          <Button asChild variant="outline" size="sm" className="mt-2">
            <Link href={`/dashboard/cadastros/jogadores/${selectedBoston.playerId}`}>Abrir ficha do atleta</Link>
          </Button>
          <ul className="mt-4 space-y-3">
            {selectedBoston.matches.map((m) => (
              <li key={m.reportId} className="rounded-lg border border-border/60 p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2 font-medium">
                  <Star className="h-3.5 w-3.5 text-primary" />
                  {m.matchDate ? formatDateDayMonYear(m.matchDate.slice(0, 10)) : "—"}
                  {m.opponent ? ` · ${m.opponent}` : ""}
                  {m.scoreLabel ? ` · ${m.scoreLabel}` : ""}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{m.competition ?? "—"}</p>
                <p className="mt-2 text-xs">
                  {m.isMatchBest ? "Melhor nota · " : ""}
                  {m.isStaffStandout ? "Destaque comissão · " : ""}
                  Nota {m.rating ?? "—"} · {m.assists} assist.
                </p>
                {m.individualReport ? <p className="mt-2 text-muted-foreground">{m.individualReport}</p> : null}
              </li>
            ))}
          </ul>
        </PageSection>
      ) : null}

      {selectedOpponent ? (
        <PageSection
          title={selectedOpponent.displayName}
          action={
            <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedOpponent(null)}>
              Fechar
            </Button>
          }
        >
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <p>
              <span className="text-muted-foreground">CBF:</span> {selectedOpponent.cbfRegistration ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Posição:</span> {selectedOpponent.position ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Último clube:</span> {selectedOpponent.lastKnownClub ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Confiança:</span> {selectedOpponent.identityConfidence} (
              {selectedOpponent.identitySource})
            </p>
          </div>
          {selectedOpponent.clubHistory.length > 0 ? (
            <p className="text-xs text-muted-foreground mt-2">
              Clubes no histórico: {selectedOpponent.clubHistory.join(" · ")}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            {selectedOpponent.scoutingProspectId ? (
              <Button asChild size="sm">
                <Link href={`/dashboard/futebol/captacao?prospect=${selectedOpponent.scoutingProspectId}`}>
                  Abrir na Captação
                </Link>
              </Button>
            ) : canCaptacao ? (
              <Button type="button" size="sm" onClick={sendToCaptacao} disabled={sendingCaptacao}>
                {sendingCaptacao ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Enviar para Captação
              </Button>
            ) : null}
          </div>

          <div className="mt-4 space-y-2">
            <Label>Acompanhamento</Label>
            <Textarea rows={3} value={mgmtNotes} onChange={(e) => setMgmtNotes(e.target.value)} />
            <Button type="button" size="sm" variant="outline" onClick={saveManagement}>
              Salvar notas
            </Button>
          </div>

          <ul className="mt-4 space-y-3">
            {selectedOpponent.events.map((e) => (
              <li key={e.id} className="rounded-lg border border-border/60 p-3 text-sm">
                <div className="font-medium">
                  {e.matchDate ? formatDateDayMonYear(e.matchDate.slice(0, 10)) : "—"}
                  {e.scoreLabel ? ` · ${e.scoreLabel}` : ""}
                </div>
                <p className="text-xs text-muted-foreground">
                  {e.competition ?? "—"} · {e.opponentClub ?? "—"}
                  {e.jerseyNumber != null ? ` · #${e.jerseyNumber}` : ""}
                </p>
                {e.staffNotes ? <p className="mt-2">{e.staffNotes}</p> : null}
                {e.officialStats && typeof e.officialStats === "object" ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Súmula:{" "}
                    {JSON.stringify(e.officialStats)
                      .slice(0, 180)
                      .replace(/[{}"]/g, " ")
                      .trim()}
                    …
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </PageSection>
      ) : null}

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
      />
    </Cup360PageShell>
  );
}
