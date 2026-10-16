import Link from "next/link";
import { Calendar, MapPin, Ticket, ArrowRight } from "lucide-react";
import { PortfolioFavicon } from "@/components/portfolio/PortfolioFavicon";
import { PublicPortfolioHeader } from "@/components/portfolio/PublicPortfolioHeader";
import {
  BCH_TICKET_AVAILABILITY_LABEL,
  fetchBchPublicEvents,
  formatBchEventDateTime,
  type BchPublicEventListItem,
} from "@/lib/bch-public-events";
import { bchPublicNavLinks } from "@/lib/bch-public-nav";
import { BCH_PUBLIC_PATH, bchLogoSrc } from "@/lib/boston-city-hall";
import { getPublicImageUrl } from "@/lib/media-url";

function availabilityClass(state: BchPublicEventListItem["ticketAvailability"]): string {
  switch (state) {
    case "AVAILABLE":
      return "text-emerald-400";
    case "LOW_AVAILABILITY":
      return "text-amber-400";
    case "SOLD_OUT":
      return "text-zinc-500";
    default:
      return "text-zinc-400";
  }
}

function canBuy(item: BchPublicEventListItem): boolean {
  return (
    item.ticketingEnabled &&
    (item.ticketAvailability === "AVAILABLE" || item.ticketAvailability === "LOW_AVAILABILITY")
  );
}

export async function BchPublicVenueHome({
  slug,
  lang,
  tenantName,
  logoUrl,
}: {
  slug: string;
  lang: "pt" | "en";
  tenantName: string;
  logoUrl?: string | null;
}) {
  const events = await fetchBchPublicEvents();
  const featured = events.slice(0, 6);
  const basePath = `/portfolio/${slug}`;
  const nav = bchPublicNavLinks(lang, basePath);
  const logoSrc = bchLogoSrc(logoUrl);

  const copy = {
    heroTitle: tenantName,
    heroLead:
      lang === "pt"
        ? "Shows, galas e experiências ao vivo — ingressos digitais e entrada rápida."
        : "Live shows, galas and experiences — digital tickets and fast entry.",
    ctaEvents: lang === "pt" ? "Ver eventos" : "Browse events",
    ctaTickets: lang === "pt" ? "Meus ingressos" : "My tickets",
    sectionEvents: lang === "pt" ? "Próximos eventos" : "Upcoming events",
    allEvents: lang === "pt" ? "Ver todos" : "View all",
    emptyEvents:
      lang === "pt"
        ? "Novos eventos serão publicados em breve."
        : "New events will be published soon.",
    buy: lang === "pt" ? "Comprar" : "Buy",
    details: lang === "pt" ? "Detalhes" : "Details",
    footerGroup: lang === "pt" ? "Boston City Group" : "Boston City Group",
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <PortfolioFavicon slug={slug} logoUrl={logoUrl} />
      <PublicPortfolioHeader
        slug={slug}
        tenantName={tenantName}
        logoUrl={logoUrl}
        headerBlock={undefined}
        lang={lang}
        basePath={basePath}
        extraNavLinks={nav}
      />

      <section className="relative overflow-hidden border-b border-white/10">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(251,191,36,0.18),transparent)]"
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-zinc-900/40 to-zinc-950" aria-hidden />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 py-16 text-center sm:px-6 sm:py-24 lg:py-28">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoSrc}
            alt=""
            className="mb-8 h-16 w-auto max-w-[220px] object-contain sm:h-20"
          />
          <h1 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {copy.heroTitle}
          </h1>
          <p className="mt-4 max-w-xl text-base text-zinc-400 sm:text-lg">{copy.heroLead}</p>
          <div className="mt-10 flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
            <Link
              href={`${basePath}/events${lang === "en" ? "?lang=en" : ""}`}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400"
            >
              {copy.ctaEvents}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href={`${basePath}/my-tickets${lang === "en" ? "?lang=en" : ""}`}
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              {copy.ctaTickets}
            </Link>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-2xl font-bold sm:text-3xl">{copy.sectionEvents}</h2>
          <Link
            href={`${basePath}/events${lang === "en" ? "?lang=en" : ""}`}
            className="inline-flex min-h-[44px] items-center text-sm font-medium text-amber-400 hover:text-amber-300"
          >
            {copy.allEvents} →
          </Link>
        </div>

        {featured.length === 0 ? (
          <p className="mt-12 text-center text-zinc-500">{copy.emptyEvents}</p>
        ) : (
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((item) => (
              <li key={item.slug}>
                <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/70 shadow-lg transition hover:border-amber-500/25">
                  <Link href={item.detailPath} className="block">
                    {item.logoUrl ? (
                      <div className="aspect-[16/10] bg-zinc-800">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getPublicImageUrl(item.logoUrl)}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex aspect-[16/10] items-center justify-center bg-zinc-800/80 text-amber-500/50">
                        <Calendar className="h-12 w-12" aria-hidden />
                      </div>
                    )}
                  </Link>
                  <div className="flex flex-1 flex-col p-5">
                    <Link href={item.detailPath} className="hover:text-amber-100">
                      <h3 className="text-lg font-semibold leading-snug">{item.name}</h3>
                    </Link>
                    {item.startDate ? (
                      <p className="mt-2 flex items-start gap-2 text-sm text-zinc-400">
                        <Calendar className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                        {formatBchEventDateTime(item.startDate, lang)}
                      </p>
                    ) : null}
                    {item.locationLabel ? (
                      <p className="mt-1 flex items-start gap-2 text-sm text-zinc-500">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                        <span className="line-clamp-2">{item.locationLabel}</span>
                      </p>
                    ) : null}
                    {item.ticketingEnabled ? (
                      <p
                        className={`mt-3 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide ${availabilityClass(item.ticketAvailability)}`}
                      >
                        <Ticket className="h-3.5 w-3.5" aria-hidden />
                        {BCH_TICKET_AVAILABILITY_LABEL[item.ticketAvailability]}
                      </p>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-2 pt-2">
                      <Link
                        href={item.detailPath}
                        className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-white/5 px-3 text-sm font-medium text-zinc-200 hover:bg-white/10 sm:flex-none sm:px-4"
                      >
                        {copy.details}
                      </Link>
                      {canBuy(item) ? (
                        <Link
                          href={`${basePath}/events/${encodeURIComponent(item.slug)}/checkout${lang === "en" ? "?lang=en" : ""}`}
                          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-amber-500/90 px-3 text-sm font-semibold text-zinc-950 hover:bg-amber-400 sm:flex-none sm:px-4"
                        >
                          {copy.buy}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </main>

      <footer className="border-t border-white/10 bg-zinc-950/90 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 text-center text-sm text-zinc-500 sm:flex-row sm:justify-between sm:text-left">
          <p>© {new Date().getFullYear()} {tenantName}</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href={BCH_PUBLIC_PATH} className="text-zinc-400 hover:text-white">
              {tenantName}
            </Link>
            <Link href="/" className="text-amber-400/90 hover:text-amber-300">
              {copy.footerGroup}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
