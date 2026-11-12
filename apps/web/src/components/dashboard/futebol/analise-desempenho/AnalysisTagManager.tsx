"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectField } from "@/components/ui/native-select";
import { Checkbox } from "@/components/ui/checkbox";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { findTagShortcutConflict, RESERVED_POSSESSION_KEYS } from "@/lib/live-tag-shortcuts";
import { labelOutcome, labelQualifier, parseStringList } from "@/lib/analysis-tag-labels";
import type { AnalysisTagDefinition } from "@/lib/performance-analysis-types";
import { cn } from "@/lib/utils";

const STATE_BEHAVIORS = [
  { value: "", label: "Nenhum" },
  { value: "possession_our", label: "Posse nosso time" },
  { value: "possession_opponent", label: "Posse adversário" },
  { value: "ball_out", label: "Bola fora" },
];

type Props = { tenantId: string };

type EditableTag = AnalysisTagDefinition & {
  description?: string | null;
  qualifiers?: string[];
  outcomesList?: string[];
  qualifierList?: string[];
};

function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function AnalysisTagManager({ tenantId }: Props) {
  const [tags, setTags] = useState<EditableTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState<EditableTag | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  function hydrate(list: AnalysisTagDefinition[]): EditableTag[] {
    return list.map((t) => {
      const { outcomes, qualifiers, ...rest } = t;
      return {
        ...rest,
        outcomes,
        qualifiers: parseStringList(qualifiers),
        outcomesList: parseStringList(outcomes),
        qualifierList: parseStringList(qualifiers),
      };
    });
  }

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get<AnalysisTagDefinition[]>(
        `/performance-analysis/tags?tenantId=${tenantId}&includeInactive=${showInactive ? "1" : "0"}`,
      );
      setTags(hydrate(Array.isArray(data) ? data : []));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tenantId) void load();
  }, [tenantId, showInactive]);

  const shortcutConflict = useMemo(() => {
    if (!draft?.shortcutKey) return [];
    return findTagShortcutConflict(tags, []);
  }, [draft?.shortcutKey, tags]);

  const byGroup = useMemo(() => {
    const m = new Map<string, EditableTag[]>();
    for (const t of tags) {
      const g = t.tagGroup || t.category || "Geral";
      const list = m.get(g) ?? [];
      list.push(t);
      m.set(g, list);
    }
    for (const [, list] of m) list.sort((a, b) => a.sortOrder - b.sortOrder);
    return [...m.entries()];
  }, [tags]);

  function openCreate() {
    setDraft({
      id: "",
      key: "",
      label: "",
      category: "acao",
      tagGroup: "AÇÃO",
      outcomes: [],
      outcomesList: ["neutro"],
      qualifierList: [],
      sortOrder: (tags[tags.length - 1]?.sortOrder ?? 0) + 10,
      active: true,
      requiresPlayer: false,
    } as EditableTag);
    setEditOpen(true);
  }

  function openEdit(t: EditableTag) {
    setDraft({ ...t, outcomesList: [...(t.outcomesList ?? [])], qualifierList: [...(t.qualifierList ?? [])] });
    setEditOpen(true);
  }

  async function saveDraft() {
    if (!draft) return;
    setSaving(true);
    try {
      const key = draft.id ? draft.key : slugify(draft.key || draft.label);
      if (!key) throw new Error("Informe o nome da ação.");
      const body = {
        tenantId,
        id: draft.id || undefined,
        key,
        label: draft.label,
        description: draft.description ?? null,
        category: draft.category,
        tagGroup: draft.tagGroup,
        sortOrder: draft.sortOrder,
        outcomes: draft.outcomesList ?? [],
        qualifiers: draft.qualifierList ?? [],
        color: draft.color ?? null,
        icon: draft.icon ?? null,
        shortcutKey: draft.shortcutKey ?? null,
        requiresPlayer: draft.requiresPlayer,
        requiresRelatedPlayer: draft.requiresRelatedPlayer ?? false,
        requiresFieldLocation: draft.requiresFieldLocation ?? false,
        stateBehavior: draft.stateBehavior ?? null,
        active: draft.active,
      };
      await api.post("/performance-analysis/tags", body);
      setEditOpen(false);
      setDraft(null);
      await load();
      setFeedback({ title: "Salvo", message: "Tag atualizada." });
    } catch (err) {
      setFeedback({
        title: "Erro",
        message: err instanceof Error ? err.message : "Falha ao salvar.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function moveTag(id: string, dir: -1 | 1) {
    const flat = tags.map((t) => t.id);
    const i = flat.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= flat.length) return;
    const next = [...flat];
    [next[i], next[j]] = [next[j], next[i]];
    await api.post("/performance-analysis/tags/reorder", { tenantId, orderedIds: next });
    await load();
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" />
          Nova tag
        </Button>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={showInactive} onCheckedChange={(v) => setShowInactive(Boolean(v))} />
          Incluir arquivadas
        </label>
        <p className="text-xs text-muted-foreground">
          Reservados: 1/2/3 (posse) · Espaço = vídeo
        </p>
      </div>

      {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : null}

      {byGroup.map(([group, list]) => (
        <div key={group} className="rounded-lg border border-border p-3">
          <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{group}</p>
          <ul className="divide-y divide-border">
            {list.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <span
                  className="h-3 w-3 rounded-full border border-border"
                  style={{ backgroundColor: t.color ?? "transparent" }}
                />
                <span className={cn(!t.active && "opacity-50 line-through")}>{t.label}</span>
                {t.shortcutKey ? (
                  <span className="rounded bg-muted px-1.5 text-[10px] uppercase">{t.shortcutKey}</span>
                ) : null}
                <div className="ml-auto flex gap-1">
                  <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => void moveTag(t.id, -1)}>
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => void moveTag(t.id, 1)}>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => openEdit(t)}>
                    Editar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Editar tag" : "Nova tag"}</DialogTitle>
          </DialogHeader>
          {draft ? (
            <div className="space-y-3">
              <Input
                placeholder="Nome da ação"
                value={draft.label}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                className="text-foreground"
              />
              <Input
                placeholder="Descrição (opcional)"
                value={draft.description ?? ""}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                className="text-foreground"
              />
              {!draft.id ? (
                <Input
                  placeholder="Chave interna (opcional)"
                  value={draft.key}
                  onChange={(e) => setDraft({ ...draft, key: e.target.value })}
                  className="text-foreground"
                />
              ) : (
                <p className="text-xs text-muted-foreground">Chave: {draft.key}</p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Grupo"
                  value={draft.tagGroup ?? ""}
                  onChange={(e) => setDraft({ ...draft, tagGroup: e.target.value })}
                  className="text-foreground"
                />
                <Input
                  placeholder="Categoria"
                  value={draft.category ?? ""}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                  className="text-foreground"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  placeholder="Atalho"
                  value={draft.shortcutKey ?? ""}
                  onChange={(e) => setDraft({ ...draft, shortcutKey: e.target.value.toLowerCase() })}
                  className="text-foreground"
                />
                <Input
                  type="color"
                  value={draft.color ?? "#a78bfa"}
                  onChange={(e) => setDraft({ ...draft, color: e.target.value })}
                  className="h-10"
                />
                <Input
                  placeholder="Ícone (lucide)"
                  value={draft.icon ?? ""}
                  onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
                  className="text-foreground"
                />
              </div>
              {shortcutConflict.length > 0 || RESERVED_POSSESSION_KEYS.includes((draft.shortcutKey ?? "") as "1") ? (
                <p className="text-xs text-amber-300">
                  Conflito ou reserva: {shortcutConflict.join(", ") || draft.shortcutKey}
                </p>
              ) : null}
              <NativeSelectField
                value={draft.stateBehavior ?? ""}
                onChange={(e) => setDraft({ ...draft, stateBehavior: e.target.value || null })}
                placeholder="Comportamento de estado"
                options={STATE_BEHAVIORS}
              />
              <div className="flex flex-wrap gap-3 text-sm">
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={draft.requiresPlayer}
                    onCheckedChange={(v) => setDraft({ ...draft, requiresPlayer: Boolean(v) })}
                  />
                  Exige jogador
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={draft.requiresRelatedPlayer ?? false}
                    onCheckedChange={(v) => setDraft({ ...draft, requiresRelatedPlayer: Boolean(v) })}
                  />
                  Jogador relacionado
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={draft.requiresFieldLocation ?? false}
                    onCheckedChange={(v) => setDraft({ ...draft, requiresFieldLocation: Boolean(v) })}
                  />
                  Exige campo
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={draft.active}
                    onCheckedChange={(v) => setDraft({ ...draft, active: Boolean(v) })}
                  />
                  Ativa
                </label>
              </div>
              <OutcomesEditor
                items={draft.outcomesList ?? []}
                onChange={(outcomesList) => setDraft({ ...draft, outcomesList })}
              />
              <QualifiersEditor
                items={draft.qualifierList ?? []}
                onChange={(qualifierList) => setDraft({ ...draft, qualifierList })}
              />
              <Button type="button" disabled={saving} onClick={() => void saveDraft()}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salvar
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <FeedbackModal
        open={Boolean(feedback)}
        onOpenChange={() => setFeedback(null)}
        title={feedback?.title ?? ""}
        message={feedback?.message ?? ""}
      />
    </div>
  );
}

function OutcomesEditor({ items, onChange }: { items: string[]; onChange: (v: string[]) => void }) {
  const [newItem, setNewItem] = useState("");
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">Resultados</p>
      <ul className="space-y-1">
        {items.map((o, i) => (
          <li key={o + i} className="flex items-center gap-2 text-sm">
            <span className="flex-1">{labelOutcome(o)}</span>
            <code className="text-[10px] text-muted-foreground">{o}</code>
            <Button type="button" size="sm" variant="ghost" onClick={() => onChange(items.filter((_, j) => j !== i))}>
              ×
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="novo resultado (ex.: vencido)"
          className="text-foreground h-8"
        />
        <Button
          type="button"
          size="sm"
          onClick={() => {
            const k = slugify(newItem);
            if (!k || items.includes(k)) return;
            onChange([...items, k]);
            setNewItem("");
          }}
        >
          Add
        </Button>
      </div>
    </div>
  );
}

function QualifiersEditor({ items, onChange }: { items: string[]; onChange: (v: string[]) => void }) {
  const [newItem, setNewItem] = useState("");
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">Qualificadores</p>
      <ul className="space-y-1">
        {items.map((q, i) => (
          <li key={q + i} className="flex items-center gap-2 text-sm">
            <span className="flex-1">{labelQualifier(q)}</span>
            <code className="text-[10px] text-muted-foreground">{q}</code>
            <Button type="button" size="sm" variant="ghost" onClick={() => onChange(items.filter((_, j) => j !== i))}>
              ×
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="ex.: aerial"
          className="text-foreground h-8"
        />
        <Button
          type="button"
          size="sm"
          onClick={() => {
            const k = slugify(newItem);
            if (!k || items.includes(k)) return;
            onChange([...items, k]);
            setNewItem("");
          }}
        >
          Add
        </Button>
      </div>
    </div>
  );
}
