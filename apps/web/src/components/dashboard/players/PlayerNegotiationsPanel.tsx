"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, ExternalLink, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
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
import {
  formatNegotiationMoney,
  INSTALLMENT_STATUS_LABELS,
  NEGOTIATION_STATUS_LABELS,
  NEGOTIATION_TYPE_LABELS,
} from "@/lib/player-negotiation-labels";

type NegotiationRow = {
  id: string;
  negotiationType: string;
  status: string;
  counterpartyName: string;
  totalValue: number | null;
  currency: string;
  negotiatedPercentage: number | null;
  retainedPercentage: number | null;
  negotiatedAt: string | null;
  installments: Array<{
    id: string;
    sequence: number;
    amount: number;
    dueDate: string;
    status: string;
    computedStatus: string;
    financeiroLancamentoId: string | null;
  }>;
  documents: Array<{ id: string; name: string; fileUrl: string }>;
  auditLogs: Array<{
    id: string;
    at: string;
    userName: string | null;
    action: string;
    details: unknown;
  }>;
};

interface PlayerNegotiationsPanelProps {
  playerId: string;
}

export function PlayerNegotiationsPanel({ playerId }: PlayerNegotiationsPanelProps) {
  const [rows, setRows] = useState<NegotiationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<NegotiationRow[]>(`/player-negotiations/by-player/${playerId}`);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar negociações.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Carregando…
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-destructive">{error}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {rows.length === 0
            ? "Nenhuma negociação registrada para este atleta."
            : `${rows.length} negociação(ões) — histórico completo preservado.`}
        </p>
        <Link href="/dashboard/cadastros/jogadores/negociados">
          <Button variant="outline" size="sm" className="min-h-[44px]">
            <ExternalLink className="mr-2 h-4 w-4" />
            Atletas negociados
          </Button>
        </Link>
      </div>

      {rows.length > 0 && (
        <Card className="overflow-hidden border-border/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Histórico de negociações</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0 sm:p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Contraparte</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="hidden md:table-cell">Data</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((n) => {
                  const open = expandedId === n.id;
                  return (
                    <Fragment key={n.id}>
                      <TableRow>
                        <TableCell className="text-sm">
                          {NEGOTIATION_TYPE_LABELS[n.negotiationType] ?? n.negotiationType}
                        </TableCell>
                        <TableCell className="text-sm">
                          {NEGOTIATION_STATUS_LABELS[n.status] ?? n.status}
                        </TableCell>
                        <TableCell className="max-w-[140px] truncate text-sm sm:max-w-none">
                          {n.counterpartyName}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatNegotiationMoney(n.totalValue, n.currency)}
                        </TableCell>
                        <TableCell className="hidden text-sm md:table-cell">
                          {n.negotiatedAt ? n.negotiatedAt.slice(0, 10) : "—"}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="min-h-[44px] min-w-[44px]"
                            onClick={() => setExpandedId(open ? null : n.id)}
                            aria-label={open ? "Recolher detalhes" : "Ver detalhes"}
                          >
                            {open ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                      {open && (
                        <TableRow className="bg-muted/20">
                          <TableCell colSpan={6} className="p-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div>
                                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                                  Parcelas
                                </p>
                                {n.installments.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">Sem parcelas.</p>
                                ) : (
                                  <ul className="space-y-1 text-sm">
                                    {n.installments.map((i) => (
                                      <li key={i.id} className="flex justify-between gap-2">
                                        <span>
                                          #{i.sequence} —{" "}
                                          {INSTALLMENT_STATUS_LABELS[i.computedStatus] ??
                                            i.computedStatus}
                                        </span>
                                        <span>
                                          {formatNegotiationMoney(i.amount, n.currency)} ·{" "}
                                          {i.dueDate.slice(0, 10)}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                              <div>
                                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                                  Auditoria
                                </p>
                                <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
                                  {(n.auditLogs ?? []).slice(0, 12).map((log) => (
                                    <li key={log.id} className="text-muted-foreground">
                                      <span className="text-foreground">{log.action}</span>
                                      {" · "}
                                      {new Date(log.at).toLocaleString("pt-BR")}
                                      {log.userName ? ` · ${log.userName}` : ""}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              {n.documents.length > 0 && (
                                <div className="md:col-span-2">
                                  <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                                    Documentos
                                  </p>
                                  <ul className="flex flex-wrap gap-2">
                                    {n.documents.map((d) => (
                                      <li key={d.id}>
                                        <a
                                          href={d.fileUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-sm text-violet-400 underline-offset-2 hover:underline"
                                        >
                                          {d.name}
                                        </a>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
