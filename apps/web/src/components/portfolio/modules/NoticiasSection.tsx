"use client";

import { useState, useEffect, useMemo } from "react";
import type { HomeContentBlock } from "@/types/home-content";
import type { NoticiasItem } from "@/types/home-content";
import { AnimateInView } from "@/components/home/AnimateInView";
import { SectionTitle } from "@/components/portfolio/SectionTitle";
import { getPublicImageUrl } from "@/lib/media-url";
import { moduleBottomBorderClass } from "@/lib/module-section-border";
import { moduleSectionContainerClass } from "@/lib/module-section-container";
import { SmartImage } from "@/components/common/SmartImage";
import {
  normalizeNoticiasColumns,
  normalizeNoticiasMaxItems,
  noticiasGridClass,
} from "@/lib/noticias-grid";
import {
  normalizeNoticiasOrderMode,
  noticiasFeedFetchMax,
  orderNoticiasForDisplay,
} from "@/lib/noticias-order";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Newspaper, ExternalLink, Loader2 } from "lucide-react";

function NewsCardImage({ src, srcOriginal }: { src: string; srcOriginal?: string }) {
  const [failed, setFailed] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const baseSrc =
    typeof window !== "undefined" && src.startsWith("/") ? `${window.location.origin}${src}` : src;
  const proxyFallbackUrl = (() => {
    if (!baseSrc.includes("/api/public/noticias-image?")) return null;
    try {
      const u = new URL(baseSrc);
      const encoded = u.searchParams.get("url");
      return encoded ? decodeURIComponent(encoded) : null;
    } catch {
      return null;
    }
  })();
  const isBlockedCdn = (url?: string) =>
    url && /cdninstagram|fbcdn\.net|instagram\.com/i.test(url);
  const imgSrc =
    useFallback && proxyFallbackUrl && srcOriginal && !isBlockedCdn(srcOriginal)
      ? srcOriginal
      : baseSrc;
  if (failed) {
    return (
      <div className="flex aspect-video w-full shrink-0 items-center justify-center bg-zinc-800/80">
        <Newspaper className="h-12 w-12 text-zinc-500" />
      </div>
    );
  }
  return (
    <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-zinc-800">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imgSrc}
        alt=""
        className="h-full w-full object-cover transition-transform group-hover:scale-105"
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => {
          if (!useFallback && proxyFallbackUrl && srcOriginal && !isBlockedCdn(srcOriginal)) {
            setUseFallback(true);
          } else {
            setFailed(true);
          }
        }}
      />
    </div>
  );
}

const PADDING_CLASSES = {
  minimal: { top: "pt-4 sm:pt-5", bottom: "pb-4 sm:pb-5" },
  compact: { top: "pt-6 sm:pt-8", bottom: "pb-6 sm:pb-8" },
  normal: { top: "pt-12 sm:pt-16", bottom: "pb-12 sm:pb-16" },
  large: { top: "pt-20 sm:pt-24", bottom: "pb-20 sm:pb-24" },
} as const;

