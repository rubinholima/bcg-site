"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import type { HomeContentBlock } from "@/types/home-content";
import type { NoticiasItem } from "@/types/home-content";
import { AnimateInView } from "@/components/home/AnimateInView";
import { SectionTitle } from "@/components/portfolio/SectionTitle";
import { getPublicImageUrl, isProxyImageUrl } from "@/lib/media-url";
import { Newspaper, ExternalLink, Loader2 } from "lucide-react";

function NewsCardImage({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
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
        src={src}
        alt=""
        className="h-full w-full object-cover transition-transform group-hover:scale-105"
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
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
}: {
  block: HomeContentBlock;
  lang: "pt" | "en";
}) {
  const [items, setItems] = useState<NoticiasItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const title = (lang === "pt" ? block.config?.titlePt : block.config?.titleEn) as string;
  const dataSource = (block.config?.noticiasDataSource as "rss" | "manual") ?? "rss";
  const rssUrl = (block.config?.noticiasRssUrl as string)?.trim() ?? "";
  const manualItems = (block.config?.noticiasManualItems as NoticiasItem[] | undefined) ?? [];
  const maxItems = Math.min(20, Math.max(1, (block.config?.noticiasMaxItems as number) ?? 10));
  const padTop = (block.config?.noticiasPaddingTop as keyof typeof PADDING_CLASSES) ?? "compact";
  const padBottom = (block.config?.noticiasPaddingBottom as keyof typeof PADDING_CLASSES) ?? "compact";
  const bgColor = (block.config?.backgroundColor as string)?.trim();
  const bgImage = (block.config?.backgroundImage as string)?.trim();
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
            <Image
              src={getPublicImageUrl(bgImage)}
              alt=""
              fill
              className="object-cover"
              sizes="100vw"
              unoptimized={isProxyImageUrl(getPublicImageUrl(bgImage))}
            />
            <div className="absolute inset-0 bg-zinc-950" style={{ opacity: overlayOpacity }} />
          </div>
        )}
        <div className="container relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {title && (
            <SectionTitle
              title={title}
              gradientStart={(block.config?.titleGradientStart as string)?.trim()}
              gradientEnd={(block.config?.titleGradientEnd as string)?.trim()}
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
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {displayItems.map((item, idx) => (
                <a
                  key={item.id ?? item.link ?? idx}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60 transition-all hover:border-amber-500/20 hover:shadow-lg hover:shadow-amber-500/5"
                >
                  {item.imageUrl ? (
                    <NewsCardImage src={item.imageUrl} />
                  ) : (
                    <div className="flex aspect-video w-full shrink-0 items-center justify-center bg-zinc-800/80">
                      <Newspaper className="h-12 w-12 text-zinc-500" />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="line-clamp-2 font-semibold text-white group-hover:text-amber-400">
                      {item.title}
                    </h3>
                    {item.excerpt && (
                      <p className="mt-2 line-clamp-2 text-sm text-zinc-400">
                        {item.excerpt}
                      </p>
                    )}
                    <div className="mt-auto flex items-center justify-between pt-3 text-xs text-zinc-500">
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
