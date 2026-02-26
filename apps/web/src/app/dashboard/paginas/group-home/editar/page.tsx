"use client";

import { useState, useEffect, Fragment } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Trash2,
  Loader2,
  Plus,
  Linkedin,
  Instagram,
  Twitter,
  Globe,
  User,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  HomeContentBlock,
  HomeBlockType,
  HeroCarouselEffect,
  HeroSlide,
  HeroCarouselIntervalSeconds,
  CtaButtonConfig,
  GlobalPresenceLocation,
  GlobalPresenceCounter,
} from "@/types/home-content";
import type { BlockConfigValue } from "@/types/block-config";
import { HERO_RECOMMENDED_DIMENSIONS } from "@/types/home-content";
import { getCtaPresetContent, CTA_PRESET_OPTIONS, type CtaPresetId } from "@/lib/cta-presets";
import type { Page, PageTheme } from "@/types/page";
import {
  getBlockLabel,
  MODULE_OPTIONS,
  createBlock,
  BLOCK_TYPES_WITH_BODY,
  mergeGlobalPresenceCounters,
} from "@/lib/home-content";
import { MediaPicker } from "@/components/dashboard/MediaPicker";
import { authFetch } from "@/lib/authFetch";
import { getPublicImageUrl } from "@/lib/media-url";

