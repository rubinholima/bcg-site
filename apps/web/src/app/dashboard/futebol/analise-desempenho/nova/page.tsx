"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectField } from "@/components/ui/native-select";
import { PageSection } from "@/components/dashboard/cup360/Cup360PageShell";
import { AnaliseDesempenhoShell } from "@/components/dashboard/futebol/analise-desempenho/AnaliseDesempenhoShell";
import {
  ANALISE_DESEMPENHO_BASE,
  useAnaliseDesempenhoQuery,
} from "@/components/dashboard/futebol/analise-desempenho/AnaliseDesempenhoFilters";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import type { AnalysisSessionKind } from "@/lib/performance-analysis-types";
import type { FutebolGameListItem, FutebolGamesListResponse } from "@/lib/futebol-jogos.types";
import type { CoachTrainingSession } from "@/lib/treinadores-types";

export default function NovaAnaliseDesempenhoPage() {
  const router = useRouter();
  const { tenantId, category, qs } = useAnaliseDesempenhoQuery();
  const [kind, setKind] = useState<AnalysisSessionKind>("MATCH");
  const [title, setTitle] = useState("");
  const [sessionCategory, setSessionCategory] = useState(category);
  const [fmfMatchReportId, setFmfMatchReportId] = useState("");
  const [trainingSessionId, setTrainingSessionId] = useState("");
  const [games, setGames] = useState<FutebolGameListItem[]>([]);
  const [trainings, setTrainings] = useState<CoachTrainingSession[]>([]);
  const [videoTitle, setVideoTitle] = useState("Transmissão");
  const [videoType, setVideoType] = useState("YOUTUBE");
  const [externalUrl, setExternalUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);

  useEffect(() => {
    setSessionCategory(category);
  }, [category]);

  useEffect(() => {
    if (!tenantId) return;
    const params = new URLSearchParams({ tenantId });
    if (category) params.set("category", category);
    api
      .get<FutebolGamesListResponse>(`/futebol-jogos?${params}&status=completed`)
      .then(({ data }) => setGames(data?.games ?? []))
      .catch(() => setGames([]));
    api
      .get<CoachTrainingSession[]>(`/futebol-treinadores/training-sessions?${params}`)
      .then(({ data }) => setTrainings(Array.isArray(data) ? data : []))
      .catch(() => setTrainings([]));
  }, [tenantId, category]);

  async function handleCreate() {
    if (!tenantId || !title.trim()) {
      setFeedback({ title: "Campos obrigatórios", message: "Informe o título da análise." });
      return;
    }
    setSaving(true);
    try {
      const { data: session } = await api.post<{ id: string }>("/performance-analysis/sessions", {
        tenantId,
        kind,
        title: title.trim(),
        category: sessionCategory || null,
        fmfMatchReportId: kind === "MATCH" && fmfMatchReportId ? fmfMatchReportId : null,
        trainingSessionId: kind === "TRAINING" && trainingSessionId ? trainingSessionId : null,
      });
      if (videoTitle.trim()) {
        await api.post(`/performance-analysis/sessions/${session.id}/video-sources`, {
          sourceType: videoType,
          title: videoTitle.trim(),
          cameraLabel: "Principal",
          externalUrl: videoType !== "UPLOAD" ? externalUrl.trim() : undefined,
        });
      }
      router.push(`${ANALISE_DESEMPENHO_BASE}/sessoes/${session.id}${qs ? `?${qs}` : ""}`);
    } catch (err) {
      setFeedback({
        title: "Erro",
        message: err instanceof Error ? err.message : "Não foi possível criar a sessão.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnaliseDesempenhoShell title="Nova análise">
      <PageSection className="mt-4 max-w-2xl space-y-4">
        <div>
          <label className="mb-1 block text-sm text-muted-foreground">Tipo</label>
          <NativeSelect value={kind} onChange={(e) => setKind(e.target.value as AnalysisSessionKind)}>
            <option value="MATCH">Jogo</option>
            <option value="TRAINING">Treino</option>
            <option value="OPPONENT">Adversário</option>
            <option value="OTHER">Outro</option>
          </NativeSelect>
        </div>

        {kind === "MATCH" ? (
          <NativeSelectField
            value={fmfMatchReportId}
            onChange={(e) => {
              setFmfMatchReportId(e.target.value);
              const g = games.find((x) => x.fmfMatchReportId === e.target.value);
              if (g && !title.trim()) {
                setTitle(`${g.opponentName} · ${g.matchDate.slice(0, 10)}`);
              }
            }}
            placeholder="Vincular partida (opcional)"
            options={[
              { value: "", label: "Sem vínculo" },
              ...games
                .filter((g) => g.fmfMatchReportId)
                .map((g) => ({
                  value: g.fmfMatchReportId!,
                  label: `${g.opponentName} — ${g.matchDate.slice(0, 10)}`,
                })),
            ]}
          />
        ) : null}

        {kind === "TRAINING" ? (
          <NativeSelectField
            value={trainingSessionId}
            onChange={(e) => setTrainingSessionId(e.target.value)}
            placeholder="Vincular treino (opcional)"
            options={[
              { value: "", label: "Sem vínculo" },
              ...trainings.map((t) => ({
                value: t.id,
                label: `${t.sessionDate?.slice(0, 10) ?? "Treino"} — ${t.objectives?.slice(0, 40) ?? t.id}`,
              })),
            ]}
          />
        ) : null}

        <Input
          placeholder="Título da sessão"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-foreground"
        />

        <Input
          placeholder="Categoria"
          value={sessionCategory}
          onChange={(e) => setSessionCategory(e.target.value)}
          className="text-foreground"
        />

        <div className="rounded-lg border border-border p-4 space-y-3">
          <p className="text-sm font-medium">Primeira fonte de vídeo</p>
          <NativeSelect value={videoType} onChange={(e) => setVideoType(e.target.value)}>
            <option value="YOUTUBE">YouTube</option>
            <option value="EXTERNAL_URL">URL externa</option>
            <option value="UPLOAD">Upload (depois na sessão)</option>
          </NativeSelect>
          <Input
            placeholder="Nome da fonte"
            value={videoTitle}
            onChange={(e) => setVideoTitle(e.target.value)}
            className="text-foreground"
          />
          {videoType !== "UPLOAD" ? (
            <Input
              placeholder="URL do vídeo"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              className="text-foreground"
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              Após criar, envie o arquivo na página da sessão.
            </p>
          )}
        </div>

        <Button type="button" disabled={saving || !tenantId} onClick={() => void handleCreate()}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Criar sessão
        </Button>
      </PageSection>

      <FeedbackModal
        open={Boolean(feedback)}
        onOpenChange={() => setFeedback(null)}
        title={feedback?.title ?? ""}
        message={feedback?.message ?? ""}
      />
    </AnaliseDesempenhoShell>
  );
}
