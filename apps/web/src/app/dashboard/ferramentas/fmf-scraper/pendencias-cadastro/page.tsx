"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Database,
  Loader2,
  UserPen,
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
import { DashboardDeptHeader } from "@/components/dashboard/DashboardDeptHeader";
import { NativeSelect } from "@/components/ui/native-select";
import { useAuth } from "@/context/AuthContext";
import { authFetch } from "@/lib/authFetch";
import { resolveCadastroPendencyActions } from "@/lib/fmf-cadastro-pendencies";
import type { FmfCadastroPendenciesReport } from "@/lib/fmf-cadastro-pendencies.types";

type SyncCandidate = {
  tenantId: string;
  tenantName: string;
};

function formatDateTime(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

export default function FmfCadastroPendenciesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canAccessModule, loading: authLoading } = useAuth();
  const canView = canAccessModule("fmf_scraper");

  const [candidates, setCandidates] = useState<SyncCandidate[]>([]);
  const [tenantId, setTenantId] = useState(() => searchParams.get("tenantId") ?? "");
  const [report, setReport] = useState<FmfCadastroPendenciesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCandidates = useCallback(async () => {
    try {
      const res = await authFetch("/api/fmf-scraper/sync/candidates");
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error();
      const list = Array.isArray(data) ? data : [];
      setCandidates(list);
      setTenantId((prev) => prev || list[0]?.tenantId || "");
    } catch {
      setError("Erro ao carregar clubes.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadReport = useCallback(async (selectedTenantId: string) => {
    if (!selectedTenantId) {
      setReport(null);
      return;
    }
    setLoadingReport(true);
    setError(null);
    try {
      const res = await authFetch(
        `/api/fmf-scraper/match-reports/cadastro-pendencies?tenantId=${encodeURIComponent(selectedTenantId)}`,
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof data?.message === "string" ? data.message : "Erro ao carregar pendências.");
        setReport(null);
        return;
      }
      setReport(data as FmfCadastroPendenciesReport);
    } catch {
      setError("Erro ao carregar pendências de cadastro.");
      setReport(null);
    } finally {
      setLoadingReport(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !canView) {
      router.replace("/403");
      return;
    }
    if (canView) void loadCandidates();
  }, [authLoading, canView, loadCandidates, router]);

  useEffect(() => {
    const fromUrl = searchParams.get("tenantId");
    if (fromUrl) setTenantId(fromUrl);
  }, [searchParams]);

  useEffect(() => {
    if (tenantId) void loadReport(tenantId);
  }, [loadReport, tenantId]);

  const summary = useMemo(() => {
    if (!report) return null;
    return `${report.totals.pendingGroups} atleta(s) · ${report.totals.affectedMatches} jogo(s)`;
  }, [report]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando…
      </div>
    );
  }

  if (!canView) return null;

  return (
    <>
      <DashboardDeptHeader
        section="Ferramentas"
        sectionIcon={Database}
        title="Pendências de cadastro — FMF"
        aside={
          <Button variant="outline" asChild className="min-h-11">
            <Link href="/dashboard/ferramentas/fmf-scraper">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Importação FMF
            </Link>
          </Button>
        }
      />

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Atletas para ajuste</CardTitle>
          <NativeSelect
            value={tenantId}
            onChange={(event) => setTenantId(event.target.value)}
            className="min-h-11 min-w-56"
          >
            <option value="">Selecione o clube</option>
            {candidates.map((candidate) => (
              <option key={candidate.tenantId} value={candidate.tenantId}>
                {candidate.tenantName}
              </option>
            ))}
          </NativeSelect>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingReport ? (
            <div className="flex min-h-28 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando pendências…
            </div>
          ) : !tenantId ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Selecione o clube.</p>
          ) : report && report.items.length === 0 ? (
            <p className="py-6 text-center text-sm text-emerald-400">
              Nenhuma pendência de cadastro nas súmulas importadas.
            </p>
          ) : report ? (
            <>
              <p className="text-sm text-muted-foreground">
                {summary}
                {" · "}
                Atualizado em {formatDateTime(report.generatedAt)}
              </p>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Atleta (FMF)</TableHead>
                      <TableHead>CBF</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Jogos</TableHead>
                      <TableHead className="text-right">Corrigir</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.items.map((item) => {
                      const actions = resolveCadastroPendencyActions(report.tenantId, item);
                      return (
                        <TableRow key={item.key}>
                          <TableCell>
                            <div className="font-medium">{item.sourceName || "—"}</div>
                            <div className="mt-1 text-xs text-muted-foreground">{item.fixHint}</div>
                          </TableCell>
                          <TableCell>{item.cbfRegistration || "—"}</TableCell>
                          <TableCell className="max-w-56 text-sm text-amber-300">{item.reason}</TableCell>
                          <TableCell>
                            <div className="text-sm">{item.matchCount}</div>
                            <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                              {item.matches.slice(0, 2).map((match) => (
                                <li key={match.externalMatchId}>
                                  <span className="uppercase">{match.category}</span>
                                  {" · "}
                                  {match.label}
                                  {match.reportUrl ? (
                                    <>
                                      {" · "}
                                      <a
                                        href={match.reportUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline"
                                      >
                                        Súmula
                                      </a>
                                    </>
                                  ) : null}
                                </li>
                              ))}
                              {item.matches.length > 2 ? (
                                <li>+ {item.matches.length - 2} jogo(s)</li>
                              ) : null}
                            </ul>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-stretch gap-2 sm:items-end">
                              {actions.map((action) => (
                                <Button
                                  key={`${item.key}-${action.href}`}
                                  size="sm"
                                  variant={action.variant ?? "outline"}
                                  className="min-h-11 justify-start sm:justify-center"
                                  asChild
                                >
                                  <Link href={action.href}>
                                    {action.variant === "default" ? (
                                      <UserPen className="mr-2 h-4 w-4" />
                                    ) : null}
                                    {action.label}
                                  </Link>
                                </Button>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
