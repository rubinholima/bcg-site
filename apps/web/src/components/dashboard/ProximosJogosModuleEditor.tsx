"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { CalendarIcon, Loader2, Plus, Trash2 } from "lucide-react";
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
import { SelectWithCreate } from "@/components/dashboard/SelectWithCreate";
import { authFetch } from "@/lib/authFetch";
import { FIXTURE_CATEGORIES, getCategoryLabel } from "@/lib/fixture-categories";
import type { CompetitionFormat } from "@/lib/competition-formats";
import { CompetitionFormatFixturesGuide } from "@/components/dashboard/CompetitionFormatFixturesGuide";

export interface ProximosJogosModuleEditorProps {
  block: HomeContentBlock;
  updateBlockConfigValue: (key: string, value: BlockConfigValue) => void;
  setError: (msg: string | null) => void;
  /** Página de clube: nome do mandante quando &quot;nosso time&quot; joga em casa. Em `mode: event` não é usado. */
  principalTeamName: string;
  publicSlug: string;
  /** Ex.: `/portfolio/slug` ou `/eventos/slug` */
  publicPreviewPath: string;
  linkedTenantId?: string | null;
  canSyncSheets: boolean;
  /** `event` = jogos do evento (dois times), sem conceito de &quot;nosso clube&quot;. */
  mode?: "club" | "event";
  /** Evento futebol: guia alinhado ao formato da disputa (cadastro do evento). */
  eventCategory?: string;
  competitionFormat?: CompetitionFormat | null;
  eventEditHref?: string;
  /** Modo evento: nome do evento (preenche competição nos jogos e export CSV; campo Competição some da UI). */
  eventDisplayName?: string;
}