function sortBlocks(blocks: HomeContentBlock[]): HomeContentBlock[] {
  return [...blocks].sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Garante: primeiro bloco = cabeçalho, último = rodapé, meio = módulos reordenáveis. */
function normalizeBlocks(blocks: HomeContentBlock[]): HomeContentBlock[] {
  const sorted = sortBlocks(blocks);
  const header = sorted.find((b) => b.type === "header") ?? createBlock("header", 0);
  const footer = sorted.find((b) => b.type === "footer") ?? createBlock("footer", 999);
  const middle = sorted.filter((b) => b.type !== "header" && b.type !== "footer");
  const list = [header, ...middle, footer];
  return list.map((b, i) => ({ ...b, sortOrder: i }));
}

/** Opções para adicionar só no meio (sem cabeçalho/rodapé no dropdown). */
const MIDDLE_MODULE_OPTIONS = MODULE_OPTIONS.filter(
  (o) => o.type !== "header" && o.type !== "footer",
);

type HeaderPreset = "classic" | "centered" | "minimal" | "overlay" | "sticky" | "split";

const HEADER_PRESET_OPTIONS: { value: HeaderPreset; label: string }[] = [
  { value: "classic", label: "Classic (logo esquerda, links direita)" },
  { value: "centered", label: "Centered (logo+nome central, links abaixo)" },
  { value: "minimal", label: "Minimal (compacto, poucos links)" },
  { value: "overlay", label: "Overlay (transparente sobre o hero)" },
  { value: "sticky", label: "Sticky (fixo no topo ao scroll)" },
  { value: "split", label: "Split (logo | links | ações)" },
];

/** Valores aplicados ao trocar o preset (sobrescreve, exceto headerLinks). */
const HEADER_PRESET_VALUES: Record<HeaderPreset, Record<string, unknown>> = {
  classic: {
    headerPreset: "classic",
    backgroundMode: "solid",
    backgroundColor: "#18181b",
    headerTextColor: "#ffffff",
    linkStyle: "text",
    logoSize: "md",
    sticky: false,
    borderBottom: false,
    borderColor: undefined,
    showLanguage: true,
    showHomeLink: true,
  },
  centered: {
    headerPreset: "centered",
    backgroundMode: "solid",
    backgroundColor: "#0b1220",
    headerTextColor: "#ffffff",
    linkStyle: "pill",
    logoSize: "lg",
    sticky: false,
    borderBottom: true,
    borderColor: "rgba(255,255,255,0.08)",
    showLanguage: true,
    showHomeLink: true,
  },
  minimal: {
    headerPreset: "minimal",
    backgroundMode: "transparent",
    backgroundColor: undefined,
    headerTextColor: "#ffffff",
    linkStyle: "text",
    logoSize: "sm",
    sticky: false,
    borderBottom: false,
    borderColor: undefined,
    showLanguage: true,
    showHomeLink: true,
  },
  overlay: {
    headerPreset: "overlay",
    backgroundMode: "blur",
    backgroundColor: undefined,
    headerTextColor: "#ffffff",
    linkStyle: "text",
    logoSize: "md",
    sticky: false,
    borderBottom: false,
    borderColor: undefined,
    showLanguage: true,
    showHomeLink: true,
  },
  sticky: {
    headerPreset: "sticky",
    backgroundMode: "solid",
    backgroundColor: "#0b1220",
    headerTextColor: "#ffffff",
    linkStyle: "text",
    logoSize: "md",
    sticky: true,
    borderBottom: true,
    borderColor: "rgba(255,255,255,0.1)",
    showLanguage: true,
    showHomeLink: true,
  },
  split: {
    headerPreset: "split",
    backgroundMode: "solid",
    backgroundColor: "#111827",
    headerTextColor: "#ffffff",
    linkStyle: "button",
    logoSize: "md",
    sticky: false,
    borderBottom: true,
    borderColor: "rgba(255,255,255,0.08)",
    showLanguage: true,
    showHomeLink: true,
  },
};

/** Aplica valores do preset ao config, sobrescrevendo campos visuais. NÃO sobrescreve headerLinks. */
function applyHeaderPresetOverwrite(
  preset: HeaderPreset,
  currentConfig: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const presetValues = HEADER_PRESET_VALUES[preset] ?? HEADER_PRESET_VALUES.classic;
  const existingLinks = Array.isArray((currentConfig ?? {}).headerLinks) ? (currentConfig as { headerLinks: unknown }).headerLinks : [];
  const merged = { ...(currentConfig ?? {}), ...presetValues };
  merged.headerLinks = existingLinks;
  return merged;
}

export default function EditarGroupHomePage() {
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [headerAdvanced, setHeaderAdvanced] = useState(false);
  const [headerDebug, setHeaderDebug] = useState(false);
  const [collapsedBlockIds, setCollapsedBlockIds] = useState<Set<string>>(new Set());
  const [globalAppearanceOpen, setGlobalAppearanceOpen] = useState(false);
  const [overlayOpacityDraft, setOverlayOpacityDraft] = useState<string | null>(null);

  const blocks = normalizeBlocks(page?.content?.blocks ?? []);
  const theme = (page?.content?.theme ?? {}) as PageTheme;
  const updateTheme = (key: keyof PageTheme, value: string | number | undefined) => {
    const normalized = value === undefined || value === null || value === "" ? undefined : value;
    setPage((prev) =>
      prev
        ? {
            ...prev,
            content: {
              ...prev.content,
              theme: { ...(prev.content.theme ?? {}), [key]: normalized },
            },
          }
        : null,
    );
  };

  const toggleBlockCollapsed = (blockId: string) => {
    setCollapsedBlockIds((prev) => {
      const next = new Set(prev);
      if (next.has(blockId)) next.delete(blockId);
      else next.add(blockId);
      return next;
    });
  };

  useEffect(() => {
    let cancelled = false;
    authFetch("/api/pages/group-home", { credentials: "include" })
      .then((r) => {
        if (r.status === 404) return null;
        if (!r.ok) return r.json().then((d) => Promise.reject(new Error((d as { error?: string })?.error ?? "Erro ao carregar página")));
        return r.json();
      })
      .then((data: Page | null) => {
        if (!cancelled && data?.content) {
          const normalized = normalizeBlocks(data.content.blocks ?? []);
          setPage({
            ...data,
            content: {
              ...data.content,
              blocks: normalized,
            },
          });
          setCollapsedBlockIds(new Set(normalized.map((b) => b.id)));
        } else if (!cancelled) {
          setPage(data);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erro");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setBlocks = (newBlocks: HomeContentBlock[]) => {
    const normalized = normalizeBlocks(newBlocks);
    setPage((prev) =>
      prev
        ? {
            ...prev,
            content: { ...prev.content, blocks: normalized },
          }
        : null,
    );
  };

  const moveBlockTo = (fromIndex: number, toIndex: number) => {
    if (fromIndex <= 0 || fromIndex >= blocks.length - 1) return;
    if (toIndex <= 0 || toIndex >= blocks.length - 1) return;
    if (fromIndex === toIndex) return;
    const next = [...blocks];
    const [removed] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, removed);
    const withOrder = next.map((b, i) => ({ ...b, sortOrder: i }));
    setBlocks(withOrder);
  };

  const updateBlockConfig = (
    index: number,
    key: string,
    value: string | undefined,
  ) => {
    const list = [...blocks];
    const block = list[index];
    if (!block) return;
    const config = { ...(block.config ?? {}), [key]: value || undefined };
    list[index] = { ...block, config };
    setBlocks(list);
  };

  const updateBlockConfigValue = (index: number, key: string, value: BlockConfigValue) => {
    const list = [...blocks];
    const block = list[index];
    if (!block) return;
    const config = { ...(block.config ?? {}), [key]: value };
    list[index] = { ...block, config };
    setBlocks(list);
  };

  const addModule = (type: HomeBlockType) => {
    if (type === "header" || type === "footer") return;
    const newBlock = createBlock(type, blocks.length - 1);
    const beforeFooter = blocks.slice(0, -1);
    setBlocks([...beforeFooter, newBlock, blocks[blocks.length - 1]!]);
    setCollapsedBlockIds((prev) => new Set(prev).add(newBlock.id));
  };

  const removeBlock = (index: number) => {
    if (index <= 0 || index >= blocks.length - 1) return;
    setBlocks(blocks.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!page) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await authFetch("/api/group", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homeContent: { theme: page.content.theme, blocks },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string })?.error ?? "Erro ao salvar");
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="space-y-6">
        <p className="text-destructive">
          Home do Grupo não configurada. Execute o seed do grupo:{" "}
          <code className="text-xs bg-muted px-1 rounded">pnpm --filter api run seed:group-home</code>
        </p>
        <Link href="/dashboard/paginas">
          <Button variant="outline">Voltar para Páginas</Button>
        </Link>
      </div>
    );
  }

  const tenantName = page.tenant?.name ?? "Home (Grupo)";

  return (
    <div className="flex flex-col gap-6">
      {/* Barra fixa: voltar, título e salvar */}
      <div className="sticky top-0 z-10 -mx-6 -mt-6 flex flex-wrap items-center justify-between gap-4 border-b border-border bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/paginas">
            <Button variant="ghost" size="icon" type="button">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold">Editar página — {tenantName}</h1>
            <p className="text-xs text-muted-foreground">
              Módulos: Hero, Destaques, textos (PT/EN), aparência.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {error && (
            <span className="text-sm text-destructive max-w-[200px] truncate" title={error}>
              {error}
            </span>
          )}
          {success && (
            <span className="text-sm text-green-600 dark:text-green-400">Salvo.</span>
          )}
          <Link href="/dashboard/paginas">
            <Button type="button" variant="outline" disabled={saving}>
              Voltar
            </Button>
          </Link>
          <Button type="submit" form="editor-group-home-form" disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </div>

      {/* Alertas em destaque abaixo da barra */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
          Página salva com sucesso.
        </div>
      )}

      <form id="editor-group-home-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Aparência geral da página — fundo, cores, fontes. Módulos podem sobrescrever. */}
        <Card className="border-violet-500/30 bg-violet-950/20">
          <CardHeader
            className="cursor-pointer select-none border-b border-transparent hover:border-violet-500/30 transition-colors"
            onClick={() => setGlobalAppearanceOpen((o) => !o)}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <CardTitle className="flex items-center gap-2">
                  <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-sm">Global</span>
                  Aparência geral da página
                </CardTitle>
                <CardDescription>
                  Fundo, cores, largura (box/full) e fontes aplicados a toda a página. Cada módulo pode sobrescrever em Aparência.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5 border-violet-500/40"
                onClick={(e) => {
                  e.stopPropagation();
                  setGlobalAppearanceOpen((o) => !o);
                }}
                aria-expanded={globalAppearanceOpen}
                aria-label={globalAppearanceOpen ? "Recolher" : "Expandir"}
              >
                {globalAppearanceOpen ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Recolher
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Expandir
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          {globalAppearanceOpen && (
          <CardContent className="space-y-4">
            <div className="space-y-3 rounded-lg border border-violet-500/30 bg-violet-500/10 p-3">
              <Label className="text-sm font-medium">Padrões (todos os módulos)</Label>
              <p className="text-xs text-muted-foreground">
                Defina aqui para não precisar configurar em cada módulo. Cada módulo pode sobrescrever em Aparência.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Largura do conteúdo</Label>
                  <Select
                    value={(theme.contentWidth as string) ?? "box"}
                    onValueChange={(v) => updateTheme("contentWidth", v as "box" | "full")}
                  >
                    <SelectTrigger className="max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="box">Box (centralizado)</SelectItem>
                      <SelectItem value="full">Full width</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Alinhamento dos títulos</Label>
                  <Select
                    value={(theme.titleAlign as string) ?? "left"}
                    onValueChange={(v) => updateTheme("titleAlign", v as "left" | "center" | "right")}
                  >
                    <SelectTrigger className="max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Esquerda</SelectItem>
                      <SelectItem value="center">Centro</SelectItem>
                      <SelectItem value="right">Direita</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Cor de fundo do corpo (hex)</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="color"
                    className="h-10 w-12 cursor-pointer rounded border border-input bg-background"
                    value={(theme.backgroundColor as string)?.trim() || "#0f0f12"}
                    onChange={(e) => updateTheme("backgroundColor", e.target.value)}
                  />
                  <Input
                    type="text"
                    placeholder="#0f0f12"
                    className="flex-1 min-w-[120px]"
                    value={(theme.backgroundColor as string) ?? ""}
                    onChange={(e) => updateTheme("backgroundColor", e.target.value.trim() || undefined)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Imagem de fundo do corpo</Label>
                <MediaPicker
                  value={(theme.backgroundImage as string) ?? ""}
                  onChange={(url) => updateTheme("backgroundImage", url || undefined)}
                  sizeKey="backgrounds"
                  uploadFolderHint="backgrounds"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Opacidade do overlay sobre a imagem (0–1)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.75"
                  value={overlayOpacityDraft ?? String(theme.backgroundOverlayOpacity ?? "")}
                  onChange={(e) => setOverlayOpacityDraft(e.target.value)}
                  onBlur={() => {
                    const v = (overlayOpacityDraft ?? "").trim();
                    const n = v === "" ? undefined : parseFloat(v);
                    const valid = typeof n === "number" && !Number.isNaN(n) && n >= 0 && n <= 1;
                    updateTheme("backgroundOverlayOpacity", valid ? n : undefined);
                    setOverlayOpacityDraft(null);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Cor do texto principal (hex)</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="color"
                    className="h-10 w-12 cursor-pointer rounded border border-input bg-background"
                    value={(theme.textColor as string)?.trim() || "#fafafa"}
                    onChange={(e) => updateTheme("textColor", e.target.value)}
                  />
                  <Input
                    type="text"
                    placeholder="#fafafa"
                    className="flex-1 min-w-[120px]"
                    value={(theme.textColor as string) ?? ""}
                    onChange={(e) => updateTheme("textColor", e.target.value.trim() || undefined)}
                  />
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Cor de destaque / links (hex)</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="color"
                    className="h-10 w-12 cursor-pointer rounded border border-input bg-background"
                    value={(theme.accentColor as string)?.trim() || "#fbbf24"}
                    onChange={(e) => updateTheme("accentColor", e.target.value)}
                  />
                  <Input
                    type="text"
                    placeholder="#fbbf24"
                    className="flex-1 min-w-[120px]"
                    value={(theme.accentColor as string) ?? ""}
                    onChange={(e) => updateTheme("accentColor", e.target.value.trim() || undefined)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Família de fontes</Label>
                <Input
                  type="text"
                  placeholder="Inter, system-ui"
                  value={(theme.fontFamily as string) ?? ""}
                  onChange={(e) => updateTheme("fontFamily", e.target.value.trim() || undefined)}
                />
              </div>
            </div>
          </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Módulos da página</CardTitle>
            <CardDescription>
              Adicione módulos no dropdown. Em cada módulo: cor de fundo, opacidade do overlay, imagem de fundo, título em PT e EN (e corpo/imagem para texto e custom).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              {((() => {
                const header = blocks[0];
                const footer = blocks[blocks.length - 1];
                const middleBlocks = blocks.slice(1, -1).map((block, i) => ({ block, index: i + 1 }));
                const visibleMiddle = middleBlocks.filter(({ block }) => block.config?.visible !== false);
                const hiddenMiddle = middleBlocks.filter(({ block }) => block.config?.visible === false);
                const rows: Array<
                  | { type: "block"; block: HomeContentBlock; index: number; hidden: boolean }
                  | { type: "add" }
                > = [
                  ...(header ? [{ type: "block" as const, block: header, index: 0, hidden: false }] : []),
                  ...visibleMiddle.map(({ block, index }) => ({ type: "block" as const, block, index, hidden: false })),
                  { type: "add" },
                  ...hiddenMiddle.map(({ block, index }) => ({ type: "block" as const, block, index, hidden: true })),
                  ...(footer ? [{ type: "block" as const, block: footer, index: blocks.length - 1, hidden: false }] : []),
                ];
                return rows.map((row) => {
                  if (row.type === "add") {
                    return (
                      <div key="add-module" className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-red-500/50 bg-red-500/15 dark:bg-red-950/50 px-3 py-4">
                        <span className="text-sm font-semibold text-muted-foreground">
                          Adicionar módulo:
                        </span>
                        <Select
                          value=""
                          onValueChange={(value) => {
                            if (value) addModule(value as HomeBlockType);
                          }}
                        >
                          <SelectTrigger className="w-[280px]">
                            <SelectValue placeholder="Hero, Destaques, Texto…" />
                          </SelectTrigger>
                          <SelectContent>
                            {MIDDLE_MODULE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.type} value={opt.type}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  }
                  const { block, index, hidden } = row;
                  const isHeader = index === 0;
                  const isFooter = index === blocks.length - 1;
                  const isFixed = isHeader || isFooter;
                  const sectionLabel = isHeader
                    ? "Cabeçalho"
                    : isFooter
                      ? "Rodapé"
                      : `Módulo — ${getBlockLabel(block.id, block.type as HomeBlockType, "pt")}`;
                  const isExpanded = !collapsedBlockIds.has(block.id);
                  const cardClassName = isHeader || isFooter
                    ? `module-card flex flex-col gap-3 rounded-lg border-2 border-emerald-500/50 bg-emerald-950/30 p-3 ${isExpanded ? "ring-2 ring-white/90" : ""}`
                    : `module-card flex flex-col gap-3 rounded-lg bg-muted/30 p-3 ${isExpanded ? "border-2 border-white/90 ring-2 ring-white/70" : "border border-border"}`;
                  return (
                    <Fragment key={block.id}>
                      <div
                        className={hidden ? "rounded-lg border-2 border-dashed border-amber-500/40 bg-amber-950/20 p-2 opacity-60" : ""}
                      >
                        {hidden && (
                          <p className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400">
                            Fora da página (oculto) — clique no olho para exibir de novo
                          </p>
                        )}
                        <div
                          className={cardClassName}
                  onDragEnter={!isFixed ? (e) => e.preventDefault() : undefined}
                  onDragOver={!isFixed ? (e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  } : undefined}
                  onDrop={!isFixed ? (e) => {
                    e.preventDefault();
                    const from = parseInt(e.dataTransfer.getData("text/plain"), 10);
                    if (Number.isNaN(from) || from === index) return;
                    moveBlockTo(from, index);
                  } : undefined}
                >
                  <div className="flex items-center gap-2">
                    {isFixed ? (
                      <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                        Fixo
                      </span>
                    ) : (
                      <div
                        draggable
                        className="flex cursor-grab items-center gap-2 active:cursor-grabbing"
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", String(index));
                          e.dataTransfer.effectAllowed = "move";
                          (e.currentTarget as HTMLElement).closest(".module-card")?.classList.add("opacity-60");
                        }}
                        onDragEnd={(e) => {
                          (e.currentTarget as HTMLElement).closest(".module-card")?.classList.remove("opacity-60");
                        }}
                        title="Arrastar para reordenar"
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                        <span className="font-medium">
                          {sectionLabel}
                        </span>
                      </div>
                    )}
                    {isFixed ? (
                      <span className="font-medium">
                        {sectionLabel}
                      </span>
                    ) : null}
                    <div className="ml-auto flex items-center gap-1">
                      {!isFixed && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={`h-8 w-8 ${block.config?.visible === false ? "text-muted-foreground" : "text-amber-500"}`}
                          onClick={() => updateBlockConfigValue(index, "visible", block.config?.visible === false ? true : false)}
                          title={block.config?.visible === false ? "Exibir na página pública" : "Ocultar da página pública"}
                          aria-label={block.config?.visible === false ? "Exibir" : "Ocultar"}
                        >
                          {block.config?.visible === false ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleBlockCollapsed(block.id)}
                        title={collapsedBlockIds.has(block.id) ? "Expandir módulo" : "Recolher módulo"}
                        aria-label={collapsedBlockIds.has(block.id) ? "Expandir módulo" : "Recolher módulo"}
                      >
                        {collapsedBlockIds.has(block.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronUp className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeBlock(index)}
                        disabled={isFixed}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {!collapsedBlockIds.has(block.id) && (
                  <div className="grid gap-3 border-t pt-3 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label className="text-muted-foreground">
                        Aparência (todos os módulos)
                      </Label>
                    </div>
                    {(block.type !== "header" && block.type !== "footer") && (
                      <>
                        <div className="space-y-2">
                          <Label>Largura do conteúdo (box ou full width)</Label>
                          <Select
                            value={(block.config?.contentWidth as string) ?? "inherit"}
                            onValueChange={(v) => updateBlockConfig(index, "contentWidth", v === "inherit" ? undefined : v)}
                          >
                            <SelectTrigger className="max-w-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="inherit">Padrão da página ({theme.contentWidth === "full" ? "full width" : "box"})</SelectItem>
                              <SelectItem value="box">Box (centralizado)</SelectItem>
                              <SelectItem value="full">Full width</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Alinhamento do título</Label>
                          <Select
                            value={(block.config?.titleAlign as string) ?? "inherit"}
                            onValueChange={(v) => updateBlockConfig(index, "titleAlign", v === "inherit" ? undefined : v)}
                          >
                            <SelectTrigger className="max-w-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="inherit">Padrão da página ({((theme.titleAlign as string) === "center" ? "centro" : (theme.titleAlign as string) === "right" ? "direita" : "esquerda")})</SelectItem>
                              <SelectItem value="left">Esquerda</SelectItem>
                              <SelectItem value="center">Centro</SelectItem>
                              <SelectItem value="right">Direita</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}
                    {block.type !== "hero" && block.type !== "global_presence" && block.type !== "logo_carousel" && (
                      <div className="space-y-2">
                        <Label>Cor de fundo (hex)</Label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            className="h-10 w-12 cursor-pointer rounded border border-input bg-background"
                            value={
                              (block.config?.backgroundColor as string) || "#18181b"
                            }
                            onChange={(e) =>
                              updateBlockConfig(
                                index,
                                "backgroundColor",
                                e.target.value,
                              )
                            }
                          />
                          <Input
                            placeholder="#18181b ou vazio"
                            value={
                              (block.config?.backgroundColor as string) ?? ""
                            }
                            onChange={(e) =>
                              updateBlockConfig(
                                index,
                                "backgroundColor",
                                e.target.value,
                              )
                            }
                          />
                        </div>
                      </div>
                    )}
                    {block.type !== "header" && block.type !== "footer" && block.type !== "global_presence" && block.type !== "logo_carousel" && (
                      <>
                        <div className="space-y-2">
                          <Label>Opacidade overlay (0-1)</Label>
                          <Input
                            type="number"
                            min={0}
                            max={1}
                            step={0.1}
                            placeholder="0.8"
                            value={
                              (block.config?.backgroundOverlayOpacity as number) ??
                              ""
                            }
                            onChange={(e) => {
                              const v = e.target.value;
                              updateBlockConfig(
                                index,
                                "backgroundOverlayOpacity",
                                v === "" ? undefined : String(Number(v)),
                              );
                            }}
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <MediaPicker
                            label="Imagem de fundo"
                            sizeKey="section_bg"
                            allowAllFolders
                            value={(block.config?.backgroundImage as string) ?? ""}
                            onChange={(url) => updateBlockConfig(index, "backgroundImage", url)}
                            placeholder="Escolher da mídia (fundo de seção)"
                          />
                          <Input
                            className="mt-1"
                            placeholder="Ou cole a URL manualmente"
                            value={(block.config?.backgroundImage as string) ?? ""}
                            onChange={(e) =>
                              updateBlockConfig(index, "backgroundImage", e.target.value)
                            }
                          />
                        </div>
                      </>
                    )}
                    {block.type !== "header" && block.type !== "footer" && block.type !== "global_presence" && block.type !== "logo_carousel" && (
                      <details className="rounded-lg border border-border bg-muted/20 sm:col-span-2">
                        <summary className="cursor-pointer px-3 py-2 font-medium">Tamanho do módulo</summary>
                        <div className="border-t border-border px-3 py-3 space-y-2">
                          <Label>Altura / espaço da seção</Label>
                          <Select
                            value={(block.config?.sectionSize as string) ?? "normal"}
                            onValueChange={(v) => updateBlockConfig(index, "sectionSize", v)}
                          >
                            <SelectTrigger className="w-full max-w-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="compact">Compacto (menor)</SelectItem>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="large">Grande (mais espaço)</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Compacto reduz o padding vertical; use para deixar o módulo menor e ganhar espaço na página.
                          </p>
                        </div>
                      </details>
                    )}
                    {block.type === "hero" && (() => {
                      const heroSlides: HeroSlide[] = Array.isArray(block.config?.heroSlides)
                        ? block.config.heroSlides
                        : (Array.isArray(block.config?.heroImages)
                          ? (block.config.heroImages as string[]).map((url) => ({ url, titlePt: "", titleEn: "" }))
                          : []);
                      const interval = (block.config?.heroCarouselIntervalSeconds as HeroCarouselIntervalSeconds) ?? 10;
                      return (
                        <>
                          <details open className="rounded-lg border border-border bg-muted/20 sm:col-span-2">
                            <summary className="cursor-pointer px-3 py-2.5 font-medium">
                              Slides do carrossel (URL + título por foto)
                            </summary>
                            <div className="border-t border-border px-3 py-3 space-y-4">
                              <p className="text-sm text-muted-foreground">
                                Recomendado: <strong>{HERO_RECOMMENDED_DIMENSIONS} px</strong>
                              </p>
                              <div className="space-y-2 sm:col-span-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const arr = [...heroSlides, { url: "", titlePt: "", titleEn: "" }];
                                    updateBlockConfigValue(index, "heroSlides", arr);
                                  }}
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Adicionar imagem
                                </Button>
                              </div>
                              <div className="space-y-2 sm:col-span-2">
                                <Label>Tempo em cada foto (temporizador)</Label>
                                <Select
                                  value={String(interval)}
                                  onValueChange={(v) =>
                                    updateBlockConfigValue(index, "heroCarouselIntervalSeconds", Number(v) as HeroCarouselIntervalSeconds)
                                  }
                                >
                                  <SelectTrigger className="w-full max-w-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="5">5 segundos</SelectItem>
                                    <SelectItem value="10">10 segundos</SelectItem>
                                    <SelectItem value="15">15 segundos</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2 sm:col-span-2">
                                <Label>Efeito do carrossel</Label>
                                <Select
                                  value={(block.config?.heroCarouselEffect as HeroCarouselEffect) ?? "fade"}
                                  onValueChange={(v) =>
                                    updateBlockConfigValue(index, "heroCarouselEffect", v as HeroCarouselEffect)
                                  }
                                >
                                  <SelectTrigger className="w-full max-w-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="fade">Fade</SelectItem>
                                    <SelectItem value="slide">Slide</SelectItem>
                                    <SelectItem value="zoom">Zoom</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2 sm:col-span-2">
                                <Label>Slides do carrossel (URL + título por foto)</Label>
                                {heroSlides.map((slide, i) => (
                                  <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                                    <MediaPicker
                                      label={`Imagem ${i + 1}`}
                                      sizeKey="hero"
                                      allowAllFolders
                                      value={slide.url}
                                      onChange={(url) => {
                                        const arr = [...heroSlides];
                                        arr[i] = { ...arr[i], url };
                                        updateBlockConfigValue(index, "heroSlides", arr);
                                      }}
                                      placeholder="Escolher da mídia (hero)"
                                    />
                                    <div className="flex gap-2">
                                      <Input
                                        placeholder="Ou cole a URL manualmente"
                                        value={slide.url}
                                        onChange={(e) => {
                                          const arr = [...heroSlides];
                                          arr[i] = { ...arr[i], url: e.target.value };
                                          updateBlockConfigValue(index, "heroSlides", arr);
                                        }}
                                      />
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="shrink-0 text-destructive"
                                        onClick={() => {
                                          const arr = heroSlides.filter((_, j) => j !== i);
                                          updateBlockConfigValue(index, "heroSlides", arr);
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                      <Input
                                        placeholder="Título da foto (PT)"
                                        value={slide.titlePt ?? ""}
                                        onChange={(e) => {
                                          const arr = [...heroSlides];
                                          arr[i] = { ...arr[i], titlePt: e.target.value };
                                          updateBlockConfigValue(index, "heroSlides", arr);
                                        }}
                                      />
                                      <Input
                                        placeholder="Title (EN)"
                                        value={slide.titleEn ?? ""}
                                        onChange={(e) => {
                                          const arr = [...heroSlides];
                                          arr[i] = { ...arr[i], titleEn: e.target.value };
                                          updateBlockConfigValue(index, "heroSlides", arr);
                                        }}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </details>
                          <details className="rounded-lg border border-border bg-muted/20 sm:col-span-2" open>
                            <summary className="cursor-pointer px-3 py-2 font-medium">Conteúdo (título já acima)</summary>
                            <div className="border-t border-border px-3 py-3 space-y-3">
                              <div className="space-y-2">
                                <Label>Subtítulo (PT)</Label>
                                <Input placeholder="Frase de posicionamento" value={(block.config?.subtitlePT as string) ?? ""} onChange={(e) => updateBlockConfig(index, "subtitlePT", e.target.value)} />
                              </div>
                              <div className="space-y-2">
                                <Label>Subtitle (EN)</Label>
                                <Input placeholder="Positioning phrase" value={(block.config?.subtitleEN as string) ?? ""} onChange={(e) => updateBlockConfig(index, "subtitleEN", e.target.value)} />
                              </div>
                              <div className="space-y-2">
                                <Label>Descrição (PT) — opcional</Label>
                                <textarea placeholder="Até 3 linhas" value={(block.config?.descriptionPT as string) ?? ""} onChange={(e) => updateBlockConfig(index, "descriptionPT", e.target.value)} rows={3} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                              </div>
                              <div className="space-y-2">
                                <Label>Description (EN) — optional</Label>
                                <textarea placeholder="Up to 3 lines" value={(block.config?.descriptionEN as string) ?? ""} onChange={(e) => updateBlockConfig(index, "descriptionEN", e.target.value)} rows={3} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                              </div>
                            </div>
                          </details>
                          <details className="rounded-lg border border-border bg-muted/20 sm:col-span-2">
                            <summary className="cursor-pointer px-3 py-2 font-medium">Ações (CTA)</summary>
                            <div className="border-t border-border px-3 py-3 space-y-4">
                              <div className="space-y-2">
                                <Label>Botão primário</Label>
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <Input placeholder="Label (PT)" value={(block.config?.primaryCTA as { labelPT?: string })?.labelPT ?? ""} onChange={(e) => updateBlockConfigValue(index, "primaryCTA", { ...(block.config?.primaryCTA as object || {}), labelPT: e.target.value })} />
                                  <Input placeholder="Label (EN)" value={(block.config?.primaryCTA as { labelEN?: string })?.labelEN ?? ""} onChange={(e) => updateBlockConfigValue(index, "primaryCTA", { ...(block.config?.primaryCTA as object || {}), labelEN: e.target.value })} />
                                </div>
                                <Input placeholder="Link (href)" value={(block.config?.primaryCTA as { href?: string })?.href ?? ""} onChange={(e) => updateBlockConfigValue(index, "primaryCTA", { ...(block.config?.primaryCTA as object || {}), href: e.target.value })} />
                              </div>
                              <div className="space-y-2">
                                <Label>Botão secundário (opcional)</Label>
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <Input placeholder="Label (PT)" value={(block.config?.secondaryCTA as { labelPT?: string })?.labelPT ?? ""} onChange={(e) => updateBlockConfigValue(index, "secondaryCTA", { ...(block.config?.secondaryCTA as object || {}), labelPT: e.target.value })} />
                                  <Input placeholder="Label (EN)" value={(block.config?.secondaryCTA as { labelEN?: string })?.labelEN ?? ""} onChange={(e) => updateBlockConfigValue(index, "secondaryCTA", { ...(block.config?.secondaryCTA as object || {}), labelEN: e.target.value })} />
                                </div>
                                <Input placeholder="Link (href)" value={(block.config?.secondaryCTA as { href?: string })?.href ?? ""} onChange={(e) => updateBlockConfigValue(index, "secondaryCTA", { ...(block.config?.secondaryCTA as object || {}), href: e.target.value })} />
                                <Select value={(block.config?.secondaryCTA as { variant?: string })?.variant ?? "outline"} onValueChange={(v) => updateBlockConfigValue(index, "secondaryCTA", { ...(block.config?.secondaryCTA as object || {}), variant: v as "outline" | "ghost" })}>
                                  <SelectTrigger className="w-full max-w-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="outline">Outline</SelectItem>
                                    <SelectItem value="ghost">Ghost</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </details>
                          <details className="rounded-lg border border-border bg-muted/20 sm:col-span-2">
                            <summary className="cursor-pointer px-3 py-2 font-medium">Cor de fundo (hex)</summary>
                            <div className="border-t border-border px-3 py-3 space-y-3">
                              <div className="space-y-2">
                                <Label>Cor de fundo da seção (hex)</Label>
                                <div className="flex gap-2">
                                  <input
                                    type="color"
                                    className="h-10 w-12 cursor-pointer rounded border border-input bg-background"
                                    value={(block.config?.backgroundColor as string) || "#18181b"}
                                    onChange={(e) => updateBlockConfig(index, "backgroundColor", e.target.value)}
                                  />
                                  <Input
                                    placeholder="#18181b ou vazio"
                                    value={(block.config?.backgroundColor as string) ?? ""}
                                    onChange={(e) => updateBlockConfig(index, "backgroundColor", e.target.value)}
                                  />
                                </div>
                              </div>
                            </div>
                          </details>
                          <details className="rounded-lg border border-border bg-muted/20 sm:col-span-2">
                            <summary className="cursor-pointer px-3 py-2 font-medium">Fundo & Overlay</summary>
                            <div className="border-t border-border px-3 py-3 space-y-3">
                              <div className="space-y-2">
                                <Label>Modo do overlay</Label>
                                <Select value={(block.config?.overlayMode as string) ?? "solid"} onValueChange={(v) => updateBlockConfig(index, "overlayMode", v)}>
                                  <SelectTrigger className="w-full max-w-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="solid">Sólido</SelectItem>
                                    <SelectItem value="gradient-bottom">Gradiente (cima→baixo)</SelectItem>
                                    <SelectItem value="gradient-right">Gradiente (esq→dir)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Cor do overlay (hex)</Label>
                                <div className="flex gap-2">
                                  <input type="color" className="h-10 w-12 cursor-pointer rounded border" value={(block.config?.overlayColor as string) || "#000000"} onChange={(e) => updateBlockConfig(index, "overlayColor", e.target.value)} />
                                  <Input placeholder="#000000" value={(block.config?.overlayColor as string) ?? ""} onChange={(e) => updateBlockConfig(index, "overlayColor", e.target.value)} />
                                </div>
                              </div>
                            </div>
                          </details>
                          <details className="rounded-lg border border-border bg-muted/20 sm:col-span-2">
                            <summary className="cursor-pointer px-3 py-2 font-medium">Layout & Estilo</summary>
                            <div className="border-t border-border px-3 py-3 space-y-3">
                              <div className="grid gap-2 sm:grid-cols-2">
                                <div className="space-y-2">
                                  <Label>Alinhamento horizontal</Label>
                                  <Select value={(block.config?.contentAlign as string) ?? "center"} onValueChange={(v) => updateBlockConfig(index, "contentAlign", v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="left">Esquerda</SelectItem>
                                      <SelectItem value="center">Centro</SelectItem>
                                      <SelectItem value="right">Direita</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>Alinhamento vertical</Label>
                                  <Select value={(block.config?.verticalAlign as string) ?? "center"} onValueChange={(v) => updateBlockConfig(index, "verticalAlign", v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="top">Topo</SelectItem>
                                      <SelectItem value="center">Centro</SelectItem>
                                      <SelectItem value="bottom">Base</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label>Largura máxima do conteúdo</Label>
                                <Select value={(block.config?.maxContentWidth as string) ?? "normal"} onValueChange={(v) => updateBlockConfig(index, "maxContentWidth", v)}>
                                  <SelectTrigger className="w-full max-w-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="narrow">Estreita</SelectItem>
                                    <SelectItem value="normal">Normal</SelectItem>
                                    <SelectItem value="wide">Larga</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Tamanho do título</Label>
                                <Select value={(block.config?.titleSize as string) ?? "2xl"} onValueChange={(v) => updateBlockConfig(index, "titleSize", v)}>
                                  <SelectTrigger className="w-full max-w-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="xl">XL</SelectItem>
                                    <SelectItem value="2xl">2XL</SelectItem>
                                    <SelectItem value="3xl">3XL</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Estilo do subtítulo</Label>
                                <Select value={(block.config?.subtitleStyle as string) ?? "normal"} onValueChange={(v) => updateBlockConfig(index, "subtitleStyle", v)}>
                                  <SelectTrigger className="w-full max-w-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="normal">Normal</SelectItem>
                                    <SelectItem value="uppercase">Uppercase</SelectItem>
                                    <SelectItem value="highlighted">Destaque (linha/cor)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Altura do Hero</Label>
                                <Select value={(block.config?.heroHeight as string) ?? "medium"} onValueChange={(v) => updateBlockConfig(index, "heroHeight", v)}>
                                  <SelectTrigger className="w-full max-w-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="screen">Tela inteira (100vh)</SelectItem>
                                    <SelectItem value="large">Grande (80vh)</SelectItem>
                                    <SelectItem value="medium">Médio (60vh)</SelectItem>
                                    <SelectItem value="compact">Compacto (50vh)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </details>
                        </>
                      );
                    })()}
                    {block.type === "header" && (() => {
                      const preset = (block.config?.headerPreset as HeaderPreset) || "classic";
                      const applyPreset = (newPreset: HeaderPreset) => {
                        const list = [...blocks];
                        const bl = list[index];
                        if (!bl) return;
                        const merged = applyHeaderPresetOverwrite(newPreset, bl.config as Record<string, unknown>);
                        list[index] = { ...bl, config: merged };
                        setBlocks(list);
                      };
                      const bgMode = (block.config?.backgroundMode as string) ?? "—";
                      const bgColor = (block.config?.backgroundColor as string) ?? "—";
                      const linkStyleVal = (block.config?.linkStyle as string) ?? "—";
                      const stickyVal = !!block.config?.sticky;
                      return (
                        <>
                          <div className="space-y-2 sm:col-span-2">
                            <Label>Modelo do Cabeçalho</Label>
                            <Select
                              value={preset}
                              onValueChange={(v) => applyPreset(v as HeaderPreset)}
                            >
                              <SelectTrigger className="w-full max-w-md">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {HEADER_PRESET_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id="header-advanced"
                                checked={headerAdvanced}
                                onChange={(e) => setHeaderAdvanced(e.target.checked)}
                              />
                              <Label htmlFor="header-advanced" className="cursor-pointer">
                                Avançado
                              </Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id="header-debug"
                                checked={headerDebug}
                                onChange={(e) => setHeaderDebug(e.target.checked)}
                              />
                              <Label htmlFor="header-debug" className="cursor-pointer">
                                Debug
                              </Label>
                            </div>
                          </div>
                          {headerDebug && (
                            <div className="sm:col-span-2 rounded border border-amber-500/40 bg-amber-950/20 px-3 py-2 text-xs font-mono text-amber-200/90 space-y-1">
                              <div>Preset atual: <strong>{preset}</strong></div>
                              <div>bgMode: {String(bgMode)} · bgColor: {String(bgColor)} · linkStyle: {String(linkStyleVal)} · sticky: {String(stickyVal)}</div>
                            </div>
                          )}
                          {!headerAdvanced && (
                            <>
                              {(preset === "overlay" || preset === "minimal") && (
                                <div className="space-y-2 sm:col-span-2">
                                  <Label>Modo de fundo</Label>
                                  <Select
                                    value={(block.config?.backgroundMode as string) || "solid"}
                                    onValueChange={(v) => updateBlockConfig(index, "backgroundMode", v)}
                                  >
                                    <SelectTrigger className="w-full max-w-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="solid">Sólido</SelectItem>
                                      <SelectItem value="transparent">Transparente</SelectItem>
                                      <SelectItem value="blur">Blur</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                              {preset === "sticky" && (
                                <div className="flex items-center gap-2 sm:col-span-2">
                                  <input
                                    type="checkbox"
                                    checked={!!block.config?.sticky}
                                    onChange={(e) => updateBlockConfigValue(index, "sticky", e.target.checked)}
                                  />
                                  <Label>Fixo no topo ao scroll</Label>
                                </div>
                              )}
                              {(preset === "minimal" || preset === "centered") && (
                                <>
                                  <div className="space-y-2">
                                    <Label>Tamanho do logo</Label>
                                    <Select
                                      value={(block.config?.logoSize as string) || "md"}
                                      onValueChange={(v) => updateBlockConfig(index, "logoSize", v)}
                                    >
                                      <SelectTrigger className="w-full">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="sm">Pequeno</SelectItem>
                                        <SelectItem value="md">Médio</SelectItem>
                                        <SelectItem value="lg">Grande</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Estilo dos links</Label>
                                    <Select
                                      value={(block.config?.linkStyle as string) || "text"}
                                      onValueChange={(v) => updateBlockConfig(index, "linkStyle", v)}
                                    >
                                      <SelectTrigger className="w-full">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="text">Texto</SelectItem>
                                        <SelectItem value="pill">Pill</SelectItem>
                                        <SelectItem value="button">Botão</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </>
                              )}
                            </>
                          )}
                          {headerAdvanced && (
                            <div className="space-y-3 sm:col-span-2">
                              <details className="rounded-lg border border-border bg-muted/20">
                                <summary className="cursor-pointer px-3 py-2 font-medium">Layout</summary>
                                <div className="border-t border-border px-3 py-3 space-y-3">
                                  <div className="space-y-2">
                                    <Label>Tamanho do logo</Label>
                                    <Select
                                      value={(block.config?.logoSize as string) || "md"}
                                      onValueChange={(v) => updateBlockConfig(index, "logoSize", v)}
                                    >
                                      <SelectTrigger className="w-full max-w-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="sm">Pequeno</SelectItem>
                                        <SelectItem value="md">Médio</SelectItem>
                                        <SelectItem value="lg">Grande</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Estilo dos links</Label>
                                    <Select
                                      value={(block.config?.linkStyle as string) || "text"}
                                      onValueChange={(v) => updateBlockConfig(index, "linkStyle", v)}
                                    >
                                      <SelectTrigger className="w-full max-w-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="text">Texto</SelectItem>
                                        <SelectItem value="pill">Pill</SelectItem>
                                        <SelectItem value="button">Botão</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      id="header-show-lang"
                                      checked={block.config?.showLanguage !== false}
                                      onChange={(e) => updateBlockConfigValue(index, "showLanguage", e.target.checked)}
                                    />
                                    <Label htmlFor="header-show-lang">Exibir idiomas (PT/EN)</Label>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      id="header-show-home"
                                      checked={block.config?.showHomeLink !== false}
                                      onChange={(e) => updateBlockConfigValue(index, "showHomeLink", e.target.checked)}
                                    />
                                    <Label htmlFor="header-show-home">Exibir link Home</Label>
                                  </div>
                                </div>
                              </details>
                              <details className="rounded-lg border border-border bg-muted/20">
                                <summary className="cursor-pointer px-3 py-2 font-medium">Aparência</summary>
                                <div className="border-t border-border px-3 py-3 space-y-3">
                                  <div className="space-y-2">
                                    <Label>Modo de fundo</Label>
                                    <Select
                                      value={(block.config?.backgroundMode as string) || "solid"}
                                      onValueChange={(v) => updateBlockConfig(index, "backgroundMode", v)}
                                    >
                                      <SelectTrigger className="w-full max-w-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="solid">Sólido</SelectItem>
                                        <SelectItem value="transparent">Transparente</SelectItem>
                                        <SelectItem value="blur">Blur</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  {(block.config?.backgroundMode as string) !== "transparent" && (block.config?.backgroundMode as string) !== "blur" && (
                                    <div className="space-y-2">
                                      <Label>Cor de fundo (hex)</Label>
                                      <div className="flex gap-2">
                                        <input
                                          type="color"
                                          className="h-10 w-12 cursor-pointer rounded border border-input bg-background"
                                          value={(block.config?.backgroundColor as string) || "#18181b"}
                                          onChange={(e) => updateBlockConfig(index, "backgroundColor", e.target.value)}
                                        />
                                        <Input
                                          placeholder="#18181b"
                                          value={(block.config?.backgroundColor as string) ?? ""}
                                          onChange={(e) => updateBlockConfig(index, "backgroundColor", e.target.value)}
                                        />
                                      </div>
                                    </div>
                                  )}
                                  <div className="space-y-2">
                                    <Label>Cor do texto (hex)</Label>
                                    <div className="flex gap-2">
                                      <input
                                        type="color"
                                        className="h-10 w-12 cursor-pointer rounded border border-input bg-background"
                                        value={(block.config?.headerTextColor as string) || "#ffffff"}
                                        onChange={(e) => updateBlockConfig(index, "headerTextColor", e.target.value)}
                                      />
                                      <Input
                                        placeholder="#ffffff"
                                        value={(block.config?.headerTextColor as string) ?? ""}
                                        onChange={(e) => updateBlockConfig(index, "headerTextColor", e.target.value)}
                                      />
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Idioma selecionado (PT/EN) — fundo</Label>
                                    <div className="flex gap-2">
                                      <input
                                        type="color"
                                        className="h-10 w-12 cursor-pointer rounded border border-input bg-background"
                                        value={
                                          (() => {
                                            const v = (block.config?.headerLanguageSelectedBg as string)?.trim();
                                            if (v?.startsWith("#") && /^#[0-9A-Fa-f]{3,8}$/.test(v)) return v;
                                            return "#ffffff";
                                          })()
                                        }
                                        onChange={(e) =>
                                          updateBlockConfig(index, "headerLanguageSelectedBg", e.target.value)
                                        }
                                      />
                                      <Input
                                        placeholder="Ex: #ffffff ou rgba(255,255,255,0.2) — vazio = automático"
                                        value={(block.config?.headerLanguageSelectedBg as string) ?? ""}
                                        onChange={(e) =>
                                          updateBlockConfig(index, "headerLanguageSelectedBg", e.target.value)
                                        }
                                      />
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Idioma selecionado (PT/EN) — texto</Label>
                                    <div className="flex gap-2">
                                      <input
                                        type="color"
                                        className="h-10 w-12 cursor-pointer rounded border border-input bg-background"
                                        value={(block.config?.headerLanguageSelectedText as string) || "#18181b"}
                                        onChange={(e) =>
                                          updateBlockConfig(index, "headerLanguageSelectedText", e.target.value)
                                        }
                                      />
                                      <Input
                                        placeholder="Ex: #18181b — vazio = automático"
                                        value={(block.config?.headerLanguageSelectedText as string) ?? ""}
                                        onChange={(e) =>
                                          updateBlockConfig(index, "headerLanguageSelectedText", e.target.value)
                                        }
                                      />
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      id="header-border"
                                      checked={!!block.config?.borderBottom}
                                      onChange={(e) => updateBlockConfigValue(index, "borderBottom", e.target.checked)}
                                    />
                                    <Label htmlFor="header-border">Borda inferior</Label>
                                  </div>
                                  {block.config?.borderBottom && (
                                    <div className="space-y-2">
                                      <Label>Cor da borda (hex ou rgba)</Label>
                                      <div className="flex gap-2">
                                        <input
                                          type="color"
                                          className="h-10 w-12 cursor-pointer rounded border border-input bg-background"
                                          value={
                                            (() => {
                                              const v = (block.config?.borderColor as string)?.trim();
                                              if (v?.startsWith("#") && /^#[0-9A-Fa-f]{3,8}$/.test(v))
                                                return v;
                                              if (v?.startsWith("rgba(")) {
                                                const m = v.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
                                                if (m) {
                                                  const r = Number(m[1]).toString(16).padStart(2, "0");
                                                  const g = Number(m[2]).toString(16).padStart(2, "0");
                                                  const b = Number(m[3]).toString(16).padStart(2, "0");
                                                  return `#${r}${g}${b}`;
                                                }
                                              }
                                              return "#ffffff";
                                            })()
                                          }
                                          onChange={(e) =>
                                            updateBlockConfig(index, "borderColor", e.target.value)
                                          }
                                        />
                                        <Input
                                          placeholder="rgba(255,255,255,0.1) ou #ffffff"
                                          value={(block.config?.borderColor as string) ?? ""}
                                          onChange={(e) =>
                                            updateBlockConfig(index, "borderColor", e.target.value)
                                          }
                                        />
                                      </div>
                                    </div>
                                  )}
                                  {preset === "sticky" && (
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={!!block.config?.sticky}
                                        onChange={(e) => updateBlockConfigValue(index, "sticky", e.target.checked)}
                                      />
                                      <Label>Fixo no topo (sticky)</Label>
                                    </div>
                                  )}
                                </div>
                              </details>
                              <details className="rounded-lg border border-border bg-muted/20" open>
                                <summary className="cursor-pointer px-3 py-2 font-medium">Links</summary>
                                <div className="border-t border-border px-3 py-3 space-y-2">
                                  <Label>Links do cabeçalho (label, href)</Label>
                                  {(Array.isArray(block.config?.headerLinks)
                                    ? block.config.headerLinks
                                    : []
                                  ).map((link: { label?: string; href?: string }, i: number) => (
                                    <div key={i} className="flex flex-wrap gap-2">
                                      <Input
                                        placeholder="Texto do link"
                                        className="flex-1 min-w-[120px]"
                                        value={link?.label ?? ""}
                                        onChange={(e) => {
                                          const arr = [...(block.config?.headerLinks ?? [])];
                                          arr[i] = { ...arr[i], label: e.target.value };
                                          updateBlockConfigValue(index, "headerLinks", arr);
                                        }}
                                      />
                                      <Input
                                        placeholder="#seção ou /url ou https://"
                                        className="flex-1 min-w-[120px]"
                                        value={link?.href ?? ""}
                                        onChange={(e) => {
                                          const arr = [...(block.config?.headerLinks ?? [])];
                                          arr[i] = { ...arr[i], href: e.target.value };
                                          updateBlockConfigValue(index, "headerLinks", arr);
                                        }}
                                      />
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="shrink-0 text-destructive"
                                        onClick={() => {
                                          const arr = (block.config?.headerLinks ?? []).filter((_: unknown, j: number) => j !== i);
                                          updateBlockConfigValue(index, "headerLinks", arr);
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ))}
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const arr = [...(block.config?.headerLinks ?? []), { label: "", href: "" }];
                                      updateBlockConfigValue(index, "headerLinks", arr);
                                    }}
                                  >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Adicionar link
                                  </Button>
                                </div>
                              </details>
                            </div>
                          )}
                          {!headerAdvanced && (
                            <div className="space-y-2 sm:col-span-2">
                              <Label>Links do cabeçalho (label, href)</Label>
                              {(Array.isArray(block.config?.headerLinks)
                                ? block.config.headerLinks
                                : []
                              ).map((link: { label?: string; href?: string }, i: number) => (
                                <div key={i} className="flex flex-wrap gap-2">
                                  <Input
                                    placeholder="Texto do link"
                                    className="flex-1 min-w-[120px]"
                                    value={link?.label ?? ""}
                                    onChange={(e) => {
                                      const arr = [...(block.config?.headerLinks ?? [])];
                                      arr[i] = { ...arr[i], label: e.target.value };
                                      updateBlockConfigValue(index, "headerLinks", arr);
                                    }}
                                  />
                                  <Input
                                    placeholder="#seção ou /url"
                                    className="flex-1 min-w-[120px]"
                                    value={link?.href ?? ""}
                                    onChange={(e) => {
                                      const arr = [...(block.config?.headerLinks ?? [])];
                                      arr[i] = { ...arr[i], href: e.target.value };
                                      updateBlockConfigValue(index, "headerLinks", arr);
                                    }}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="shrink-0 text-destructive"
                                    onClick={() => {
                                      const arr = (block.config?.headerLinks ?? []).filter((_: unknown, j: number) => j !== i);
                                      updateBlockConfigValue(index, "headerLinks", arr);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const arr = [...(block.config?.headerLinks ?? []), { label: "", href: "" }];
                                  updateBlockConfigValue(index, "headerLinks", arr);
                                }}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Adicionar link
                              </Button>
                            </div>
                          )}
                        </>
                      );
                    })()}
                    {block.type === "footer" && (
                      <>
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Cor do texto e links (hex)</Label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              className="h-10 w-12 cursor-pointer rounded border border-input bg-background"
                              value={(block.config?.footerTextColor as string) || "#71717a"}
                              onChange={(e) => updateBlockConfig(index, "footerTextColor", e.target.value)}
                            />
                            <Input
                              placeholder="#71717a ou vazio"
                              value={(block.config?.footerTextColor as string) ?? ""}
                              onChange={(e) => updateBlockConfig(index, "footerTextColor", e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Texto do rodapé</Label>
                          <Input
                            placeholder="Ex: © 2025 Nome do grupo"
                            value={(block.config?.footerText as string) ?? ""}
                            onChange={(e) => updateBlockConfig(index, "footerText", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Links do rodapé (label, href)</Label>
                          {(Array.isArray(block.config?.footerLinks)
                            ? block.config.footerLinks
                            : []
                          ).map((link: { label?: string; href?: string }, i: number) => (
                            <div key={i} className="flex flex-wrap gap-2">
                              <Input
                                placeholder="Texto do link"
                                className="flex-1 min-w-[120px]"
                                value={link?.label ?? ""}
                                onChange={(e) => {
                                  const arr = [...(block.config?.footerLinks ?? [])];
                                  arr[i] = { ...arr[i], label: e.target.value };
                                  updateBlockConfigValue(index, "footerLinks", arr);
                                }}
                              />
                              <Input
                                placeholder="#seção ou /url"
                                className="flex-1 min-w-[120px]"
                                value={link?.href ?? ""}
                                onChange={(e) => {
                                  const arr = [...(block.config?.footerLinks ?? [])];
                                  arr[i] = { ...arr[i], href: e.target.value };
                                  updateBlockConfigValue(index, "footerLinks", arr);
                                }}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="shrink-0 text-destructive"
                                onClick={() => {
                                  const arr = (block.config?.footerLinks ?? []).filter((_: unknown, j: number) => j !== i);
                                  updateBlockConfigValue(index, "footerLinks", arr);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const arr = [...(block.config?.footerLinks ?? []), { label: "", href: "" }];
                                updateBlockConfigValue(index, "footerLinks", arr);
                              }}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Adicionar link
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                    {block.type === "global_presence" && (() => {
                      const counters = mergeGlobalPresenceCounters(block.config?.counters as GlobalPresenceCounter[] | undefined);
                      const updateCounter = (i: number, field: keyof GlobalPresenceCounter, value: string | number | boolean) => {
                        const arr = [...counters];
                        arr[i] = { ...arr[i], [field]: value };
                        updateBlockConfigValue(index, "counters", arr);
                      };
                      return (
                        <div className="space-y-3 sm:col-span-2">
                          <details open className="rounded-lg border border-border bg-muted/20">
                            <summary className="cursor-pointer px-3 py-2 font-medium">Conteúdo (título, subtítulo, descrição)</summary>
                            <div className="border-t border-border px-3 py-3 space-y-3">
                              <div className="grid gap-2 sm:grid-cols-2">
                                <div className="space-y-1"><Label>Título (PT)</Label><Input placeholder="Presença Global" value={(block.config?.titlePt as string) ?? ""} onChange={(e) => updateBlockConfig(index, "titlePt", e.target.value)} /></div>
                                <div className="space-y-1"><Label>Título (EN)</Label><Input placeholder="Global Presence" value={(block.config?.titleEn as string) ?? ""} onChange={(e) => updateBlockConfig(index, "titleEn", e.target.value)} /></div>
                              </div>
                              <div className="grid gap-2 sm:grid-cols-2">
                                <div className="space-y-1"><Label>Subtítulo (PT)</Label><Input placeholder="Não somos locais. Somos plataforma." value={(block.config?.subtitlePT as string) ?? ""} onChange={(e) => updateBlockConfig(index, "subtitlePT", e.target.value)} /></div>
                                <div className="space-y-1"><Label>Subtítulo (EN)</Label><Input placeholder="We are not local. We are a platform." value={(block.config?.subtitleEN as string) ?? ""} onChange={(e) => updateBlockConfig(index, "subtitleEN", e.target.value)} /></div>
                              </div>
                              <div className="grid gap-2 sm:grid-cols-2">
                                <div className="space-y-1"><Label>Descrição (PT) — opcional</Label><Input placeholder="1–2 linhas" value={(block.config?.descriptionPT as string) ?? ""} onChange={(e) => updateBlockConfig(index, "descriptionPT", e.target.value)} /></div>
                                <div className="space-y-1"><Label>Description (EN) — optional</Label><Input placeholder="1–2 lines" value={(block.config?.descriptionEN as string) ?? ""} onChange={(e) => updateBlockConfig(index, "descriptionEN", e.target.value)} /></div>
                              </div>
                            </div>
                          </details>
                          <details className="rounded-lg border border-border bg-muted/20">
                            <summary className="cursor-pointer px-3 py-2 font-medium">Aparência (FIFA)</summary>
                            <div className="border-t border-border px-3 py-3 space-y-3">
                              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                <div className="space-y-1">
                                  <Label>Cor de fundo (hex)</Label>
                                  <div className="flex gap-2">
                                    <input type="color" className="h-10 w-12 cursor-pointer rounded border" value={(block.config?.backgroundColor as string) || "#0a0a0f"} onChange={(e) => updateBlockConfig(index, "backgroundColor", e.target.value)} />
                                    <Input placeholder="#0a0a0f" value={(block.config?.backgroundColor as string) ?? ""} onChange={(e) => updateBlockConfig(index, "backgroundColor", e.target.value)} />
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <Label>Cor de destaque / pontos (hex)</Label>
                                  <div className="flex gap-2">
                                    <input type="color" className="h-10 w-12 cursor-pointer rounded border" value={(block.config?.accentColor as string) || "#38bdf8"} onChange={(e) => updateBlockConfig(index, "accentColor", e.target.value)} />
                                    <Input placeholder="#38bdf8" value={(block.config?.accentColor as string) ?? ""} onChange={(e) => updateBlockConfig(index, "accentColor", e.target.value)} />
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <Label>Cor do mapa (mapTint hex)</Label>
                                  <div className="flex gap-2">
                                    <input type="color" className="h-10 w-12 cursor-pointer rounded border" value={(block.config?.mapTint as string) || "#334155"} onChange={(e) => updateBlockConfig(index, "mapTint", e.target.value)} />
                                    <Input placeholder="#334155" value={(block.config?.mapTint as string) ?? ""} onChange={(e) => updateBlockConfig(index, "mapTint", e.target.value)} />
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-4">
                                <div className="space-y-1">
                                  <Label>Overlay (0–1)</Label>
                                  <Input type="number" min={0} max={1} step={0.1} className="w-20" value={(block.config?.overlayOpacity as number) ?? 0.4} onChange={(e) => { const v = e.target.value; updateBlockConfigValue(index, "overlayOpacity", v === "" ? undefined : Number(e.target.value)); }} />
                                </div>
                                <div className="flex items-center gap-2">
                                  <input type="checkbox" id="gp-grid" checked={!!block.config?.showGridLines} onChange={(e) => updateBlockConfigValue(index, "showGridLines", e.target.checked)} />
                                  <Label htmlFor="gp-grid">Linhas de grid</Label>
                                </div>
                                <div className="space-y-1">
                                  <Label>Altura da seção</Label>
                                  <Select value={(block.config?.sectionHeight as string) ?? "normal"} onValueChange={(v) => updateBlockConfig(index, "sectionHeight", v)}>
                                    <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="compact">Compacto</SelectItem>
                                      <SelectItem value="normal">Normal</SelectItem>
                                      <SelectItem value="tall">Alto</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                          </details>
                          <details className="rounded-lg border border-border bg-muted/20">
                            <summary className="cursor-pointer px-3 py-2 font-medium">Contadores (Clubes, Empresas, Atletas, Projetos, Países)</summary>
                            <div className="border-t border-border px-3 py-3 space-y-3">
                              {counters.map((c, i) => (
                                <div key={c.key} className="rounded-lg border border-border p-3 flex flex-wrap items-center gap-4">
                                  <div className="flex items-center gap-2">
                                    <input type="checkbox" checked={!!c.enabled} onChange={(e) => updateCounter(i, "enabled", e.target.checked)} />
                                    <Label className="font-mono text-xs">{c.key}</Label>
                                  </div>
                                  <Input placeholder="Label PT" className="w-28" value={c.labelPT ?? ""} onChange={(e) => updateCounter(i, "labelPT", e.target.value)} />
                                  <Input placeholder="Label EN" className="w-28" value={c.labelEN ?? ""} onChange={(e) => updateCounter(i, "labelEN", e.target.value)} />
                                  <Input type="number" min={0} className="w-20" value={c.value ?? 0} onChange={(e) => updateCounter(i, "value", parseInt(e.target.value, 10) || 0)} />
                                </div>
                              ))}
                            </div>
                          </details>
                          <p className="text-xs text-muted-foreground">
                            Clubes, Empresas e Países vêm do cadastro (empresas/clubes). Atletas e Projetos são manuais. O mapa e a lista &quot;Presença por país&quot; usam os dados de lat/lng do cadastro.
                          </p>
                        </div>
                      );
                    })()}
                    {block.type === "logo_carousel" && (
                      <div className="space-y-3 sm:col-span-2">
                        <p className="text-xs text-muted-foreground">
                          Dados puxados automaticamente: clubes e empresas com logo em uma única faixa contínua.
                        </p>
                        <details open className="rounded-lg border border-border bg-muted/20">
                          <summary className="cursor-pointer px-3 py-2 font-medium">Geral (faixa e cards)</summary>
                          <div className="border-t border-border px-3 py-3 space-y-3">
                            <div className="space-y-1">
                              <Label>Cor de fundo da seção (hex)</Label>
                              <div className="flex gap-2">
                                <input type="color" className="h-10 w-12 cursor-pointer rounded border border-input bg-background shrink-0" value={(block.config?.backgroundColor as string)?.trim() || "#0f0f12"} onChange={(e) => updateBlockConfig(index, "backgroundColor", e.target.value)} />
                                <Input placeholder="#0f0f12" value={(block.config?.backgroundColor as string) ?? ""} onChange={(e) => updateBlockConfig(index, "backgroundColor", e.target.value)} className="flex-1" />
                              </div>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                              <div className="space-y-1">
                                <Label>Estilo do card</Label>
                                <Select value={(block.config?.logoCarouselCardStyle as string) ?? "fifa"} onValueChange={(v) => updateBlockConfig(index, "logoCarouselCardStyle", v)}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="fifa">FIFA (claro)</SelectItem>
                                    <SelectItem value="minimal">Minimal</SelectItem>
                                    <SelectItem value="glass">Glass (vidro)</SelectItem>
                                    <SelectItem value="dark">Escuro</SelectItem>
                                    <SelectItem value="bordered">Com borda</SelectItem>
                                    <SelectItem value="outline">Contorno (transparente)</SelectItem>
                                    <SelectItem value="gradient">Gradiente</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label>Altura do card (px)</Label>
                                <Input type="number" min={80} max={400} value={(block.config?.logoCarouselCardHeight as number) ?? 260} onChange={(e) => updateBlockConfigValue(index, "logoCarouselCardHeight", parseInt(e.target.value, 10) || 260)} />
                              </div>
                              <div className="space-y-1">
                                <Label>Largura do card (× altura)</Label>
                                <Input type="number" min={1} max={3} step={0.2} placeholder="1.6" value={(block.config?.logoCarouselCardWidthRatio as number) ?? 1.6} onChange={(e) => updateBlockConfigValue(index, "logoCarouselCardWidthRatio", parseFloat(e.target.value) || 1.6)} />
                              </div>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                              <div className="space-y-1">
                                <Label>Cor dos cards (hex)</Label>
                                <div className="flex gap-2">
                                  <input type="color" className="h-10 w-12 cursor-pointer rounded border border-input bg-background shrink-0" value={(block.config?.logoCarouselCardBackground as string)?.trim() || "#FFFFFF"} onChange={(e) => updateBlockConfig(index, "logoCarouselCardBackground", e.target.value)} />
                                  <Input placeholder="#FFFFFF" value={(block.config?.logoCarouselCardBackground as string) ?? ""} onChange={(e) => updateBlockConfig(index, "logoCarouselCardBackground", e.target.value)} />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <Label>Raio do card (px)</Label>
                                <Input type="number" min={0} max={32} value={(block.config?.logoCarouselCardRadius as number) ?? 12} onChange={(e) => updateBlockConfigValue(index, "logoCarouselCardRadius", parseInt(e.target.value, 10) ?? 12)} />
                              </div>
                              <div className="space-y-1">
                                <Label>Espaço entre cards (px)</Label>
                                <Input type="number" min={0} max={48} value={(block.config?.logoCarouselGapBetweenCards as number) ?? 16} onChange={(e) => updateBlockConfigValue(index, "logoCarouselGapBetweenCards", parseInt(e.target.value, 10) ?? 16)} />
                              </div>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                              <div className="space-y-1">
                                <Label>Espaço em cima (px)</Label>
                                <Input type="number" min={0} max={120} placeholder="24" value={(block.config?.logoCarouselPaddingTop as number) ?? 24} onChange={(e) => updateBlockConfigValue(index, "logoCarouselPaddingTop", e.target.value === "" ? undefined : parseInt(e.target.value, 10))} />
                              </div>
                              <div className="space-y-1">
                                <Label>Espaço em baixo (px)</Label>
                                <Input type="number" min={0} max={120} placeholder="24" value={(block.config?.logoCarouselPaddingBottom as number) ?? 24} onChange={(e) => updateBlockConfigValue(index, "logoCarouselPaddingBottom", e.target.value === "" ? undefined : parseInt(e.target.value, 10))} />
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-4">
                              <div className="flex items-center gap-2">
                                <input type="checkbox" id={`lc-shadow-gh-${block.id}`} checked={block.config?.logoCarouselShowShadow !== false} onChange={(e) => updateBlockConfigValue(index, "logoCarouselShowShadow", e.target.checked)} />
                                <Label htmlFor={`lc-shadow-gh-${block.id}`}>Sombra no card</Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <input type="checkbox" id={`lc-pause-gh-${block.id}`} checked={block.config?.logoCarouselPauseOnHover !== false} onChange={(e) => updateBlockConfigValue(index, "logoCarouselPauseOnHover", e.target.checked)} />
                                <Label htmlFor={`lc-pause-gh-${block.id}`}>Pausar ao passar o mouse</Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <input type="checkbox" id={`lc-newtab-gh-${block.id}`} checked={block.config?.logoCarouselOpenInNewTab !== false} onChange={(e) => updateBlockConfigValue(index, "logoCarouselOpenInNewTab", e.target.checked)} />
                                <Label htmlFor={`lc-newtab-gh-${block.id}`}>Abrir link em nova aba</Label>
                              </div>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                              <div className="space-y-1">
                                <Label>Velocidade do carrossel</Label>
                                <Select value={(block.config?.logoCarouselAnimationSpeed as string) ?? "normal"} onValueChange={(v) => updateBlockConfig(index, "logoCarouselAnimationSpeed", v)}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="slow">Lento</SelectItem>
                                    <SelectItem value="normal">Normal</SelectItem>
                                    <SelectItem value="fast">Rápido</SelectItem>
                                    <SelectItem value="strobe-05">Strobe (espera 0,5 s)</SelectItem>
                                    <SelectItem value="strobe-1">Strobe (espera 1 s)</SelectItem>
                                    <SelectItem value="strobe-2">Strobe (espera 2 s)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label>Direção</Label>
                                <Select value={(block.config?.logoCarouselDirection as string) ?? "left-to-right"} onValueChange={(v) => updateBlockConfig(index, "logoCarouselDirection", v)}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="left-to-right">Esquerda → Direita</SelectItem>
                                    <SelectItem value="right-to-left">Direita → Esquerda</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        </details>
                      </div>
                    )}
                    {block.type === "founder" && (
                      <div className="space-y-3 sm:col-span-2">
                        <details className="rounded-lg border border-border bg-muted/20" open>
                          <summary className="cursor-pointer px-3 py-2 font-medium flex items-center gap-2">
                            <User className="h-4 w-4" /> Perfil do Fundador
                          </summary>
                          <div className="border-t border-border px-3 py-3 space-y-3">
                            <div className="flex flex-wrap items-start gap-4">
                              <div className="flex flex-col items-center gap-2">
                                <div className="relative h-24 w-24 rounded-full overflow-hidden border-2 border-border bg-muted flex items-center justify-center shrink-0">
                                  {(block.config?.founderPhoto as string)?.trim() ? (
                                    <img
                                      src={getPublicImageUrl(block.config?.founderPhoto as string)}
                                      alt=""
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <User className="h-10 w-10 text-muted-foreground" />
                                  )}
                                </div>
                                <MediaPicker
                                  label=""
                                  sizeKey="card"
                                  allowAllFolders
                                  value={(block.config?.founderPhoto as string) ?? ""}
                                  onChange={(url) => updateBlockConfig(index, "founderPhoto", url)}
                                  placeholder="Adicionar foto do fundador"
                                />
                              </div>
                              <div className="flex-1 min-w-[200px] space-y-2">
                                <div className="space-y-2">
                                  <Label>Cargo / função (PT)</Label>
                                  <Input
                                    placeholder="Ex: Fundador & Chairman"
                                    value={(block.config?.rolePT as string) ?? ""}
                                    onChange={(e) => updateBlockConfig(index, "rolePT", e.target.value)}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Role (EN)</Label>
                                  <Input
                                    placeholder="e.g. Founder & Chairman"
                                    value={(block.config?.roleEN as string) ?? ""}
                                    onChange={(e) => updateBlockConfig(index, "roleEN", e.target.value)}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Ano de fundação</Label>
                                  <Input
                                    placeholder="Ex: 2015"
                                    value={(block.config?.foundedYear as string) ?? ""}
                                    onChange={(e) => updateBlockConfig(index, "foundedYear", e.target.value)}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </details>
                        <details className="rounded-lg border border-border bg-muted/20">
                          <summary className="cursor-pointer px-3 py-2 font-medium">Biografia</summary>
                          <div className="border-t border-border px-3 py-3 space-y-3">
                            <div className="space-y-2">
                              <Label>Biografia (PT)</Label>
                              <textarea
                                placeholder="Texto longo em português. Parágrafos com quebra de linha preservada."
                                value={(block.config?.biographyPT as string) ?? ""}
                                onChange={(e) => updateBlockConfig(index, "biographyPT", e.target.value)}
                                rows={6}
                                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Biography (EN)</Label>
                              <textarea
                                placeholder="Long text in English. Paragraphs with line breaks preserved."
                                value={(block.config?.biographyEN as string) ?? ""}
                                onChange={(e) => updateBlockConfig(index, "biographyEN", e.target.value)}
                                rows={6}
                                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              />
                            </div>
                          </div>
                        </details>
                        <details className="rounded-lg border border-border bg-muted/20">
                          <summary className="cursor-pointer px-3 py-2 font-medium">Destaque (citação)</summary>
                          <div className="border-t border-border px-3 py-3 space-y-3">
                            <div className="space-y-2">
                              <Label>Frase de destaque (PT)</Label>
                              <Input
                                placeholder="Ex: lema ou frase em destaque"
                                value={(block.config?.highlightQuotePT as string) ?? ""}
                                onChange={(e) => updateBlockConfig(index, "highlightQuotePT", e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Highlight quote (EN)</Label>
                              <Input
                                placeholder="e.g. motto or highlight phrase"
                                value={(block.config?.highlightQuoteEN as string) ?? ""}
                                onChange={(e) => updateBlockConfig(index, "highlightQuoteEN", e.target.value)}
                              />
                            </div>
                          </div>
                        </details>
                        <details className="rounded-lg border border-border bg-muted/20">
                          <summary className="cursor-pointer px-3 py-2 font-medium">Redes sociais</summary>
                          <div className="border-t border-border px-3 py-3 space-y-3">
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2"><Linkedin className="h-4 w-4" /> LinkedIn</Label>
                              <Input
                                placeholder="https://linkedin.com/in/..."
                                value={(block.config?.socialLinkedIn as string) ?? ""}
                                onChange={(e) => updateBlockConfig(index, "socialLinkedIn", e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2"><Instagram className="h-4 w-4" /> Instagram</Label>
                              <Input
                                placeholder="https://instagram.com/..."
                                value={(block.config?.socialInstagram as string) ?? ""}
                                onChange={(e) => updateBlockConfig(index, "socialInstagram", e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2"><Twitter className="h-4 w-4" /> Twitter / X</Label>
                              <Input
                                placeholder="https://x.com/..."
                                value={(block.config?.socialTwitter as string) ?? ""}
                                onChange={(e) => updateBlockConfig(index, "socialTwitter", e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2"><Globe className="h-4 w-4" /> Website pessoal</Label>
                              <Input
                                placeholder="https://..."
                                value={(block.config?.socialWebsite as string) ?? ""}
                                onChange={(e) => updateBlockConfig(index, "socialWebsite", e.target.value)}
                              />
                            </div>
                          </div>
                        </details>
                      </div>
                    )}
                    {block.type !== "header" && block.type !== "footer" && block.type !== "hero" && (
                      <details className="rounded-lg border border-border bg-muted/20 sm:col-span-2" open>
                        <summary className="cursor-pointer px-3 py-2 font-medium">Conteúdo (textos e ícones)</summary>
                        <div className="border-t border-border px-3 py-3 space-y-4">
                          {block.type === "highlights" && (() => {
                            const pt = (Array.isArray(block.config?.highlightsPt) ? block.config.highlightsPt : ["", "", ""]).slice(0, 3);
                            const en = (Array.isArray(block.config?.highlightsEn) ? block.config.highlightsEn : ["", "", ""]).slice(0, 3);
                            const icons = (Array.isArray(block.config?.highlightsIcons) ? block.config.highlightsIcons : ["Trophy", "Globe", "Layers"]).slice(0, 3) as [string, string, string];
                            const HIGHLIGHTS_ICON_OPTIONS = [
                              { value: "Trophy", label: "Troféu" },
                              { value: "Globe", label: "Globo" },
                              { value: "Layers", label: "Camadas" },
                              { value: "Award", label: "Prêmio" },
                              { value: "Target", label: "Alvo" },
                              { value: "Zap", label: "Raio" },
                              { value: "Building2", label: "Prédio" },
                              { value: "Users", label: "Usuários" },
                              { value: "Star", label: "Estrela" },
                              { value: "BarChart3", label: "Gráfico" },
                              { value: "Briefcase", label: "Maleta" },
                            ];
                            return (
                              <div className="space-y-4 rounded-lg border border-border p-3 bg-muted/10">
                                <p className="text-sm font-medium text-muted-foreground">Destaques — 3 cards (frases e ícone por card)</p>
                                {[0, 1, 2].map((i) => (
                                  <div key={i} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                    <div className="space-y-1">
                                      <Label>Card {i + 1} — Frase (PT)</Label>
                                      <Input
                                        placeholder={`Frase ${i + 1} em português`}
                                        value={pt[i] ?? ""}
                                        onChange={(e) => {
                                          const arr = [...pt];
                                          arr[i] = e.target.value;
                                          updateBlockConfigValue(index, "highlightsPt", arr);
                                        }}
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label>Card {i + 1} — Frase (EN)</Label>
                                      <Input
                                        placeholder={`Phrase ${i + 1} in English`}
                                        value={en[i] ?? ""}
                                        onChange={(e) => {
                                          const arr = [...en];
                                          arr[i] = e.target.value;
                                          updateBlockConfigValue(index, "highlightsEn", arr);
                                        }}
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label>Card {i + 1} — Ícone</Label>
                                      <Select
                                        value={icons[i] ?? "Trophy"}
                                        onValueChange={(v) => {
                                          const arr = [...icons];
                                          arr[i] = v;
                                          updateBlockConfigValue(index, "highlightsIcons", arr);
                                        }}
                                      >
                                        <SelectTrigger className="w-full">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {HIGHLIGHTS_ICON_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                              {opt.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                          {block.type === "what" && (() => {
                            const cardsPt = (Array.isArray(block.config?.cardsPt) ? block.config.cardsPt : []).slice(0, 4);
                            const cardsEn = (Array.isArray(block.config?.cardsEn) ? block.config.cardsEn : []).slice(0, 4);
                            const ensure4 = (arr: Array<{ title?: string; body?: string }>) => {
                              const a = [...arr];
                              while (a.length < 4) a.push({ title: "", body: "" });
                              return a.slice(0, 4);
                            };
                            const pt = ensure4(cardsPt);
                            const en = ensure4(cardsEn);
                            return (
                              <div className="space-y-4 rounded-lg border border-border p-3 bg-muted/10">
                                <p className="text-sm font-medium text-muted-foreground">O que fazemos — título, parágrafo, 4 cards e foto</p>
                                <div className="space-y-2">
                                  <Label>Parágrafo (PT) — abaixo do título</Label>
                                  <textarea placeholder="Texto descritivo em português" value={(block.config?.bodyPt as string) ?? ""} onChange={(e) => updateBlockConfig(index, "bodyPt", e.target.value)} rows={3} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                                </div>
                                <div className="space-y-2">
                                  <Label>Paragraph (EN)</Label>
                                  <textarea placeholder="Descriptive text in English" value={(block.config?.bodyEn as string) ?? ""} onChange={(e) => updateBlockConfig(index, "bodyEn", e.target.value)} rows={3} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                                </div>
                                <div className="space-y-3">
                                  <Label>4 cards (título + descrição em PT e EN)</Label>
                                  {[0, 1, 2, 3].map((i) => (
                                    <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                                      <p className="text-xs font-medium text-muted-foreground">Card {i + 1}</p>
                                      <div className="grid gap-2 sm:grid-cols-2">
                                        <Input placeholder="Título (PT)" value={pt[i]?.title ?? ""} onChange={(e) => { const arr = [...pt]; arr[i] = { ...arr[i], title: e.target.value }; updateBlockConfigValue(index, "cardsPt", arr); }} />
                                        <Input placeholder="Title (EN)" value={en[i]?.title ?? ""} onChange={(e) => { const arr = [...en]; arr[i] = { ...arr[i], title: e.target.value }; updateBlockConfigValue(index, "cardsEn", arr); }} />
                                      </div>
                                      <div className="grid gap-2 sm:grid-cols-2">
                                        <Input placeholder="Descrição (PT)" value={pt[i]?.body ?? ""} onChange={(e) => { const arr = [...pt]; arr[i] = { ...arr[i], body: e.target.value }; updateBlockConfigValue(index, "cardsPt", arr); }} />
                                        <Input placeholder="Description (EN)" value={en[i]?.body ?? ""} onChange={(e) => { const arr = [...en]; arr[i] = { ...arr[i], body: e.target.value }; updateBlockConfigValue(index, "cardsEn", arr); }} />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <div className="space-y-2">
                                  <Label>Foto da seção (lado do texto)</Label>
                                  <MediaPicker sizeKey="section_bg" allowAllFolders value={(block.config?.imageUrl as string) ?? ""} onChange={(url) => updateBlockConfig(index, "imageUrl", url)} placeholder="Escolher da mídia" />
                                  <Input placeholder="Ou URL manual" value={(block.config?.imageUrl as string) ?? ""} onChange={(e) => updateBlockConfig(index, "imageUrl", e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                  <Label>Posição da foto</Label>
                                  <Select value={(block.config?.whatImagePosition as string) ?? "right"} onValueChange={(v) => updateBlockConfig(index, "whatImagePosition", v)}>
                                    <SelectTrigger className="w-full max-w-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="right">Texto à esquerda, foto à direita</SelectItem>
                                      <SelectItem value="left">Foto à esquerda, texto à direita</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            );
                          })()}
                          {block.type === "how" && (() => {
                            const bulletsPt = (Array.isArray(block.config?.bulletsPt) ? block.config.bulletsPt : []).slice(0, 4);
                            const bulletsEn = (Array.isArray(block.config?.bulletsEn) ? block.config.bulletsEn : []).slice(0, 4);
                            const ensure4 = (arr: string[]) => {
                              const a = [...arr];
                              while (a.length < 4) a.push("");
                              return a.slice(0, 4);
                            };
                            const pt = ensure4(bulletsPt);
                            const en = ensure4(bulletsEn);
                            const icons = (Array.isArray(block.config?.howBulletsIcons) ? block.config.howBulletsIcons : ["CheckCircle", "CheckCircle", "CheckCircle", "CheckCircle"]).slice(0, 4) as [string, string, string, string];
                            const HOW_ICON_OPTIONS = [
                              { value: "CheckCircle", label: "Check (círculo)" },
                              { value: "Check", label: "Check" },
                              { value: "Trophy", label: "Troféu" },
                              { value: "Globe", label: "Globo" },
                              { value: "Layers", label: "Camadas" },
                              { value: "Award", label: "Prêmio" },
                              { value: "Target", label: "Alvo" },
                              { value: "Zap", label: "Raio" },
                              { value: "Building2", label: "Prédio" },
                              { value: "Users", label: "Usuários" },
                              { value: "Star", label: "Estrela" },
                              { value: "BarChart3", label: "Gráfico" },
                              { value: "Briefcase", label: "Maleta" },
                            ];
                            return (
                              <div className="space-y-4 rounded-lg border border-border p-3 bg-muted/10">
                                <p className="text-sm font-medium text-muted-foreground">Como funciona — título, subtítulo e 4 itens com ícone</p>
                                <div className="space-y-2">
                                  <Label>Subtítulo / parágrafo (PT) — abaixo do título</Label>
                                  <textarea placeholder="Texto em português" value={(block.config?.bodyPt as string) ?? ""} onChange={(e) => updateBlockConfig(index, "bodyPt", e.target.value)} rows={3} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                                </div>
                                <div className="space-y-2">
                                  <Label>Subtitle / paragraph (EN)</Label>
                                  <textarea placeholder="Text in English" value={(block.config?.bodyEn as string) ?? ""} onChange={(e) => updateBlockConfig(index, "bodyEn", e.target.value)} rows={3} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                                </div>
                                <div className="space-y-3">
                                  <Label>4 itens (texto em PT e EN + ícone)</Label>
                                  {[0, 1, 2, 3].map((i) => (
                                    <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                                      <p className="text-xs font-medium text-muted-foreground">Item {i + 1}</p>
                                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                        <Input placeholder="Texto (PT)" value={pt[i] ?? ""} onChange={(e) => { const arr = [...pt]; arr[i] = e.target.value; updateBlockConfigValue(index, "bulletsPt", arr); }} />
                                        <Input placeholder="Text (EN)" value={en[i] ?? ""} onChange={(e) => { const arr = [...en]; arr[i] = e.target.value; updateBlockConfigValue(index, "bulletsEn", arr); }} />
                                        <div className="sm:col-span-2 lg:col-span-1">
                                          <Select value={icons[i] ?? "CheckCircle"} onValueChange={(v) => { const arr = [...icons]; arr[i] = v; updateBlockConfigValue(index, "howBulletsIcons", arr); }}>
                                            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                              {HOW_ICON_OPTIONS.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                          {block.type === "cta" && (() => {
                            const cfg = block.config ?? {};
                            const buttons: CtaButtonConfig[] = Array.isArray(cfg.ctaButtons) ? cfg.ctaButtons.slice(0, 3) : [];
                            const applyPreset = (presetId: CtaPresetId) => {
                              const content = getCtaPresetContent(presetId);
                              if (!content) return;
                              const list = [...blocks];
                              const bl = list[index];
                              if (!bl?.config) return;
                              const c = { ...bl.config } as Record<string, unknown>;
                              if (!(c.titlePt as string)?.trim()) c.titlePt = content.titlePT;
                              if (!(c.titleEn as string)?.trim()) c.titleEn = content.titleEN;
                              if (!(c.ctaSubtitlePT as string)?.trim()) c.ctaSubtitlePT = content.subtitlePT;
                              if (!(c.ctaSubtitleEN as string)?.trim()) c.ctaSubtitleEN = content.subtitleEN;
                              if (!(c.ctaSupportTextPT as string)?.trim()) c.ctaSupportTextPT = content.supportPT;
                              if (!(c.ctaSupportTextEN as string)?.trim()) c.ctaSupportTextEN = content.supportEN;
                              if (!Array.isArray(c.ctaButtons) || (c.ctaButtons as CtaButtonConfig[]).length === 0) c.ctaButtons = content.buttons;
                              c.ctaPreset = presetId;
                              list[index] = { ...bl, config: c };
                              setBlocks(list);
                            };
                            return (
                              <div className="space-y-4 rounded-lg border border-border p-3 bg-muted/10">
                                <p className="text-sm font-medium text-muted-foreground">CTA Final — conversão institucional (até 3 botões, sem contato direto)</p>
                                <div className="space-y-2">
                                  <Label>Preset (preenche só campos vazios)</Label>
                                  <Select value={(cfg.ctaPreset as string) ?? "custom"} onValueChange={(v) => { updateBlockConfig(index, "ctaPreset", v); if (v !== "custom") applyPreset(v as CtaPresetId); }}>
                                    <SelectTrigger className="w-full max-w-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {CTA_PRESET_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <div className="space-y-1"><Label>Título (PT)</Label><Input placeholder="Headline" value={(cfg.titlePt as string) ?? ""} onChange={(e) => updateBlockConfig(index, "titlePt", e.target.value)} /></div>
                                  <div className="space-y-1"><Label>Título (EN)</Label><Input placeholder="Headline (EN)" value={(cfg.titleEn as string) ?? ""} onChange={(e) => updateBlockConfig(index, "titleEn", e.target.value)} /></div>
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <div className="space-y-1"><Label>Subtítulo (PT)</Label><Input placeholder="Subheadline" value={(cfg.ctaSubtitlePT as string) ?? ""} onChange={(e) => updateBlockConfig(index, "ctaSubtitlePT", e.target.value)} /></div>
                                  <div className="space-y-1"><Label>Subtítulo (EN)</Label><Input placeholder="Subheadline (EN)" value={(cfg.ctaSubtitleEN as string) ?? ""} onChange={(e) => updateBlockConfig(index, "ctaSubtitleEN", e.target.value)} /></div>
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <div className="space-y-1"><Label>Texto de apoio (PT) — opcional</Label><Input placeholder="Frase curta" value={(cfg.ctaSupportTextPT as string) ?? ""} onChange={(e) => updateBlockConfig(index, "ctaSupportTextPT", e.target.value)} /></div>
                                  <div className="space-y-1"><Label>Texto de apoio (EN)</Label><Input placeholder="Short line" value={(cfg.ctaSupportTextEN as string) ?? ""} onChange={(e) => updateBlockConfig(index, "ctaSupportTextEN", e.target.value)} /></div>
                                </div>
                                <div className="space-y-2">
                                  <Label>Layout</Label>
                                  <div className="flex flex-wrap gap-4">
                                    <div><Label className="text-xs text-muted-foreground">CTA Layout</Label><Select value={(cfg.ctaLayout as string) ?? "centered"} onValueChange={(v) => updateBlockConfig(index, "ctaLayout", v)}><SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="centered">Centrado</SelectItem><SelectItem value="split">Split</SelectItem><SelectItem value="boxed">Boxed</SelectItem></SelectContent></Select></div>
                                    <div><Label className="text-xs text-muted-foreground">Alinhamento texto</Label><Select value={(cfg.ctaTextAlign as string) ?? "center"} onValueChange={(v) => updateBlockConfig(index, "ctaTextAlign", v)}><SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="left">Esquerda</SelectItem><SelectItem value="center">Centro</SelectItem></SelectContent></Select></div>
                                    <div><Label className="text-xs text-muted-foreground">Largura</Label><Select value={(cfg.ctaContentWidth as string) ?? "normal"} onValueChange={(v) => updateBlockConfig(index, "ctaContentWidth", v)}><SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="normal">Normal</SelectItem><SelectItem value="wide">Larga</SelectItem></SelectContent></Select></div>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label>Fundo</Label>
                                  <div className="flex flex-wrap gap-4">
                                    <div><Label className="text-xs text-muted-foreground">Tipo</Label><Select value={(cfg.ctaBackgroundMode as string) ?? "image"} onValueChange={(v) => updateBlockConfig(index, "ctaBackgroundMode", v)}><SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="image">Imagem</SelectItem><SelectItem value="gradient">Gradiente</SelectItem><SelectItem value="solid">Cor sólida</SelectItem></SelectContent></Select></div>
                                    <div className="flex items-center gap-2"><input type="checkbox" id="cta-blur" checked={!!cfg.ctaBlur} onChange={(e) => updateBlockConfigValue(index, "ctaBlur", e.target.checked)} /><Label htmlFor="cta-blur">Blur</Label></div>
                                  </div>
                                  {(cfg.ctaBackgroundMode as string) === "image" && (
                                    <div className="space-y-1"><MediaPicker sizeKey="section_bg" allowAllFolders value={(cfg.backgroundImage as string) ?? ""} onChange={(url) => updateBlockConfig(index, "backgroundImage", url)} placeholder="Imagem de fundo" /><Input placeholder="Ou URL" value={(cfg.backgroundImage as string) ?? ""} onChange={(e) => updateBlockConfig(index, "backgroundImage", e.target.value)} /></div>
                                  )}
                                  {(cfg.ctaBackgroundMode as string) === "gradient" && (
                                    <div className="flex gap-2"><Input placeholder="Cor início (hex)" value={(cfg.ctaGradientStart as string) ?? ""} onChange={(e) => updateBlockConfig(index, "ctaGradientStart", e.target.value)} /><Input placeholder="Cor fim (hex)" value={(cfg.ctaGradientEnd as string) ?? ""} onChange={(e) => updateBlockConfig(index, "ctaGradientEnd", e.target.value)} /></div>
                                  )}
                                  {(cfg.ctaBackgroundMode as string) === "solid" && (
                                    <div className="flex gap-2"><input type="color" className="h-10 w-12 rounded border" value={(cfg.backgroundColor as string) || "#18181b"} onChange={(e) => updateBlockConfig(index, "backgroundColor", e.target.value)} /><Input placeholder="Hex" value={(cfg.backgroundColor as string) ?? ""} onChange={(e) => updateBlockConfig(index, "backgroundColor", e.target.value)} /></div>
                                  )}
                                  <div className="flex gap-2 items-center"><Label className="text-xs text-muted-foreground">Overlay (0-1)</Label><Input type="number" min={0} max={1} step={0.1} placeholder="0.75" value={(cfg.ctaOverlayOpacity as number) ?? ""} onChange={(e) => { const v = e.target.value; updateBlockConfigValue(index, "ctaOverlayOpacity", v === "" ? undefined : Number(v)); }} className="w-20" /></div>
                                </div>
                                <div className="space-y-3">
                                  <Label>Botões (até 3 — links internos, âncoras ou externos; sem contato)</Label>
                                  {[0, 1, 2].map((i) => {
                                    const btn = buttons[i] ?? {};
                                    return (
                                      <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                                        <div className="grid gap-2 sm:grid-cols-2"><Input placeholder="Label (PT)" value={btn.labelPT ?? ""} onChange={(e) => { const arr = [...buttons]; arr[i] = { ...arr[i], labelPT: e.target.value }; updateBlockConfigValue(index, "ctaButtons", arr); }} /><Input placeholder="Label (EN)" value={btn.labelEN ?? ""} onChange={(e) => { const arr = [...buttons]; arr[i] = { ...arr[i], labelEN: e.target.value }; updateBlockConfigValue(index, "ctaButtons", arr); }} /></div>
                                        <div className="flex flex-wrap gap-2">
                                          <Select value={(btn.type as string) ?? "primary"} onValueChange={(v) => { const arr = [...buttons]; arr[i] = { ...arr[i], type: v as "primary" | "secondary" | "ghost" }; updateBlockConfigValue(index, "ctaButtons", arr); }}><SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="primary">Primary</SelectItem><SelectItem value="secondary">Secondary</SelectItem><SelectItem value="ghost">Ghost</SelectItem></SelectContent></Select>
                                          <Input placeholder="URL ou #âncora" className="flex-1 min-w-[120px]" value={btn.href ?? ""} onChange={(e) => { const arr = [...buttons]; arr[i] = { ...arr[i], href: e.target.value }; updateBlockConfigValue(index, "ctaButtons", arr); }} />
                                          <label className="flex items-center gap-1"><input type="checkbox" checked={!!btn.openInNewTab} onChange={(e) => { const arr = [...buttons]; arr[i] = { ...arr[i], openInNewTab: e.target.checked }; updateBlockConfigValue(index, "ctaButtons", arr); }} /> Nova aba</label>
                                          <label className="flex items-center gap-1"><input type="checkbox" checked={!!btn.highlighted} onChange={(e) => { const arr = [...buttons]; arr[i] = { ...arr[i], highlighted: e.target.checked }; updateBlockConfigValue(index, "ctaButtons", arr); }} /> Destaque</label>
                                        </div>
                                      </div>
                                    );
                                  })}
                                  <Button type="button" variant="outline" size="sm" onClick={() => { const arr = [...buttons, { labelPT: "", labelEN: "", type: "secondary" as const, href: "" }].slice(0, 3); updateBlockConfigValue(index, "ctaButtons", arr); }} disabled={buttons.length >= 3}><Plus className="h-4 w-4 mr-1" /> Adicionar botão</Button>
                                </div>
                              </div>
                            );
                          })()}
                          {block.type !== "global_presence" && (
                          <>
                          <div className="space-y-2">
                            <Label>Título (PT)</Label>
                            <Input
                              placeholder="Título da seção em PT"
                              value={(block.config?.titlePt as string) ?? ""}
                              onChange={(e) =>
                                updateBlockConfig(index, "titlePt", e.target.value)
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Título (EN)</Label>
                            <Input
                              placeholder="Section title (EN)"
                              value={(block.config?.titleEn as string) ?? ""}
                              onChange={(e) =>
                                updateBlockConfig(index, "titleEn", e.target.value)
                              }
                            />
                          </div>
                          </>
                          )}
                          {block.type !== "global_presence" && BLOCK_TYPES_WITH_BODY.includes(block.type as HomeBlockType) && (
                            <>
                              <div className="space-y-2">
                                <Label>Corpo (PT)</Label>
                                <Input
                                  placeholder="Texto da seção em PT"
                                  value={(block.config?.bodyPt as string) ?? ""}
                                  onChange={(e) =>
                                    updateBlockConfig(
                                      index,
                                      "bodyPt",
                                      e.target.value,
                                    )
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Body (EN)</Label>
                                <Input
                                  placeholder="Section body (EN)"
                                  value={(block.config?.bodyEn as string) ?? ""}
                                  onChange={(e) =>
                                    updateBlockConfig(
                                      index,
                                      "bodyEn",
                                      e.target.value,
                                    )
                                  }
                                />
                              </div>
                            </>
                          )}
                          {(block.type === "custom" || block.type === "galeria") && (
                            <div className="space-y-2">
                              <MediaPicker
                                label="Imagem da seção"
                                sizeKey="card"
                                allowAllFolders
                                value={(block.config?.imageUrl as string) ?? ""}
                                onChange={(url) => updateBlockConfig(index, "imageUrl", url)}
                                placeholder="Escolher da mídia (card)"
                              />
                              <Input
                                className="mt-1"
                                placeholder="Ou cole a URL manualmente"
                                value={(block.config?.imageUrl as string) ?? ""}
                                onChange={(e) =>
                                  updateBlockConfig(index, "imageUrl", e.target.value)
                                }
                              />
                            </div>
                          )}
                        </div>
                      </details>
                    )}
                  </div>
                  )}
                </div>
                      </div>
                </Fragment>
                  );
                });
              });
            }}
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
