"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { NativeSelectField } from "@/components/ui/native-select";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import {
  PreMatchTacticalBoard,
  type TacticalBoardState,
} from "./PreMatchTacticalBoard";
import { ANALISE_DESEMPENHO_BASE } from "./AnaliseDesempenhoFilters";
import { AnalysisPrivateClipPlayer } from "./AnalysisPrivateClipPlayer";
import { api } from "@/lib/api";
import {
  OPPONENT_CLIP_GROUPS,
  PRE_MATCH_EDITOR_SECTIONS,
} from "@/lib/performance-analysis-workflows-ui";

type Props = {
  preparationId: string;
  querySuffix: string;
};

export function PreMatchEditorWorkspace({ preparationId, querySuffix }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [versionId, setVersionId] = useState<string | null>(null);
  const [lifecycle, setLifecycle] = useState("DRAFT");
  const [title, setTitle] = useState("");
  const [opponentProfileId, setOpponentProfileId] = useState<string | null>(null);
  const [sections, setSections] = useState<Record<string, { text?: string }>>({});
  const [hiddenSections, setHiddenSections] = useState<string[]>([]);
  const [selectedClipIds, setSelectedClipIds] = useState<string[]>([]);
  const [board, setBoard] = useState<TacticalBoardState>({ elements: [] });
  const [activeSection, setActiveSection] = useState<string>(PRE_MATCH_EDITOR_SECTIONS[0].key);
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);
  const [importClipGroups, setImportClipGroups] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<{
        title: string;
        opponentProfileId: string | null;
        versions: Array<{
          id: string;
          lifecycle: string;
          sections?: Record<string, { text?: string }>;
          hiddenSections?: string[];
          selectedClipIds?: string[];
          tacticalBoard?: TacticalBoardState;
        }>;
      }>(`/performance-analysis/pre-match/${preparationId}`);
      setTitle(data.title);
      setOpponentProfileId(data.opponentProfileId);
      const v = data.versions[0];
      if (v) {
        setVersionId(v.id);
        setLifecycle(v.lifecycle);
        setSections(v.sections ?? {});
        setHiddenSections(Array.isArray(v.hiddenSections) ? v.hiddenSections : []);
        setSelectedClipIds(Array.isArray(v.selectedClipIds) ? v.selectedClipIds : []);
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
        hiddenSections,
        selectedClipIds,
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
      await api.post(`/performance-analysis/pre-match/versions/${versionId}/lifecycle`, { lifecycle: next });
      await load();
    } catch (e) {
      setFeedback({
        title: "Transição não permitida",
        message: e instanceof Error ? e.message : "Verifique o status.",
      });
    }
  }

  async function importFromOpponent() {
    if (!versionId || !opponentProfileId || readOnly) return;
    try {
      await api.post(`/performance-analysis/pre-match/versions/${versionId}/import-opponent`, {
        profileId: opponentProfileId,
        includeTacticalSections: true,
        includeLineup: true,
        includeKeyPlayers: true,
        includeStrengths: true,
        includeWeaknesses: true,
        includeSetPieces: true,
        includeClipGroupKeys: importClipGroups,
      });
      await load();
    } catch (e) {
      setFeedback({
        title: "Importação falhou",
        message: e instanceof Error ? e.message : "Verifique o vínculo com o adversário.",
      });
    }
  }

  function toggleHidden(key: string) {
    setHiddenSections((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  if (loading) {
    return <Loader2 className="h-6 w-6 animate-spin" />;
  }

  const sectionMeta = PRE_MATCH_EDITOR_SECTIONS.find((s) => s.key === activeSection);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {title} · {lifecycle}
        </span>
        {!readOnly ? (
          <Button type="button" size="sm" disabled={saving} onClick={() => void save()}>
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            Salvar
          </Button>
        ) : null}
        <Button type="button" size="sm" variant="outline" asChild>
          <Link href={`${ANALISE_DESEMPENHO_BASE}/pre-jogo/${preparationId}/apresentacao${querySuffix}`}>
            Apresentação
          </Link>
        </Button>
        {lifecycle === "DRAFT" ? (
          <Button type="button" size="sm" variant="secondary" onClick={() => void advanceLifecycle("REVIEW")}>
            Enviar para revisão
          </Button>
        ) : null}
        {lifecycle === "REVIEW" ? (
          <Button type="button" size="sm" variant="secondary" onClick={() => void advanceLifecycle("APPROVED")}>
            Aprovar
          </Button>
        ) : null}
        {lifecycle === "APPROVED" ? (
          <Button type="button" size="sm" variant="secondary" onClick={() => void advanceLifecycle("PRESENTED")}>
            Marcar como apresentado
          </Button>
        ) : null}
      </div>

      {opponentProfileId && !readOnly ? (
        <div className="flex flex-wrap items-end gap-2 rounded-md border border-border/50 p-3">
          <div className="min-w-[200px] flex-1">
            <Label className="text-xs">Importar do perfil adversário (curado)</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              {OPPONENT_CLIP_GROUPS.map((g) => (
                <label key={g.key} className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={importClipGroups.includes(g.key)}
                    onChange={(e) =>
                      setImportClipGroups((prev) =>
                        e.target.checked ? [...prev, g.key] : prev.filter((k) => k !== g.key),
                      )
                    }
                  />
                  {g.label}
                </label>
              ))}
            </div>
          </div>
          <Button type="button" size="sm" onClick={() => void importFromOpponent()}>
            Importar seleção
          </Button>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-1">
          {PRE_MATCH_EDITOR_SECTIONS.map((s) => (
            <button
              key={s.key}
              type="button"
              className={`flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm ${
                activeSection === s.key ? "bg-violet-500/15 text-violet-100" : "text-muted-foreground hover:bg-muted/50"
              }`}
              onClick={() => setActiveSection(s.key)}
            >
              <span>{s.label}</span>
              {!readOnly ? (
                <input
                  type="checkbox"
                  checked={!hiddenSections.includes(s.key)}
                  title="Exibir na apresentação"
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => toggleHidden(s.key)}
                />
              ) : null}
            </button>
          ))}
          <div className="pt-2">
            <button
              type="button"
              className={`w-full rounded-md px-2 py-2 text-left text-sm ${
                activeSection === "board" ? "bg-violet-500/15" : "text-muted-foreground"
              }`}
              onClick={() => setActiveSection("board")}
            >
              Quadro tático
            </button>
          </div>
        </aside>

        <div className="min-h-[280px]">
          {activeSection === "board" ? (
            <PreMatchTacticalBoard value={board} onChange={setBoard} readOnly={readOnly} />
          ) : activeSection === "clips_selecionados" ? (
            <div className="space-y-3">
              <Label>IDs de clips (separados por vírgula ou importe do adversário)</Label>
              <Textarea
                className="text-foreground font-mono text-xs"
                rows={3}
                readOnly={readOnly}
                value={selectedClipIds.join(", ")}
                onChange={(e) =>
                  setSelectedClipIds(
                    e.target.value
                      .split(/[,;\s]+/)
                      .map((x) => x.trim())
                      .filter(Boolean),
                  )
                }
              />
              {selectedClipIds.slice(0, 3).map((id) => (
                <AnalysisPrivateClipPlayer key={id} clipId={id} compact />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <Label>{sectionMeta?.label}</Label>
              <Textarea
                className="text-foreground min-h-[240px]"
                readOnly={readOnly}
                value={sections[activeSection]?.text ?? ""}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    [activeSection]: { text: e.target.value },
                  }))
                }
              />
            </div>
          )}
        </div>
      </div>

      <FeedbackModal
        open={!!feedback}
        onOpenChange={() => setFeedback(null)}
        title={feedback?.title ?? ""}
        message={feedback?.message ?? ""}
      />
    </div>
  );
}