export function ProximosJogosModuleEditor({
  block,
  updateBlockConfigValue,
  setError,
  principalTeamName,
  publicSlug,
  publicPreviewPath,
  linkedTenantId,
  canSyncSheets,
  mode = "club",
  eventCategory,
  competitionFormat,
  eventEditHref,
  eventDisplayName,
}: ProximosJogosModuleEditorProps) {
  const isEvent = mode === "event";
  const showFormatGuide =
    isEvent && eventCategory === "football" && Boolean(eventEditHref?.trim());
  const [syncing, setSyncing] = useState(false);
  const [openFixtureIndex, setOpenFixtureIndex] = useState<number | null>(null);
  const dateInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  return (
    <div className="space-y-3 sm:col-span-2">
      {showFormatGuide && eventEditHref && (
        <>
          {competitionFormat ? (
            <CompetitionFormatFixturesGuide format={competitionFormat} eventEditHref={eventEditHref} />
          ) : (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-muted-foreground space-y-2">
              <p>
                Defina o <strong>formato da disputa</strong> e a <strong>quantidade de clubes</strong> no cadastro do
                evento para ver aqui a referência de fases e confrontos (ex.: 8 times em eliminatória).
              </p>
              <Link href={eventEditHref} className="inline-block text-amber-300 underline">
                Cadastro do evento → Formato da disputa
              </Link>
            </div>
          )}
        </>
      )}
      <details className="rounded-lg border border-border bg-muted/20">
        <summary className="cursor-pointer px-3 py-2 font-medium">Espaço no topo e embaixo</summary>
        <div className="border-t border-border px-3 py-3 space-y-3">
          <p className="text-xs text-muted-foreground">
            Ajuste o tamanho do espaço vertical da seção Próximos Jogos.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Espaço no topo</Label>
              <Select
                value={(block.config?.proximosJogosPaddingTop as string) ?? "compact"}
                onValueChange={(v) => updateBlockConfigValue("proximosJogosPaddingTop", v)}
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
                value={(block.config?.proximosJogosPaddingBottom as string) ?? "compact"}
                onValueChange={(v) => updateBlockConfigValue("proximosJogosPaddingBottom", v)}
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
          <div className="space-y-2 pt-2">
            <Label>Carrossel full-bleed</Label>
            <Select
              value={(block.config?.fullBleedCarousel as boolean) === true ? "true" : "false"}
              onValueChange={(v) => updateBlockConfigValue("fullBleedCarousel", v === "true")}
            >
              <SelectTrigger className="max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="false">Não (com padding lateral)</SelectItem>
                <SelectItem value="true">Sim (encosta nas bordas do box azul)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Quando Sim, o carrossel ocupa toda a largura da coluna azul, sem espaço nas laterais.
            </p>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id={`pj-fullbleed-${block.id}`}
              checked={!!block.config?.fullBleedCarousel}
              onChange={(e) => updateBlockConfigValue("fullBleedCarousel", e.target.checked)}
            />
            <Label htmlFor={`pj-fullbleed-${block.id}`}>
              Carrossel full-bleed (encosta nas bordas do box azul)
            </Label>
          </div>
        </div>
      </details>
      <p className="text-xs text-muted-foreground">
        {isEvent
          ? "No evento, cada jogo é um confronto entre dois times (mandante × visitante). Fonte: manual, Google Sheets (mesma integração dos clubes — veja abaixo) ou AUTO (SofaScore), se houver clube vinculado ao evento com Team ID."
          : "Os jogos exibidos vêm da fonte escolhida abaixo. Fonte: Manual (lista editada) ou AUTO (SofaScore — exige clube com Team ID)."}
      </p>
      <div className="space-y-2">
        <Label>Fonte de dados</Label>
        <Select
          value={(block.config?.proximosJogosDataSource as string) ?? "manual"}
          onValueChange={(v) => updateBlockConfigValue("proximosJogosDataSource", v)}
        >
          <SelectTrigger className="w-full max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">Manual (lista editada)</SelectItem>
            <SelectItem value="sofascore">AUTO (SofaScore)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {(block.config?.proximosJogosDataSource as string) === "sofascore" && (
        <div className="space-y-2">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-sm">
            <p className="font-medium text-amber-800 dark:text-amber-200">Fonte: SofaScore (teamId do clube)</p>
            {linkedTenantId ? (
              <p className="mt-1 text-muted-foreground">
                Configure o SofaScore Team ID na edição do clube:{" "}
                <Link
                  href={`/dashboard/empresas/${linkedTenantId}/edit`}
                  className="underline text-amber-700 dark:text-amber-300"
                >
                  Empresas → [este clube] → Editar → SofaScore Team ID
                </Link>
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                Para puxar jogos pelo SofaScore, vincule este evento a um clube/empresa (organizador) e configure o Team ID na edição da empresa.
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Os próximos jogos serão buscados automaticamente. Use overrides abaixo para ocultar, destacar ou adicionar links (Assistir / Ingresso) por jogo.
            </p>
          </div>
          <div className="rounded-lg border border-amber-500/50 bg-amber-500/15 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
            <strong>Atenção:</strong> A API do SofaScore pode bloquear requisições de servidor (erro 403).
          </div>
        </div>
      )}
      <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Dados dinâmicos (Google Sheets)</p>
        <p className="text-xs text-muted-foreground">
          {isEvent ? (
            <>
              <strong>Não existe planilha separada só para evento.</strong> Usa a mesma integração{" "}
              <strong>Próximos jogos</strong> em <strong>Configurações → Integrações</strong>. Na planilha, cada linha
              deve ter o filtro com o valor <code className="text-xs">{publicSlug || "slug-do-evento"}</code> na coluna{" "}
              <strong>clube/slug</strong> (ou <strong>evento/slug</strong> / <strong>slug</strong> — o sistema lê os
              mesmos cabeçalhos). Assim convivem linhas de clubes (slug do clube) e de eventos (slug do evento) na mesma
              aba. A coluna <strong>competição</strong> pode ficar vazia ou repetir o nome do evento — no site o contexto
              exibido é o próprio evento.
            </>
          ) : (
            <>
              Planilha configurada em <strong>Configurações → Integrações</strong> (tipo <strong>Próximos jogos</strong>
              ). Use o botão abaixo para importar. Filtra pela coluna clube/slug com o slug desta página (
              <code className="text-xs">{publicSlug || "…"}</code>).
            </>
          )}
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={!canSyncSheets || syncing}
          onClick={() => {
            if (!canSyncSheets) return;
            setSyncing(true);
            authFetch("/api/integrations/sync", {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "proximos_jogos",
                slug: publicSlug || undefined,
              }),
            })
              .then((r) => {
                if (!r.ok)
                  return r.json().then((d) => Promise.reject(new Error((d as { error?: string })?.error ?? "Erro ao importar")));
                return r.json();
              })
              .then((data: { fixtures?: object[] }) => {
                setError(null);
                if (data.fixtures?.length) {
                  updateBlockConfigValue("proximosJogosManualFixtures", data.fixtures);
                } else if (Array.isArray(data.fixtures)) {
                  updateBlockConfigValue("proximosJogosManualFixtures", []);
                }
              })
              .catch((err) => setError(err instanceof Error ? err.message : "Erro ao importar da planilha"))
              .finally(() => setSyncing(false));
          }}
        >
          {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
          Atualizar com Google Sheets
        </Button>
        {((block.config?.proximosJogosManualFixtures as object[]) ?? []).length > 0 && (
          <div className="mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const fixtures = (block.config?.proximosJogosManualFixtures as Array<{
                  startISO?: string;
                  homeTeamName?: string;
                  awayTeamName?: string;
                  competitionName?: string;
                  venueName?: string;
                  watchUrl?: string;
                  ticketUrl?: string;
                  category?: string;
                  featured?: boolean;
                }>) ?? [];
                const currentSlug = publicSlug ?? "";
                const csvRows: string[] = [
                  "data,hora,clube/slug,time_casa,time_visitante,competicao,local,url_assistir,url_ingresso,categoria,destaque,logo_casa,logo_visitante,nosso_time",
                ];
                fixtures.forEach((f) => {
                  const d = f.startISO ? new Date(f.startISO) : null;
                  const date =
                    d && !Number.isNaN(d.getTime())
                      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
                      : "";
                  const time =
                    d && !Number.isNaN(d.getTime())
                      ? `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
                      : "";
                  csvRows.push(
                    [
                      date,
                      time,
                      currentSlug,
                      f.homeTeamName || "",
                      f.awayTeamName || "",
                      (isEvent ? (f.competitionName || eventDisplayName || "") : f.competitionName) || "",
                      f.venueName || "",
                      f.watchUrl || "",
                      f.ticketUrl || "",
                      f.category || "principal",
                      f.featured ? "sim" : "não",
                      (f as { homeTeamLogoUrl?: string }).homeTeamLogoUrl || "",
                      (f as { awayTeamLogoUrl?: string }).awayTeamLogoUrl || "",
                      (f as { isOurTeamHome?: boolean }).isOurTeamHome === true
                        ? "casa"
                        : (f as { isOurTeamHome?: boolean }).isOurTeamHome === false
                          ? "visitante"
                          : "",
                    ].join(","),
                  );
                });
                const csv = "\uFEFF" + csvRows.join("\n");
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                const link = document.createElement("a");
                const url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute("download", `proximos-jogos-export-${new Date().toISOString().slice(0, 10)}.csv`);
                link.style.visibility = "hidden";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
            >
              Exportar jogos cadastrados para CSV
            </Button>
          </div>
        )}
      </div>
      {(block.config?.proximosJogosDataSource as string) === "manual" && (
        <details className="rounded-lg border border-border bg-muted/20 mt-2">
          <summary className="cursor-pointer px-3 py-2 font-medium">Lista manual de jogos</summary>
          <div className="border-t border-border px-3 py-3 space-y-3">
            {publicSlug ? (
              <p className="text-xs text-muted-foreground">
                <Link
                  href={publicPreviewPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-primary"
                >
                  Ver na página pública →
                </Link>
              </p>
            ) : (
              <p className="text-xs text-amber-600">Defina o slug da página/evento para ver o preview.</p>
            )}
            {(
              (block.config?.proximosJogosManualFixtures as Array<{
                startISO?: string;
                homeTeamName?: string;
                awayTeamName?: string;
                competitionName?: string;
                venueName?: string;
                watchUrl?: string;
                ticketUrl?: string;
                isOurTeamHome?: boolean;
                homeTeamLogoUrl?: string;
                awayTeamLogoUrl?: string;
                category?: string;
              }>) ?? []
            ).map((f, fi) => {
              const fromISO = (iso: string | undefined) => {
                if (!iso?.trim()) return { date: "", time: "20:00" };
                const d = new Date(iso);
                if (Number.isNaN(d.getTime())) return { date: "", time: "20:00" };
                const pad = (n: number) => String(n).padStart(2, "0");
                return {
                  date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
                  time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
                };
              };
              const { date: dateVal, time: timeVal } = fromISO(f.startISO);
              const catLabel = getCategoryLabel((f as { category?: string }).category ?? "principal", "pt");
              const summaryText = dateVal
                ? `Jogo ${fi + 1}: ${catLabel} · ${f.homeTeamName || "Casa"} x ${f.awayTeamName || "Visitante"} — ${dateVal} ${timeVal}`
                : `Jogo ${fi + 1}: ${catLabel} · ${f.homeTeamName || "Casa"} x ${f.awayTeamName || "Visitante"} — (sem data)`;
              return (
                <details
                  key={fi}
                  className="rounded border border-amber-500/40 bg-amber-500/20"
                  open={fi === (openFixtureIndex ?? -1)}
                  onToggle={(e) => {
                    const el = e.currentTarget;
                    setOpenFixtureIndex(el.open ? fi : null);
                  }}
                >
                  <summary className="cursor-pointer px-3 py-2 font-medium hover:bg-amber-500/30 flex items-center justify-between gap-2">
                    <span>{summaryText}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/20"
                      title="Remover jogo"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const list = ((block.config?.proximosJogosManualFixtures as object[]) ?? []).filter((_, i) => i !== fi);
                        updateBlockConfigValue("proximosJogosManualFixtures", list);
                        setOpenFixtureIndex((prev) => (prev === fi ? null : prev !== null && prev > fi ? prev - 1 : prev));
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </summary>
                  <div className="rounded border-t border-border p-3 space-y-2 grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Data</Label>
                      <div className="flex gap-1">
                        <input
                          ref={(el) => {
                            dateInputRefs.current[fi] = el;
                          }}
                          type="date"
                          className="flex h-10 flex-1 min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          value={dateVal}
                          onChange={(e) => {
                            const date = e.target.value;
                            const list = [...((block.config?.proximosJogosManualFixtures as object[]) ?? [])];
                            const current = fromISO((list[fi] as Record<string, string>).startISO);
                            const iso = date && current.time ? new Date(`${date}T${current.time}`).toISOString() : "";
                            (list[fi] as Record<string, string>).startISO = iso;
                            updateBlockConfigValue("proximosJogosManualFixtures", list);
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 shrink-0"
                          title="Abrir calendário"
                          onClick={() => dateInputRefs.current[fi]?.showPicker?.()}
                        >
                          <CalendarIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Hora</Label>
                      <input
                        type="time"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={timeVal}
                        onChange={(e) => {
                          const time = e.target.value;
                          const list = [...((block.config?.proximosJogosManualFixtures as object[]) ?? [])];
                          const current = fromISO((list[fi] as Record<string, string>).startISO);
                          const date = current.date || new Date().toISOString().slice(0, 10);
                          const iso = time ? new Date(`${date}T${time}`).toISOString() : (list[fi] as Record<string, string>).startISO || "";
                          (list[fi] as Record<string, string>).startISO = iso;
                          updateBlockConfigValue("proximosJogosManualFixtures", list);
                        }}
                      />
                    </div>
                    {!isEvent && (
                      <div className="space-y-1">
                        <Label className="text-xs">Posição do time principal neste jogo</Label>
                        <Select
                          value={f.isOurTeamHome === false ? "away" : "home"}
                          onValueChange={(v) => {
                            const list = [...((block.config?.proximosJogosManualFixtures as object[]) ?? [])];
                            const row = list[fi] as Record<string, string | boolean | undefined>;
                            row.isOurTeamHome = v === "home";
                            if (v === "home") row.homeTeamName = principalTeamName;
                            else row.awayTeamName = principalTeamName;
                            updateBlockConfigValue("proximosJogosManualFixtures", list);
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="home">Casa (time principal é mandante)</SelectItem>
                            <SelectItem value="away">Visitante (time principal joga fora)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="space-y-1">
                      <Label className="text-xs">Categoria</Label>
                      <Select
                        value={(f as { category?: string }).category ?? "principal"}
                        onValueChange={(v) => {
                          const list = [...((block.config?.proximosJogosManualFixtures as object[]) ?? [])];
                          (list[fi] as Record<string, string>).category = v;
                          updateBlockConfigValue("proximosJogosManualFixtures", list);
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FIXTURE_CATEGORIES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.labelPT}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {!isEvent && (
                      <div className="space-y-1 sm:col-span-2">
                        <Label className="text-xs">Adversário (time da casa ou visitante)</Label>
                        <SelectWithCreate
                          type="visiting-team"
                          value={
                            f.isOurTeamHome === false ? (f.homeTeamName ?? "") : (f.awayTeamName ?? "")
                          }
                          logoUrl={
                            f.isOurTeamHome === false
                              ? ((f.homeTeamLogoUrl as string) ?? "")
                              : ((f.awayTeamLogoUrl as string) ?? "")
                          }
                          onChange={(name, logoUrl) => {
                            const list = [...((block.config?.proximosJogosManualFixtures as object[]) ?? [])];
                            const row = list[fi] as Record<string, string>;
                            if (f.isOurTeamHome === false) {
                              row.homeTeamName = name;
                              row.homeTeamLogoUrl = logoUrl ?? "";
                            } else {
                              row.awayTeamName = name;
                              row.awayTeamLogoUrl = logoUrl ?? "";
                            }
                            updateBlockConfigValue("proximosJogosManualFixtures", list);
                          }}
                          placeholder="Selecione o time adversário"
                        />
                      </div>
                    )}
                    {isEvent && (
                      <>
                        <div className="space-y-1 sm:col-span-2">
                          <Label className="text-xs">Time mandante (casa)</Label>
                          <SelectWithCreate
                            type="visiting-team"
                            value={f.homeTeamName ?? ""}
                            logoUrl={(f.homeTeamLogoUrl as string) ?? ""}
                            onChange={(name, logoUrl) => {
                              const list = [...((block.config?.proximosJogosManualFixtures as object[]) ?? [])];
                              const row = list[fi] as Record<string, string>;
                              row.homeTeamName = name;
                              row.homeTeamLogoUrl = logoUrl ?? "";
                              delete (row as { isOurTeamHome?: boolean }).isOurTeamHome;
                              updateBlockConfigValue("proximosJogosManualFixtures", list);
                            }}
                            placeholder="Time da casa"
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <Label className="text-xs">Time visitante</Label>
                          <SelectWithCreate
                            type="visiting-team"
                            value={f.awayTeamName ?? ""}
                            logoUrl={(f.awayTeamLogoUrl as string) ?? ""}
                            onChange={(name, logoUrl) => {
                              const list = [...((block.config?.proximosJogosManualFixtures as object[]) ?? [])];
                              const row = list[fi] as Record<string, string>;
                              row.awayTeamName = name;
                              row.awayTeamLogoUrl = logoUrl ?? "";
                              delete (row as { isOurTeamHome?: boolean }).isOurTeamHome;
                              updateBlockConfigValue("proximosJogosManualFixtures", list);
                            }}
                            placeholder="Time visitante"
                          />
                        </div>
                      </>
                    )}
                    {!isEvent && (
                      <div className="space-y-1">
                        <Label className="text-xs">Competição</Label>
                        <SelectWithCreate
                          type="championship"
                          value={f.competitionName ?? ""}
                          onChange={(name) => {
                            const list = [...((block.config?.proximosJogosManualFixtures as object[]) ?? [])];
                            (list[fi] as Record<string, string>).competitionName = name;
                            updateBlockConfigValue("proximosJogosManualFixtures", list);
                          }}
                          placeholder="Selecione a competição"
                        />
                      </div>
                    )}
                    <div className="space-y-1">
                      <Label className="text-xs">Local (opcional)</Label>
                      <SelectWithCreate
                        type="stadium"
                        value={f.venueName ?? ""}
                        onChange={(name) => {
                          const list = [...((block.config?.proximosJogosManualFixtures as object[]) ?? [])];
                          (list[fi] as Record<string, string>).venueName = name;
                          updateBlockConfigValue("proximosJogosManualFixtures", list);
                        }}
                        placeholder="Selecione o estádio"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">URL Assistir (opcional)</Label>
                      <Input
                        placeholder="URL Assistir (opcional)"
                        value={f.watchUrl ?? ""}
                        onChange={(e) => {
                          const list = [...((block.config?.proximosJogosManualFixtures as object[]) ?? [])];
                          (list[fi] as Record<string, string>).watchUrl = e.target.value;
                          updateBlockConfigValue("proximosJogosManualFixtures", list);
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">URL Ingresso (opcional)</Label>
                      <Input
                        placeholder="URL Ingresso (opcional)"
                        value={f.ticketUrl ?? ""}
                        onChange={(e) => {
                          const list = [...((block.config?.proximosJogosManualFixtures as object[]) ?? [])];
                          (list[fi] as Record<string, string>).ticketUrl = e.target.value;
                          updateBlockConfigValue("proximosJogosManualFixtures", list);
                        }}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          const list = ((block.config?.proximosJogosManualFixtures as object[]) ?? []).filter((_, i) => i !== fi);
                          updateBlockConfigValue("proximosJogosManualFixtures", list);
                        }}
                      >
                        Remover
                      </Button>
                    </div>
                  </div>
                </details>
              );
            })}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const manualList = (block.config?.proximosJogosManualFixtures as object[]) ?? [];
                const id = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
                const base = {
                  id,
                  startISO: "",
                  competitionName: "",
                  venueName: "",
                  watchUrl: "",
                  ticketUrl: "",
                  homeTeamLogoUrl: "",
                  awayTeamLogoUrl: "",
                  category: "principal",
                };
                const row = isEvent
                  ? {
                      ...base,
                      homeTeamName: "",
                      awayTeamName: "",
                      competitionName: eventDisplayName?.trim() ?? "",
                    }
                  : {
                      ...base,
                      homeTeamName: principalTeamName,
                      awayTeamName: "",
                      isOurTeamHome: true,
                    };
                const list = [...manualList, row];
                updateBlockConfigValue("proximosJogosManualFixtures", list);
                setOpenFixtureIndex(list.length - 1);
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> Adicionar jogo
            </Button>
          </div>
        </details>
      )}
    </div>
  );
}