async function fetchRssFeed(rssUrl: string, max: number): Promise<NoticiasItem[]> {
  const params = new URLSearchParams({ rssUrl, max: String(max) });
  const res = await fetch(`/api/public/noticias-feed?${params}`, { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  if (Array.isArray(data)) return data;
  if (data?.error) return [];
  return [];
}

function formatDate(iso: string | undefined, lang: "pt" | "en"): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(lang === "pt" ? "pt-BR" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function NoticiasArticleDialog({
  item,
  lang,
  open,
  onOpenChange,
}: {
  item: NoticiasItem | null;
  lang: "pt" | "en";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bcg-modal w-[min(42rem,calc(100vw-1.25rem))] max-h-[calc(100vh-1.25rem)] border border-white/10 bg-zinc-950 text-zinc-100"
        showCloseButton
      >
        <DialogHeader className="space-y-3 text-left">
          {(item.imageUrl || item.imageUrlOriginal) && (
            <div className="overflow-hidden rounded-lg border border-white/10">
              <NewsCardImage
                src={item.imageUrl ?? item.imageUrlOriginal ?? ""}
                srcOriginal={item.imageUrlOriginal}
              />
            </div>
          )}
          <DialogTitle className="text-xl leading-snug text-white sm:text-2xl">
            {item.title}
          </DialogTitle>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
            {item.dateISO ? <span>{formatDate(item.dateISO, lang)}</span> : null}
            {item.source ? (
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-medium text-amber-200">
                {item.source}
              </span>
            ) : null}
          </div>
          {item.excerpt ? (
            <DialogDescription className="text-left text-sm leading-relaxed text-zinc-300">
              {item.excerpt}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        {item.link ? (
          <div className="pt-2">
            <Button
              asChild
              variant="outline"
              className="w-full border-white/15 bg-white/5 text-white hover:bg-white/10 sm:w-auto"
            >
              <a href={item.link} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                {lang === "pt" ? "Ler na fonte original" : "Read at original source"}
                {item.source ? ` (${item.source})` : ""}
              </a>
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function NoticiasSection({
  block,
  lang,
  fullWidth,
  titleAlign = "left",
  inSection,
  showTitle = true,
}: {
  block: HomeContentBlock;
  lang: "pt" | "en";
  fullWidth?: boolean;
  titleAlign?: "left" | "center" | "right";
  inSection?: boolean;
  showTitle?: boolean;
}) {
  const [rawItems, setRawItems] = useState<NoticiasItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<NoticiasItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const title = (lang === "pt" ? block.config?.titlePt : block.config?.titleEn) as string;
  const dataSource = (block.config?.noticiasDataSource as "rss" | "manual") ?? "rss";
  const rssUrl = (block.config?.noticiasRssUrl as string)?.trim() ?? "";
  const manualItems = (block.config?.noticiasManualItems as NoticiasItem[] | undefined) ?? [];
  const maxItems = normalizeNoticiasMaxItems(block.config?.noticiasMaxItems);
  const columns = normalizeNoticiasColumns(block.config?.noticiasColumns);
  const orderMode = normalizeNoticiasOrderMode(block.config?.noticiasOrderMode);
  const gridClass = noticiasGridClass(columns);
  const padTop = (block.config?.noticiasPaddingTop as keyof typeof PADDING_CLASSES) ?? "compact";
  const padBottom = (block.config?.noticiasPaddingBottom as keyof typeof PADDING_CLASSES) ?? "compact";
  const blockBg = (block.config?.backgroundColor as string)?.trim();
  const blockBgImg = (block.config?.backgroundImage as string)?.trim();
  const bgColor = blockBg || undefined;
  const bgImage = blockBgImg || undefined;
  const overlayOpacity = (() => {
    const v = block.config?.backgroundOverlayOpacity;
    if (typeof v === "number" && v >= 0 && v <= 1) return v;
    if (typeof v === "string") {
      const n = Number(v);
      if (!Number.isNaN(n) && n >= 0 && n <= 1) return n;
    }
    return 0.75;
  })();

  const paddingTop = PADDING_CLASSES[padTop]?.top ?? PADDING_CLASSES.compact.top;
  const paddingBottom = PADDING_CLASSES[padBottom]?.bottom ?? PADDING_CLASSES.compact.bottom;
  const containerClass = moduleSectionContainerClass({ fullWidth });
  const fetchMax = noticiasFeedFetchMax(maxItems);

  useEffect(() => {
    if (dataSource === "manual") {
      setRawItems([]);
      setLoading(false);
      setError(null);
      return;
    }
    if (!rssUrl) {
      setRawItems([]);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchRssFeed(rssUrl, fetchMax)
      .then((data) => {
        if (!cancelled) {
          setRawItems(data);
          setError(data.length === 0 ? (lang === "pt" ? "Nenhuma notícia encontrada." : "No news found.") : null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRawItems([]);
          setError(lang === "pt" ? "Erro ao carregar notícias." : "Error loading news.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dataSource, rssUrl, fetchMax, lang]);

  const displayItems = useMemo(() => {
    const pool = dataSource === "manual" ? manualItems : rawItems;
    return orderNoticiasForDisplay(pool, maxItems, orderMode);
  }, [dataSource, manualItems, rawItems, maxItems, orderMode]);

  const hasContent = displayItems.length > 0;

  const openArticle = (item: NoticiasItem) => {
    setSelectedItem(item);
    setDialogOpen(true);
  };

  return (
    <AnimateInView>
      <section
        id={block.id}
        className={`relative overflow-hidden ${moduleBottomBorderClass(block.config)} ${paddingTop} ${paddingBottom}`}
        style={bgColor ? { backgroundColor: bgColor } : undefined}
      >
        {bgImage && (
          <div className="absolute inset-0">
            <SmartImage
              src={getPublicImageUrl(bgImage)}
              alt=""
              fill
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-zinc-950" style={{ opacity: overlayOpacity }} />
          </div>
        )}
        <div className={`relative ${containerClass}`}>
          {showTitle && title && (
            <SectionTitle
              title={title}
              gradientStart={(block.config?.titleGradientStart as string)?.trim()}
              gradientEnd={(block.config?.titleGradientEnd as string)?.trim()}
              align={titleAlign}
            />
          )}
          {loading && (
            <div className="mt-8 flex items-center justify-center gap-3 py-12 text-zinc-400">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>{lang === "pt" ? "Carregando notícias…" : "Loading news…"}</span>
            </div>
          )}
          {error && !loading && (
            <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              {error}
            </div>
          )}
          {hasContent && !loading && (
            <div className={`mt-8 grid gap-6 items-stretch ${gridClass}`}>
              {displayItems.map((item, idx) => (
                <button
                  key={item.id ?? item.link ?? idx}
                  type="button"
                  onClick={() => openArticle(item)}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60 text-left transition-all hover:border-amber-500/20 hover:shadow-lg hover:shadow-amber-500/5 h-full cursor-pointer"
                >
                  {item.imageUrl || item.imageUrlOriginal ? (
                    <NewsCardImage
                      src={item.imageUrl ?? item.imageUrlOriginal ?? ""}
                      srcOriginal={item.imageUrlOriginal}
                    />
                  ) : (
                    <div className="flex aspect-video w-full shrink-0 items-center justify-center bg-zinc-800/80">
                      <Newspaper className="h-12 w-12 text-zinc-500" />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col min-h-[120px] p-4">
                    {item.source ? (
                      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-amber-400/90 line-clamp-1">
                        {item.source}
                      </p>
                    ) : null}
                    <h3 className="line-clamp-2 font-semibold text-white group-hover:text-amber-400">
                      {item.title}
                    </h3>
                    {item.excerpt && (
                      <p className="mt-2 line-clamp-2 text-sm text-zinc-400 flex-1">
                        {item.excerpt}
                      </p>
                    )}
                    <div className="mt-auto flex items-center justify-between pt-3 text-xs text-zinc-500 shrink-0">
                      {item.dateISO ? <span>{formatDate(item.dateISO, lang)}</span> : <span />}
                      <span className="text-zinc-500 opacity-0 transition-opacity group-hover:opacity-100">
                        {lang === "pt" ? "Ler →" : "Read →"}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <NoticiasArticleDialog
        item={selectedItem}
        lang={lang}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSelectedItem(null);
        }}
      />
    </AnimateInView>
  );
}
