"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelectField } from "@/components/ui/native-select";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";
import { getPlayerListDisplayName } from "@/lib/player-display-name";
import type { CoachContextResponse, CoachMatchReport } from "@/lib/treinadores-types";
import { COACH_ATTACHMENT_KINDS } from "@/lib/treinadores-types";
import { TreinadoresMediaPicker } from "./TreinadoresMediaPicker";

type PlayerRatingDraft = {
  playerId: string;
  name: string;
  rating: string;
  individualReport: string;
};

type AttachmentDraft = {
  label: string;
  fileUrl: string;
  kind: string;
};

interface Props {
  tenantId: string;
  category?: string;
  contextLoading: boolean;
  context: CoachContextResponse | null;
}

function emptyDraft(players: CoachContextResponse["players"]): PlayerRatingDraft[] {
  return players.map((p) => ({
    playerId: p.id,
    name: getPlayerListDisplayName(p),
    rating: "",
    individualReport: "",
  }));
}

export function TreinadoresPosJogoTab({ tenantId, category, contextLoading, context }: Props) {
  const [reports, setReports] = useState<CoachMatchReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string>("");
  const [travelLogisticsId, setTravelLogisticsId] = useState("");
  const [fmfMatchReportId, setFmfMatchReportId] = useState("");
  const [selectedGameKey, setSelectedGameKey] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [opponentName, setOpponentName] = useState("");
  const [teamReport, setTeamReport] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");
  const [status, setStatus] = useState("rascunho");
  const [playerRatings, setPlayerRatings] = useState<PlayerRatingDraft[]>([]);
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const [feedback, setFeedback] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: "",
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const completedGames = useMemo(
    () => context?.completedGames ?? [],
    [context?.completedGames],
  );

  const gameOptions = useMemo(
    () =>
      completedGames.map((g) => ({
        value: g.gameKey,
        label: `${g.opponentName} · ${g.scoreLabel} · ${formatDateDayMonYear(new Date(g.matchDate))}`,
      })),
    [completedGames],
  );

  const loadReports = () => {
    if (!tenantId) return;
    setLoading(true);
    const params = new URLSearchParams({ tenantId });
    if (category) params.set("category", category);
    api
      .get<CoachMatchReport[]>(`/futebol-treinadores/match-reports?${params}`)
      .then(({ data }) => setReports(Array.isArray(data) ? data : []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadReports();
  }, [tenantId, category]);

  const resetForm = () => {
    setSelectedId("");
    setSelectedGameKey("");
    setTravelLogisticsId("");
    setFmfMatchReportId("");
    setMatchDate("");
    setOpponentName("");
    setTeamReport("");
    setGeneralNotes("");
    setStatus("rascunho");
    setPlayerRatings(emptyDraft(context?.players ?? []));
    setAttachments([]);
  };

  useEffect(() => {
    if (!selectedId) {
      setPlayerRatings(emptyDraft(context?.players ?? []));
      return;
    }
    api.get<CoachMatchReport>(`/futebol-treinadores/match-reports/${selectedId}`).then(({ data }) => {
      if (!data) return;
      setTravelLogisticsId(data.travelLogisticsId ?? "");
      setFmfMatchReportId(data.fmfMatchReportId ?? "");
      const gameKey =
        data.fmfMatchReportId
          ? `fmf:${data.fmfMatchReportId}`
          : data.travelLogisticsId
            ? `travel:${data.travelLogisticsId}`
            : "";
      setSelectedGameKey(gameKey);
      setMatchDate(data.matchDate ? data.matchDate.slice(0, 10) : "");
      setOpponentName(data.opponentName ?? "");
      setTeamReport(data.teamReport ?? "");
      setGeneralNotes(data.generalNotes ?? "");
      setStatus(data.status ?? "rascunho");
      const byId = new Map(data.playerRatings.map((r) => [r.playerId, r]));
      setPlayerRatings(
        emptyDraft(context?.players ?? []).map((p) => {
          const row = byId.get(p.playerId);
          return {
            ...p,
            rating: row?.rating != null ? String(row.rating) : "",
            individualReport: row?.individualReport ?? "",
          };
        }),
      );
      setAttachments(
        data.attachments.map((a) => ({
          label: a.label ?? "",
          fileUrl: a.fileUrl,
          kind: a.kind ?? "outro",
        })),
      );
    });
  }, [selectedId, context?.players]);

  const handleGameChange = (gameKey: string) => {
    setSelectedGameKey(gameKey);
    if (!gameKey) {
      setTravelLogisticsId("");
      setFmfMatchReportId("");
      return;
    }
    const game = completedGames.find((g) => g.gameKey === gameKey);
    if (!game) return;
    setTravelLogisticsId(game.travelLogisticsId ?? "");
    setFmfMatchReportId(game.fmfMatchReportId ?? "");
    setMatchDate(game.matchDate.slice(0, 10));
    setOpponentName(game.opponentName);
  };

  const handleSave = async () => {
    if (!tenantId) return;
    setSaving(true);
    try {
      const payload = {
        id: selectedId || undefined,
        tenantId,
        category: category || null,
        travelLogisticsId: travelLogisticsId || null,
        fmfMatchReportId: fmfMatchReportId || null,
        matchDate: matchDate || null,
        opponentName: opponentName || null,
        teamReport,
        generalNotes,
        status,
        playerRatings: playerRatings.map((p) => ({
          playerId: p.playerId,
          rating: p.rating === "" ? null : Number(p.rating),
          individualReport: p.individualReport || null,
        })),
        attachments: attachments.filter((a) => a.fileUrl.trim()),
      };
      const { data } = await api.post<CoachMatchReport>("/futebol-treinadores/match-reports", payload);
      if (data?.id) setSelectedId(data.id);
      loadReports();
      setFeedback({ open: true, title: "Salvo", message: "Relatório pós-jogo salvo." });
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível salvar.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/futebol-treinadores/match-reports/${deleteId}`);
      if (selectedId === deleteId) resetForm();
      loadReports();
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível excluir.",
      });
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      {contextLoading ? (
        <div className="lg:col-span-2 flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Relatórios</CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={resetForm}>
            <Plus className="mr-1 h-4 w-4" />
            Novo
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
          ) : reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum relatório ainda.</p>
          ) : (
            reports.map((r) => (
              <div
                key={r.id}
                className={`rounded-lg border p-3 text-sm ${selectedId === r.id ? "border-primary bg-primary/5" : "border-border/60"}`}
              >
                <button type="button" className="w-full text-left" onClick={() => setSelectedId(r.id)}>
                  <div className="font-medium">{r.opponentName ?? "Jogo"}</div>
                  <div className="text-muted-foreground">
                    {r.matchDate ? formatDateDayMonYear(new Date(r.matchDate)) : "—"} · {r.status}
                  </div>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-8 text-destructive"
                  onClick={() => setDeleteId(r.id)}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Excluir
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Relatório pós-jogo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Jogo</Label>
            <NativeSelectField
              value={selectedGameKey}
              onChange={(e) => handleGameChange(e.target.value)}
              placeholder={gameOptions.length === 0 ? "Nenhum jogo realizado — preencha manualmente" : "Selecione o jogo…"}
              options={gameOptions}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Adversário</Label>
              <Input value={opponentName} onChange={(e) => setOpponentName(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Relatório geral da equipe</Label>
            <Textarea rows={4} value={teamReport} onChange={(e) => setTeamReport(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Observações gerais</Label>
            <Textarea rows={3} value={generalNotes} onChange={(e) => setGeneralNotes(e.target.value)} />
          </div>

          <div className="space-y-3">
            <Label>Notas e relatório individual (0 a 5)</Label>
            {playerRatings.map((p, idx) => (
              <div key={p.playerId} className="rounded-lg border border-border/60 p-3 space-y-2">
                <div className="font-medium text-sm">{p.name}</div>
                <div className="grid gap-3 sm:grid-cols-[120px_minmax(0,1fr)]">
                  <Input
                    type="number"
                    min={0}
                    max={5}
                    step={0.5}
                    placeholder="Nota"
                    value={p.rating}
                    onChange={(e) => {
                      const next = [...playerRatings];
                      next[idx] = { ...p, rating: e.target.value };
                      setPlayerRatings(next);
                    }}
                  />
                  <Textarea
                    rows={2}
                    placeholder="Relatório individual"
                    value={p.individualReport}
                    onChange={(e) => {
                      const next = [...playerRatings];
                      next[idx] = { ...p, individualReport: e.target.value };
                      setPlayerRatings(next);
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label>Anexos</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setAttachments((prev) => [...prev, { label: "", fileUrl: "", kind: "outro" }])}
              >
                <Plus className="mr-1 h-4 w-4" />
                Anexo
              </Button>
            </div>
            {attachments.map((a, idx) => (
              <div key={idx} className="rounded-lg border border-border/60 p-3 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs">Tipo</Label>
                    <NativeSelectField
                      value={a.kind}
                      onChange={(e) => {
                        const next = [...attachments];
                        next[idx] = { ...a, kind: e.target.value };
                        setAttachments(next);
                      }}
                      options={COACH_ATTACHMENT_KINDS.map((k) => ({ value: k.value, label: k.label }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Descrição</Label>
                    <Input
                      value={a.label}
                      onChange={(e) => {
                        const next = [...attachments];
                        next[idx] = { ...a, label: e.target.value };
                        setAttachments(next);
                      }}
                    />
                  </div>
                </div>
                <TreinadoresMediaPicker
                  value={a.fileUrl}
                  onChange={(url) => {
                    const next = [...attachments];
                    next[idx] = { ...a, fileUrl: url };
                    setAttachments(next);
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                >
                  Remover anexo
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <NativeSelectField
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: "rascunho", label: "Rascunho" },
                { value: "finalizado", label: "Finalizado" },
              ]}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar relatório
            </Button>
          </div>
        </CardContent>
      </Card>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir relatório?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
        </>
      )}
    </div>
  );
}
