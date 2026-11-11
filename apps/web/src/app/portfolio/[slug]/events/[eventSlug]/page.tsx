import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Page } from "@/types/page";
import type { HomeContentBlock } from "@/types/home-content";
import { buildBackendUrl, getAppBaseUrl, getBackendOriginForServerFetch } from "@/lib/apiProxy";
import { getPublicImageUrl } from "@/lib/media-url";
import { SmartImage } from "@/components/common/SmartImage";
import { PortfolioFavicon } from "@/components/portfolio/PortfolioFavicon";
import { PublicPortfolioHeader } from "@/components/portfolio/PublicPortfolioHeader";
import { BlockRenderer } from "@/components/portfolio/modules/BlockRenderer";
import { PublicFooter, isFooterBlockVisible } from "@/components/portfolio/PublicFooter";
import { BchPublicEventTickets } from "@/components/portfolio/modules/BchPublicEventTickets";
import {
  fetchBchPublicEventBySlug,
  formatBchEventDateTime,
  type BchPublicEventDetail,
} from "@/lib/bch-public-events";
import { Calendar, MapPin } from "lucide-react";
import { getPortfolioPublicContextServer } from "@/components/portfolio/portfolio-public-path";

const BCH_SLUG = "boston-city-hall";

const GENERIC_BLOCK_TYPES = [
  "header",
  "footer",
  "section",
  "text",
  "custom",
  "hero",
  "highlights",
  "what",
  "founder",
  "how",
  "cta",
  "logo_carousel",
  "clubs",
  "companies",
  "eventos",
  "bch_upcoming_events",
  "galeria_eventos",
  "proximos_eventos",
  "ultimos_eventos",
  "sobre",
  "servicos",
  "contato",
];

async function getPageBySlug(slug: string): Promise<Page | null> {
  try {
    const res = await fetch(buildBackendUrl(`/public/page-by-slug/${encodeURIComponent(slug)}`), {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as Page;
  } catch {
    return null;
  }
}

async function fetchEventDetail(
  eventSlug: string,
  pathBase?: string,
): Promise<BchPublicEventDetail | null> {
  const encoded = encodeURIComponent(eventSlug);
  const urls = [
    `${getBackendOriginForServerFetch()}/public/boston-city-hall/events/${encoded}`,
    `${getAppBaseUrl().replace(/\/$/, "")}/api/public/boston-city-hall/events/${encoded}`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      const data = (await res.json()) as BchPublicEventDetail | null;
      if (data && typeof data === "object" && "slug" in data) return data;
    } catch {
      /* próxima origem */
    }
  }
  return fetchBchPublicEventBySlug(eventSlug, { pathBase });
}

function sortBlocks(blocks: HomeContentBlock[]): HomeContentBlock[] {
  return [...blocks].sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; eventSlug: string }>;
}): Promise<Metadata> {
  const { slug, eventSlug } = await params;
  if (slug !== BCH_SLUG) return { title: "Evento" };
  const pathBase = (await getPortfolioPublicContextServer(slug)).pathBase;
  const event = await fetchEventDetail(eventSlug, pathBase);
  const iconUrl = event?.logoUrl ? getPublicImageUrl(event.logoUrl) : "/favicon.ico";
  return {
    title: event?.name ?? eventSlug,
    description: event?.description ?? undefined,
    icons: { icon: iconUrl },
    openGraph: event?.logoUrl
      ? { images: [{ url: getPublicImageUrl(event.logoUrl) }] }
      : undefined,
  };
}

