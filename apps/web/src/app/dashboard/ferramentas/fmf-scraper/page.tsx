"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Database, ExternalLink, Loader2, RefreshCw, AlertTriangle, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DashboardDeptHeader,
} from "@/components/dashboard/DashboardDeptHeader";
import { authFetch } from "@/lib/authFetch";
import { useAuth } from "@/context/AuthContext";

type FmfPreset = {
  key: string;
  fmfD: number;
  slug: string;
  name: string;
  fixtureCategory: string;
  sourceUrl: string;
};

type CategorySnapshot = {
  preset: string;
  name: string;
  fmfD: number;
  fetchedAt: string;
  parsed: number;
  scheduled: number;
  finished: number;
  sourceUrl: string;
  upcoming: Array<{
    matchDate: string | null;
    kickoffTime: string | null;
    homeName: string;
    awayName: string;
    roundNumber: number | null;
  }>;
  recentResults: Array<{
    matchDate: string | null;
    homeName: string;
    awayName: string;
    homeGoals: number | null;
    awayGoals: number | null;
  }>;
  standings: Array<{
    time: string;
    pontos: number;
    jogos: number;
    vitorias: number;
    empates: number;
    derrotas: number;
    saldoGols: number;
  }>;
};

type FmfStatus = {
  updatedAt: string;
  lastRunOk: boolean;
  lastRunError?: string | null;
  busy: boolean;
  categories: Record<string, CategorySnapshot>;
};

type SyncCandidate = {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  hasPage: boolean;
  fmfTeamNames: string[];
  matchCountByPreset: Record<string, number>;
  totalMatches: number;
  missingLogosPreview: string[];
};

type SyncTenantResult = {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  ok: boolean;
  error?: string;
  skipped?: string;
  fixturesUpdated: number;
  resultadosUpdated: number;
  tabelaRowsUpdated: number;
  missingLogos: string[];
  categoriesSynced: string[];
};

type SyncResult = {
  syncedAt: string;
  tenants: SyncTenantResult[];
};

