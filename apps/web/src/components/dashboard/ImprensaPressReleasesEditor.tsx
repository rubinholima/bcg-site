"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, History, Loader2, Megaphone, Newspaper, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import {
  type ImprensaPressReleaseItem,
  formatPressReleaseDate,
  sortPressReleasesByDate,
} from "@/lib/imprensa-press-releases";
import { AssessoriaCollapsible, ImprensaEditorTextarea } from "@/components/dashboard/AssessoriaCollapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type EditorialFields = Record<string, string>;

const EMPTY: EditorialFields = {
  imprensaReleasePt: "",
  imprensaReleaseEn: "",
  imprensaHistoriaTituloPt: "",
  imprensaHistoriaTituloEn: "",
  imprensaHistoriaPt: "",
  imprensaHistoriaEn: "",
};

function emptyRelease(): ImprensaPressReleaseItem {
  return {
    id: `pr-${Date.now()}`,
    date: new Date().toISOString().slice(0, 10),
    titlePt: "",
    titleEn: "",
    bodyPt: "",
    bodyEn: "",
  };
}

function LangColumn({
  lang,
  label,
  children,
}: {
  lang: "PT" | "EN";
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider",
            lang === "PT" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-sky-500/15 text-sky-600 dark:text-sky-400",
          )}
        >
          {lang}
        </span>
        <Label className="text-sm font-medium text-foreground">{label}</Label>
      </div>
      {children}
    </div>
  );
}

