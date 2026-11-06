"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, MapPin, Ticket } from "lucide-react";
import type { HomeContentBlock } from "@/types/home-content";
import type { Page } from "@/types/page";
import { getPublicImageUrl } from "@/lib/media-url";
import { moduleBottomBorderClass } from "@/lib/module-section-border";
import { moduleSectionContainerClass } from "@/lib/module-section-container";
import { SectionTitle } from "@/components/portfolio/SectionTitle";
import {
  BCH_TICKET_AVAILABILITY_LABEL,
  fetchBchPublicEvents,
  formatBchEventDateTime,
  type BchPublicEventListItem,
} from "@/lib/bch-public-events";
import { rewriteTenantPortfolioHref } from "@/lib/portfolio-public-links";

function blockTitle(block: HomeContentBlock, fallback: string, lang: "pt" | "en"): string {
  const v = lang === "pt" ? block.config?.titlePt : block.config?.titleEn;
  return v && String(v).trim() ? String(v) : fallback;
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

const DEFAULT_TITLE = { pt: "Próximos eventos", en: "Upcoming events" };
const VIEW_LABEL = { pt: "Ver detalhes", en: "View details" };
const ALL_LABEL = { pt: "Ver todos", en: "View all" };
const BUY_LABEL = { pt: "Comprar", en: "Buy" };

function availabilityClass(state: BchPublicEventListItem["ticketAvailability"]): string {
  switch (state) {
    case "AVAILABLE":
      return "text-emerald-400";
    case "LOW_AVAILABILITY":
      return "text-amber-400";
    case "SOLD_OUT":
      return "text-zinc-500";
    case "NOT_YET_ON_SALE":
      return "text-sky-400";
    case "SALES_ENDED":
      return "text-zinc-500";
    default:
      return "text-zinc-400";
  }
}

export function BchUpcomingEventsSection({
  block,
  lang,
  page,
  pathBase = `/portfolio/${page.tenant?.slug ?? "boston-city-hall"}`,
  fullWidth,
  titleAlign,
  inSection,
  showTitle,
}: {
  block: HomeContentBlock;
  lang: "pt" | "en";
  page: Page;
  pathBase?: string;
  fullWidth?: boolean;
  titleAlign?: "left" | "center" | "right";
  inSection?: boolean;
  showTitle?: boolean;
}) {
  const [events, setEvents] = useState<BchPublicEventListItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const limitRaw = block.config?.maxItems;
  const maxItems =
    typeof limitRaw === "number" && limitRaw > 0
      ? limitRaw
      : typeof limitRaw === "string" && Number(limitRaw) > 0
        ? Number(limitRaw)
        : 6;

  useEffect(() => {
    let cancelled = false;
    fetchBchPublicEvents({ pathBase })
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
  }, [pathBase]);

  const v = block.config?.visible as boolean | string | undefined;
  const visible = v !== false && v !== "false";
  if (!visible) return null;

  const eventsList = (events ?? []).slice(0, maxItems);
  if (!loading && eventsList.length === 0) return null;

  const title = blockTitle(block, DEFAULT_TITLE[lang], lang);
  const viewLabel = VIEW_LABEL[lang];
  const allLabel = ALL_LABEL[lang];
  const containerClass = moduleSectionContainerClass({ fullWidth });
  const tenantSlug = page.tenant?.slug ?? "boston-city-hall";
  const eventsBase = pathBase === "" ? "/events" : `${pathBase.replace(/\/$/, "")}/events`;

  return (
    <section
      id="bch-eventos"
      className={`relative overflow-hidden ${moduleBottomBorderClass(block.config)} py-16 sm:py-20 scroll-mt-24`}
      style={
        blockBgColor(block)
          ? { backgroundColor: blockBgColor(block) }
          : { backgroundColor: "rgb(39 39 42 / 0.3)" }
      }
    >
      {block.config?.backgroundImage && (
        <div className="absolute inset-0">
          <img
            src={getPublicImageUrl(block.config.backgroundImage as string)}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div
            className="absolute inset-0 bg-zinc-950"
            style={{ opacity: blockOverlayOpacity(block) }}
          />
        </div>
      )}
      <div className={`relative ${containerClass}`}>
        {showTitle !== false && (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionTitle
              title={title}
              gradientStart={(block.config?.titleGradientStart as string)?.trim()}
              gradientEnd={(block.config?.titleGradientEnd as string)?.trim()}
              align={titleAlign ?? "left"}
            />
            <Link
              href={eventsBase}
              className="inline-flex min-h-[44px] items-center text-sm font-medium text-amber-400/90 hover:text-amber-300"
            >
              {allLabel}
            </Link>
          </div>
        )}
        {loading ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-2xl border border-white/10 bg-zinc-800/50"
              />
            ))}
          </div>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {eventsList.map((item) => (
              <article
                key={item.slug}
                className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/80 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/25 hover:shadow-xl hover:shadow-amber-500/10"
              >
                {item.logoUrl ? (
                  <div className="relative aspect-[16/10] w-full bg-zinc-800">
                    <img
                      src={getPublicImageUrl(item.logoUrl)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-[16/10] items-center justify-center bg-zinc-800 text-amber-500/70">
                    <Calendar className="h-12 w-12" />
                  </div>
                )}
                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <h3 className="text-lg font-semibold text-white">{item.name}</h3>
                  {item.startDate && (
                    <p className="mt-2 flex items-start gap-2 text-sm text-zinc-400">
                      <Calendar className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      {formatBchEventDateTime(item.startDate, lang)}
                    </p>
                  )}
                  {item.locationLabel && (
                    <p className="mt-1 flex items-start gap-2 text-sm text-zinc-500">
                      <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      <span className="line-clamp-2">{item.locationLabel}</span>
                    </p>
                  )}
                  {item.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-zinc-400">{item.description}</p>
                  )}
                  {item.ticketingEnabled && (
                    <p
                      className={`mt-3 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide ${availabilityClass(item.ticketAvailability)}`}
                    >
                      <Ticket className="h-3.5 w-3.5" />
                      {BCH_TICKET_AVAILABILITY_LABEL[item.ticketAvailability]}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2 pt-2">
                    <Link
                      href={rewriteTenantPortfolioHref(item.detailPath, tenantSlug, pathBase)}
                      className="inline-flex min-h-[44px] items-center rounded-lg bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      {viewLabel}
                    </Link>
                    {item.ticketingEnabled &&
                    (item.ticketAvailability === "AVAILABLE" ||
                      item.ticketAvailability === "LOW_AVAILABILITY") ? (
                      <Link
                        href={`${eventsBase}/${encodeURIComponent(item.slug)}/checkout?lang=${lang}`}
                        className="inline-flex min-h-[44px] items-center rounded-lg bg-amber-500/90 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
                      >
                        {BUY_LABEL[lang]}
                      </Link>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
