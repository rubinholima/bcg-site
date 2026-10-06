"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AnaliseDesempenhoShell } from "@/components/dashboard/futebol/analise-desempenho/AnaliseDesempenhoShell";
import {
  ANALISE_DESEMPENHO_BASE,
  useAnaliseDesempenhoQuery,
} from "@/components/dashboard/futebol/analise-desempenho/AnaliseDesempenhoFilters";
import {
  PreMatchTacticalBoard,
  type TacticalBoardState,
} from "@/components/dashboard/futebol/analise-desempenho/PreMatchTacticalBoard";
import { api } from "@/lib/api";
import { FeedbackModal } from "@/components/ui/feedback-modal";

const SECTIONS = [
  { key: "jogo", label: "Jogo" },
  { key: "adversario", label: "Adversário" },
  { key: "plano_comissao", label: "Plano / observações da comissão" },
] as const;

export default function PreJogoEditorPage() {
  const preparationId = String(useParams().preparationId ?? "");
  const { qs } = useAnaliseDesempenhoQuery();
  const suffix = qs ? `?${qs}` : "";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [versionId, setVersionId] = useState<string | null>(null);
  const [lifecycle, setLifecycle] = useState("DRAFT");
  const [sections, setSections] = useState<Record<string, { text?: string }>>({});
  const [board, setBoard] = useState<TacticalBoardState>({ elements: [] });
  const [title, setTitle] = useState("");
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<{
        title: string;
        versions: Array<{
          id: string;
          lifecycle: string;
          sections?: Record<string, { text?: string }>;
          tacticalBoard?: TacticalBoardState;
        }>;
      }>(`/performance-analysis/pre-match/${preparationId}`);
      setTitle(data.title);
      const v = data.versions[0];
      if (v) {
        setVersionId(v.id);
        setLifecycle(v.lifecycle);
        setSections(v.sections ?? {});
        setBoard((v.tacticalBoard as TacticalBoardState) ?? { elements: [] });
      }
    } finally {
      setLoading(false);
    }
  }, [preparationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const readOnly = lifecycle === "APPROVED" || lifecycle === "PRESENTED";

  async function save() {
    if (!versionId || readOnly) return;
    setSaving(true);
    try {
      await api.patch(`/performance-analysis/pre-match/versions/${versionId}`, {
        sections,
        tacticalBoard: board,
      });
    } catch (e) {
      setFeedback({
        title: "Erro ao salvar",
        message: e instanceof Error ? e.message : "Tente novamente.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function advanceLifecycle(next: string) {
    if (!versionId) return;
    try {
      await api.post(`/performance-analysis/pre-match/versions/${versionId}/lifecycle`, {
        lifecycle: next,
      });
      await load();
    } catch (e) {
      setFeedback({
        title: "Transição não permitida",
        message: e instanceof Error ? e.message : "Verifique o status atual.",
      });
    }
  }

  async function exportHtml() {
    if (!versionId) return;
    const { data } = await api.get<{ html: string }>(
      `/performance-analysis/pre-match/versions/${versionId}/export-html`,
    );
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(data.html);
      w.document.close();
    }
  }

  if (loading) {
    return (
      <AnaliseDesempenhoShell title="Pré-jogo">
        <Loader2 className="h-6 w-6 animate-spin" />
      </AnaliseDesempenhoShell>
    );
  }

  return (
    <AnaliseDesempenhoShell title={title || "Pré-jogo"}>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" onClick={() => void save()} disabled={saving || readOnly}>
          Salvar rascunho
        </Button>
        {lifecycle === "DRAFT" ? (
          <Button type="button" variant="outline" onClick={() => void advanceLifecycle("REVIEW")}>
            Enviar para revisão
          </Button>
        ) : null}
        {lifecycle === "REVIEW" ? (
          <Button type="button" variant="outline" onClick={() => void advanceLifecycle("APPROVED")}>
            Aprovar
          </Button>
        ) : null}
        {lifecycle === "APPROVED" ? (
          <Button type="button" variant="outline" onClick={() => void advanceLifecycle("PRESENTED")}>
            Marcar apresentado
          </Button>
        ) : null}
        <Button type="button" variant="secondary" onClick={() => void exportHtml()}>
          Exportar / imprimir
        </Button>
        <Button variant="outline" asChild>
          <Link href={`${ANALISE_DESEMPENHO_BASE}/pre-jogo/${preparationId}/apresentacao${suffix}`}>
            Modo apresentação
          </Link>
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Status: {lifecycle}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          {SECTIONS.map((s) => (
            <label key={s.key} className="block space-y-1">
              <span className="text-xs font-medium">{s.label}</span>
              <Textarea
                value={sections[s.key]?.text ?? ""}
                onChange={(e) =>
                  setSections((prev) => ({ ...prev, [s.key]: { text: e.target.value } }))
                }
                disabled={readOnly}
                className="min-h-[80px] text-foreground"
              />
            </label>
          ))}
        </div>
        <div>
          <p className="mb-2 text-xs font-medium">Quadro tático</p>
          <PreMatchTacticalBoard value={board} onChange={setBoard} readOnly={readOnly} />
        </div>
      </div>

      <FeedbackModal
        open={Boolean(feedback)}
        onOpenChange={() => setFeedback(null)}
        title={feedback?.title ?? ""}
        message={feedback?.message ?? ""}
      />
    </AnaliseDesempenhoShell>
  );
}