export function ImprensaPressReleasesEditor({ tenantId }: { tenantId: string }) {
  const [fields, setFields] = useState<EditorialFields>(EMPTY);
  const [releases, setReleases] = useState<ImprensaPressReleaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<{
        fields: EditorialFields;
        pressReleases: ImprensaPressReleaseItem[];
      }>(`/tenants/${tenantId}/press/editorial`);
      setFields({ ...EMPTY, ...(data.fields ?? {}) });
      setReleases(Array.isArray(data.pressReleases) ? data.pressReleases : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar conteúdo editorial.");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const setField = (key: keyof EditorialFields, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const updateRelease = (index: number, patch: Partial<ImprensaPressReleaseItem>) => {
    setReleases((prev) => {
      const arr = [...prev];
      arr[index] = { ...arr[index]!, ...patch };
      return sortPressReleasesByDate(arr);
    });
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const { data } = await api.patch<{
        fields: EditorialFields;
        pressReleases: ImprensaPressReleaseItem[];
      }>(`/tenants/${tenantId}/press/editorial`, {
        fields,
        pressReleases: sortPressReleasesByDate(releases),
      });
      setFields({ ...EMPTY, ...(data.fields ?? {}) });
      setReleases(Array.isArray(data.pressReleases) ? data.pressReleases : []);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center gap-3 rounded-2xl border border-border bg-card px-6 py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Carregando conteúdo editorial…</span>
      </div>
    );
  }

  const sorted = sortPressReleasesByDate(releases);

  return (
    <div className="overflow-hidden rounded-2xl border border-amber-500/20 bg-card shadow-sm">
      <div className="border-b border-amber-500/15 bg-gradient-to-r from-amber-500/10 via-violet-500/5 to-transparent px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Newspaper className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-foreground sm:text-xl">Conteúdo editorial</h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Apresentação, história do clube e releases por data — o que aparece na página pública de imprensa.
              </p>
            </div>
          </div>
          <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
            {sorted.length} release(s)
          </span>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {error ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <AssessoriaCollapsible
          title="Apresentação"
          description="Texto de boas-vindas no topo da página — PT e EN lado a lado."
          icon={Megaphone}
          defaultOpen
          borderClassName="border-amber-500/15"
        >
          <div className="grid gap-5 xl:grid-cols-2">
            <LangColumn lang="PT" label="Boas-vindas">
              <ImprensaEditorTextarea
                value={fields.imprensaReleasePt}
                onChange={(v) => setField("imprensaReleasePt", v)}
                placeholder="Bem-vindo à Central de Imprensa oficial…"
                rows={10}
              />
            </LangColumn>
            <LangColumn lang="EN" label="Welcome">
              <ImprensaEditorTextarea
                value={fields.imprensaReleaseEn}
                onChange={(v) => setField("imprensaReleaseEn", v)}
                placeholder="Welcome to the official Press Center…"
                rows={10}
              />
            </LangColumn>
          </div>
        </AssessoriaCollapsible>

        <AssessoriaCollapsible
          title="Press release — história do clube"
          description="Bloco expansível na página pública, logo após a apresentação."
          icon={History}
          defaultOpen
          borderClassName="border-violet-500/15"
        >
          <div className="grid gap-5 xl:grid-cols-2">
            <LangColumn lang="PT" label="Título">
              <Input
                className="h-11 text-base"
                placeholder="História do clube"
                value={fields.imprensaHistoriaTituloPt}
                onChange={(e) => setField("imprensaHistoriaTituloPt", e.target.value)}
              />
            </LangColumn>
            <LangColumn lang="EN" label="Title">
              <Input
                className="h-11 text-base"
                placeholder="Club history"
                value={fields.imprensaHistoriaTituloEn}
                onChange={(e) => setField("imprensaHistoriaTituloEn", e.target.value)}
              />
            </LangColumn>
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <LangColumn lang="PT" label="Texto completo">
              <ImprensaEditorTextarea
                value={fields.imprensaHistoriaPt}
                onChange={(v) => setField("imprensaHistoriaPt", v)}
                placeholder="História completa do clube…"
                rows={14}
                className="min-h-[20rem]"
              />
            </LangColumn>
            <LangColumn lang="EN" label="Full text">
              <ImprensaEditorTextarea
                value={fields.imprensaHistoriaEn}
                onChange={(v) => setField("imprensaHistoriaEn", v)}
                placeholder="Full club history…"
                rows={14}
                className="min-h-[20rem]"
              />
            </LangColumn>
          </div>
        </AssessoriaCollapsible>

        <AssessoriaCollapsible
          title="Releases por data"
          description="Jogos e eventos — o mais recente fica em destaque; os demais no histórico expansível."
          icon={Sparkles}
          badge={`${sorted.length}`}
          defaultOpen
          borderClassName="border-emerald-500/15"
        >
          <p className="rounded-lg bg-muted/50 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
            Ordenação automática pela <strong className="text-foreground">data do jogo</strong>, do mais recente para o mais antigo.
          </p>

          <div className="space-y-3">
            {sorted.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhum release cadastrado ainda.</p>
            ) : (
              sorted.map((rel) => {
                const index = releases.findIndex((r) => r.id === rel.id);
                const label =
                  rel.titlePt?.trim() ||
                  rel.titleEn?.trim() ||
                  formatPressReleaseDate(rel.date, "pt");
                const isLatest = sorted[0]?.id === rel.id;
                return (
                  <details
                    key={rel.id}
                    open={isLatest || undefined}
                    className="group/rel overflow-hidden rounded-xl border border-border/80 bg-muted/20"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
                      <span className="flex min-w-0 items-center gap-2.5 text-sm sm:text-base">
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition group-open/rel:rotate-180" />
                        <span className="truncate font-medium">
                          {formatPressReleaseDate(rel.date, "pt")} — {label}
                        </span>
                        {isLatest ? (
                          <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                            Destaque
                          </span>
                        ) : null}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 text-destructive"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setReleases((prev) => prev.filter((r) => r.id !== rel.id));
                          setSaved(false);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </summary>
                    <div className="space-y-4 border-t border-border/60 bg-card px-4 py-4 sm:px-5 sm:py-5">
                      <div className="space-y-2">
                        <Label>Data do jogo / evento</Label>
                        <Input
                          type="date"
                          className="h-11 max-w-xs text-base text-foreground [&::-webkit-datetime-edit]:text-foreground"
                          value={rel.date}
                          onChange={(e) => updateRelease(index, { date: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-5 xl:grid-cols-2">
                        <LangColumn lang="PT" label="Título">
                          <Input
                            className="h-11 text-base"
                            placeholder="Villa Nova 2 x 1 América"
                            value={rel.titlePt}
                            onChange={(e) => updateRelease(index, { titlePt: e.target.value })}
                          />
                        </LangColumn>
                        <LangColumn lang="EN" label="Title">
                          <Input
                            className="h-11 text-base"
                            placeholder="Match title EN"
                            value={rel.titleEn}
                            onChange={(e) => updateRelease(index, { titleEn: e.target.value })}
                          />
                        </LangColumn>
                      </div>
                      <div className="grid gap-5 xl:grid-cols-2">
                        <LangColumn lang="PT" label="Release">
                          <ImprensaEditorTextarea
                            value={rel.bodyPt}
                            onChange={(v) => updateRelease(index, { bodyPt: v })}
                            placeholder="Texto do release em português…"
                            rows={12}
                          />
                        </LangColumn>
                        <LangColumn lang="EN" label="Release">
                          <ImprensaEditorTextarea
                            value={rel.bodyEn}
                            onChange={(v) => updateRelease(index, { bodyEn: v })}
                            placeholder="Press release in English…"
                            rows={12}
                          />
                        </LangColumn>
                      </div>
                    </div>
                  </details>
                );
              })
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              setReleases((prev) => sortPressReleasesByDate([...prev, emptyRelease()]));
              setSaved(false);
            }}
          >
            <Plus className="h-4 w-4" />
            Adicionar release
          </Button>
        </AssessoriaCollapsible>
      </div>

      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-card/95 px-5 py-4 backdrop-blur sm:px-6">
        <p className="text-xs text-muted-foreground sm:text-sm">
          {saved ? (
            <span className="font-medium text-emerald-500">Alterações salvas com sucesso.</span>
          ) : (
            "Salve para publicar na página de imprensa do clube."
          )}
        </p>
        <Button type="button" onClick={() => void handleSave()} disabled={saving} size="lg" className="gap-2 px-6">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Salvando…" : "Salvar conteúdo"}
        </Button>
      </div>
    </div>
  );
}
