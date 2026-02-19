"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Image as ImageIcon, GripVertical, ChevronUp, ChevronDown, Plus, Trash2 } from "lucide-react";
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
  HomeContentDto,
  HomeContentBlock,
  HomeBlockType,
  HeroCarouselEffect,
  HeroSlide,
  HeroCarouselIntervalSeconds,
  GlobalPresenceCounter,
} from "@/types/home-content";
import { HERO_RECOMMENDED_DIMENSIONS } from "@/types/home-content";
import { copy } from "@/lib/home-copy";
import {
  DEFAULT_BLOCK_IDS,
  getOrderedBlocks,
  getBlockLabel,
  MODULE_OPTIONS,
  createBlock,
  BLOCK_TYPES_WITH_BODY,
  mergeGlobalPresenceCounters,
} from "@/lib/home-content";
import { MediaPicker } from "@/components/dashboard/MediaPicker";

const emptyContent = (): HomeContentDto => ({
  pt: {},
  en: {},
  images: {},
});

function getNested<T>(obj: Record<string, unknown> | undefined, path: string): T | undefined {
  if (!obj) return undefined;
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current as T;
}

function setNested(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): void {
  const keys = path.split(".");
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const next = keys[i + 1];
    const isNextArray = /^\d+$/.test(next);
    if (!(key in current)) {
      current[key] = isNextArray ? [] : {};
    }
    const nextVal = current[key];
    if (Array.isArray(nextVal)) {
      current = nextVal as unknown as Record<string, unknown>;
    } else if (nextVal && typeof nextVal === "object") {
      current = nextVal as Record<string, unknown>;
    } else {
      const newVal = isNextArray ? [] : {};
      current[key] = newVal;
      current = newVal as Record<string, unknown>;
    }
  }
  const last = keys[keys.length - 1];
  if (Array.isArray(current)) {
    (current as unknown[])[Number(last)] = value;
  } else {
    current[last] = value;
  }
}

