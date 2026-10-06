"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KpiCard } from "@/components/dashboard/cup360/KpiCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AnaliseDesempenhoShell } from "@/components/dashboard/futebol/analise-desempenho/AnaliseDesempenhoShell";
import { PerformanceAnalysisTaggingWorkspace } from "@/components/dashboard/futebol/analise-desempenho/PerformanceAnalysisTaggingWorkspace";
import { ANALISE_DESEMPENHO_BASE } from "@/components/dashboard/futebol/analise-desempenho/AnaliseDesempenhoFilters";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import type {
  AnalysisClipRow,
  AnalysisSessionDetail,
  PlayerMetrics,
  TeamMetrics,
} from "@/lib/performance-analysis-types";
import { formatMs } from "@/lib/performance-analysis-types";
import { cn } from "@/lib/utils";

type Tab = "visao" | "tagging" | "metricas" | "clips";

export default function AnaliseDesempenhoSessionPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = String(params.sessionId ?? "");
  const tenantId = searchParams.get("tenantId") ?? "";
  const category = searchParams.get("category") ?? "";
  const qs = searchParams.toString();
  const suffix = qs ? `?${qs}` : "";

  const tab = (searchParams.get("tab") as Tab) || "visao";

  const [detail, setDetail] = useState<AnalysisSessionDetail | null>(null);
  const [metrics, setMetrics] = useState<{ team: TeamMetrics; players: PlayerMetrics[] } | null>(
    null,
  );
  const [clips, setClips] = useState<AnalysisClipRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadSourceId, setUploadSourceId] = useState("");
  const [clipTitle, setClipTitle] = useState("");
  const [clipStart, setClipStart] = useState("0");
  const [clipEnd, setClipEnd] = useState("5000");
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: sess }, metricsRes, clipsRes] = await Promise.all([
        api.get<AnalysisSessionDetail>(`/performance-analysis/sessions/${sessionId}`),
        api.get<{ team: TeamMetrics; players: PlayerMetrics[] }>(
          `/performance-analysis/sessions/${sessionId}/metrics`,
        ),
        api.get<AnalysisClipRow[]>(`/performance-analysis/sessions/${sessionId}/clips`),
      ]);
      setDetail(sess);
      setMetrics(metricsRes.data);
      setClips(Array.isArray(clipsRes.data) ? clipsRes.data : []);
      const uploadSrc = sess.videoSources.find((v) => v.sourceType === "UPLOAD");
      if (uploadSrc) setUploadSourceId(uploadSrc.id);
    } catch (err) {
      setFeedback({
        title: "Erro",
        message: err instanceof Error ? err.message : "Falha ao carregar sessão.",
      });
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function handleUpload(file: File) {
    if (!uploadSourceId) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      await api.postForm(
        `/performance-analysis/sessions/${sessionId}/video-sources/${uploadSourceId}/upload`,
        fd,
      );
      await reload();
    } catch (err) {
      setFeedback({
        title: "Upload",
        message: err instanceof Error ? err.message : "Falha no envio.",
      });
    }
  }

  async function handleCreateClip() {
    const vs = detail?.videoSources[0]?.id;
    if (!vs) return;
    const startMs = Number(clipStart);
    const endMs = Number(clipEnd);
    try {
      await api.post(`/performance-analysis/sessions/${sessionId}/clips`, {
        videoSourceId: vs,
        title: clipTitle.trim() || "Clip",
        startMs,
        endMs,
      });
      setClipTitle("");
      const { data } = await api.get<AnalysisClipRow[]>(
        `/performance-analysis/sessions/${sessionId}/clips`,
      );
      setClips(Array.isArray(data) ? data : []);
    } catch (err) {
      setFeedback({
        title: "Clip",
        message: err instanceof Error ? err.message : "Não foi possível criar o clip.",
      });
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "visao", label: "Visão geral" },
    { id: "tagging", label: "Marcação" },
    { id: "metricas", label: "Quantitativo" },
    { id: "clips", label: "Clips" },
  ];

  if (loading && !detail) {
    return (
      <AnaliseDesempenhoShell title="Sessão" showFilters={false}>
        <Loader2 className="mt-8 h-8 w-8 animate-spin text-muted-foreground" />
      </AnaliseDesempenhoShell>
    );
  }

  return (
    <AnaliseDesempenhoShell title={detail?.session.title ?? "Sessão"} showFilters={false}>
      <div className="mt-2 flex flex-wrap gap-2 border-b border-border pb-3">
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={`${ANALISE_DESEMPENHO_BASE}/sessoes/${sessionId}?${new URLSearchParams({
              ...(qs ? Object.fromEntries(new URLSearchParams(qs)) : {}),
              tab: t.id,
            }).toString()}`}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium",
              tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {t.label}
          </Link>
        ))}
        <Button variant="ghost" size="sm" className="ml-auto" asChild>
          <Link href={`${ANALISE_DESEMPENHO_BASE}/sessoes${suffix}`}>Voltar</Link>
        </Button>
      </div>

      {tab === "visao" && detail ? (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Eventos" value={String(metrics?.team.totalTagged ?? 0)} />
            <KpiCard
              label="Precisão de passe"
              value={
                metrics?.team.passAccuracyPct != null
                  ? `${metrics.team.passAccuracyPct}%`
                  : "—"
              }
            />
            <KpiCard label="Finalizações" value={String(metrics?.team.shots ?? 0)} />
            <KpiCard label="Fontes de vídeo" value={String(detail.videoSources.length)} />
          </div>

          {detail.videoSources.some((v) => v.sourceType === "UPLOAD" && !v.hasPrivateUpload) ? (
            <div className="rounded-lg border border-border p-4">
              <p className="mb-2 text-sm font-medium">Upload privado</p>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                <Upload className="h-4 w-4" />
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleUpload(f);
                  }}
                />
                Enviar vídeo
              </label>
            </div>
          ) : null}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fonte</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.videoSources.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>{v.title}</TableCell>
                  <TableCell>{v.sourceType}</TableCell>
                  <TableCell>{v.processingStatus}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {tab === "tagging" && tenantId ? (
        <PerformanceAnalysisTaggingWorkspace
          sessionId={sessionId}
          tenantId={tenantId}
          category={category || undefined}
        />
      ) : null}

      {tab === "metricas" && metrics ? (
        <div className="mt-4 space-y-6">
          <div>
            <h3 className="mb-2 text-sm font-semibold">Coletivo</h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <KpiCard label="Passes tentados" value={metrics.team.passAttempts} />
              <KpiCard label="Passes certos" value={metrics.team.passSuccess} />
              <KpiCard label="Recuperações" value={metrics.team.recoveries} />
              <KpiCard label="Perdas" value={metrics.team.losses} />
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">Por atleta</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Atleta</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                  <TableHead className="text-right">Passes</TableHead>
                  <TableHead className="text-right">Precisão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.players.map((p) => (
                  <TableRow key={p.playerId}>
                    <TableCell>{p.playerName ?? p.playerId}</TableCell>
                    <TableCell className="text-right">{p.totalTagged}</TableCell>
                    <TableCell className="text-right">{p.passAttempts}</TableCell>
                    <TableCell className="text-right">
                      {p.passAccuracyPct != null ? `${p.passAccuracyPct}%` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {metrics.players.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      Marque ações com atleta para ver métricas individuais.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}

      {tab === "clips" ? (
        <div className="mt-4 space-y-4">
          <div className="grid gap-2 sm:grid-cols-4">
            <Input
              placeholder="Título"
              value={clipTitle}
              onChange={(e) => setClipTitle(e.target.value)}
              className="text-foreground sm:col-span-2"
            />
            <Input
              type="number"
              placeholder="Início (ms)"
              value={clipStart}
              onChange={(e) => setClipStart(e.target.value)}
              className="text-foreground"
            />
            <Input
              type="number"
              placeholder="Fim (ms)"
              value={clipEnd}
              onChange={(e) => setClipEnd(e.target.value)}
              className="text-foreground"
            />
          </div>
          <Button type="button" onClick={() => void handleCreateClip()}>
            Criar clip virtual
          </Button>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Intervalo</TableHead>
                <TableHead>Fonte</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clips.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.title}</TableCell>
                  <TableCell>
                    {formatMs(c.startMs)} – {formatMs(c.endMs)}
                  </TableCell>
                  <TableCell>{c.videoSource?.title ?? "—"}</TableCell>
                </TableRow>
              ))}
              {clips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">
                    Nenhum clip ainda.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      ) : null}

      <FeedbackModal
        open={Boolean(feedback)}
        onOpenChange={() => setFeedback(null)}
        title={feedback?.title ?? ""}
        message={feedback?.message ?? ""}
        variant="error"
      />
    </AnaliseDesempenhoShell>
  );
}
