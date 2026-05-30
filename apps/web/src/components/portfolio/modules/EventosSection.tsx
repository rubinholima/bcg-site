"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Calendar } from "lucide-react";
import type { HomeContentBlock } from "@/types/home-content";
import type { Page } from "@/types/page";
import { getPublicImageUrl } from "@/lib/media-url";
import { moduleBottomBorderClass } from "@/lib/module-section-border";
import { moduleSectionContainerClass } from "@/lib/module-section-container";
import { fetchPublicEvents, type PublicEventItem } from "@/lib/public-events";
import { SectionTitle } from "@/components/portfolio/SectionTitle";

function blockTitle(block: HomeContentBlock, fallback: string, lang: "pt" | "en"): string {
  const v = lang === "pt" ? block.config?.titlePt : block.config?.titleEn;
  return (v && String(v).trim()) ? String(v) : fallback;
}

function blockBody(block: HomeContentBlock, fallback: string, lang: "pt" | "en"): string {
  const v = lang === "pt" ? block.config?.bodyPt : block.config?.bodyEn;
  return (v && String(v).trim()) ? String(v) : fallback;
}

function blockBgColor(block: HomeContentBlock): string | undefined {
  return (block.config?.backgroundColor as string)?.trim() || undefined;
}

function blockOverlayOpacity(block: HomeContentBlock): number {
  const v = block.config?.backgroundOverlayOpacity;
  if (typeof v === "number" && v >= 0 && v <= 1) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (!Number.isNaN(n) && n >= 0 && n <= 1) return n;
  }
  return 0.75;
}

const DEFAULT_TITLE = { pt: "Nossos Eventos", en: "Our Events" };
const DEFAULT_SUBTEXT = {
  pt: "Campeonatos, copas e torneios organizados pelo grupo ou pelos clubes.",
  en: "Championships, cups and tournaments organized by the group or clubs.",
};
const VIEW_LABEL = { pt: "Ver evento", en: "View event" };

export function EventosSection({
  block,
  lang,
  page,
  fullWidth,
  titleAlign,
  inSection,
  showTitle,
}: {
  block: HomeContentBlock;
  lang: "pt" | "en";
  page: Page;
  fullWidth?: boolean;
  titleAlign?: "left" | "center" | "right";
  inSection?: boolean;
  showTitle?: boolean;
}) {
  const tenantId = page.tenant?.id;
  const [events, setEvents] = useState<PublicEventItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchPublicEvents(tenantId)
      .then((data) => {
        if (!cancelled) setEvents(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const v = block.config?.visible as boolean | string | undefined;
  const visible = v !== false && v !== "false";
  if (!visible) return null;

  const eventsList = events ?? [];
  if (!loading && eventsList.length === 0) return null;

  const title = blockTitle(block, DEFAULT_TITLE[lang], lang);
  const subtext = blockBody(block, DEFAULT_SUBTEXT[lang], lang);
  const viewLabel = VIEW_LABEL[lang];
  const containerClass = moduleSectionContainerClass({ fullWidth });

  return (
    <section
      id="eventos"
      className={`relative overflow-hidden ${moduleBottomBorderClass(block.config)} py-16 sm:py-20 scroll-mt-24`}
      style={blockBgColor(block) ? { backgroundColor: blockBgColor(block) } : { backgroundColor: "rgb(39 39 42 / 0.3)" }}
    >
      {block.config?.backgroundImage && (
        <div className="absolute inset-0">
          <img
            src={getPublicImageUrl(block.config.backgroundImage as string)}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-zinc-950" style={{ opacity: blockOverlayOpacity(block) }} />
        </div>
      )}
      <div className={`relative ${containerClass}`}>
        {showTitle !== false && (
          <SectionTitle
            title={title}
            gradientStart={(block.config?.titleGradientStart as string)?.trim()}
            gradientEnd={(block.config?.titleGradientEnd as string)?.trim()}
            align={titleAlign ?? "left"}
          />
        )}
        {subtext && <p className="mt-3 text-zinc-400">{subtext}</p>}
        {loading ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-56 animate-pulse rounded-2xl border border-white/10 bg-zinc-800/50" />
            ))}
          </div>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {eventsList.map((item) => {
              const period =
                item.startDate && item.endDate
                  ? `${item.startDate} a ${item.endDate}`
                  : item.startDate ?? "";
              return (
                <article
                  key={item.id}
                  className="flex flex-col rounded-2xl border border-white/10 bg-zinc-900/80 p-6 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:border-amber-500/25 hover:shadow-xl hover:shadow-amber-500/10"
                >
                  <div className="flex flex-col items-center text-center">
                    {item.logoUrl ? (
                      <img
                        src={getPublicImageUrl(item.logoUrl)}
                        alt=""
                        className="h-16 w-16 rounded-xl object-contain sm:h-20 sm:w-20"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-zinc-800 text-amber-500/80 sm:h-20 sm:w-20">
                        <Calendar className="h-8 w-8 sm:h-10 sm:w-10" />
                      </div>
                    )}
                    <h3 className="mt-4 text-lg font-semibold text-white">{item.name}</h3>
                    {period && (
                      <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-zinc-500">
                        <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                        {period}
                      </p>
                    )}
                    {item.description && (
                      <p className="mt-2 line-clamp-2 text-sm text-zinc-400">{item.description}</p>
                    )}
                    <div className="mt-4">
                      <Link
                        href={`/eventos/${item.slug}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        {viewLabel}
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
