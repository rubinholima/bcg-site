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
} from "@/types/home-content";
import { HERO_RECOMMENDED_DIMENSIONS } from "@/types/home-content";
import type { Page } from "@/types/page";
import {
  getBlockLabel,
  MODULE_OPTIONS,
  createBlock,
  BLOCK_TYPES_WITH_BODY,
} from "@/lib/home-content";
import { MediaPicker } from "@/components/dashboard/MediaPicker";

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

  const blocks = normalizeBlocks(page?.content?.blocks ?? []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/pages/group-home", { credentials: "include" })
      .then((r) => {
        if (r.status === 404) return null;
        if (!r.ok) throw new Error("Erro ao carregar página");
        return r.json();
      })
      .then((data: Page | null) => {
        if (!cancelled && data?.content) {
          setPage({
            ...data,
            content: {
              ...data.content,
              blocks: normalizeBlocks(data.content.blocks ?? []),
            },
          });
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

  const moveBlock = (index: number, dir: 1 | -1) => {
    if (index <= 0 || index >= blocks.length - 1) return;
    const j = index + dir;
    if (j <= 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[j]] = [next[j], next[index]];
    setBlocks(next);
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

  const updateBlockConfigValue = (
    index: number,
    key: string,
    value: string | number | boolean | string[] | Record<string, string>[] | undefined,
  ) => {
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
      const res = await fetch("/api/group", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homeContent: { blocks },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Erro ao salvar");
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
        <Card>
          <CardHeader>
            <CardTitle>Módulos da página</CardTitle>
            <CardDescription>
              Adicione módulos no dropdown. Em cada módulo: cor de fundo, opacidade do overlay, imagem de fundo, título em PT e EN (e corpo/imagem para texto e custom).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {blocks.map((block, index) => {
                const isHeader = index === 0;
                const isFooter = index === blocks.length - 1;
                const isLastBlock = index === blocks.length - 1;
                const isFixed = isHeader || isFooter;
                const sectionLabel = isHeader
                  ? "1. Cabeçalho (sempre primeiro)"
                  : isFooter
                    ? "3. Rodapé (sempre por último)"
                    : `2. Módulos — ${getBlockLabel(block.id, block.type as HomeBlockType, "pt")}`;
                const cardClassName = isHeader || isFooter
                  ? "flex flex-col gap-3 rounded-lg border-2 border-emerald-500/50 bg-emerald-950/30 p-3"
                  : "flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3";
                return (
                <Fragment key={block.id}>
                  {isLastBlock && (
                    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-3 py-3">
                      <span className="text-sm text-muted-foreground">
                        Adicionar módulo (entre cabeçalho e rodapé):
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
                  )}
                <div className={cardClassName}>
                  <div className="flex items-center gap-2">
                    {isFixed ? (
                      <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                        Fixo
                      </span>
                    ) : (
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-medium">
                      {sectionLabel}
                    </span>
                    <div className="ml-auto flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => moveBlock(index, -1)}
                        disabled={isFixed || index === 1}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => moveBlock(index, 1)}
                        disabled={isFixed || index === blocks.length - 2}
                      >
                        <ChevronDown className="h-4 w-4" />
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
                  <div className="grid gap-3 border-t pt-3 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label className="text-muted-foreground">
                        Aparência (todos os módulos)
                      </Label>
                    </div>
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
                    {block.type !== "header" && block.type !== "footer" && (
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
                    {block.type === "hero" && (() => {
                      const heroSlides: HeroSlide[] = Array.isArray(block.config?.heroSlides)
                        ? block.config.heroSlides
                        : (Array.isArray(block.config?.heroImages)
                          ? (block.config.heroImages as string[]).map((url) => ({ url, titlePt: "", titleEn: "" }))
                          : []);
                      const interval = (block.config?.heroCarouselIntervalSeconds as HeroCarouselIntervalSeconds) ?? 10;
                      return (
                        <>
                          <p className="sm:col-span-2 text-sm text-muted-foreground">
                            Tamanho recomendado para as artes: <strong>{HERO_RECOMMENDED_DIMENSIONS} px</strong>
                          </p>
                          <div className="sm:col-span-2">
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
                                    onValueChange={(v) => updateBlockConfigValue(index, "backgroundMode", v)}
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
                                      onValueChange={(v) => updateBlockConfigValue(index, "logoSize", v)}
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
                                      onValueChange={(v) => updateBlockConfigValue(index, "linkStyle", v)}
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
                                      onValueChange={(v) => updateBlockConfigValue(index, "logoSize", v)}
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
                                      onValueChange={(v) => updateBlockConfigValue(index, "linkStyle", v)}
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
                                      onValueChange={(v) => updateBlockConfigValue(index, "backgroundMode", v)}
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
                    {block.type !== "header" && block.type !== "footer" && (
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
                    {BLOCK_TYPES_WITH_BODY.includes(block.type as HomeBlockType) && (
                      <>
                        <div className="space-y-2 sm:col-span-2">
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
                        <div className="space-y-2 sm:col-span-2">
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
                      <div className="space-y-2 sm:col-span-2">
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
                </div>
                </Fragment>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
