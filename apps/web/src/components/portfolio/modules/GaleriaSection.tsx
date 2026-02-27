"use client";

import { useState, useEffect, useCallback } from "react";
import type { HomeContentBlock } from "@/types/home-content";
import type { NoticiasItem, GaleriaItem } from "@/types/home-content";
import { AnimateInView } from "@/components/home/AnimateInView";
import { SectionTitle } from "@/components/portfolio/SectionTitle";
import { getPublicImageUrl } from "@/lib/media-url";
import { SmartImage } from "@/components/common/SmartImage";
import { ImageIcon, Loader2, X } from "lucide-react";

function GalleryPhoto({ src, srcOriginal, alt }: { src: string; srcOriginal?: string; alt?: string }) {
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
  const useDirectFirst = !!srcOriginal;
  const imgSrc = useDirectFirst
    ? srcOriginal!
    : useFallback && proxyFallbackUrl
      ? proxyFallbackUrl
      : baseSrc;
  if (failed) {
    return (
      <div className="flex aspect-square w-full items-center justify-center bg-zinc-800/80">
        <ImageIcon className="h-12 w-12 text-zinc-500" />
      </div>
    );
  }
  return (
    <div className="relative aspect-square w-full overflow-hidden bg-zinc-900">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imgSrc}
        alt={alt ?? ""}
        className="h-full w-full object-cover grayscale transition-all duration-300 group-hover:scale-105 group-hover:grayscale-0"
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => {
          if (!useFallback && !useDirectFirst && proxyFallbackUrl) {
            setUseFallback(true);
          } else {
            setFailed(true);
          }
        }}
      />
    </div>
  );
}

function Lightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt?: string;
  onClose: () => void;
}) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label="Fechar"
    >
      <button
        type="button"
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
        onClick={onClose}
        aria-label="Fechar"
      >
        <X className="h-6 w-6" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt ?? ""}
        className="max-h-[90vh] max-w-full object-contain"
        onClick={(e) => e.stopPropagation()}
        draggable={false}
        referrerPolicy="no-referrer"
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

/** Converte itens RSS (NoticiasItem) em GaleriaItem — só os que têm imagem */
function rssToGaleriaItems(items: NoticiasItem[]): GaleriaItem[] {
  return items
    .filter((i) => i.imageUrl?.trim() || i.imageUrlOriginal?.trim())
    .map((i) => ({
      id: i.id,
      imageUrl: i.imageUrl ?? i.imageUrlOriginal ?? "",
      imageUrlOriginal: i.imageUrlOriginal,
      link: i.link?.trim() || undefined,
      title: i.title?.trim() || undefined,
      caption: i.excerpt?.trim() || undefined,
    }));
}

export function GaleriaSection({
  block,
  lang,
  fullWidth,
  titleAlign = "left",
}: {
  block: HomeContentBlock;
  lang: "pt" | "en";
  fullWidth?: boolean;
  titleAlign?: "left" | "center" | "right";
}) {
  const [items, setItems] = useState<GaleriaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const title = (lang === "pt" ? block.config?.titlePt : block.config?.titleEn) as string;
  const dataSource = (block.config?.galeriaDataSource as "rss" | "manual") ?? "rss";
  const rssUrl = (block.config?.galeriaRssUrl as string)?.trim() ?? "";
  const manualItems = (block.config?.galeriaManualItems as GaleriaItem[] | undefined) ?? [];
  const maxItems = Math.min(24, Math.max(1, (block.config?.galeriaMaxItems as number) ?? 12));
  const padTop = (block.config?.galeriaPaddingTop as keyof typeof PADDING_CLASSES) ?? "compact";
  const padBottom = (block.config?.galeriaPaddingBottom as keyof typeof PADDING_CLASSES) ?? "compact";
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
  const containerClass = fullWidth ? "w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" : "container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8";

  useEffect(() => {
    if (dataSource === "manual") {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }
    if (!rssUrl) {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchRssFeed(rssUrl, maxItems)
      .then((data) => {
        if (!cancelled) {
          const gallery = rssToGaleriaItems(data);
          setItems(gallery);
          setError(
            gallery.length === 0
              ? lang === "pt"
                ? "Nenhuma foto encontrada no feed."
                : "No photos found in feed."
              : null
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setItems([]);
          setError(
            lang === "pt" ? "Erro ao carregar galeria." : "Error loading gallery."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dataSource, rssUrl, maxItems, lang]);

  const displayItems =
    dataSource === "manual"
      ? manualItems.filter((i) => i.imageUrl?.trim()).slice(0, maxItems)
      : items;
  const hasContent = displayItems.length > 0;

  return (
    <AnimateInView>
      <section
        id={block.id}
        className={`relative overflow-hidden border-b border-white/5 ${paddingTop} ${paddingBottom}`}
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
            <div
              className="absolute inset-0 bg-zinc-950"
              style={{ opacity: overlayOpacity }}
            />
          </div>
        )}
        <div className={`relative ${containerClass}`}>
          {title && (
            <SectionTitle
              title={title}
              align={titleAlign}
              gradientStart={(block.config?.titleGradientStart as string)?.trim()}
              gradientEnd={(block.config?.titleGradientEnd as string)?.trim()}
            />
          )}
          {loading && (
            <div className="mt-8 flex items-center justify-center gap-3 py-12 text-zinc-400">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>
                {lang === "pt" ? "Carregando fotos…" : "Loading photos…"}
              </span>
            </div>
          )}
          {error && !loading && (
            <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              {error}
            </div>
          )}
          {hasContent && !loading && (
            <div className="mt-8 grid grid-cols-3 gap-0 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {displayItems.map((item, idx) => (
              <button
                key={item.id ?? idx}
                type="button"
                className="group relative block cursor-pointer overflow-hidden focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-2 focus:ring-offset-zinc-950"
                onClick={() =>
                  setLightboxSrc(
                    item.imageUrlOriginal ?? getPublicImageUrl(item.imageUrl)
                  )
                }
              >
                <GalleryPhoto
                  src={getPublicImageUrl(item.imageUrl) || item.imageUrl}
                  srcOriginal={item.imageUrlOriginal}
                  alt=""
                />
              </button>
            ))}
            </div>
          )}
        </div>
      </section>
      {lightboxSrc && (
        <Lightbox
          src={lightboxSrc}
          alt=""
          onClose={() => setLightboxSrc(null)}
        />
      )}
    </AnimateInView>
  );
}
