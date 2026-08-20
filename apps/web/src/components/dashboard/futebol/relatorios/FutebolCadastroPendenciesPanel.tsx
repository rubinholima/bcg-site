"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Loader2, UserPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NativeSelectField } from "@/components/ui/native-select";
import { api } from "@/lib/api";
import { resolveCadastroPendencyActions } from "@/lib/fmf-cadastro-pendencies";
import type { FmfCadastroPendenciesReport } from "@/lib/fmf-cadastro-pendencies.types";
import { useFutebolRelatorioTenants } from "./futebol-relatorio-shared";

function formatDateTime(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

type FutebolCadastroPendenciesPanelProps = {
  initialTenantId?: string;
};

export function FutebolCadastroPendenciesPanel({
  initialTenantId = "",
}: FutebolCadastroPendenciesPanelProps) {
  const { tenants, loading: loadingTenants } = useFutebolRelatorioTenants();
  const [tenantId, setTenantId] = useState(initialTenantId);
  const [report, setReport] = useState<FmfCadastroPendenciesReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialTenantId) setTenantId(initialTenantId);
  }, [initialTenantId]);

  useEffect(() => {
    if (tenants.length === 1 && !tenantId) {
      setTenantId(tenants[0]!.id);
    }
  }, [tenantId, tenants]);

  useEffect(() => {
    if (!tenantId) {
      setReport(null);
      return;
    }

    let cancelled = false;
    setLoadingReport(true);
    setError(null);

    api
      .get<FmfCadastroPendenciesReport>(
        `/futebol-relatorios/fmf-cadastro-pendencies?tenantId=${encodeURIComponent(tenantId)}`,
      )
      .then(({ data }) => {
        if (cancelled) return;
        setReport(data);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const msg =
          e && typeof e === "object" && "response" in e
            ? (e as { response?: { data?: { message?: string | string[] } } }).response?.data
                ?.message
            : null;
        const detail = Array.isArray(msg) ? msg.join(", ") : typeof msg === "string" ? msg : null;
        setError(detail ?? "Erro ao carregar pendências de cadastro.");
        setReport(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingReport(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const summary = useMemo(() => {
    if (!report) return null;
    return `${report.totals.pendingGroups} atleta(s) · ${report.totals.affectedMatches} jogo(s)`;
  }, [report]);

  if (loadingTenants) {
    return (
      <div className="flex min-h-28 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Carregando clubes…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Atletas para ajuste</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Clube</Label>
            <NativeSelectField
              value={tenantId}
              onChange={(event) => setTenantId(event.target.value)}
              placeholder="Selecione o clube"
              className="min-h-11 max-w-md"
              options={tenants.map((tenant) => ({ value: tenant.id, label: tenant.name }))}
            />
          </div>

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
    </div>
  );
}
