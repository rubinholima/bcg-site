import Link from "next/link";
import {
  Calendar,
  MapPin,
  Ticket,
  ArrowRight,
  Building2,
  Mic2,
  Utensils,
  Users,
  Sparkles,
  Instagram,
  ExternalLink,
} from "lucide-react";
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
import {
  BCH_VENUE_GALLERY,
  BCH_VENUE_HERO_IMAGE,
  BCH_VENUE_INSTAGRAM,
  BCH_VENUE_MAP_EMBED,
  bchVenueCopy,
} from "@/lib/bch-public-venue-content";
import { BchPublicVenueGallery } from "@/components/portfolio/bch/BchPublicVenueGallery";
import { BchPublicVenueLeadForm } from "@/components/portfolio/bch/BchPublicVenueLeadForm";

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

const STRUCTURE_ICONS = [Building2, Mic2, Sparkles, Utensils, Users, Ticket] as const;

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
  const langQ = lang === "en" ? "?lang=en" : "";
  const nav = bchPublicNavLinks(lang, basePath);
  const logoSrc = bchLogoSrc(logoUrl);
  const copy = bchVenueCopy(lang);
  const aboutParagraphs = copy.aboutBody.split("\n\n");

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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={BCH_VENUE_HERO_IMAGE}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-zinc-950/75" aria-hidden />
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(251,191,36,0.2),transparent)]"
          aria-hidden
        />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 py-16 text-center sm:px-6 sm:py-24 lg:py-28">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoSrc}
            alt=""
            className="mb-8 h-16 w-auto max-w-[220px] object-contain drop-shadow-lg sm:h-20"
          />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400/90">
            Manhuaçu · MG
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {tenantName}
          </h1>
          <p className="mt-4 max-w-2xl text-base text-zinc-300 sm:text-lg">{copy.heroLead}</p>
          <div className="mt-10 flex w-full max-w-lg flex-col gap-3 sm:max-w-none sm:flex-row sm:flex-wrap sm:justify-center">
            <Link
              href={`${basePath}/events${langQ}`}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400"
            >
              {copy.ctaEvents}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href={`${basePath}${langQ}#alugar`}
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15"
            >
              {copy.ctaRent}
            </Link>
            <Link
              href={`${basePath}/my-tickets${langQ}`}
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-white/15 bg-zinc-950/40 px-6 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-900/60"
            >
              {copy.ctaTickets}
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-zinc-900/50">
        <ul className="mx-auto grid max-w-6xl grid-cols-2 gap-px bg-white/10 sm:grid-cols-4">
          {copy.stats.map((stat) => (
            <li key={stat.label} className="bg-zinc-950 px-4 py-8 text-center sm:px-6">
              <p className="text-2xl font-bold text-amber-400 sm:text-3xl">{stat.value}</p>
              <p className="mt-1 text-xs text-zinc-400 sm:text-sm">{stat.label}</p>
            </li>
          ))}
        </ul>
      </section>

      <main>
        <section id="o-espaco" className="scroll-mt-20 border-b border-white/10 px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:items-start">
            <div>
              <h2 className="text-2xl font-bold sm:text-3xl">{copy.aboutTitle}</h2>
              <div className="mt-6 space-y-4 text-zinc-400 leading-relaxed">
                {aboutParagraphs.map((p) => (
                  <p key={p.slice(0, 24)}>{p}</p>
                ))}
              </div>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {copy.spaces.map((space) => (
                <li
                  key={space.title}
                  className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5"
                >
                  <h3 className="font-semibold text-amber-100/90">{space.title}</h3>
                  <p className="mt-2 text-sm text-zinc-400">{space.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="estrutura" className="scroll-mt-20 border-b border-white/10 bg-zinc-900/30 px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-2xl font-bold sm:text-3xl">{copy.structureTitle}</h2>
            <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {copy.structureItems.map((item, i) => {
                const Icon = STRUCTURE_ICONS[i] ?? Building2;
                return (
                  <li
                    key={item.title}
                    className="rounded-2xl border border-white/10 bg-zinc-950/80 p-6"
                  >
                    <Icon className="h-6 w-6 text-amber-400" aria-hidden />
                    <h3 className="mt-4 font-semibold">{item.title}</h3>
                    <p className="mt-2 text-sm text-zinc-400">{item.body}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section id="galeria" className="scroll-mt-20 border-b border-white/10 px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold sm:text-3xl">{copy.galleryTitle}</h2>
                <p className="mt-2 text-sm text-zinc-500">{copy.galleryCredit}</p>
              </div>
              <a
                href={BCH_VENUE_INSTAGRAM}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-amber-400 hover:text-amber-300"
              >
                <Instagram className="h-4 w-4" aria-hidden />
                {copy.instagram}
                <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden />
              </a>
            </div>
            <BchPublicVenueGallery items={BCH_VENUE_GALLERY} lang={lang} />
          </div>
        </section>

        <section id="eventos" className="scroll-mt-20 border-b border-white/10 px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold sm:text-3xl">{copy.eventsTitle}</h2>
                <p className="mt-2 text-sm text-zinc-500">{copy.sectionEvents}</p>
              </div>
              <Link
                href={`${basePath}/events${langQ}`}
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
                              href={`${basePath}/events/${encodeURIComponent(item.slug)}/checkout${langQ}`}
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
          </div>
        </section>

        <section id="alugar" className="scroll-mt-20 border-b border-white/10 bg-zinc-900/40 px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold sm:text-3xl">{copy.rentTitle}</h2>
              <p className="mt-4 text-zinc-400">{copy.rentLead}</p>
              <ol className="mt-8 space-y-4">
                {copy.rentSteps.map((step, i) => (
                  <li key={step} className="flex gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-sm font-bold text-amber-400">
                      {i + 1}
                    </span>
                    <p className="pt-1 text-sm text-zinc-300 sm:text-base">{step}</p>
                  </li>
                ))}
              </ol>
            </div>
            <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-6 sm:p-8">
              <h3 className="text-lg font-semibold">{copy.formTitle}</h3>
              <div className="mt-6">
                <BchPublicVenueLeadForm lang={lang} />
              </div>
            </div>
          </div>
        </section>

        <section id="local" className="scroll-mt-20 px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-2xl font-bold sm:text-3xl">{copy.locationTitle}</h2>
            <p className="mt-3 max-w-2xl text-zinc-400">{copy.locationBody}</p>
            <div className="mt-8 overflow-hidden rounded-2xl border border-white/10">
              <iframe
                title={copy.locationTitle}
                src={BCH_VENUE_MAP_EMBED}
                className="h-[280px] w-full sm:h-[360px]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <a
              href="https://www.google.com/maps/search/?api=1&query=Centro+de+Treinamento+Boston+City+Manhua%C3%A7u+MG"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-amber-400 hover:text-amber-300"
            >
              <MapPin className="h-4 w-4" aria-hidden />
              {copy.mapOpen}
              <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden />
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-zinc-950/90 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 text-center text-sm text-zinc-500 sm:flex-row sm:justify-between sm:text-left">
          <p>
            © {new Date().getFullYear()} {tenantName} · Manhuaçu (MG)
          </p>
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
