"use client";

import { useState, useEffect } from "react";
import type { HomeContentBlock } from "@/types/home-content";
import type { NoticiasItem } from "@/types/home-content";
import { AnimateInView } from "@/components/home/AnimateInView";
import { SectionTitle } from "@/components/portfolio/SectionTitle";
import { getPublicImageUrl } from "@/lib/media-url";
import { SmartImage } from "@/components/common/SmartImage";
import { Newspaper, ExternalLink, Loader2 } from "lucide-react";

function NewsCardImage({ src, srcOriginal }: { src: string; srcOriginal?: string }) {
  const [failed, setFailed] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  // Priorizar URL original direto (evita 403 — Instagram/CDNs bloqueiam proxy no servidor)
  const useDirectFirst = !!srcOriginal;
  const baseSrc =
    typeof window !== "undefined" && src.startsWith("/") ? `${window.location.origin}${src}` : src;
  // Fallback: quando proxy retorna 403, tentar URL original extraída do param
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
  const imgSrc = useDirectFirst
    ? srcOriginal!
    : useFallback && proxyFallbackUrl
      ? proxyFallbackUrl
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

export function NoticiasSection({
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
  const [items, setItems] = useState<NoticiasItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const title = (lang === "pt" ? block.config?.titlePt : block.config?.titleEn) as string;
  const dataSource = (block.config?.noticiasDataSource as "rss" | "manual") ?? "rss";
  const rssUrl = (block.config?.noticiasRssUrl as string)?.trim() ?? "";
  const manualItems = (block.config?.noticiasManualItems as NoticiasItem[] | undefined) ?? [];
  const maxItems = 6; // Somente as 6 últimas notícias
  const padTop = (block.config?.noticiasPaddingTop as keyof typeof PADDING_CLASSES) ?? "compact";
  const padBottom = (block.config?.noticiasPaddingBottom as keyof typeof PADDING_CLASSES) ?? "compact";
  const blockBg = (block.config?.backgroundColor as string)?.trim();
  const blockBgImg = (block.config?.backgroundImage as string)?.trim();
  // Só usa fundo do bloco: NUNCA herda do tema — a página já tem fundo único; seção transparente = continuidade
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
          setItems(data);
          setError(data.length === 0 ? (lang === "pt" ? "Nenhuma notícia encontrada." : "No news found.") : null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setItems([]);
          setError(lang === "pt" ? "Erro ao carregar notícias." : "Error loading news.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [dataSource, rssUrl, maxItems, manualItems, lang]);

  const displayItems = dataSource === "manual" ? manualItems.slice(0, maxItems) : items;
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
            <div className="absolute inset-0 bg-zinc-950" style={{ opacity: overlayOpacity }} />
          </div>
        )}
        <div className={`relative ${containerClass}`}>
          {title && (
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
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 items-stretch">
              {displayItems.map((item, idx) => (
                <a
                  key={item.id ?? item.link ?? idx}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60 transition-all hover:border-amber-500/20 hover:shadow-lg hover:shadow-amber-500/5 h-full"
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
                    <h3 className="line-clamp-2 font-semibold text-white group-hover:text-amber-400">
                      {item.title}
                    </h3>
                    {item.excerpt && (
                      <p className="mt-2 line-clamp-2 text-sm text-zinc-400 flex-1">
                        {item.excerpt}
                      </p>
                    )}
                    <div className="mt-auto flex items-center justify-between pt-3 text-xs text-zinc-500 shrink-0">
                      {item.dateISO && (
                        <span>{formatDate(item.dateISO, lang)}</span>
                      )}
                      <ExternalLink className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>
    </AnimateInView>
  );
}