function formatDateTime(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

function formatMatchDate(d: string | null, t: string | null): string {
  if (!d) return "—";
  const time = t?.slice(0, 5) ?? "";
  return time ? `${d.split("-").reverse().join("/")} ${time}` : d.split("-").reverse().join("/");
}

export default function FmfScraperPage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();
  const [presets, setPresets] = useState<FmfPreset[]>([]);
  const [status, setStatus] = useState<FmfStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<SyncCandidate[]>([]);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<SyncResult | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const canView = canAccessModule("fmf_scraper");

  const load = useCallback(async () => {
    setError(null);
    try {
      const [presetsRes, statusRes, candidatesRes, syncConfigRes] = await Promise.all([
        authFetch("/api/fmf-scraper/presets"),
        authFetch("/api/fmf-scraper/status"),
        authFetch("/api/fmf-scraper/sync/candidates"),
        authFetch("/api/fmf-scraper/sync/config"),
      ]);
      if (presetsRes.ok) setPresets(await presetsRes.json());
      if (statusRes.ok) setStatus(await statusRes.json());
      if (candidatesRes.ok) setCandidates(await candidatesRes.json());
      if (syncConfigRes.ok) {
        const cfg = await syncConfigRes.json();
        if (cfg?.lastResults) setLastSync(cfg.lastResults);
      }
    } catch {
      setError("Erro ao carregar dados FMF.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !canView) {
      router.replace("/403");
      return;
    }
    if (canView) load();
  }, [authLoading, canView, load, router]);

  const handleRun = async (opts: { preset?: string; all?: boolean }) => {
    setRunning(opts.all ? "all" : (opts.preset ?? "all"));
    setError(null);
    try {
      const res = await authFetch("/api/fmf-scraper/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opts),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.message === "string" ? data.message : data.error ?? "Falha na importação.");
        return;
      }
      if (data.store) setStatus({ ...data.store, busy: false });
      else await load();
    } catch {
      setError("Erro ao importar da FMF.");
    } finally {
      setRunning(null);
    }
  };

  const handleSync = async (opts: { tenantId?: string; all?: boolean }) => {
    setSyncing(opts.all ? "all" : (opts.tenantId ?? "all"));
    setSyncMessage(null);
    setError(null);
    try {
      const res = await authFetch("/api/fmf-scraper/sync/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opts),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.message === "string" ? data.message : data.error ?? "Falha ao aplicar no site.");
        return;
      }
      setLastSync({ syncedAt: data.syncedAt, tenants: data.tenants ?? [] });
      const missing = (data.tenants as SyncTenantResult[] | undefined)?.flatMap((t) => t.missingLogos ?? []) ?? [];
      const uniqueMissing = [...new Set(missing)];
      if (uniqueMissing.length > 0) {
        setSyncMessage(
          `Dados aplicados. ${uniqueMissing.length} time(s) sem logo cadastrado — cadastre em Cadastros → Times.`,
        );
      } else {
        setSyncMessage("Dados aplicados nos módulos Próximos jogos, Últimos resultados e Tabela.");
      }
      await load();
    } catch {
      setError("Erro ao aplicar dados no site.");
    } finally {
      setSyncing(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando…
      </div>
    );
  }

  if (!canView) return null;

  const categoryEntries = status?.categories ? Object.entries(status.categories) : [];

  return (
    <>
      <DashboardDeptHeader
        section="Ferramentas"
        sectionIcon={Database}
        title="Importação FMF"
        description="Próximos jogos, últimos resultados e tabela calculada a partir do site oficial da FMF. Atualização automática a cada 2 horas e opção de aplicar nos sites dos clubes."
        aside={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => handleSync({ all: true })}
              disabled={!!syncing || !!running || status?.busy || !status?.updatedAt}
            >
              {syncing === "all" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="mr-2 h-4 w-4" />
              )}
              Aplicar no site
            </Button>
            <Button
              onClick={() => handleRun({ all: true })}
              disabled={!!running || status?.busy || !!syncing}
            >
              {running === "all" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Atualizar tudo
            </Button>
          </div>
        }
      />

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {syncMessage && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {syncMessage}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aplicar nos sites dos clubes</CardTitle>
          <CardDescription>
            Liga os dados importados aos módulos Próximos jogos, Últimos resultados e Tabela de cada clube.
            Times adversários precisam estar em{" "}
            <a href="/dashboard/cadastros/times" className="underline hover:text-foreground">
              Cadastros → Times
            </a>{" "}
            para exibir a logo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum clube encontrado ou importe os dados FMF primeiro.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Clube</TableHead>
                    <TableHead>Página</TableHead>
                    <TableHead>Jogos FMF</TableHead>
                    <TableHead>Logos ausentes</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidates.map((c) => (
                    <TableRow key={c.tenantId}>
                      <TableCell>
                        <div className="font-medium">{c.tenantName}</div>
                        <div className="text-xs text-muted-foreground">{c.tenantSlug}</div>
                      </TableCell>
                      <TableCell>{c.hasPage ? "Sim" : "Não"}</TableCell>
                      <TableCell>
                        {c.totalMatches > 0 ? (
                          <span>{c.totalMatches} partida(s)</span>
                        ) : (
                          <span className="text-muted-foreground">Nenhuma (verifique nome na FMF)</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {c.missingLogosPreview.length > 0 ? (
                          <span className="inline-flex items-start gap-1 text-amber-400 text-xs">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                            {c.missingLogosPreview.slice(0, 4).join(", ")}
                            {c.missingLogosPreview.length > 4
                              ? ` +${c.missingLogosPreview.length - 4}`
                              : ""}
                          </span>
                        ) : c.totalMatches > 0 ? (
                          <span className="text-emerald-500 text-xs">OK</span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={
                            !c.hasPage ||
                            c.totalMatches === 0 ||
                            !!syncing ||
                            !status?.updatedAt
                          }
                          onClick={() => handleSync({ tenantId: c.tenantId })}
                        >
                          {syncing === c.tenantId ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Link2 className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Aplicar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {lastSync && lastSync.tenants.length > 0 && (
            <div className="text-xs text-muted-foreground border-t border-border pt-3">
              Última aplicação: {formatDateTime(lastSync.syncedAt)}
              {" · "}
              {lastSync.tenants.filter((t) => t.ok && !t.skipped).length} clube(s) atualizado(s)
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status</CardTitle>
          <CardDescription>
            Última execução: {formatDateTime(status?.updatedAt)}{" "}
            {status?.lastRunOk ? (
              <span className="text-emerald-500">· OK</span>
            ) : status?.updatedAt ? (
              <span className="text-destructive">· com erro</span>
            ) : null}
            {status?.lastRunError ? (
              <span className="block mt-1 text-destructive">{status.lastRunError}</span>
            ) : null}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {presets.map((p) => {
          const snap = status?.categories?.[p.key];
          return (
            <Card key={p.key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base leading-snug">{p.name}</CardTitle>
                <CardDescription>
                  <code className="text-xs">d={p.fmfD}</code>
                  {" · "}
                  {snap
                    ? `${snap.parsed} jogos · ${snap.scheduled} próx. · ${snap.finished} fin.`
                    : "Ainda não importado"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!!running || status?.busy}
                  onClick={() => handleRun({ preset: p.key })}
                >
                  {running === p.key ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Atualizar
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                    FMF
                  </a>
                </Button>
                {snap && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setExpanded(expanded === p.key ? null : p.key)}
                  >
                    {expanded === p.key ? "Ocultar" : "Ver dados"}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {categoryEntries.map(([key, cat]) =>
        expanded === key ? (
          <div key={key} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Próximos — {cat.name}</CardTitle>
                <CardDescription>Atualizado em {formatDateTime(cat.fetchedAt)}</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Casa</TableHead>
                      <TableHead>Visitante</TableHead>
                      <TableHead>Rodada</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cat.upcoming.slice(0, 15).map((m, i) => (
                      <TableRow key={i}>
                        <TableCell>{formatMatchDate(m.matchDate, m.kickoffTime)}</TableCell>
                        <TableCell>{m.homeName}</TableCell>
                        <TableCell>{m.awayName}</TableCell>
                        <TableCell>{m.roundNumber ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Últimos resultados — {cat.name}</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Placar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cat.recentResults.slice(0, 15).map((m, i) => (
                      <TableRow key={i}>
                        <TableCell>{formatMatchDate(m.matchDate, null)}</TableCell>
                        <TableCell>
                          {m.homeName} {m.homeGoals} × {m.awayGoals} {m.awayName}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Classificação (calculada) — {cat.name}</CardTitle>
                <CardDescription>Com base nos jogos finalizados importados da FMF</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>P</TableHead>
                      <TableHead>J</TableHead>
                      <TableHead>V</TableHead>
                      <TableHead>E</TableHead>
                      <TableHead>D</TableHead>
                      <TableHead>SG</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cat.standings.map((row, i) => (
                      <TableRow key={row.time}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell>{row.time}</TableCell>
                        <TableCell>{row.pontos}</TableCell>
                        <TableCell>{row.jogos}</TableCell>
                        <TableCell>{row.vitorias}</TableCell>
                        <TableCell>{row.empates}</TableCell>
                        <TableCell>{row.derrotas}</TableCell>
                        <TableCell>{row.saldoGols}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        ) : null,
      )}
    </>
  );
}
