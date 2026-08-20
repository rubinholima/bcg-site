"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Link2, UserPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeedbackModal, type FeedbackVariant } from "@/components/ui/feedback-modal";
import { Input } from "@/components/ui/input";
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
import type {
  FmfCadastroPendenciesReport,
  FmfCadastroPendencyItem,
} from "@/lib/fmf-cadastro-pendencies.types";
import { useFutebolRelatorioTenants } from "./futebol-relatorio-shared";

function formatDateTime(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function itemMatchesSearch(item: FmfCadastroPendencyItem, query: string): boolean {
  if (!query) return true;
  const haystack = [
    item.sourceName,
    item.cbfRegistration,
    item.reason,
    item.fixHint,
    ...item.candidatePlayers.map((player) => player.name),
    ...item.candidatePlayers.map((player) => player.cbfRegistration ?? ""),
  ]
    .filter(Boolean)
    .join(" ");
  return normalizeSearch(haystack).includes(query);
}

function apiErrorMessage(e: unknown, fallback: string): string {
  const msg =
    e && typeof e === "object" && "response" in e
      ? (e as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
      : null;
  if (Array.isArray(msg)) return msg.join(", ");
  if (typeof msg === "string" && msg.trim()) return msg;
  return fallback;
}

type PlayerOption = { id: string; name: string; category: string | null };

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
  const [search, setSearch] = useState("");
  const [linkPlayerByKey, setLinkPlayerByKey] = useState<Record<string, string>>({});
  const [linkingKey, setLinkingKey] = useState<string | null>(null);
  const [playerSearchByKey, setPlayerSearchByKey] = useState<Record<string, string>>({});
  const [playerOptionsByKey, setPlayerOptionsByKey] = useState<Record<string, PlayerOption[]>>({});
  const [feedback, setFeedback] = useState<{
    open: boolean;
    variant: FeedbackVariant;
    title: string;
    message: string;
  }>({ open: false, variant: "info", title: "", message: "" });

  useEffect(() => {
    if (initialTenantId) setTenantId(initialTenantId);
  }, [initialTenantId]);

  useEffect(() => {
    if (tenants.length === 1 && !tenantId) {
      setTenantId(tenants[0]!.id);
    }
  }, [tenantId, tenants]);

  const loadReport = useCallback(async (id: string) => {
    setLoadingReport(true);
    setError(null);
    try {
      const { data } = await api.get<FmfCadastroPendenciesReport>(
        `/futebol-relatorios/fmf-cadastro-pendencies?tenantId=${encodeURIComponent(id)}`,
      );
      setReport(data);
      setLinkPlayerByKey((prev) => {
        const next = { ...prev };
        for (const item of data.items) {
          if (!next[item.key] && item.candidatePlayers.length === 1) {
            next[item.key] = item.candidatePlayers[0]!.id;
          }
        }
        return next;
      });
    } catch (e: unknown) {
      setError(apiErrorMessage(e, "Erro ao carregar pendências de cadastro."));
      setReport(null);
    } finally {
      setLoadingReport(false);
    }
  }, []);

  useEffect(() => {
    if (!tenantId) {
      setReport(null);
      return;
    }
    void loadReport(tenantId);
  }, [tenantId, loadReport]);

  const summary = useMemo(() => {
    if (!report) return null;
    return `${report.totals.pendingGroups} atleta(s) · ${report.totals.affectedMatches} jogo(s)`;
  }, [report]);

  const searchQuery = useMemo(() => normalizeSearch(search), [search]);

  const filteredItems = useMemo(() => {
    if (!report) return [];
    return report.items.filter((item) => itemMatchesSearch(item, searchQuery));
  }, [report, searchQuery]);

  const searchPlayers = async (itemKey: string, term: string) => {
    if (!tenantId || term.trim().length < 2) {
      setPlayerOptionsByKey((prev) => ({ ...prev, [itemKey]: [] }));
      return;
    }
    try {
      const params = new URLSearchParams({
        tenantId,
        search: term.trim(),
      });
      const { data } = await api.get<PlayerOption[]>(`/players?${params.toString()}`);
      const list = Array.isArray(data) ? data : [];
      setPlayerOptionsByKey((prev) => ({
        ...prev,
        [itemKey]: list.slice(0, 20).map((row) => ({
          id: row.id,
          name: row.name,
          category: row.category ?? null,
        })),
      }));
    } catch {
      setPlayerOptionsByKey((prev) => ({ ...prev, [itemKey]: [] }));
    }
  };

  const handleLink = async (item: FmfCadastroPendencyItem) => {
    const playerId = linkPlayerByKey[item.key]?.trim();
    if (!tenantId || !playerId) {
      setFeedback({
        open: true,
        variant: "error",
        title: "Selecione o atleta",
        message: "Escolha o atleta do cadastro para vincular à súmula.",
      });
      return;
    }
    setLinkingKey(item.key);
    try {
      const { data } = await api.post<{ linkedMatches: number; playerName: string }>(
        "/futebol-relatorios/fmf-cadastro-pendencies/link",
        {
          tenantId,
          playerId,
          cbfRegistration: item.cbfRegistration || undefined,
          sourceName: item.sourceName,
        },
      );
      setFeedback({
        open: true,
        variant: "success",
        title: "Vínculo feito",
        message: `${data.playerName} vinculado em ${data.linkedMatches} súmula(s). Gere o relatório de cartões de novo.`,
      });
      await loadReport(tenantId);
    } catch (e: unknown) {
      setFeedback({
        open: true,
        variant: "error",
        title: "Não foi possível vincular",
        message: apiErrorMessage(e, "Erro ao vincular atleta à súmula."),
      });
    } finally {
      setLinkingKey(null);
    }
  };

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

              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-2">
                  <Label htmlFor="pendencias-search">Buscar</Label>
                  <Input
                    id="pendencias-search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Nome ou CBF…"
                    className="min-h-11 max-w-md text-foreground"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  disabled={loadingReport}
                  onClick={() => {
                    if (tenantId) void loadReport(tenantId);
                  }}
                >
                  {loadingReport ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Atualizar lista
                </Button>
              </div>

              {filteredItems.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nenhum resultado para &quot;{search.trim()}&quot;.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Atleta (FMF)</TableHead>
                        <TableHead>CBF</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead>Jogos</TableHead>
                        <TableHead>Vincular à súmula</TableHead>
                        <TableHead className="text-right">Cadastro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => {
                        const actions = resolveCadastroPendencyActions(report.tenantId, item);
                        const candidateOptions = item.candidatePlayers.map((player) => ({
                          value: player.id,
                          label: `${player.name}${player.category ? ` (${player.category})` : ""}`,
                        }));
                        const searched = playerOptionsByKey[item.key] ?? [];
                        const searchOptions = searched
                          .filter((p) => !item.candidatePlayers.some((c) => c.id === p.id))
                          .map((player) => ({
                            value: player.id,
                            label: `${player.name}${player.category ? ` (${player.category})` : ""}`,
                          }));
                        const options = [
                          { value: "", label: "Selecione o atleta…" },
                          ...candidateOptions,
                          ...searchOptions,
                        ];

                        return (
                          <TableRow key={item.key}>
                            <TableCell>
                              <div className="font-medium">{item.sourceName || "—"}</div>
                              <div className="mt-1 text-xs text-muted-foreground">{item.fixHint}</div>
                            </TableCell>
                            <TableCell>{item.cbfRegistration || "—"}</TableCell>
                            <TableCell className="max-w-56 text-sm text-amber-300">
                              {item.reason}
                            </TableCell>
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
                            <TableCell className="min-w-[220px]">
                              <div className="space-y-2">
                                {item.candidatePlayers.length === 0 ? (
                                  <Input
                                    value={playerSearchByKey[item.key] ?? ""}
                                    onChange={(event) => {
                                      const value = event.target.value;
                                      setPlayerSearchByKey((prev) => ({
                                        ...prev,
                                        [item.key]: value,
                                      }));
                                      void searchPlayers(item.key, value);
                                    }}
                                    placeholder="Buscar atleta…"
                                    className="min-h-11 text-foreground"
                                  />
                                ) : null}
                                <NativeSelectField
                                  value={linkPlayerByKey[item.key] ?? ""}
                                  onChange={(event) =>
                                    setLinkPlayerByKey((prev) => ({
                                      ...prev,
                                      [item.key]: event.target.value,
                                    }))
                                  }
                                  options={options}
                                  className="min-h-11"
                                />
                                <Button
                                  size="sm"
                                  className="min-h-11 w-full"
                                  disabled={linkingKey === item.key}
                                  onClick={() => void handleLink(item)}
                                >
                                  {linkingKey === item.key ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <Link2 className="mr-2 h-4 w-4" />
                                  )}
                                  Vincular
                                </Button>
                              </div>
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
              )}
            </>
          ) : null}
        </CardContent>
      </Card>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((prev) => ({ ...prev, open }))}
        variant={feedback.variant}
        title={feedback.title}
        message={feedback.message}
      />
    </div>
  );
}
