import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Calendar, MapPin, Ticket } from "lucide-react";
import type { Page } from "@/types/page";
import { buildBackendUrl, getAppBaseUrl, getBackendOriginForServerFetch } from "@/lib/apiProxy";
import { getPublicImageUrl } from "@/lib/media-url";
import { PortfolioFavicon } from "@/components/portfolio/PortfolioFavicon";
import { PublicPortfolioHeader } from "@/components/portfolio/PublicPortfolioHeader";
import { PublicFooter, isFooterBlockVisible } from "@/components/portfolio/PublicFooter";
import {
  BCH_TICKET_AVAILABILITY_LABEL,
  fetchBchPublicEvents,
  formatBchEventDateTime,
  type BchPublicEventListItem,
} from "@/lib/bch-public-events";
import { bchPublicNavLinks } from "@/lib/bch-public-nav";

const BCH_SLUG = "boston-city-hall";

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

async function fetchEvents(past: boolean): Promise<BchPublicEventListItem[]> {
  const qs = past ? "?past=1" : "";
  const urls = [
    `${getBackendOriginForServerFetch()}/public/boston-city-hall/events${qs}`,
    `${getAppBaseUrl().replace(/\/$/, "")}/api/public/boston-city-hall/events${qs}`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      const data = (await res.json()) as BchPublicEventListItem[];
      return Array.isArray(data) ? data : [];
    } catch {
      /* próxima origem */
    }
  }
  return fetchBchPublicEvents({ past });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (slug !== BCH_SLUG) return { title: "Eventos" };
  return {
    title: "Eventos — Boston City Hall",
    description: "Próximos eventos e experiências no Boston City Hall.",
  };
}

export default async function PortfolioEventsListPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ past?: string; lang?: string }>;
}) {
  const { slug } = await params;
  const { past: pastParam, lang: langParam } = await searchParams;

  if (slug !== BCH_SLUG) {
    notFound();
  }

  const showPast = pastParam === "1" || pastParam === "true";
  const lang = langParam === "en" ? "en" : "pt";
  const page = await getPageBySlug(slug);
  const events = await fetchEvents(showPast);

  const title = lang === "pt" ? (showPast ? "Eventos passados" : "Próximos eventos") : showPast ? "Past events" : "Upcoming events";
  const empty =
    lang === "pt"
      ? "Nenhum evento publicado neste período."
      : "No published events in this period.";
  const toggleUpcoming = lang === "pt" ? "Próximos" : "Upcoming";
  const togglePast = lang === "pt" ? "Passados" : "Past";

  const headerBlock = page?.content?.blocks?.find((b) => b.type === "header");
  const footerBlock = page?.content?.blocks?.find((b) => b.type === "footer");
  const tenantName = page?.tenant?.name ?? "Boston City Hall";
  const logoUrl = page?.tenant?.logoUrl;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <PortfolioFavicon slug={slug} logoUrl={logoUrl} />
      <PublicPortfolioHeader
        slug={slug}
        tenantName={tenantName}
        logoUrl={logoUrl}
        headerBlock={headerBlock}
        lang={lang}
        basePath={`/portfolio/${slug}`}
        extraNavLinks={headerBlock ? undefined : bchPublicNavLinks(lang, `/portfolio/${slug}`)}
      />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
          <div className="flex gap-2">
            <Link
              href={`/portfolio/${slug}/events?lang=${lang}`}
              className={`min-h-[44px] rounded-lg px-4 py-2.5 text-sm font-medium ${
                !showPast ? "bg-amber-500/20 text-amber-300" : "bg-white/5 text-zinc-400 hover:text-white"
              }`}
            >
              {toggleUpcoming}
            </Link>
            <Link
              href={`/portfolio/${slug}/events?past=1&lang=${lang}`}
              className={`min-h-[44px] rounded-lg px-4 py-2.5 text-sm font-medium ${
                showPast ? "bg-amber-500/20 text-amber-300" : "bg-white/5 text-zinc-400 hover:text-white"
              }`}
            >
              {togglePast}
            </Link>
          </div>
        </div>

        {events.length === 0 ? (
          <p className="mt-12 text-center text-zinc-400">{empty}</p>
        ) : (
          <ul className="mt-10 grid gap-6 sm:grid-cols-2">
            {events.map((item) => (
              <li key={item.slug}>
                <Link
                  href={item.detailPath}
                  className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/80 transition hover:border-amber-500/30"
                >
                  {item.logoUrl ? (
                    <div className="aspect-[16/9] bg-zinc-800">
                      <img
                        src={getPublicImageUrl(item.logoUrl)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-[16/9] items-center justify-center bg-zinc-800 text-amber-500/60">
                      <Calendar className="h-14 w-14" />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-5">
                    <h2 className="text-lg font-semibold">{item.name}</h2>
                    {item.startDate && (
                      <p className="mt-2 flex items-center gap-2 text-sm text-zinc-400">
                        <Calendar className="h-4 w-4" />
                        {formatBchEventDateTime(item.startDate, lang)}
                      </p>
                    )}
                    {item.locationLabel && (
                      <p className="mt-1 flex items-start gap-2 text-sm text-zinc-500">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        {item.locationLabel}
                      </p>
                    )}
                    {item.ticketingEnabled && (
                      <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-zinc-400">
                        <Ticket className="h-3.5 w-3.5" />
                        {BCH_TICKET_AVAILABILITY_LABEL[item.ticketAvailability]}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-12 text-center">
          <Link href={`/portfolio/${slug}`} className="text-sm text-amber-400 hover:underline">
            ← {lang === "pt" ? "Voltar ao site" : "Back to site"}
          </Link>
        </p>
      </main>
      {isFooterBlockVisible(footerBlock) ? (
        <PublicFooter
          block={footerBlock}
          theme={page?.content?.theme}
          defaultText={tenantName}
          defaultLinks={[{ label: "Boston City Group", href: "/" }]}
        />
      ) : null}
    </div>
  );
}