export default async function BchPublicEventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; eventSlug: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { slug, eventSlug } = await params;
  const { lang: langParam } = await searchParams;

  if (slug !== BCH_SLUG) {
    notFound();
  }

  const pathBase = (await getPortfolioPublicContextServer(slug)).pathBase;
  const eventsListHref = pathBase === "" ? "/events" : `${pathBase}/events`;
  const event = await fetchEventDetail(eventSlug, pathBase);
  if (!event) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950 px-4 text-white">
        <p className="text-lg text-zinc-300">Evento não encontrado.</p>
        <Link href={eventsListHref} className="text-sm text-amber-400 hover:underline">
          ← Eventos
        </Link>
      </div>
    );
  }

  const portfolioPage = await getPageBySlug(slug);
  const defaultLang =
    (event.content?.theme as { defaultLang?: "pt" | "en" } | undefined)?.defaultLang ?? "pt";
  const lang = langParam === "en" ? "en" : langParam === "pt" ? "pt" : defaultLang;

  const page: Page = {
    id: event.slug,
    tenantId: portfolioPage?.tenantId ?? "",
    slug: BCH_SLUG,
    title: event.name,
    content: event.content as Page["content"],
    createdAt: "",
    updatedAt: "",
    tenant: portfolioPage?.tenant,
  };

  const theme = event.content?.theme ?? {};
  const blocks = sortBlocks((event.content?.blocks ?? []) as HomeContentBlock[]);
  const contentBlocks = blocks.filter((b) => {
    const t = String(b.type ?? "").toLowerCase();
    if (t === "header" || t === "footer") return false;
    const v = b.config?.visible as boolean | string | undefined;
    if (v === false || v === "false") return false;
    return GENERIC_BLOCK_TYPES.some((k) => String(k).toLowerCase() === t);
  });

  const headerBlock =
    portfolioPage?.content?.blocks?.find((b) => b.type === "header") ??
    blocks.find((b) => b.type === "header");
  const footerBlock =
    portfolioPage?.content?.blocks?.find((b) => b.type === "footer") ??
    blocks.find((b) => b.type === "footer");

  const bgColor = (theme.backgroundColor as string)?.trim() || "#0f0f12";
  const bgImage = (theme.backgroundImage as string)?.trim();
  const overlayOpacity =
    typeof theme.backgroundOverlayOpacity === "number" ? theme.backgroundOverlayOpacity : 0.75;
  const textColor = (theme.textColor as string)?.trim() || "#fafafa";
  const accentColor = (theme.accentColor as string)?.trim() || "#fbbf24";
  const fontFamily = (theme.fontFamily as string)?.trim();

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: bgImage ? undefined : bgColor,
        color: textColor,
        fontFamily: fontFamily || undefined,
        ["--portfolio-accent" as string]: accentColor,
      }}
    >
      <PortfolioFavicon slug={slug} logoUrl={event.logoUrl ?? portfolioPage?.tenant?.logoUrl} />
      {bgImage && (
        <div className="fixed inset-0 -z-10">
          <SmartImage
            src={getPublicImageUrl(bgImage)}
            alt=""
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-zinc-950" style={{ opacity: overlayOpacity }} />
        </div>
      )}
      <PublicPortfolioHeader
        slug={slug}
        tenantName={portfolioPage?.tenant?.name ?? "Boston City Hall"}
        logoUrl={event.logoUrl ?? portfolioPage?.tenant?.logoUrl}
        headerBlock={headerBlock}
        lang={lang}
        basePath={pathBase}
      />

      <article className="relative mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        {event.logoUrl && (
          <div className="relative mb-8 aspect-[21/9] overflow-hidden rounded-2xl border border-white/10 bg-zinc-900">
            <img
              src={getPublicImageUrl(event.logoUrl)}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{event.name}</h1>
        {event.startDate && (
          <p className="mt-4 flex items-center gap-2 text-zinc-300">
            <Calendar className="h-5 w-5 text-amber-500/80" />
            {formatBchEventDateTime(event.startDate, lang)}
            {event.endDate && (
              <span className="text-zinc-500">
                {" "}
                — {formatBchEventDateTime(event.endDate, lang)}
              </span>
            )}
          </p>
        )}
        {event.locationLabel && (
          <p className="mt-2 flex items-start gap-2 text-zinc-400">
            <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500/70" />
            {event.locationLabel}
          </p>
        )}
        {event.description && (
          <p className="mt-6 whitespace-pre-line text-base leading-relaxed text-zinc-300">
            {event.description}
          </p>
        )}

        <BchPublicEventTickets event={event} lang={lang} pathBase={pathBase} />

        {contentBlocks.length > 0 && (
          <div className="mt-12 space-y-0">
            {contentBlocks.map((block) => (
              <BlockRenderer
                key={block.id}
                block={block}
                lang={lang}
                page={page}
                slug={slug}
                pathBase={pathBase}
              />
            ))}
          </div>
        )}

        <p className="mt-12 flex flex-wrap gap-4 text-sm">
          <Link href={eventsListHref} className="text-amber-400 hover:underline">
            ← {lang === "pt" ? "Todos os eventos" : "All events"}
          </Link>
          <Link href={`/eventos/${encodeURIComponent(event.slug)}`} className="text-zinc-400 hover:text-white">
            {lang === "pt" ? "Página completa do evento" : "Full event page"}
          </Link>
        </p>
      </article>

      {isFooterBlockVisible(footerBlock) ? (
        <PublicFooter
          block={footerBlock}
          theme={portfolioPage?.content?.theme ?? theme}
          defaultText={portfolioPage?.tenant?.name ?? "Boston City Hall"}
          defaultLinks={[{ label: "Boston City Group", href: "/" }]}
          accentColor={accentColor}
        />
      ) : null}
    </div>
  );
}
