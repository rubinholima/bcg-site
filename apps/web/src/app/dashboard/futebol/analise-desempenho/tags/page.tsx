"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AnaliseDesempenhoShell } from "@/components/dashboard/futebol/analise-desempenho/AnaliseDesempenhoShell";
import { useAnaliseDesempenhoQuery } from "@/components/dashboard/futebol/analise-desempenho/AnaliseDesempenhoFilters";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import type { AnalysisTagDefinition } from "@/lib/performance-analysis-types";

export default function TagsConfigPage() {
  const { tenantId } = useAnaliseDesempenhoQuery();
  const [tags, setTags] = useState<AnalysisTagDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    setLoading(true);
    api
      .get<AnalysisTagDefinition[]>(`/performance-analysis/tags?tenantId=${tenantId}`)
      .then(({ data }) => setTags(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [tenantId]);

  async function saveTag(tag: AnalysisTagDefinition) {
    if (!tenantId) return;
    setSavingId(tag.id);
    try {
      await api.post("/performance-analysis/tags", {
        tenantId,
        id: tag.id,
        key: tag.key,
        label: tag.label,
        category: tag.category,
        tagGroup: (tag as { tagGroup?: string }).tagGroup,
        shortcutKey: tag.shortcutKey,
        requiresPlayer: tag.requiresPlayer,
        requiresFieldLocation: (tag as { requiresFieldLocation?: boolean }).requiresFieldLocation,
        active: tag.active,
      });
      setFeedback({ title: "Salvo", message: "Tag atualizada." });
    } catch (err) {
      setFeedback({
        title: "Erro",
        message: err instanceof Error ? err.message : "Falha ao salvar tag.",
      });
    } finally {
      setSavingId("");
    }
  }

  return (
    <AnaliseDesempenhoShell title="Configurar tags">
      {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : null}
      <Table className="mt-4">
        <TableHeader>
          <TableRow>
            <TableHead>Label</TableHead>
            <TableHead>Grupo</TableHead>
            <TableHead>Atalho</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {tags.map((tag) => (
            <TableRow key={tag.id}>
              <TableCell>
                <Input
                  value={tag.label}
                  className="text-foreground"
                  onChange={(e) =>
                    setTags((list) => list.map((t) => (t.id === tag.id ? { ...t, label: e.target.value } : t)))
                  }
                />
              </TableCell>
              <TableCell>
                <Input
                  value={(tag as { tagGroup?: string }).tagGroup ?? tag.category ?? ""}
                  className="text-foreground"
                  onChange={(e) =>
                    setTags((list) =>
                      list.map((t) => (t.id === tag.id ? { ...t, tagGroup: e.target.value } : t)),
                    )
                  }
                />
              </TableCell>
              <TableCell>
                <Input
                  value={tag.shortcutKey ?? ""}
                  className="text-foreground w-20"
                  onChange={(e) =>
                    setTags((list) =>
                      list.map((t) => (t.id === tag.id ? { ...t, shortcutKey: e.target.value } : t)),
                    )
                  }
                />
              </TableCell>
              <TableCell>
                <Button type="button" size="sm" disabled={savingId === tag.id} onClick={() => void saveTag(tag)}>
                  {savingId === tag.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <FeedbackModal
        open={Boolean(feedback)}
        onOpenChange={() => setFeedback(null)}
        title={feedback?.title ?? ""}
        message={feedback?.message ?? ""}
      />
    </AnaliseDesempenhoShell>
  );
}
