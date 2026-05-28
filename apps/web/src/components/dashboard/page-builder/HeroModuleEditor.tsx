"use client";

import { Plus, Trash2 } from "lucide-react";
import type { BlockConfigValue } from "@/types/block-config";
import type { HomeContentBlock, HeroCarouselEffect, HeroCarouselIntervalSeconds, HeroSlide } from "@/types/home-content";
import { HERO_RECOMMENDED_DIMENSIONS } from "@/types/home-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MediaPicker } from "@/components/dashboard/MediaPicker";
import { getPublicImageUrl, resolveMediaUrlWithProxyFallback } from "@/lib/media-url";

interface HeroModuleEditorProps {
  block: HomeContentBlock;
  index: number;
  updateBlockConfig: (index: number, key: string, value: string | undefined) => void;
  updateBlockConfigValue: (index: number, key: string, value: BlockConfigValue) => void;
}

function heroSlidesFromBlock(block: HomeContentBlock): HeroSlide[] {
  if (Array.isArray(block.config?.heroSlides)) {
    return block.config.heroSlides as HeroSlide[];
  }
  if (Array.isArray(block.config?.heroImages)) {
    return (block.config.heroImages as string[]).map((url) => ({ url, titlePt: "", titleEn: "" }));
  }
  return [];
}

function HeroSlidePreview({ url }: { url: string }) {
  const src = resolveMediaUrlWithProxyFallback(url) || getPublicImageUrl(url) || url.trim();
  if (!src) {
    return (
      <div className="flex h-28 w-full max-w-sm items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-xs text-muted-foreground">
        Sem imagem
      </div>
    );
  }
  return (
    <div className="relative h-28 w-full max-w-sm overflow-hidden rounded-lg border border-border bg-zinc-900">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="h-full w-full object-cover" />
    </div>
  );
}

export function HeroModuleEditor({
  block,
  index,
  updateBlockConfig,
  updateBlockConfigValue,
}: HeroModuleEditorProps) {
  const heroSlides = heroSlidesFromBlock(block);
  const interval = (block.config?.heroCarouselIntervalSeconds as HeroCarouselIntervalSeconds) ?? 10;

  const setSlides = (slides: HeroSlide[]) => {
    updateBlockConfigValue(index, "heroSlides", slides);
  };

  const clearAllTitles = () => {
    updateBlockConfig(index, "titlePt", undefined);
    updateBlockConfig(index, "titleEn", undefined);
    if (heroSlides.length > 0) {
      setSlides(heroSlides.map((s) => ({ ...s, titlePt: "", titleEn: "" })));
    }
  };

  return (
    <>
      <div className="space-y-3 rounded-lg border border-violet-500/40 bg-violet-500/10 p-4 sm:col-span-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-violet-200">Título do Hero</p>
            <p className="text-xs text-muted-foreground">
              Deixe vazio para <strong>sem título</strong> no site. Só aparece se você preencher.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" className="min-h-[44px]" onClick={clearAllTitles}>
            Limpar títulos
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Título (PT)</Label>
            <Input
              placeholder="Vazio = sem título"
              value={(block.config?.titlePt as string) ?? ""}
              onChange={(e) => updateBlockConfig(index, "titlePt", e.target.value.trim() || undefined)}
              className="text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label>Título (EN)</Label>
            <Input
              placeholder="Empty = no title"
              value={(block.config?.titleEn as string) ?? ""}
              onChange={(e) => updateBlockConfig(index, "titleEn", e.target.value.trim() || undefined)}
              className="text-foreground"
            />
          </div>
        </div>
      </div>

      <details className="rounded-lg border border-border bg-muted/20 sm:col-span-2" open>
        <summary className="cursor-pointer px-3 py-2.5 font-medium">Fotos do banner (carrossel)</summary>
        <div className="space-y-4 border-t border-border px-3 py-3">
          <p className="text-sm text-muted-foreground">
            Recomendado: <strong>{HERO_RECOMMENDED_DIMENSIONS} px</strong>. Escolha na mídia ou envie do computador.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-[44px]"
            onClick={() => setSlides([...heroSlides, { url: "", titlePt: "", titleEn: "" }])}
          >
            <Plus className="mr-1 h-4 w-4" />
            Adicionar foto
          </Button>

          {heroSlides.length === 0 ? (
            <p className="text-sm text-amber-600/90">Nenhuma foto — adicione ao menos uma imagem do S3/mídia.</p>
          ) : null}

          {heroSlides.map((slide, i) => (
            <div key={i} className="space-y-2 rounded-lg border border-border bg-background/50 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Foto {i + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => setSlides(heroSlides.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <HeroSlidePreview url={slide.url} />
              <MediaPicker
                label="Escolher da mídia"
                sizeKey="hero"
                allowAllFolders
                allowUpload
                uploadFolderHint="hero"
                value={slide.url}
                onChange={(url) => {
                  const arr = [...heroSlides];
                  arr[i] = { ...arr[i], url, titlePt: "", titleEn: "" };
                  setSlides(arr);
                }}
                placeholder="Imagens da pasta hero ou mídia"
              />
              <Input
                placeholder="Ou cole a URL (S3 / mídia)"
                value={slide.url}
                className="text-foreground"
                onChange={(e) => {
                  const arr = [...heroSlides];
                  arr[i] = { ...arr[i], url: e.target.value };
                  setSlides(arr);
                }}
              />
            </div>
          ))}

          {heroSlides.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tempo em cada foto</Label>
                <Select
                  value={String(interval)}
                  onValueChange={(v) =>
                    updateBlockConfigValue(index, "heroCarouselIntervalSeconds", Number(v) as HeroCarouselIntervalSeconds)
                  }
                >
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 segundos</SelectItem>
                    <SelectItem value="10">10 segundos</SelectItem>
                    <SelectItem value="15">15 segundos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Efeito</Label>
                <Select
                  value={(block.config?.heroCarouselEffect as HeroCarouselEffect) ?? "fade"}
                  onValueChange={(v) => updateBlockConfigValue(index, "heroCarouselEffect", v as HeroCarouselEffect)}
                >
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fade">Fade</SelectItem>
                    <SelectItem value="slide">Slide</SelectItem>
                    <SelectItem value="zoom">Zoom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}
        </div>
      </details>
    </>
  );
}
