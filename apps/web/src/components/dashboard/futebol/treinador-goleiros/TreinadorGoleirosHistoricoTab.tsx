"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Mail, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelectField } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";
import type { GkConsolidatedHistory, GkContextResponse } from "@/lib/treinador-goleiros-types";
import { printTrainingPeriodReport } from "@/lib/treinadores-treinos-print";
import type { CoachTrainingPeriodReport } from "@/lib/treinadores-types";
import { distributeGkReport } from "@/lib/treinador-goleiros-distribute";
import { getPublicImageUrl } from "@/lib/media-url";

interface Props {
  tenantId: string;
  category?: string;
  context: GkContextResponse | null;
}

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 90);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(to) };
}

export function TreinadorGoleirosHistoricoTab({ tenantId, category, context }: Props) {
  const range = useMemo(() => defaultRange(), []);
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);
  const [playerId, setPlayerId] = useState("");
  const [onlyCross, setOnlyCross] = useState(false);
  const [history, setHistory] = useState<GkConsolidatedHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [distributing, setDistributing] = useState(false);
  const [feedback, setFeedback] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: "",
  });

  const loadHistory = () => {
    if (!tenantId || !playerId) {
      setHistory(null);
      return;
    }
    setLoading(true);
    api
      .get<GkConsolidatedHistory>(`/treinador-goleiros/history/goalkeeper/${playerId}?tenantId=${tenantId}`)
      .then(({ data }) => setHistory(data))
      .catch(() => setHistory(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadHistory();
  }, [playerId, tenantId]);

  const trainingRows = useMemo(() => {
    if (!history) return [];
    return history.training.filter((t) => {
      if (t.sessionDate < from || t.sessionDate > to) return false;
      if (onlyCross && !t.crossCategory) return false;
      if (category && t.sessionCategory !== category) return false;
      return true;
    });
  }, [history, from, to, onlyCross, category]);

  const analysisRows = useMemo(() => {
    if (!history) return [];
    return history.matchAnalyses.filter((a) => {
      const d = a.matchDate?.slice(0, 10);
      if (!d || d < from || d > to) return false;
      return true;
    });
  }, [history, from, to]);

  const handlePrintPeriod = async () => {
    if (!tenantId) return;
    setPrinting(true);
    try {
      const params = new URLSearchParams({ tenantId, from, to });
      if (category) params.set("category", category);
      const { data } = await api.get<CoachTrainingPeriodReport>(`/treinador-goleiros/reports/period?${params}`);
      printTrainingPeriodReport(data);
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Falha ao imprimir.",
      });
    } finally {
      setPrinting(false);
    }
  };

  const handleDistributePeriod = async () => {
    if (!tenantId) return;
    setDistributing(true);
    try {
      const summary = `Relatório período GK ${from} a ${to}${category ? ` · ${category}` : ""}`;
      const res = await distributeGkReport({
        tenantId,
        kind: "period_report",
        referenceId: `${from}_${to}`,
        summary,
      });
      setFeedback({
        open: true,
        title: "Enviado",
        message: `Enviado para ${res?.recipientCount ?? "destinatários autorizados"}.`,
      });
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Falha ao enviar.",
      });
    } finally {
      setDistributing(false);
    }
  };

  const handleDistributeGoalkeeper = async () => {
    if (!tenantId || !playerId) return;
    setDistributing(true);
    try {
      const name = history?.player.name ?? playerId;
      const res = await distributeGkReport({
        tenantId,
        kind: "goalkeeper_report",
        referenceId: playerId,
        summary: `Histórico goleiro — ${name}`,
      });
      setFeedback({
        open: true,
        title: "Enviado",
        message: `Enviado para ${res?.recipientCount ?? "destinatários autorizados"}.`,
      });
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Falha ao enviar.",
      });
    } finally {
      setDistributing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>De</Label>
            <Input
              type="date"
              className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Até</Label>
            <Input
              type="date"
              className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Goleiro</Label>
            <NativeSelectField
              value={playerId}
              onChange={(e) => setPlayerId(e.target.value)}
              placeholder="Selecione…"
              options={(context?.players ?? []).map((p) => ({ value: p.id, label: p.name }))}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={onlyCross} onChange={(e) => setOnlyCross(e.target.checked)} />
            Só cross-category
          </label>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={handlePrintPeriod} disabled={printing}>
          {printing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Printer className="mr-1 h-4 w-4" />}
          Relatório do período
        </Button>
        <Button type="button" variant="outline" onClick={handleDistributePeriod} disabled={distributing}>
          {distributing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Mail className="mr-1 h-4 w-4" />}
          Enviar período
        </Button>
        {playerId ? (
          <Button type="button" variant="outline" onClick={handleDistributeGoalkeeper} disabled={distributing}>
            <Mail className="mr-1 h-4 w-4" />
            Enviar histórico do goleiro
          </Button>
        ) : null}
      </div>

      {loading ? (
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
      ) : !playerId ? (
        <p className="text-sm text-muted-foreground">Selecione um goleiro para ver o histórico consolidado.</p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Treinos específicos</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Categoria treino</TableHead>
                    <TableHead>Categoria atleta</TableHead>
                    <TableHead>Cross</TableHead>
                    <TableHead>Nota</TableHead>
                    <TableHead>PDF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trainingRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-muted-foreground">
                        Nenhum registro no filtro.
                      </TableCell>
                    </TableRow>
                  ) : (
                    trainingRows.map((t) => (
                      <TableRow key={t.sessionId}>
                        <TableCell>{formatDateDayMonYear(new Date(`${t.sessionDate}T12:00:00`))}</TableCell>
                        <TableCell>{t.sessionCategory ?? "—"}</TableCell>
                        <TableCell>{t.playerCategory ?? "—"}</TableCell>
                        <TableCell>{t.crossCategoryLabel ?? "—"}</TableCell>
                        <TableCell>{t.rating ?? "—"}</TableCell>
                        <TableCell>
                          {t.attachments[0] ? (
                            <a
                              className="text-primary underline"
                              href={getPublicImageUrl(t.attachments[0].fileUrl) || t.attachments[0].fileUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              PDF
                            </a>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Análises de jogo</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Adversário</TableHead>
                    <TableHead>Vídeo</TableHead>
                    <TableHead>PDF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analysisRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground">
                        Nenhuma análise no filtro.
                      </TableCell>
                    </TableRow>
                  ) : (
                    analysisRows.map((a) => (
                      <TableRow key={a.analysisId}>
                        <TableCell>
                          {a.matchDate ? formatDateDayMonYear(new Date(a.matchDate)) : "—"}
                        </TableCell>
                        <TableCell>{a.opponentName ?? "—"}</TableCell>
                        <TableCell>
                          {a.highlightsVideoUrl ? (
                            <a href={a.highlightsVideoUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                              YouTube
                            </a>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          {a.attachments[0] ? (
                            <a
                              className="text-primary underline"
                              href={getPublicImageUrl(a.attachments[0].fileUrl) || a.attachments[0].fileUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              PDF
                            </a>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
      />
    </div>
  );
}
