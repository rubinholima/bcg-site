"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarIcon, ChevronRight, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { HomeContentBlock } from "@/types/home-content";
import type { BlockConfigValue } from "@/types/block-config";
import { getCategoryLabel } from "@/lib/fixture-categories";
import { fetchFixtures, type FixtureItem, type FixturesFetchContext } from "@/lib/fixtures-shared";
import type { CompetitionFormat } from "@/lib/competition-formats";
import { CompetitionFormatFixturesGuide } from "@/components/dashboard/CompetitionFormatFixturesGuide";

export interface UltimosResultadosModuleEditorProps {
  block: HomeContentBlock;
  updateBlockConfigValue: (key: string, value: BlockConfigValue) => void;
  publicSlug: string;
  fixturesFetchContext: FixturesFetchContext;
  /** Página de evento: lembra que a lista vem da mesma base / integração que Próximos jogos. */
  showEventDataHint?: boolean;
  eventCategory?: string;
  competitionFormat?: CompetitionFormat | null;
  eventEditHref?: string;
}

export function UltimosResultadosModuleEditor({
  block,
  updateBlockConfigValue,
  publicSlug,
  fixturesFetchContext,
  showEventDataHint = false,
  eventCategory,
  competitionFormat,
  eventEditHref,
}: UltimosResultadosModuleEditorProps) {
  const [pastFixtures, setPastFixtures] = useState<FixtureItem[]>([]);
  const [loadingPast, setLoadingPast] = useState(false);
  const showFormatGuide =
    showEventDataHint &&
    eventCategory === "football" &&
    Boolean(eventEditHref?.trim());

  return (
    <div className="space-y-3 sm:col-span-2">
      <details className="rounded-lg border border-border bg-muted/20">
        <summary className="cursor-pointer px-3 py-2 font-medium">Últimos resultados</summary>
        <div className="border-t border-border px-3 py-3 space-y-3">
          <p className="text-xs text-muted-foreground">
            Mesma base de Próximos Jogos. Exibe jogos já realizados com placar. Placar vem da API (SofaScore) ou pode ser informado manualmente abaixo.
          </p>
          {showEventDataHint && (
            <p className="text-xs text-muted-foreground border-l-2 border-amber-500/40 pl-2">
              No evento, os jogos listados são os mesmos cadastrados no módulo <strong>Próximos jogos</strong> (manual ou
              planilha da integração <strong>Próximos jogos</strong> em Configurações → Integrações, com o{" "}
              <strong>slug deste evento</strong> na coluna de filtro). Não há integração separada só para &quot;últimos
              resultados&quot;.
            </p>
          )}
          {showFormatGuide && eventEditHref && (
            <>
              {competitionFormat ? (
                <CompetitionFormatFixturesGuide
                  format={competitionFormat}
                  eventEditHref={eventEditHref}
                  compact
                />
              ) : (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 py-2 text-[11px] text-muted-foreground">
                  <span className="text-violet-200/90">Formato da disputa:</span> ainda não definido no cadastro do
                  evento — alinhe fases e número de clubes em{" "}
                  <Link href={eventEditHref} className="text-violet-300 underline">
                    Eventos → editar
                  </Link>
                  .
                </div>
              )}
            </>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Máx. resultados exibidos</Label>
              <Input
                type="number"
                min={3}
                max={30}
                value={(block.config?.ultimosResultadosMaxItems as number) ?? 10}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  updateBlockConfigValue(
                    "ultimosResultadosMaxItems",
                    Number.isNaN(v) ? 10 : Math.min(30, Math.max(3, v)),
                  );
                }}
              />
            </div>
            <div className="space-y-1">
              <Label>Espaço no topo</Label>
              <Select
                value={(block.config?.ultimosResultadosPaddingTop as string) ?? "compact"}
                onValueChange={(v) => updateBlockConfigValue("ultimosResultadosPaddingTop", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimal">Mínimo</SelectItem>
                  <SelectItem value="compact">Compacto</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="large">Grande</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Espaço embaixo</Label>
              <Select
                value={(block.config?.ultimosResultadosPaddingBottom as string) ?? "compact"}
                onValueChange={(v) => updateBlockConfigValue("ultimosResultadosPaddingBottom", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimal">Mínimo</SelectItem>
                  <SelectItem value="compact">Compacto</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="large">Grande</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <details className="rounded-lg border border-amber-500/40 bg-amber-500/10 mt-3">
            <summary className="cursor-pointer px-3 py-2 font-medium">Placares manuais (quando a API não tem)</summary>
            <div className="border-t border-border px-3 py-3 space-y-3">
              <p className="text-xs text-muted-foreground">
                Se o placar não vier da API, informe aqui. Clique em &quot;Carregar jogos&quot; para listar os jogos passados. Expanda cada jogo para registrar gols, cartões, substituições, pênaltis, formações, estatísticas (posse, finalizações, xG, distância) e vídeos.
              </p>
              {!publicSlug ? (
                <p className="text-xs text-amber-600">Carregue a página/evento com slug válido primeiro.</p>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={loadingPast}
                    onClick={async () => {
                      setLoadingPast(true);
                      try {
                        const list = await fetchFixtures(publicSlug, fixturesFetchContext);
                        const now = new Date();
                        const past = list
                          .filter((f) => new Date(f.startISO) < now)
                          .sort((a, b) => new Date(b.startISO).getTime() - new Date(a.startISO).getTime())
                          .slice(0, 20);
                        setPastFixtures(past);
                      } catch (err) {
                        console.error("Erro ao carregar jogos passados:", err);
                      } finally {
                        setLoadingPast(false);
                      }
                    }}
                  >
                    {loadingPast ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CalendarIcon className="h-4 w-4 mr-1" />}
                    {loadingPast ? "Carregando…" : "Carregar jogos passados"}
                  </Button>
                  {pastFixtures.length > 0 && (
                    <div className="space-y-2">
                      {pastFixtures.map((f) => {
                        const resultados =
                          (block.config?.resultadosManuais as Record<string, { homeScore: number; awayScore: number }>) ?? {};
                        const manual = resultados[f.externalId] ?? {
                          homeScore: f.homeScore ?? 0,
                          awayScore: f.awayScore ?? 0,
                        };
                        const detalhes =
                          ((block.config?.resultadosDetalhes as Record<string, Record<string, unknown>>) ?? {})[f.externalId] ?? {};
                        const goals = (detalhes.goals as Array<{ minute: number; scorerName: string; team: string }>) ?? [];
                        const redCards =
                          (detalhes.redCards as Array<{ minute: number; playerName: string; team: string }>) ?? [];
                        const yellowCards =
                          (detalhes.yellowCards as Array<{ minute: number; playerName: string; team: string }>) ?? [];
                        const substitutions =
                          (detalhes.substitutions as Array<{
                            minute: number;
                            playerOut: string;
                            playerIn: string;
                            team: string;
                          }>) ?? [];
                        const penalties =
                          (detalhes.penalties as Array<{
                            minute: number;
                            playerName: string;
                            team: string;
                            scored: boolean;
                          }>) ?? [];
                        const formations = (detalhes.formations as { home?: string; away?: string }) ?? {};
                        const stats = (detalhes.stats as Record<string, number>) ?? {};
                        const videoUrls = (detalhes.videoUrls as string[]) ?? [];
                        const catLabel = getCategoryLabel(f.category ?? "principal", "pt");
                        const updateDetalhes = (upd: Record<string, unknown>) => {
                          const root = (block.config?.resultadosDetalhes as Record<string, Record<string, unknown>>) ?? {};
                          const next = {
                            ...root,
                            [f.externalId]: { ...detalhes, ...upd },
                          };
                          updateBlockConfigValue("resultadosDetalhes", next);
                        };
                        return (
                          <details
                            key={f.externalId}
                            className="rounded border border-border bg-background/50 overflow-hidden group/details"
                          >
                            <summary className="flex flex-wrap items-center gap-2 p-2 text-sm cursor-pointer hover:bg-muted/50 list-none [&::-webkit-details-marker]:hidden">
                              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open/details:rotate-90" />
                              <span className="text-xs text-muted-foreground shrink-0 w-14">{catLabel}</span>
                              {(goals.length > 0 ||
                                redCards.length > 0 ||
                                yellowCards.length > 0 ||
                                stats.possessionHome != null ||
                                formations.home) && (
                                <span className="text-xs bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded px-1.5 py-0.5">
                                  {goals.length > 0 && `${goals.length} gol${goals.length !== 1 ? "s" : ""}`}
                                  {redCards.length > 0 && `${goals.length > 0 ? " · " : ""}${redCards.length} exp.`}
                                  {yellowCards.length > 0 &&
                                    `${goals.length > 0 || redCards.length > 0 ? " · " : ""}${yellowCards.length} am.`}
                                  {(stats.possessionHome != null || formations.home) && " · +"}
                                </span>
                              )}
                              <span className="min-w-0 truncate flex-1">{f.homeTeamName}</span>
                              <div className="flex items-center gap-1 shrink-0">
                                <Input
                                  type="number"
                                  min={0}
                                  max={99}
                                  className="w-12 h-8 text-center text-sm"
                                  value={manual.homeScore}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => {
                                    const v = parseInt(e.target.value, 10);
                                    const next = {
                                      ...resultados,
                                      [f.externalId]: { ...manual, homeScore: Number.isNaN(v) ? 0 : v },
                                    };
                                    updateBlockConfigValue("resultadosManuais", next);
                                  }}
                                />
                                <span className="text-muted-foreground">×</span>
                                <Input
                                  type="number"
                                  min={0}
                                  max={99}
                                  className="w-12 h-8 text-center text-sm"
                                  value={manual.awayScore}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => {
                                    const v = parseInt(e.target.value, 10);
                                    const next = {
                                      ...resultados,
                                      [f.externalId]: { ...manual, awayScore: Number.isNaN(v) ? 0 : v },
                                    };
                                    updateBlockConfigValue("resultadosManuais", next);
                                  }}
                                />
                              </div>
                              <span className="min-w-0 truncate flex-1 text-right">{f.awayTeamName}</span>
                            </summary>
                            <div className="border-t border-border p-3 space-y-4 bg-muted/20">
                              <div>
                                <Label className="text-xs font-medium">Gols (minuto, autor, time)</Label>
                                <div className="mt-1 space-y-2">
                                  {goals.map((g, gi) => (
                                    <div key={gi} className="flex flex-wrap items-center gap-2">
                                      <Input
                                        type="number"
                                        min={0}
                                        max={120}
                                        placeholder="Min"
                                        className="w-16 h-8"
                                        value={g.minute || ""}
                                        onChange={(e) => {
                                          const arr = [...goals];
                                          arr[gi] = { ...arr[gi], minute: parseInt(e.target.value, 10) || 0 };
                                          updateDetalhes({ goals: arr });
                                        }}
                                      />
                                      <Input
                                        placeholder="Autor do gol"
                                        className="flex-1 min-w-[100px] h-8"
                                        value={g.scorerName || ""}
                                        onChange={(e) => {
                                          const arr = [...goals];
                                          arr[gi] = { ...arr[gi], scorerName: e.target.value };
                                          updateDetalhes({ goals: arr });
                                        }}
                                      />
                                      <Select
                                        value={g.team || "home"}
                                        onValueChange={(v) => {
                                          const arr = [...goals];
                                          arr[gi] = { ...arr[gi], team: v };
                                          updateDetalhes({ goals: arr });
                                        }}
                                      >
                                        <SelectTrigger className="w-24 h-8">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="home">{f.homeTeamName}</SelectItem>
                                          <SelectItem value="away">{f.awayTeamName}</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive"
                                        onClick={() => updateDetalhes({ goals: goals.filter((_, i) => i !== gi) })}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ))}
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      updateDetalhes({ goals: [...goals, { minute: 0, scorerName: "", team: "home" }] })
                                    }
                                  >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Adicionar gol
                                  </Button>
                                </div>
                              </div>
                              <div>
                                <Label className="text-xs font-medium">Expulsões (minuto, jogador, time)</Label>
                                <div className="mt-1 space-y-2">
                                  {redCards.map((r, ri) => (
                                    <div key={ri} className="flex flex-wrap items-center gap-2">
                                      <Input
                                        type="number"
                                        min={0}
                                        max={120}
                                        placeholder="Min"
                                        className="w-16 h-8"
                                        value={r.minute || ""}
                                        onChange={(e) => {
                                          const arr = [...redCards];
                                          arr[ri] = { ...arr[ri], minute: parseInt(e.target.value, 10) || 0 };
                                          updateDetalhes({ redCards: arr });
                                        }}
                                      />
                                      <Input
                                        placeholder="Jogador expulso"
                                        className="flex-1 min-w-[100px] h-8"
                                        value={r.playerName || ""}
                                        onChange={(e) => {
                                          const arr = [...redCards];
                                          arr[ri] = { ...arr[ri], playerName: e.target.value };
                                          updateDetalhes({ redCards: arr });
                                        }}
                                      />
                                      <Select
                                        value={r.team || "home"}
                                        onValueChange={(v) => {
                                          const arr = [...redCards];
                                          arr[ri] = { ...arr[ri], team: v };
                                          updateDetalhes({ redCards: arr });
                                        }}
                                      >
                                        <SelectTrigger className="w-24 h-8">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="home">{f.homeTeamName}</SelectItem>
                                          <SelectItem value="away">{f.awayTeamName}</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive"
                                        onClick={() =>
                                          updateDetalhes({ redCards: redCards.filter((_, i) => i !== ri) })
                                        }
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ))}
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      updateDetalhes({
                                        redCards: [...redCards, { minute: 0, playerName: "", team: "home" }],
                                      })
                                    }
                                  >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Adicionar expulsão
                                  </Button>
                                </div>
                              </div>
                              <div>
                                <Label className="text-xs font-medium">Cartões amarelos</Label>
                                <div className="mt-1 space-y-2">
                                  {yellowCards.map((y, yi) => (
                                    <div key={yi} className="flex flex-wrap items-center gap-2">
                                      <Input
                                        type="number"
                                        min={0}
                                        max={120}
                                        placeholder="Min"
                                        className="w-16 h-8"
                                        value={y.minute || ""}
                                        onChange={(e) => {
                                          const arr = [...yellowCards];
                                          arr[yi] = { ...arr[yi], minute: parseInt(e.target.value, 10) || 0 };
                                          updateDetalhes({ yellowCards: arr });
                                        }}
                                      />
                                      <Input
                                        placeholder="Jogador"
                                        className="flex-1 min-w-[100px] h-8"
                                        value={y.playerName || ""}
                                        onChange={(e) => {
                                          const arr = [...yellowCards];
                                          arr[yi] = { ...arr[yi], playerName: e.target.value };
                                          updateDetalhes({ yellowCards: arr });
                                        }}
                                      />
                                      <Select
                                        value={y.team || "home"}
                                        onValueChange={(v) => {
                                          const arr = [...yellowCards];
                                          arr[yi] = { ...arr[yi], team: v };
                                          updateDetalhes({ yellowCards: arr });
                                        }}
                                      >
                                        <SelectTrigger className="w-24 h-8">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="home">{f.homeTeamName}</SelectItem>
                                          <SelectItem value="away">{f.awayTeamName}</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive"
                                        onClick={() =>
                                          updateDetalhes({ yellowCards: yellowCards.filter((_, i) => i !== yi) })
                                        }
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ))}
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      updateDetalhes({
                                        yellowCards: [...yellowCards, { minute: 0, playerName: "", team: "home" }],
                                      })
                                    }
                                  >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Adicionar amarelo
                                  </Button>
                                </div>
                              </div>
                              <div>
                                <Label className="text-xs font-medium">Substituições (min, sai, entra, time)</Label>
                                <div className="mt-1 space-y-2">
                                  {substitutions.map((s, si) => (
                                    <div key={si} className="flex flex-wrap items-center gap-2">
                                      <Input
                                        type="number"
                                        min={0}
                                        max={120}
                                        placeholder="Min"
                                        className="w-16 h-8"
                                        value={s.minute || ""}
                                        onChange={(e) => {
                                          const arr = [...substitutions];
                                          arr[si] = { ...arr[si], minute: parseInt(e.target.value, 10) || 0 };
                                          updateDetalhes({ substitutions: arr });
                                        }}
                                      />
                                      <Input
                                        placeholder="Sai"
                                        className="w-24 h-8"
                                        value={s.playerOut || ""}
                                        onChange={(e) => {
                                          const arr = [...substitutions];
                                          arr[si] = { ...arr[si], playerOut: e.target.value };
                                          updateDetalhes({ substitutions: arr });
                                        }}
                                      />
                                      <Input
                                        placeholder="Entra"
                                        className="w-24 h-8"
                                        value={s.playerIn || ""}
                                        onChange={(e) => {
                                          const arr = [...substitutions];
                                          arr[si] = { ...arr[si], playerIn: e.target.value };
                                          updateDetalhes({ substitutions: arr });
                                        }}
                                      />
                                      <Select
                                        value={s.team || "home"}
                                        onValueChange={(v) => {
                                          const arr = [...substitutions];
                                          arr[si] = { ...arr[si], team: v };
                                          updateDetalhes({ substitutions: arr });
                                        }}
                                      >
                                        <SelectTrigger className="w-24 h-8">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="home">{f.homeTeamName}</SelectItem>
                                          <SelectItem value="away">{f.awayTeamName}</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive"
                                        onClick={() =>
                                          updateDetalhes({ substitutions: substitutions.filter((_, i) => i !== si) })
                                        }
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ))}
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      updateDetalhes({
                                        substitutions: [
                                          ...substitutions,
                                          { minute: 0, playerOut: "", playerIn: "", team: "home" },
                                        ],
                                      })
                                    }
                                  >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Adicionar substituição
                                  </Button>
                                </div>
                              </div>
                              <div>
                                <Label className="text-xs font-medium">Pênaltis (min, jogador, time, convertido?)</Label>
                                <div className="mt-1 space-y-2">
                                  {penalties.map((p, pi) => (
                                    <div key={pi} className="flex flex-wrap items-center gap-2">
                                      <Input
                                        type="number"
                                        min={0}
                                        max={120}
                                        placeholder="Min"
                                        className="w-16 h-8"
                                        value={p.minute || ""}
                                        onChange={(e) => {
                                          const arr = [...penalties];
                                          arr[pi] = { ...arr[pi], minute: parseInt(e.target.value, 10) || 0 };
                                          updateDetalhes({ penalties: arr });
                                        }}
                                      />
                                      <Input
                                        placeholder="Cobrador"
                                        className="flex-1 min-w-[80px] h-8"
                                        value={p.playerName || ""}
                                        onChange={(e) => {
                                          const arr = [...penalties];
                                          arr[pi] = { ...arr[pi], playerName: e.target.value };
                                          updateDetalhes({ penalties: arr });
                                        }}
                                      />
                                      <Select
                                        value={p.team || "home"}
                                        onValueChange={(v) => {
                                          const arr = [...penalties];
                                          arr[pi] = { ...arr[pi], team: v };
                                          updateDetalhes({ penalties: arr });
                                        }}
                                      >
                                        <SelectTrigger className="w-24 h-8">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="home">{f.homeTeamName}</SelectItem>
                                          <SelectItem value="away">{f.awayTeamName}</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <label className="flex items-center gap-1 text-xs">
                                        <input
                                          type="checkbox"
                                          checked={!!p.scored}
                                          onChange={(e) => {
                                            const arr = [...penalties];
                                            arr[pi] = { ...arr[pi], scored: e.target.checked };
                                            updateDetalhes({ penalties: arr });
                                          }}
                                        />
                                        Gol
                                      </label>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive"
                                        onClick={() =>
                                          updateDetalhes({ penalties: penalties.filter((_, i) => i !== pi) })
                                        }
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ))}
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      updateDetalhes({
                                        penalties: [
                                          ...penalties,
                                          { minute: 0, playerName: "", team: "home", scored: true },
                                        ],
                                      })
                                    }
                                  >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Adicionar pênalti
                                  </Button>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-xs font-medium">Formação casa (ex: 4-3-3)</Label>
                                  <Input
                                    className="h-8 mt-1"
                                    placeholder="4-3-3"
                                    value={formations.home ?? ""}
                                    onChange={(e) =>
                                      updateDetalhes({ formations: { ...formations, home: e.target.value } })
                                    }
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs font-medium">Formação visitante</Label>
                                  <Input
                                    className="h-8 mt-1"
                                    placeholder="3-5-2"
                                    value={formations.away ?? ""}
                                    onChange={(e) =>
                                      updateDetalhes({ formations: { ...formations, away: e.target.value } })
                                    }
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <div>
                                  <Label className="text-xs">Posse casa %</Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={100}
                                    className="h-8 mt-0.5"
                                    value={stats.possessionHome ?? ""}
                                    onChange={(e) =>
                                      updateDetalhes({
                                        stats: {
                                          ...stats,
                                          possessionHome: e.target.value === "" ? undefined : parseInt(e.target.value, 10),
                                        },
                                      })
                                    }
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Posse visit. %</Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={100}
                                    className="h-8 mt-0.5"
                                    value={stats.possessionAway ?? ""}
                                    onChange={(e) =>
                                      updateDetalhes({
                                        stats: {
                                          ...stats,
                                          possessionAway: e.target.value === "" ? undefined : parseInt(e.target.value, 10),
                                        },
                                      })
                                    }
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Finaliz. no alvo casa</Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    className="h-8 mt-0.5"
                                    value={stats.shotsOnTargetHome ?? ""}
                                    onChange={(e) =>
                                      updateDetalhes({
                                        stats: {
                                          ...stats,
                                          shotsOnTargetHome:
                                            e.target.value === "" ? undefined : parseInt(e.target.value, 10),
                                        },
                                      })
                                    }
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Finaliz. no alvo visit.</Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    className="h-8 mt-0.5"
                                    value={stats.shotsOnTargetAway ?? ""}
                                    onChange={(e) =>
                                      updateDetalhes({
                                        stats: {
                                          ...stats,
                                          shotsOnTargetAway:
                                            e.target.value === "" ? undefined : parseInt(e.target.value, 10),
                                        },
                                      })
                                    }
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">xG casa</Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    step={0.1}
                                    className="h-8 mt-0.5"
                                    placeholder="0.0"
                                    value={stats.xgHome ?? ""}
                                    onChange={(e) =>
                                      updateDetalhes({
                                        stats: {
                                          ...stats,
                                          xgHome: e.target.value === "" ? undefined : parseFloat(e.target.value),
                                        },
                                      })
                                    }
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">xG visitante</Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    step={0.1}
                                    className="h-8 mt-0.5"
                                    placeholder="0.0"
                                    value={stats.xgAway ?? ""}
                                    onChange={(e) =>
                                      updateDetalhes({
                                        stats: {
                                          ...stats,
                                          xgAway: e.target.value === "" ? undefined : parseFloat(e.target.value),
                                        },
                                      })
                                    }
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Distância casa (km)</Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    step={0.1}
                                    className="h-8 mt-0.5"
                                    placeholder="0"
                                    value={stats.distanceHome ?? ""}
                                    onChange={(e) =>
                                      updateDetalhes({
                                        stats: {
                                          ...stats,
                                          distanceHome: e.target.value === "" ? undefined : parseFloat(e.target.value),
                                        },
                                      })
                                    }
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Distância visit. (km)</Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    step={0.1}
                                    className="h-8 mt-0.5"
                                    placeholder="0"
                                    value={stats.distanceAway ?? ""}
                                    onChange={(e) =>
                                      updateDetalhes({
                                        stats: {
                                          ...stats,
                                          distanceAway: e.target.value === "" ? undefined : parseFloat(e.target.value),
                                        },
                                      })
                                    }
                                  />
                                </div>
                              </div>
                              <div>
                                <Label className="text-xs font-medium">URLs de vídeos (gols, lances)</Label>
                                <div className="mt-1 space-y-1">
                                  {videoUrls.map((url, ui) => (
                                    <div key={ui} className="flex gap-2">
                                      <Input
                                        placeholder="https://..."
                                        className="h-8 flex-1"
                                        value={url}
                                        onChange={(e) => {
                                          const arr = [...videoUrls];
                                          arr[ui] = e.target.value;
                                          updateDetalhes({ videoUrls: arr });
                                        }}
                                      />
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive shrink-0"
                                        onClick={() =>
                                          updateDetalhes({ videoUrls: videoUrls.filter((_, i) => i !== ui) })
                                        }
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ))}
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateDetalhes({ videoUrls: [...videoUrls, ""] })}
                                  >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Adicionar vídeo
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </details>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </details>
        </div>
      </details>
    </div>
  );
}
