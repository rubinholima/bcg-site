"use client";

import { useState, useEffect, useCallback } from "react";
import type { HomeContentBlock } from "@/types/home-content";
import type { NoticiasItem, GaleriaItem } from "@/types/home-content";
import { AnimateInView } from "@/components/home/AnimateInView";
import { SectionTitle } from "@/components/portfolio/SectionTitle";
import { getPublicImageUrl } from "@/lib/media-url";
import { isBcgS3Asset } from "@/lib/isBcgS3Asset";
import { SmartImage } from "@/components/common/SmartImage";
import { ImageIcon, Loader2, X } from "lucide-react";

function GalleryPhoto({
  src,
  srcOriginal,
  alt,
  delayMs = 0,
}: {
  src: string;
  srcOriginal?: string;
  alt?: string;
  /** Atraso antes de carregar (evita rate limit no proxy quando muitas imagens) */
  delayMs?: number;
}) {
  const [ready, setReady] = useState(delayMs <= 0);
  const [failed, setFailed] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (delayMs <= 0) return;
    const t = setTimeout(() => setReady(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);

  // Priorizar PROXY: Instagram/CDN enviam CORP same-origin → browser bloqueia URL direta.
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
  // Instagram/CDN: URL direta nunca funciona (CORP). Só usar proxy; fallback causaria 403.
  const isBlockedCdn = (url?: string) =>
    url && /cdninstagram|fbcdn\.net|instagram\.com/i.test(url);
  const imgSrc =
    useFallback && proxyFallbackUrl && srcOriginal && !isBlockedCdn(srcOriginal)
      ? srcOriginal
      : baseSrc;

  if (!ready) {
    return (
      <div className="aspect-square w-full animate-pulse bg-zinc-800/80" aria-hidden />
    );
  }
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
        key={retryCount}
        src={imgSrc}
        alt={alt ?? ""}
        className="h-full w-full object-cover grayscale transition-all duration-300 group-hover:scale-105 group-hover:grayscale-0"
        loading="eager"
        referrerPolicy="no-referrer"
        onError={() => {
          if (retryCount < 5) {
            setTimeout(() => setRetryCount((c) => c + 1), 2500);
          } else if (
            !useFallback &&
            proxyFallbackUrl &&
            srcOriginal &&
            !isBlockedCdn(srcOriginal)
          ) {
            setUseFallback(true);
            setRetryCount(0);
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

/** Embaralha de forma determinística (mesmo feed = mesma ordem) — galeria diferente do bloco notícias */
function shuffleForGallery<T>(arr: T[], seed: string): T[] {
  const out = [...arr];
  let s = seed.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function GaleriaSection({
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
  const [items, setItems] = useState<GaleriaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const title = (lang === "pt" ? block.config?.titlePt : block.config?.titleEn) as string;
  const dataSource = (block.config?.galeriaDataSource as "rss" | "manual" | "rss_com_manual") ?? "rss_com_manual";
  const rssUrl = (block.config?.galeriaRssUrl as string)?.trim() ?? "";
  const manualItems = (block.config?.galeriaManualItems as GaleriaItem[] | undefined) ?? [];
  const maxItems = Math.min(24, Math.max(1, (block.config?.galeriaMaxItems as number) ?? 10));
  const useManualFirst = dataSource === "rss_com_manual" || dataSource === "manual" || dataSource === "rss";
  const useRss = dataSource === "rss" || dataSource === "rss_com_manual";
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
    if (!useRss || !rssUrl) {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchRssFeed(rssUrl, Math.min(50, maxItems * 3))
      .then((data) => {
        if (!cancelled) {
          const gallery = shuffleForGallery(
            rssToGaleriaItems(data).slice(0, maxItems),
            rssUrl
          );
          setItems(gallery);
          setError(
            gallery.length === 0 && !useManualFirst
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
            !useManualFirst && lang === "pt" ? "Erro ao carregar galeria." : !useManualFirst ? "Error loading gallery." : null
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [useRss, rssUrl, maxItems, lang, useManualFirst]);

  const manualFiltered = manualItems.filter((i) => i.imageUrl?.trim());
  const rssFiltered = items;
  const displayItems = useManualFirst
    ? [
        ...manualFiltered,
        ...rssFiltered.filter(
          (r) => !manualFiltered.some((m) => m.imageUrl?.trim() === r.imageUrl?.trim())
        ),
      ].slice(0, maxItems)
    : rssFiltered;
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
          {showTitle && title && (
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
            <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
            {displayItems.map((item, idx) => (
              <button
                key={item.id ?? idx}
                type="button"
                className="group relative block cursor-pointer overflow-hidden focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-2 focus:ring-offset-zinc-950"
                onClick={() =>
                  setLightboxSrc(
                    isBcgS3Asset(item.imageUrl)
                      ? getPublicImageUrl(item.imageUrl)
                      : (item.imageUrl?.startsWith("/api/") || item.imageUrl?.startsWith("https://")
                        ? item.imageUrl
                        : getPublicImageUrl(item.imageUrl) || item.imageUrl)
                  )
                }
              >
                <GalleryPhoto
                  src={
                    isBcgS3Asset(item.imageUrl)
                      ? getPublicImageUrl(item.imageUrl)
                      : (item.imageUrl?.startsWith("/api/") || item.imageUrl?.startsWith("https://")
                        ? item.imageUrl
                        : getPublicImageUrl(item.imageUrl) || item.imageUrl)
                  }
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