export default function ConteudoPage() {
  const [content, setContent] = useState<HomeContentDto>(emptyContent());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/home-content", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: HomeContentDto | null) => {
        if (!cancelled && data) {
          setContent({
            pt: data.pt ?? {},
            en: data.en ?? {},
            images: data.images ?? {},
            blocks: data.blocks ?? undefined,
          });
        }
      })
      .catch(() => setError("Erro ao carregar conteúdo."))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const updatePt = (path: string, value: string) => {
    setContent((prev) => {
      const pt = { ...(prev.pt ?? {}) } as Record<string, unknown>;
      setNested(pt, path, value);
      return { ...prev, pt };
    });
  };

  const updateEn = (path: string, value: string) => {
    setContent((prev) => {
      const en = { ...(prev.en ?? {}) } as Record<string, unknown>;
      setNested(en, path, value);
      return { ...prev, en };
    });
  };

  const updateImage = (key: keyof NonNullable<HomeContentDto["images"]>, value: string) => {
    setContent((prev) => ({
      ...prev,
      images: { ...(prev.images ?? {}), [key]: value || undefined },
    }));
  };

  const blocks = getOrderedBlocks(content);

  const setBlocks = (newBlocks: HomeContentBlock[]) => {
    setContent((prev) => ({
      ...prev,
      blocks: newBlocks.map((b, i) => ({ ...b, sortOrder: i })),
    }));
  };

  const moveBlock = (index: number, dir: 1 | -1) => {
    const next = [...blocks];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setBlocks(next);
  };

  const updateBlockConfig = (index: number, key: string, value: string | undefined) => {
    setContent((prev) => {
      const list = getOrderedBlocks(prev);
      const block = list[index];
      if (!block) return prev;
      const config = { ...(block.config ?? {}), [key]: value || undefined };
      const updated = list.map((b, i) => (i === index ? { ...b, config } : b));
      return { ...prev, blocks: updated.map((b, i) => ({ ...b, sortOrder: i })) };
    });
  };

  const updateBlockConfigValue = (
    index: number,
    key: string,
    value: string | number | string[] | HeroSlide[] | { label: string; href: string }[] | GlobalPresenceCounter[] | undefined,
  ) => {
    setContent((prev) => {
      const list = getOrderedBlocks(prev);
      const block = list[index];
      if (!block) return prev;
      const config = { ...(block.config ?? {}), [key]: value };
      const updated = list.map((b, i) => (i === index ? { ...b, config } : b));
      return { ...prev, blocks: updated.map((b, i) => ({ ...b, sortOrder: i })) };
    });
  };

  const addModule = (type: HomeBlockType) => {
    const list = getOrderedBlocks(content);
    const newBlock = createBlock(type, list.length);
    setContent((prev) => ({
      ...prev,
      blocks: [...list, newBlock].map((b, i) => ({ ...b, sortOrder: i })),
    }));
  };

  const removeBlock = (index: number) => {
    const next = blocks.filter((_, i) => i !== index);
    setBlocks(next);
  };

  const getPt = (path: string) =>
    (getNested<string>(content.pt as Record<string, unknown>, path) ?? "") as string;
  const getEn = (path: string) =>
    (getNested<string>(content.en as Record<string, unknown>, path) ?? "") as string;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch("/api/home-content", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Erro ao salvar");
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
      <div className="p-6">
        <p className="text-muted-foreground">Carregando conteúdo…</p>
      </div>
    );
  }

  const defaultPt = copy.pt;
  const defaultEn = copy.en;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">Conteúdo da Home</h1>
            <p className="text-sm text-muted-foreground">
              Textos e imagens da página inicial (bostoncitygroup.biz). Deixe em branco para usar o padrão.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
          Conteúdo salvo com sucesso.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Módulos da página */}
        <Card>
          <CardHeader>
            <CardTitle>Módulos da página</CardTitle>
            <CardDescription>
              Escolha o módulo no dropdown (Hero, Destaque, Texto, etc.). Em cada módulo: aparência (cor de fundo, opacidade, imagem de fundo), título PT/EN e, quando aplicável, corpo e imagem.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {blocks.map((block, index) => (
                <div
                  key={block.id}
                  className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3"
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {getBlockLabel(block.id, block.type as HomeBlockType, "pt")}
                      {block.type === "custom" && ` (${block.id})`}
                    </span>
                    <div className="ml-auto flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => moveBlock(index, -1)}
                        disabled={index === 0}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => moveBlock(index, 1)}
                        disabled={index === blocks.length - 1}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeBlock(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-3 border-t pt-3 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label className="text-muted-foreground">Aparência (todos os módulos)</Label>
                    </div>
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
                          placeholder="#18181b ou vazio"
                          value={(block.config?.backgroundColor as string) ?? ""}
                          onChange={(e) => updateBlockConfig(index, "backgroundColor", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Opacidade overlay (0-1)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={1}
                        step={0.1}
                        placeholder="0.8"
                        value={(block.config?.backgroundOverlayOpacity as number) ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          updateBlockConfig(index, "backgroundOverlayOpacity", v === "" ? undefined : String(Number(v)));
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
                        onChange={(e) => updateBlockConfig(index, "backgroundImage", e.target.value)}
                      />
                    </div>
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
                            Tamanho recomendado para as artes: <strong>{HERO_RECOMMENDED_DIMENSIONS} px</strong> (use para criar os placeholders).
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
                    {block.type === "header" && (
                      <>
                        <div className="space-y-2 sm:col-span-2">
                          <p className="text-sm text-muted-foreground">
                            O logo exibido é sempre o do grupo. Configure apenas os links.
                          </p>
                        </div>
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
                                  const arr = (block.config?.headerLinks ?? []).filter((_, j) => j !== i);
                                  updateBlockConfigValue(index, "headerLinks", arr);
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
                                const arr = [...(block.config?.headerLinks ?? []), { label: "", href: "" }];
                                updateBlockConfigValue(index, "headerLinks", arr);
                              }}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Adicionar link
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const url = typeof process.env.NEXT_PUBLIC_AWS_EMAIL_URL === "string"
                                  ? process.env.NEXT_PUBLIC_AWS_EMAIL_URL
                                  : "";
                                const arr = [...(block.config?.headerLinks ?? []), { label: "Email AWS", href: url }];
                                updateBlockConfigValue(index, "headerLinks", arr);
                              }}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Adicionar: Email AWS
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
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
                                  const arr = (block.config?.footerLinks ?? []).filter((_, j) => j !== i);
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
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const url = typeof process.env.NEXT_PUBLIC_AWS_EMAIL_URL === "string"
                                  ? process.env.NEXT_PUBLIC_AWS_EMAIL_URL
                                  : "";
                                const arr = [...(block.config?.footerLinks ?? []), { label: "Email AWS", href: url }];
                                updateBlockConfigValue(index, "footerLinks", arr);
                              }}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Adicionar: Email AWS
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
                            onChange={(e) => updateBlockConfig(index, "titlePt", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Título (EN)</Label>
                          <Input
                            placeholder="Section title (EN)"
                            value={(block.config?.titleEn as string) ?? ""}
                            onChange={(e) => updateBlockConfig(index, "titleEn", e.target.value)}
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
                            onChange={(e) => updateBlockConfig(index, "bodyPt", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Body (EN)</Label>
                          <Input
                            placeholder="Section body (EN)"
                            value={(block.config?.bodyEn as string) ?? ""}
                            onChange={(e) => updateBlockConfig(index, "bodyEn", e.target.value)}
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
                          onChange={(e) => updateBlockConfig(index, "imageUrl", e.target.value)}
                        />
                      </div>
                    )}
                    {block.type === "global_presence" && (() => {
                      const counters = mergeGlobalPresenceCounters(block.config?.counters as GlobalPresenceCounter[] | undefined);
                      const updateCounterValue = (key: GlobalPresenceCounter["key"], value: number) => {
                        const next = counters.map((c) => (c.key === key ? { ...c, value } : c));
                        updateBlockConfigValue(index, "counters", next);
                      };
                      return (
                        <div className="space-y-3 sm:col-span-2 border-t pt-3">
                          <p className="text-xs text-muted-foreground">
                            Clubes e Empresas vêm do cadastro (empresas/clubes). Atletas e Projetos são manuais. O mapa e a lista &quot;Presença por país&quot; usam as empresas/clubes que têm lat/lng no cadastro.
                          </p>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {counters.map((c) => {
                              const isManual = c.key === "athletes" || c.key === "projects";
                              return (
                                <div key={c.key} className="space-y-1.5">
                                  <Label className="text-xs">
                                    {c.labelPT}
                                    {!isManual && (
                                      <span className="ml-1 text-muted-foreground font-normal">(cadastro)</span>
                                    )}
                                  </Label>
                                  {isManual ? (
                                    <Input
                                      type="number"
                                      min={0}
                                      value={c.value}
                                      onChange={(e) =>
                                        updateCounterValue(c.key, Math.max(0, parseInt(e.target.value, 10) || 0))
                                      }
                                    />
                                  ) : (
                                    <Input type="number" min={0} value={c.value} disabled className="bg-muted" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Adicionar módulo:</span>
              <Select
                value=""
                onValueChange={(value) => {
                  if (value) addModule(value as HomeBlockType);
                }}
              >
                <SelectTrigger className="w-[280px]">
                  <SelectValue placeholder="Escolha o módulo (Hero, Destaque, Texto…)" />
                </SelectTrigger>
                <SelectContent>
                  {MODULE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.type} value={opt.type}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Hero */}
        <Card>
          <CardHeader>
            <CardTitle>Hero</CardTitle>
            <CardDescription>Manchete, subtítulo e CTAs da seção principal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Manchete (PT)</Label>
                <Input
                  placeholder={defaultPt.hero.headline}
                  value={getPt("hero.headline")}
                  onChange={(e) => updatePt("hero.headline", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Headline (EN)</Label>
                <Input
                  placeholder={defaultEn.hero.headline}
                  value={getEn("hero.headline")}
                  onChange={(e) => updateEn("hero.headline", e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Subtítulo (PT)</Label>
                <Input
                  placeholder={defaultPt.hero.subheadline?.slice(0, 60) + "…"}
                  value={getPt("hero.subheadline")}
                  onChange={(e) => updatePt("hero.subheadline", e.target.value)}
                  className="font-normal"
                />
              </div>
              <div className="space-y-2">
                <Label>Subheadline (EN)</Label>
                <Input
                  placeholder={defaultEn.hero.subheadline?.slice(0, 60) + "…"}
                  value={getEn("hero.subheadline")}
                  onChange={(e) => updateEn("hero.subheadline", e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>CTA Clubes (PT)</Label>
                <Input
                  placeholder={defaultPt.hero.ctaClubs}
                  value={getPt("hero.ctaClubs")}
                  onChange={(e) => updatePt("hero.ctaClubs", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>CTA Companies (EN)</Label>
                <Input
                  placeholder={defaultEn.hero.ctaCompanies}
                  value={getEn("hero.ctaCompanies")}
                  onChange={(e) => updateEn("hero.ctaCompanies", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Destaques */}
        <Card>
          <CardHeader>
            <CardTitle>Destaques</CardTitle>
            <CardDescription>Três frases em destaque (PT e EN)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Destaque {i + 1} (PT)</Label>
                  <Input
                    placeholder={defaultPt.highlights[i]}
                    value={getPt(`highlights.${i}`)}
                    onChange={(e) => updatePt(`highlights.${i}`, e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Highlight {i + 1} (EN)</Label>
                  <Input
                    placeholder={defaultEn.highlights[i]}
                    value={getEn(`highlights.${i}`)}
                    onChange={(e) => updateEn(`highlights.${i}`, e.target.value)}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* What */}
        <Card>
          <CardHeader>
            <CardTitle>O que fazemos</CardTitle>
            <CardDescription>Título, corpo e 4 cards (PT e EN)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Título (PT)</Label>
                <Input
                  placeholder={defaultPt.what.title}
                  value={getPt("what.title")}
                  onChange={(e) => updatePt("what.title", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Title (EN)</Label>
                <Input
                  placeholder={defaultEn.what.title}
                  value={getEn("what.title")}
                  onChange={(e) => updateEn("what.title", e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Corpo (PT)</Label>
                <Input
                  placeholder={defaultPt.what.body?.slice(0, 50) + "…"}
                  value={getPt("what.body")}
                  onChange={(e) => updatePt("what.body", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Body (EN)</Label>
                <Input
                  placeholder={defaultEn.what.body?.slice(0, 50) + "…"}
                  value={getEn("what.body")}
                  onChange={(e) => updateEn("what.body", e.target.value)}
                />
              </div>
            </div>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="grid gap-4 md:grid-cols-2 border-t pt-4">
                <div className="space-y-2">
                  <Label>Card {i + 1} título (PT)</Label>
                  <Input
                    placeholder={defaultPt.what.cards[i]?.title}
                    value={getPt(`what.cards.${i}.title`)}
                    onChange={(e) => updatePt(`what.cards.${i}.title`, e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Card {i + 1} body (EN)</Label>
                  <Input
                    placeholder={defaultEn.what.cards[i]?.body}
                    value={getEn(`what.cards.${i}.body`)}
                    onChange={(e) => updateEn(`what.cards.${i}.body`, e.target.value)}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Clubes / Companies */}
        <Card>
          <CardHeader>
            <CardTitle>Clubes e Empresas</CardTitle>
            <CardDescription>Títulos e botões das seções Clubes e Empresas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Clubes título (PT)</Label>
                <Input
                  placeholder={defaultPt.clubs.title}
                  value={getPt("clubs.title")}
                  onChange={(e) => updatePt("clubs.title", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Clubs title (EN)</Label>
                <Input
                  placeholder={defaultEn.clubs.title}
                  value={getEn("clubs.title")}
                  onChange={(e) => updateEn("clubs.title", e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Clubes subtítulo (PT)</Label>
                <Input
                  placeholder={defaultPt.clubs.subtext}
                  value={getPt("clubs.subtext")}
                  onChange={(e) => updatePt("clubs.subtext", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Companies title (EN)</Label>
                <Input
                  placeholder={defaultEn.companies.title}
                  value={getEn("companies.title")}
                  onChange={(e) => updateEn("companies.title", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fundador */}
        <Card>
          <CardHeader>
            <CardTitle>Fundador</CardTitle>
            <CardDescription>Título, corpo, bullets e citação (PT e EN)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Título (PT)</Label>
                <Input
                  placeholder={defaultPt.founder.title}
                  value={getPt("founder.title")}
                  onChange={(e) => updatePt("founder.title", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Title (EN)</Label>
                <Input
                  placeholder={defaultEn.founder.title}
                  value={getEn("founder.title")}
                  onChange={(e) => updateEn("founder.title", e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Corpo (PT)</Label>
                <Input
                  placeholder={defaultPt.founder.body?.slice(0, 50) + "…"}
                  value={getPt("founder.body")}
                  onChange={(e) => updatePt("founder.body", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Quote (EN)</Label>
                <Input
                  placeholder={defaultEn.founder.quote}
                  value={getEn("founder.quote")}
                  onChange={(e) => updateEn("founder.quote", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* How */}
        <Card>
          <CardHeader>
            <CardTitle>Como funciona</CardTitle>
            <CardDescription>Título, corpo e 4 bullets (PT e EN)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Título (PT)</Label>
                <Input
                  placeholder={defaultPt.how.title}
                  value={getPt("how.title")}
                  onChange={(e) => updatePt("how.title", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Title (EN)</Label>
                <Input
                  placeholder={defaultEn.how.title}
                  value={getEn("how.title")}
                  onChange={(e) => updateEn("how.title", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <Card>
          <CardHeader>
            <CardTitle>CTA final</CardTitle>
            <CardDescription>Título, corpo e rótulos dos botões (PT e EN)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Título (PT)</Label>
                <Input
                  placeholder={defaultPt.cta.title}
                  value={getPt("cta.title")}
                  onChange={(e) => updatePt("cta.title", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Contact button (PT)</Label>
                <Input
                  placeholder={defaultPt.cta.contact}
                  value={getPt("cta.contact")}
                  onChange={(e) => updatePt("cta.contact", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Imagens */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Imagens da Home
            </CardTitle>
            <CardDescription>
              URLs das fotos (Hero, O que fazemos, Fundador, CTA). Deixe em branco para usar as imagens padrão.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Imagem do Hero (fundo)</Label>
              <Input
                placeholder="https://..."
                value={content.images?.hero ?? ""}
                onChange={(e) => updateImage("hero", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Imagem da seção O que fazemos</Label>
              <Input
                placeholder="https://..."
                value={content.images?.what ?? ""}
                onChange={(e) => updateImage("what", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Imagem da seção Fundador</Label>
              <Input
                placeholder="https://..."
                value={content.images?.founder ?? ""}
                onChange={(e) => updateImage("founder", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Imagem de fundo do CTA final</Label>
              <Input
                placeholder="https://..."
                value={content.images?.cta ?? ""}
                onChange={(e) => updateImage("cta", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Link href="/dashboard">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Salvando…" : "Salvar conteúdo"}
          </Button>
        </div>
      </form>
    </div>
  );
}
