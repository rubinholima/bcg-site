"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Loader2, Mail, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelectField } from "@/components/ui/native-select";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";
import type { GkContextResponse, GkMatchAnalysis, GkMatchReportOption } from "@/lib/treinador-goleiros-types";
import { GK_ATTACHMENT_KINDS } from "@/lib/treinador-goleiros-types";
import { distributeGkReport } from "@/lib/treinador-goleiros-distribute";
import { TreinadoresMediaPicker } from "@/components/dashboard/futebol/treinadores/TreinadoresMediaPicker";
import { getPublicImageUrl } from "@/lib/media-url";

type AttachmentDraft = { label: string; fileUrl: string; kind: string };

interface Props {
  tenantId: string;
  category?: string;
  context: GkContextResponse | null;
}

function emptyAttachments(): AttachmentDraft[] {
  return [{ label: "Keeper Scout — Jogo", fileUrl: "", kind: "keeper_scout" }];
}

export function TreinadorGoleirosAnalisesTab({ tenantId, category, context }: Props) {
  const [rows, setRows] = useState<GkMatchAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [matchReports, setMatchReports] = useState<GkMatchReportOption[]>([]);
  const [coachMatchReportId, setCoachMatchReportId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [observations, setObservations] = useState("");
  const [highlightsVideoUrl, setHighlightsVideoUrl] = useState("");
  const [status, setStatus] = useState("rascunho");
  const [playerIds, setPlayerIds] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<AttachmentDraft[]>(emptyAttachments());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [distributing, setDistributing] = useState(false);
  const [feedback, setFeedback] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: "",
  });

  const load = () => {
    if (!tenantId) return;
    setLoading(true);
    const params = new URLSearchParams({ tenantId });
    if (category) params.set("category", category);
    api
      .get<GkMatchAnalysis[]>(`/treinador-goleiros/match-analyses?${params}`)
      .then(({ data }) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [tenantId, category]);

  useEffect(() => {
    if (!tenantId) return;
    const params = new URLSearchParams({ tenantId });
    if (category) params.set("category", category);
    api
      .get<GkMatchReportOption[]>(`/treinador-goleiros/match-reports?${params}`)
      .then(({ data }) => setMatchReports(Array.isArray(data) ? data : []))
      .catch(() => setMatchReports([]));
  }, [tenantId, category]);

  const resetForm = () => {
    setSelectedId("");
    setCoachMatchReportId("");
    setStaffId("");
    setObservations("");
    setHighlightsVideoUrl("");
    setStatus("rascunho");
    setPlayerIds((context?.players ?? []).map((p) => p.id));
    setAttachments(emptyAttachments());
  };

  useEffect(() => {
    if (!selectedId) {
      setPlayerIds((context?.players ?? []).map((p) => p.id));
      return;
    }
    api.get<GkMatchAnalysis>(`/treinador-goleiros/match-analyses/${selectedId}?tenantId=${tenantId}`).then(({ data }) => {
      if (!data) return;
      setCoachMatchReportId(data.coachMatchReportId ?? "");
      setStaffId(data.staff?.id ?? "");
      setObservations(data.observations ?? "");
      setHighlightsVideoUrl(data.highlightsVideoUrl ?? "");
      setStatus(data.status ?? "rascunho");
      setPlayerIds(data.players.map((p) => p.playerId));
      setAttachments(
        data.attachments.length > 0
          ? data.attachments.map((a) => ({
              label: a.label ?? "",
              fileUrl: a.fileUrl,
              kind: a.kind ?? "keeper_scout",
            }))
          : emptyAttachments(),
      );
    });
  }, [selectedId, tenantId, context?.players]);

  const togglePlayer = (id: string) => {
    setPlayerIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSave = async () => {
    if (!tenantId || !coachMatchReportId) {
      setFeedback({ open: true, title: "Atenção", message: "Selecione o jogo (relatório pós-jogo)." });
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post<GkMatchAnalysis>("/treinador-goleiros/match-analyses", {
        id: selectedId || undefined,
        tenantId,
        category: category || null,
        staffId: staffId || null,
        coachMatchReportId,
        observations,
        highlightsVideoUrl: highlightsVideoUrl || null,
        status,
        playerIds,
        attachments: attachments.filter((a) => a.fileUrl.trim()),
      });
      if (data?.id) setSelectedId(data.id);
      load();
      setFeedback({ open: true, title: "Salvo", message: "Análise de jogo salva." });
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
      await api.delete(`/treinador-goleiros/match-analyses/${deleteId}?tenantId=${tenantId}`);
      if (selectedId === deleteId) resetForm();
      load();
    } finally {
      setDeleteId(null);
    }
  };

  const handleDistribute = async () => {
    if (!selectedId || !tenantId) return;
    setDistributing(true);
    try {
      const row = rows.find((r) => r.id === selectedId);
      const summary = `Análise GK — ${row?.opponentName ?? ""} — ${row?.matchDate ?? ""}`.trim();
      const res = await distributeGkReport({
        tenantId,
        kind: "match_analysis",
        referenceId: selectedId,
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
        message: e instanceof Error ? e.message : "Não foi possível enviar.",
      });
    } finally {
      setDistributing(false);
    }
  };

  const videoUrl = highlightsVideoUrl.trim();

  return (
    <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Análises</CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={resetForm}>
            <Plus className="mr-1 h-4 w-4" />
            Nova
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <Loader2 className="mx-auto h-6 w-6 animate-spin" />
          ) : (
            rows.map((r) => (
              <div key={r.id} className={`rounded-lg border p-3 text-sm ${selectedId === r.id ? "border-primary bg-primary/5" : ""}`}>
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
                  className="mt-1 text-destructive"
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
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Análise Keeper Scout</CardTitle>
          {selectedId ? (
            <Button type="button" size="sm" variant="outline" onClick={handleDistribute} disabled={distributing}>
              {distributing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Mail className="mr-1 h-4 w-4" />}
              Enviar p/ Direção e Comissão
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Jogo (relatório existente)</Label>
            <NativeSelectField
              value={coachMatchReportId}
              onChange={(e) => setCoachMatchReportId(e.target.value)}
              placeholder="Selecione o jogo…"
              options={matchReports.map((m) => ({
                value: m.id,
                label: `${formatDateDayMonYear(new Date(m.matchDate))} · ${m.opponentName}`,
              }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Responsável</Label>
            <NativeSelectField
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              placeholder="Selecione…"
              options={(context?.staff ?? []).map((s) => ({ value: s.id, label: s.name }))}
            />
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
          <div className="space-y-2">
            <Label>Goleiros avaliados</Label>
            <div className="flex flex-wrap gap-2">
              {(context?.players ?? []).map((p) => (
                <label key={p.id} className="flex items-center gap-2 rounded-md border border-border/60 px-2 py-1 text-sm">
                  <input
                    type="checkbox"
                    checked={playerIds.includes(p.id)}
                    onChange={() => togglePlayer(p.id)}
                  />
                  {p.name}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>URL YouTube (destaques)</Label>
            <Input value={highlightsVideoUrl} onChange={(e) => setHighlightsVideoUrl(e.target.value)} placeholder="https://youtube.com/…" />
            {videoUrl ? (
              <a
                href={videoUrl.startsWith("http") ? videoUrl : `https://${videoUrl}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary underline"
              >
                Abrir vídeo <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea rows={3} value={observations} onChange={(e) => setObservations(e.target.value)} />
          </div>
          <div className="space-y-3">
            <Label>PDFs Keeper Scout</Label>
            {attachments.map((a, idx) => (
              <div key={idx} className="space-y-2 rounded-lg border border-border/60 p-3">
                <NativeSelectField
                  value={a.kind}
                  onChange={(e) => {
                    const next = [...attachments];
                    next[idx] = { ...a, kind: e.target.value };
                    setAttachments(next);
                  }}
                  options={GK_ATTACHMENT_KINDS.map((k) => ({ value: k.value, label: k.label }))}
                />
                <Input
                  value={a.label}
                  onChange={(e) => {
                    const next = [...attachments];
                    next[idx] = { ...a, label: e.target.value };
                    setAttachments(next);
                  }}
                  placeholder="Rótulo do PDF"
                />
                <TreinadoresMediaPicker
                  label="PDF"
                  value={a.fileUrl}
                  onChange={(url) => {
                    const next = [...attachments];
                    next[idx] = { ...a, fileUrl: url };
                    setAttachments(next);
                  }}
                />
                {a.fileUrl ? (
                  <a
                    href={getPublicImageUrl(a.fileUrl) || a.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary underline"
                  >
                    Ver PDF
                  </a>
                ) : null}
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setAttachments((p) => [...p, { label: "", fileUrl: "", kind: "keeper_scout" }])}
            >
              <Plus className="mr-1 h-4 w-4" />
              Outro PDF
            </Button>
          </div>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
            Salvar análise
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir análise?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
      />
    </div>
  );
}
